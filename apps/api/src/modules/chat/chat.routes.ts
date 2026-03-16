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

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());

function parsePatientAssignments(value: unknown): Record<string, string | null> {
  const parsed = patientAssignmentsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

async function getAllowedProfessionalIdsForPatient(patientProfileId: string): Promise<Set<string>> {
  const [assignmentConfig, bookings, purchases] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
    prisma.booking.findMany({
      where: {
        patientId: patientProfileId,
        status: { not: "CANCELLED" }
      },
      select: { professionalId: true },
      distinct: ["professionalId"]
    }),
    prisma.patientPackagePurchase.findMany({
      where: {
        patientId: patientProfileId,
        sessionPackage: {
          professionalId: {
            not: null
          }
        }
      },
      select: {
        sessionPackage: {
          select: { professionalId: true }
        }
      }
    })
  ]);

  const professionalIds = new Set<string>();

  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const assignedProfessionalId = assignments[patientProfileId];
  if (assignedProfessionalId) {
    professionalIds.add(assignedProfessionalId);
  }

  bookings.forEach((item) => professionalIds.add(item.professionalId));
  purchases.forEach((item) => {
    if (item.sessionPackage.professionalId) {
      professionalIds.add(item.sessionPackage.professionalId);
    }
  });

  return professionalIds;
}

async function assertThreadAccess(threadId: string, actor: Awaited<ReturnType<typeof getActorContext>>) {
  if (!actor) {
    return { allowed: false as const, thread: null, relatedThreadIds: [] as string[], canonicalThreadId: null as string | null };
  }

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return { allowed: false as const, thread: null, relatedThreadIds: [] as string[], canonicalThreadId: null as string | null };
  }

  let canAccessAsPatient = Boolean(actor.patientProfileId && thread.patientId === actor.patientProfileId);
  if (canAccessAsPatient && actor.patientProfileId) {
    const allowedProfessionalIds = await getAllowedProfessionalIdsForPatient(actor.patientProfileId);
    canAccessAsPatient = allowedProfessionalIds.has(thread.professionalId);
  }
  const canAccessAsProfessional = actor.professionalProfileId && thread.professionalId === actor.professionalProfileId;
  const allowed = Boolean(canAccessAsPatient || canAccessAsProfessional);

  if (!allowed) {
    return { allowed: false as const, thread: null, relatedThreadIds: [] as string[], canonicalThreadId: null as string | null };
  }

  const relatedThreads = await prisma.chatThread.findMany({
    where: {
      patientId: thread.patientId,
      professionalId: thread.professionalId
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  return {
    allowed: true as const,
    thread,
    relatedThreadIds: relatedThreads.map((item) => item.id),
    canonicalThreadId: relatedThreads[0]?.id ?? thread.id
  };
}

export const chatRouter = Router();

type ThreadRow = {
  id: string;
  patientId: string;
  professionalId: string;
  createdAt: Date;
  patient: {
    user: {
      id: string;
      fullName: string;
    };
  };
  professional: {
    user: {
      id: string;
      fullName: string;
    };
  };
  messages: Array<{
    id: string;
    body: string;
    createdAt: Date;
    senderUserId: string;
  }>;
};

function buildPairKey(thread: ThreadRow): string {
  return `${thread.patientId}:${thread.professionalId}`;
}

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

  const allowedProfessionalIds =
    actor.role === "PATIENT" && actor.patientProfileId
      ? await getAllowedProfessionalIdsForPatient(actor.patientProfileId)
      : null;
  const visibleThreads =
    allowedProfessionalIds && actor.role === "PATIENT"
      ? threads.filter((thread) => allowedProfessionalIds.has(thread.professionalId))
      : threads;

  const groups = new Map<
    string,
    {
      canonicalThreadId: string;
      canonicalThreadCreatedAt: Date;
      patientId: string;
      professionalId: string;
      counterpartName: string;
      counterpartUserId: string;
      lastMessage: {
        id: string;
        body: string;
        createdAt: Date;
        senderUserId: string;
      } | null;
      latestActivityAt: Date;
      unreadCount: number;
      relatedThreadIds: string[];
    }
  >();

  const unreadCounts = await Promise.all(
    visibleThreads.map(async (thread) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          threadId: thread.id,
          senderUserId: { not: actor.userId },
          readAt: null
        }
      });
      return { threadId: thread.id, unreadCount };
    })
  );
  const unreadByThread = new Map(unreadCounts.map((item) => [item.threadId, item.unreadCount]));

  for (const thread of visibleThreads as ThreadRow[]) {
    const pairKey = buildPairKey(thread);
    const counterpartName = actor.role === "PATIENT" ? thread.professional.user.fullName : thread.patient.user.fullName;
    const counterpartUserId = actor.role === "PATIENT" ? thread.professional.user.id : thread.patient.user.id;
    const threadLastMessage = thread.messages[0]
      ? {
          id: thread.messages[0].id,
          body: thread.messages[0].body,
          createdAt: thread.messages[0].createdAt,
          senderUserId: thread.messages[0].senderUserId
        }
      : null;
    const latestActivityAt = threadLastMessage?.createdAt ?? thread.createdAt;
    const currentUnread = unreadByThread.get(thread.id) ?? 0;

    const current = groups.get(pairKey);
    if (!current) {
      groups.set(pairKey, {
        canonicalThreadId: thread.id,
        canonicalThreadCreatedAt: thread.createdAt,
        patientId: thread.patientId,
        professionalId: thread.professionalId,
        counterpartName,
        counterpartUserId,
        lastMessage: threadLastMessage,
        latestActivityAt,
        unreadCount: currentUnread,
        relatedThreadIds: [thread.id]
      });
      continue;
    }

    current.relatedThreadIds.push(thread.id);
    current.unreadCount += currentUnread;

    if (thread.createdAt < current.canonicalThreadCreatedAt) {
      current.canonicalThreadId = thread.id;
      current.canonicalThreadCreatedAt = thread.createdAt;
    }

    if (latestActivityAt > current.latestActivityAt) {
      current.latestActivityAt = latestActivityAt;
      current.lastMessage = threadLastMessage;
    }
  }

  const mapped = Array.from(groups.values())
    .sort((a, b) => b.latestActivityAt.getTime() - a.latestActivityAt.getTime())
    .map((group) => ({
      id: group.canonicalThreadId,
      patientId: group.patientId,
      professionalId: group.professionalId,
      counterpartName: group.counterpartName,
      counterpartUserId: group.counterpartUserId,
      lastMessage: group.lastMessage
        ? {
            id: group.lastMessage.id,
            body: group.lastMessage.body,
            createdAt: group.lastMessage.createdAt,
            senderUserId: group.lastMessage.senderUserId
          }
        : null,
      unreadCount: group.unreadCount,
      createdAt: group.latestActivityAt
    }));

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

  const allowedProfessionalIds = await getAllowedProfessionalIdsForPatient(actor.patientProfileId);
  if (!allowedProfessionalIds.has(parsedParams.data.professionalId)) {
    return res.status(403).json({ error: "You can only chat with assigned professionals" });
  }

  const existingThread = await prisma.chatThread.findFirst({
    where: {
      patientId: actor.patientProfileId,
      professionalId: parsedParams.data.professionalId
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
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
    where: { threadId: { in: access.relatedThreadIds } },
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
    threadId: access.canonicalThreadId ?? access.thread.id,
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
      threadId: access.canonicalThreadId ?? access.thread.id,
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
      threadId: { in: access.relatedThreadIds },
      senderUserId: { not: req.auth.userId },
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return res.json({
    threadId: access.canonicalThreadId ?? access.thread.id,
    markedAsRead: result.count
  });
});
