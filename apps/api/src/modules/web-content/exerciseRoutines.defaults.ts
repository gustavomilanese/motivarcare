import { z } from "zod";

export const WEB_EXERCISE_ROUTINES_KEY = "patient-web-exercise-routines";

export const exerciseRoutineStatusSchema = z.enum(["draft", "published"]);

export const exerciseRoutineSchema = z.object({
  id: z.string().min(2).max(120),
  slug: z.string().min(2).max(160),
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(500),
  description: z.string().min(20).max(2_000),
  emoji: z.string().min(1).max(8),
  /** Ordered list of exercise ids from `patient-web-exercises`. */
  exerciseIds: z.array(z.string().min(2).max(120)).min(2).max(24),
  tags: z.array(z.string().min(1).max(40)).max(12),
  status: exerciseRoutineStatusSchema,
  featured: z.boolean(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sortOrder: z.number().int().min(0).max(100_000)
});

export type ExerciseRoutine = z.infer<typeof exerciseRoutineSchema>;

export const exerciseRoutineCreateSchema = exerciseRoutineSchema.omit({ id: true });
export const exerciseRoutineUpdateSchema = exerciseRoutineCreateSchema.partial();
export const exerciseRoutinesCollectionSchema = z.array(exerciseRoutineSchema);

const TODAY = "2026-04-26";

/** Plantilla importable desde admin (no se sirve al paciente sin pasar por SystemConfig). */
export const DEFAULT_EXERCISE_ROUTINES: ExerciseRoutine[] = [
  {
    id: "routine-calma-rapida",
    slug: "calma-rapida",
    title: "Calma rápida (10 min)",
    summary: "Secuencia breve para bajar la activación: respiración guiada y anclaje sensorial.",
    description:
      "Ideal cuando sentís ansiedad subiendo o necesitás resetear entre tareas. Dos prácticas complementarias en orden: primero regulás la respiración y después anclás la atención al presente.",
    emoji: "🌿",
    exerciseIds: ["ex-respiracion-4-7-8", "ex-anclaje-54321"],
    tags: ["ansiedad", "grounding", "inicio"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 10
  },
  {
    id: "routine-pre-sueno",
    slug: "pre-sueno",
    title: "Rutina pre-sueño",
    summary: "Respiración 4-7-8 seguida de body scan para soltar el día.",
    description:
      "Practicá esta secuencia 20–30 minutos antes de acostarte. La respiración prepara el sistema nervioso; el body scan ayuda a soltar tensión residual.",
    emoji: "🌙",
    exerciseIds: ["ex-respiracion-4-7-8", "ex-body-scan"],
    tags: ["sueño", "relajacion"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 20
  },
  {
    id: "routine-activacion-matutina",
    slug: "activacion-matutina",
    title: "Activación matutina",
    summary: "Movimiento suave, respiración diafragmática y postura de anclaje para empezar el día.",
    description:
      "Tres ejercicios en cadena: despertás el cuerpo con stretching, regulás la respiración y cerrás con una postura de presencia. No reemplaza actividad física intensa.",
    emoji: "☀️",
    exerciseIds: ["ex-stretching-matutino", "ex-respiracion-diafragmatica", "ex-postura-montana"],
    tags: ["mañana", "energia", "postura"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 30
  },
  {
    id: "routine-tension-cuello",
    slug: "alivio-tension-superior",
    title: "Alivio de tensión (cuello y hombros)",
    summary: "Estiramiento guiado + respiración cuadrada para zona superior del cuerpo.",
    description:
      "Cuando acumulás tensión por pantalla o estrés, esta rutina combina movimiento localizado con respiración rítmica. Detenete si aparece dolor agudo.",
    emoji: "🧘",
    exerciseIds: ["ex-estiramiento-cuello-hombros", "ex-respiracion-cuadrada"],
    tags: ["tension", "postura", "oficina"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 40
  }
];

export function resolveRoutineExerciseIdsBySlug(
  routines: ExerciseRoutine[],
  exercises: Array<{ id: string; slug: string }>
): ExerciseRoutine[] {
  const idBySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise.id]));
  return routines.map((routine) => ({
    ...routine,
    exerciseIds: routine.exerciseIds.map((ref) => {
      if (exercises.some((exercise) => exercise.id === ref)) {
        return ref;
      }
      const resolved = idBySlug.get(ref);
      return resolved ?? ref;
    })
  }));
}
