import { Router } from "express";
import { z } from "zod";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000)
});

const byProfessionalParamsSchema = z.object({
  professionalId: z.string().min(1)
});

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

async function assertThreadAccess(threadId: string, actor: Awaited<ReturnType<typeof getActorContext>>) {
  if (!actor) {
    return { allowed: false as const, thread: null };
  }

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return { allowed: false as const, thread: null };
  }

  const canAccessAsPatient = actor.patientProfileId && thread.patientId === actor.patientProfileId;
  const canAccessAsProfessional = actor.professionalProfileId && thread.professionalId === actor.professionalProfileId;

  return {
    allowed: Boolean(canAccessAsPatient || canAccessAsProfessional),
    thread
  };
}

export const chatRouter = Router();

chatRouter.get("/threads", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const threads = await prisma.chatThread.findMany({
    where:
      actor.role === "PATIENT"
        ? { patientId: actor.patientProfileId ?? "" }
        : actor.role === "PROFESSIONAL"
          ? { professionalId: actor.professionalProfileId ?? "" }
          : { id: "" },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      },
      professional: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const mapped = await Promise.all(
    threads.map(async (thread: any) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          threadId: thread.id,
          senderUserId: { not: actor.userId },
          readAt: null
        }
      });

      return {
        id: thread.id,
        patientId: thread.patientId,
        professionalId: thread.professionalId,
        counterpartName: actor.role === "PATIENT" ? thread.professional.user.fullName : thread.patient.user.fullName,
        counterpartUserId: actor.role === "PATIENT" ? thread.professional.user.id : thread.patient.user.id,
        lastMessage: thread.messages[0]
          ? {
              id: thread.messages[0].id,
              body: thread.messages[0].body,
              createdAt: thread.messages[0].createdAt,
              senderUserId: thread.messages[0].senderUserId
            }
          : null,
        unreadCount,
        createdAt: thread.createdAt
      };
    })
  );

  return res.json({ threads: mapped });
});

chatRouter.post("/threads/by-professional/:professionalId", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can open chat by professional" });
  }

  const parsedParams = byProfessionalParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: "Invalid params", details: parsedParams.error.flatten() });
  }

  const professionalExists = await prisma.professionalProfile.findUnique({
    where: { id: parsedParams.data.professionalId },
    select: { id: true }
  });

  if (!professionalExists) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const existingThread = await prisma.chatThread.findFirst({
    where: {
      patientId: actor.patientProfileId,
      professionalId: parsedParams.data.professionalId,
      bookingId: null
    }
  });

  const thread =
    existingThread
    ?? (await prisma.chatThread.create({
      data: {
        patientId: actor.patientProfileId,
        professionalId: parsedParams.data.professionalId
      }
    }));

  return res.status(existingThread ? 200 : 201).json({ threadId: thread.id, thread });
});

chatRouter.get("/threads/:threadId/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  const access = await assertThreadAccess(req.params.threadId, actor);
  if (!access.allowed || !access.thread) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const query = listMessagesQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query", details: query.error.flatten() });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: access.thread.id },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "asc" },
    take: query.data.limit
  });

  return res.json({
    threadId: access.thread.id,
    messages: messages.map((message: any) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      readAt: message.readAt,
      senderUserId: message.senderUserId,
      senderName: message.sender.fullName,
      senderRole: message.sender.role
    }))
  });
});

chatRouter.post("/threads/:threadId/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  const access = await assertThreadAccess(req.params.threadId, actor);
  if (!access.allowed || !access.thread) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsedBody = sendMessageSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid message payload", details: parsedBody.error.flatten() });
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId: access.thread.id,
      senderUserId: req.auth.userId,
      body: parsedBody.data.body.trim()
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  });

  return res.status(201).json({
    message: {
      id: message.id,
      threadId: message.threadId,
      body: message.body,
      createdAt: message.createdAt,
      senderUserId: message.senderUserId,
      senderName: message.sender.fullName,
      senderRole: message.sender.role
    }
  });
});

chatRouter.post("/threads/:threadId/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  const access = await assertThreadAccess(req.params.threadId, actor);
  if (!access.allowed || !access.thread) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const result = await prisma.chatMessage.updateMany({
    where: {
      threadId: access.thread.id,
      senderUserId: { not: req.auth.userId },
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return res.json({
    threadId: access.thread.id,
    markedAsRead: result.count
  });
});
