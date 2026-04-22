/**
 * Normaliza y re-persiste el JSON de `session-packages-visibility` en SystemConfig
 * para que en base siempre quede el **mismo shape** que el contrato (`SessionPackagesVisibilityPayload`).
 *
 * Tras migrar el contrato o si hubo filas guardadas a mano / versión vieja de API:
 *   npm run db:backfill-session-packages-visibility -w @therapy/api
 */
import { prisma } from "../src/lib/prisma.js";
import { parseSessionPackagesVisibility } from "../src/lib/sessionPackageVisibility.js";

const SESSION_PACKAGES_VISIBILITY_KEY = "session-packages-visibility";

async function main() {
  const row = await prisma.systemConfig.findUnique({
    where: { key: SESSION_PACKAGES_VISIBILITY_KEY }
  });
  if (!row) {
    console.log("No session-packages-visibility row; nothing to backfill.");
    return;
  }

  const normalized = parseSessionPackagesVisibility(row.value);
  await prisma.systemConfig.update({
    where: { key: SESSION_PACKAGES_VISIBILITY_KEY },
    data: { value: normalized as object }
  });
  console.log("Updated session-packages-visibility with normalized payload.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
