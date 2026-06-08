import { seedPatientWebContentIfEmpty } from "../src/lib/seedPatientWebContent.js";

async function main() {
  const result = await seedPatientWebContentIfEmpty();
  console.log("Patient web content seed:");
  console.log(
    `- exercises: ${result.skippedExercises ? "skipped (already present)" : `imported ${result.exercisesImported}`}`
  );
  console.log(
    `- routines: ${result.skippedRoutines ? "skipped (already present)" : `imported ${result.routinesImported}`}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.$disconnect();
  });
