import { prisma } from "../lib/prisma.js";
import { disconnectRedis } from "../lib/redis.js";
import { getEffectiveCronPollMs, getPatientEmailPlatformSettings } from "../modules/notifications/patientEmailPlatformSettings.service.js";
import { runPatientEmailReminderBatch } from "../modules/notifications/patientEmailReminders.js";

async function runBatch() {
  try {
    const result = await runPatientEmailReminderBatch();
    if (result.sent24h > 0 || result.sent1h > 0) {
      console.info("[notification-worker] reminder batch", result);
    }
  } catch (error) {
    console.error("[notification-worker] reminder batch failed", error);
  }
}

async function scheduleNextLoop() {
  let delayMs = 300_000;
  try {
    const settings = await getPatientEmailPlatformSettings();
    delayMs = getEffectiveCronPollMs(settings);
  } catch (error) {
    console.error("[notification-worker] could not load platform settings; using default delay", error);
  }

  setTimeout(() => {
    void (async () => {
      await runBatch();
      scheduleNextLoop();
    })();
  }, delayMs).unref();
}

async function main() {
  await runBatch();
  scheduleNextLoop();

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
  console.log(`${signal} received. Stopping notification worker...`);
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
  console.error("Notification worker failed", error);
  process.exit(1);
});
