import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { DEFAULT_EXERCISES } from "../modules/web-content/exercises.defaults.js";
import {
  DEFAULT_EXERCISE_ROUTINES,
  WEB_EXERCISE_ROUTINES_KEY,
  exerciseRoutinesCollectionSchema,
  resolveRoutineExerciseIdsBySlug
} from "../modules/web-content/exerciseRoutines.defaults.js";

export const WEB_EXERCISES_KEY = "patient-web-exercises";

export type SeedPatientWebContentResult = {
  exercisesImported: number;
  routinesImported: number;
  skippedExercises: boolean;
  skippedRoutines: boolean;
};

/**
 * Carga el catálogo inicial de ejercicios (60) y rutinas (14) en SystemConfig.
 * Idempotente: solo escribe si la key correspondiente está vacía.
 */
export async function seedPatientWebContentIfEmpty(): Promise<SeedPatientWebContentResult> {
  let exercisesImported = 0;
  let routinesImported = 0;
  let skippedExercises = false;
  let skippedRoutines = false;

  const exercisesConfig = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } });
  const existingExercises = Array.isArray(exercisesConfig?.value) ? exercisesConfig.value.length : 0;

  if (existingExercises === 0) {
    const exercisesValue = JSON.parse(JSON.stringify(DEFAULT_EXERCISES)) as Prisma.InputJsonValue;
    await prisma.systemConfig.upsert({
      where: { key: WEB_EXERCISES_KEY },
      update: { value: exercisesValue },
      create: { key: WEB_EXERCISES_KEY, value: exercisesValue }
    });
    exercisesImported = DEFAULT_EXERCISES.length;
  } else {
    skippedExercises = true;
  }

  const routinesConfig = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISE_ROUTINES_KEY } });
  const existingRoutines = Array.isArray(routinesConfig?.value) ? routinesConfig.value.length : 0;

  if (existingRoutines === 0) {
    const exercisesForResolve =
      existingExercises > 0 && Array.isArray(exercisesConfig?.value)
        ? (exercisesConfig!.value as Array<{ id: string; slug: string }>)
        : DEFAULT_EXERCISES.map((exercise) => ({ id: exercise.id, slug: exercise.slug }));

    const exerciseIdSet = new Set(exercisesForResolve.map((exercise) => exercise.id));
    const routines = resolveRoutineExerciseIdsBySlug(
      DEFAULT_EXERCISE_ROUTINES.map((routine) => ({ ...routine })),
      exercisesForResolve
    );

    const missingRefs = routines.flatMap((routine) =>
      routine.exerciseIds.filter((id) => !exerciseIdSet.has(id))
    );
    if (missingRefs.length > 0) {
      throw new Error(
        `Routine seed references unknown exercise ids: ${[...new Set(missingRefs)].join(", ")}`
      );
    }

    const validated = exerciseRoutinesCollectionSchema.parse(routines);
    const routinesValue = JSON.parse(JSON.stringify(validated)) as Prisma.InputJsonValue;
    await prisma.systemConfig.upsert({
      where: { key: WEB_EXERCISE_ROUTINES_KEY },
      update: { value: routinesValue },
      create: { key: WEB_EXERCISE_ROUTINES_KEY, value: routinesValue }
    });
    routinesImported = validated.length;
  } else {
    skippedRoutines = true;
  }

  return { exercisesImported, routinesImported, skippedExercises, skippedRoutines };
}
