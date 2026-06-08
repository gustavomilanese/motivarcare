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

const TODAY = "2026-06-03";

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
    id: "routine-reset-ansiedad",
    slug: "reset-ansiedad-aguda",
    title: "Reset de ansiedad aguda",
    summary: "Suspiro fisiológico, respiración coherente y anclaje 5-4-3-2-1 para momentos de mucha activación.",
    description:
      "Cuando la ansiedad sube rápido, esta secuencia va de lo más breve a lo más estable: primero interrumpís la alarma con el suspiro, después sincronizás la respiración y cerrás anclando los sentidos al presente.",
    emoji: "🆘",
    exerciseIds: [
      "ex-respiracion-suspiro-fisiologico",
      "ex-respiracion-coherente",
      "ex-anclaje-54321"
    ],
    tags: ["ansiedad", "panico", "respiracion"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 15
  },
  {
    id: "routine-pre-sueno",
    slug: "pre-sueno",
    title: "Rutina pre-sueño",
    summary: "Respiración 4-7-8, relajación progresiva y cierre antes de dormir.",
    description:
      "Practicá esta secuencia 20–30 minutos antes de acostarte. La respiración prepara el sistema nervioso; la relajación muscular suelta tensión residual; el cierre guiado ayuda a soltar el día.",
    emoji: "🌙",
    exerciseIds: [
      "ex-respiracion-4-7-8",
      "ex-relajacion-progresiva",
      "ex-relajacion-antes-dormir"
    ],
    tags: ["sueño", "relajacion"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 20
  },
  {
    id: "routine-noche-insomnio",
    slug: "noche-insomnio",
    title: "Cuando cuesta dormir",
    summary: "Body scan, respiración diafragmática y visualización de lugar seguro para volver a la calma nocturna.",
    description:
      "Si estás despierta/o con la mente acelerada, esta rutina evita forcear el sueño: primero recorrés el cuerpo sin exigirte, regulás la respiración y cerrás con una imagen de refugio interno.",
    emoji: "😴",
    exerciseIds: ["ex-body-scan", "ex-respiracion-diafragmatica", "ex-relajacion-lugar-seguro"],
    tags: ["sueño", "insomnio", "relajacion"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 25
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
    id: "routine-fin-semana",
    slug: "reset-fin-de-semana",
    title: "Reset de fin de semana",
    summary: "Caminata mindful, saludo al sol simplificado y gratitud breve para cerrar la semana.",
    description:
      "Una rutina más larga para cuando tenés un poco más de tiempo: movimiento con presencia, activación corporal suave y cierre orientado a lo que valorás de la semana.",
    emoji: "🌤️",
    exerciseIds: [
      "ex-caminata-mindful",
      "ex-movimiento-saludo-sol-simplificado",
      "ex-mindfulness-gratitud-breve"
    ],
    tags: ["fin-de-semana", "mindfulness", "movimiento"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 35
  },
  {
    id: "routine-tension-cuello",
    slug: "alivio-tension-superior",
    title: "Alivio de tensión (cuello y hombros)",
    summary: "Estiramiento guiado, alineación sentada y respiración cuadrada para la zona superior.",
    description:
      "Cuando acumulás tensión por pantalla o estrés, esta rutina combina movimiento localizado con respiración rítmica y reorganización postural. Detenete si aparece dolor agudo.",
    emoji: "🧘",
    exerciseIds: [
      "ex-estiramiento-cuello-hombros",
      "ex-postura-alineacion-sentado",
      "ex-respiracion-cuadrada"
    ],
    tags: ["tension", "postura", "oficina"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 40
  },
  {
    id: "routine-pausa-oficina",
    slug: "pausa-oficina",
    title: "Pausa de oficina (8 min)",
    summary: "Pausa activa, muñecas y hombros contra pared para quienes pasan horas sentadas/o.",
    description:
      "Micro-rutina pensada para el escritorio: movés el cuerpo sin cambiar de lugar, liberás muñecas y hombros, y volvés a la tarea con menos tensión acumulada.",
    emoji: "💼",
    exerciseIds: [
      "ex-movimiento-pausa-activa",
      "ex-movimiento-estiramiento-munecas",
      "ex-movimiento-hombros-pared"
    ],
    tags: ["oficina", "trabajo", "postura"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 45
  },
  {
    id: "routine-antes-reunion",
    slug: "antes-de-reunion",
    title: "Antes de una reunión difícil",
    summary: "Respiración cuadrada, postura de montaña y pausa consciente de 3 minutos.",
    description:
      "Preparate en pocos minutos: estabilizás la respiración, recuperás postura y presencia, y bajás la reactividad antes de entrar a una conversación exigente.",
    emoji: "🎯",
    exerciseIds: [
      "ex-respiracion-cuadrada",
      "ex-postura-montana",
      "ex-mindfulness-respiracion-3-min"
    ],
    tags: ["foco", "trabajo", "ansiedad"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 50
  },
  {
    id: "routine-regulacion-emocional",
    slug: "regulacion-emocional",
    title: "Regulación emocional",
    summary: "Técnica ACE, suspiro fisiológico y etiquetado mindful de emociones.",
    description:
      "Cuando una emoción te desborda, esta secuencia combina grounding corporal, reset respiratorio y observación sin juicio. No busca eliminar la emoción, sino bajar la intensidad.",
    emoji: "💧",
    exerciseIds: [
      "ex-grounding-tecnica-ace",
      "ex-respiracion-suspiro-fisiologico",
      "ex-mindfulness-emociones"
    ],
    tags: ["emociones", "regulacion", "grounding"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 55
  },
  {
    id: "routine-tristeza-duelo",
    slug: "acompanar-tristeza",
    title: "Acompañar la tristeza",
    summary: "Lugar seguro, frase ancla y gratitud breve para momentos de bajón o duelo.",
    description:
      "Una rutina contenida para cuando aparece tristeza, nostalgia o agotamiento emocional. Prioriza refugio interno, anclaje verbal y un cierre orientado a lo pequeño que sigue presente.",
    emoji: "🕊️",
    exerciseIds: [
      "ex-relajacion-lugar-seguro",
      "ex-grounding-frase-ancla",
      "ex-mindfulness-gratitud-breve"
    ],
    tags: ["tristeza", "duelo", "autocompasion"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 60
  },
  {
    id: "routine-concentracion",
    slug: "concentracion-y-foco",
    title: "Concentración y foco",
    summary: "Respiración coherente, pensamientos como nubes y alineación sentada.",
    description:
      "Para volver a una tarea después de interrupciones o dispersión mental. Sincronizás la respiración, soltás el diálogo interno unos minutos y reorganizás la postura de trabajo.",
    emoji: "🧠",
    exerciseIds: [
      "ex-respiracion-coherente",
      "ex-mindfulness-pensamientos-nubes",
      "ex-postura-alineacion-sentado"
    ],
    tags: ["foco", "trabajo", "mindfulness"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 65
  },
  {
    id: "routine-cuerpo-soltar",
    slug: "soltar-el-cuerpo",
    title: "Soltar el cuerpo",
    summary: "Relajación progresiva, body scan y liberación de pies para tensión generalizada.",
    description:
      "Cuando sentís el cuerpo entero cargado, esta rutina va de lo muscular a lo atencional: primero soltás grupos musculares, después observás el cuerpo completo y cerrás desde los pies.",
    emoji: "🫧",
    exerciseIds: ["ex-relajacion-progresiva", "ex-body-scan", "ex-relajacion-pies"],
    tags: ["tension", "relajacion", "cuerpo"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 70
  },
  {
    id: "routine-pausa-consciente",
    slug: "pausa-consciente",
    title: "Pausa consciente (S.T.O.P.)",
    summary: "Pausa S.T.O.P., anclaje en los pies y respiración con exhalación prolongada.",
    description:
      "Una rutina corta para frenar en seco cuando estás en piloto automático: te detenés, aterrizás en el cuerpo y regulás la respiración antes de seguir.",
    emoji: "⏸️",
    exerciseIds: [
      "ex-mindfulness-pausa-sabrosa",
      "ex-grounding-pies-tierra",
      "ex-respiracion-expiracion-prolongada"
    ],
    tags: ["pausa", "presencia", "estres"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 75
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
