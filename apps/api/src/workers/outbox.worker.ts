import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { disconnectRedis } from "../lib/redis.js";
import { processOutboxEvent } from "./outbox.handlers.js";

const PROCESSING_STUCK_MS = 5 * 60 * 1000;

function computeRetryDelayMs(attempt: number): number {
  const exponential = env.OUTBOX_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(exponential, 30 * 60 * 1000);
}

async function resetStuckProcessingRows() {
  const threshold = new Date(Date.now() - PROCESSING_STUCK_MS);
  await prisma.outboxEvent.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lte: threshold }
    },
    data: {
      status: "PENDING",
      availableAt: new Date()
    }
  });
}

async function processPendingEvent(eventId: string): Promise<void> {
  const claim = await prisma.outboxEvent.updateMany({
    where: {
      id: eventId,
      status: "PENDING"
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 }
    }
  });

  if (claim.count === 0) {
    return;
  }

  const event = await prisma.outboxEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return;
  }

  try {
    await processOutboxEvent({
      eventType: event.eventType,
      payload: event.payload
    });

    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Unknown outbox processing error";
    const shouldDeadLetter = event.attempts >= env.OUTBOX_MAX_ATTEMPTS;

    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: shouldDeadLetter
        ? {
            status: "DEAD_LETTER",
            errorMessage
          }
        : {
            status: "PENDING",
            errorMessage,
            availableAt: new Date(Date.now() + computeRetryDelayMs(event.attempts))
          }
    });
  }
}

async function processBatch() {
  await resetStuckProcessingRows();

  const now = new Date();
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "PENDING",
      availableAt: { lte: now }
    },
    orderBy: { createdAt: "asc" },
    take: env.OUTBOX_BATCH_SIZE,
    select: { id: true }
  });

  for (const event of events) {
    await processPendingEvent(event.id);
  }
}

async function main() {
  setInterval(() => {
    void processBatch();
  }, env.OUTBOX_POLL_MS).unref();

  await processBatch();
  // Keep process alive.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

let stopping = false;
async function stopWorker(signal: string) {
  if (stopping) {
    return;
  }
  stopping = true;
  console.log(`${signal} received. Stopping outbox worker...`);
  await Promise.all([prisma.$disconnect(), disconnectRedis()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void stopWorker("SIGINT");
});
process.on("SIGTERM", () => {
  void stopWorker("SIGTERM");
});

void main().catch((error) => {
  console.error("Outbox worker failed", error);
  process.exit(1);
});
