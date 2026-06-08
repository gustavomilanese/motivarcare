import { buildExercise } from "./buildExercise.js";

export const RESPIRACION_EXERCISES = [
  buildExercise({
    id: "ex-respiracion-suspiro-fisiologico",
    slug: "suspiro-fisiologico",
    title: "Suspiro fisiológico",
    summary:
      "Dos inhalaciones seguidas de una exhalación larga para bajar la activación emocional en menos de un minuto.",
    description:
      "El suspiro fisiológico es un patrón natural que el cuerpo usa para resetear el sistema nervioso después de momentos de estrés. Al practicarlo de forma consciente podés interrumpir la respuesta de alarma y volver a un estado más regulado. Es discreto, rápido y no requiere retener el aire.",
    category: "respiracion",
    durationMinutes: 2,
    difficulty: "principiante",
    emoji: "😮‍💨",
    steps: [
      "Sentate o parate con la espalda cómoda y los hombros sueltos.",
      "Inhalá profundo por la nariz hasta llenar los pulmones.",
      "Sin soltar, hacé una segunda inhalación corta por la nariz para llenar un poco más.",
      "Exhalá muy lento por la boca, como si empañaras un vidrio, hasta vaciar por completo.",
      "Repetí el ciclo entre 3 y 5 veces, sin forzar el ritmo.",
      "Cerrá con dos respiraciones naturales y notá cómo cambia el cuerpo."
    ],
    tips: [
      "Usalo antes de una conversación difícil o cuando notes que la respiración se acorta.",
      "La segunda inhalación es corta: no busques llenar al máximo.",
      "Si te mareás, volvé a respirar normal y probá con menos repeticiones."
    ],
    benefits: [
      "Reduce activación aguda en segundos.",
      "Es fácil de recordar en momentos de estrés.",
      "No requiere espacio ni silencio absoluto."
    ],
    contraindications: "Si tenés asma o broncoespasmo activo, consultalo con tu profesional antes de practicarlo.",
    tags: ["ansiedad", "respiracion", "rapido"],
    featured: true,
    sortOrder: 110
  }),
  buildExercise({
    id: "ex-respiracion-alternada-nariz",
    slug: "respiracion-alternada-nariz",
    title: "Respiración alternada por nariz",
    summary:
      "Alterná la inhalación y exhalación entre fosas nasales para equilibrar la atención y bajar la agitación mental.",
    description:
      "La respiración alternada (nadi shodhana en yoga) ayuda a centrar la mente cuando hay muchos pensamientos cruzados. No es una técnica médica: es una herramienta de autorregulación que muchas personas usan para prepararse antes de dormir o después de un día intenso.",
    category: "respiracion",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "👃",
    steps: [
      "Sentate cómoda/o con la espalda recta y relajada.",
      "Con la mano derecha, tapá la fosa nasal derecha con el pulgar.",
      "Inhalá lento por la fosa izquierda contando hasta 4.",
      "Tapá la izquierda con el anular y soltá la derecha.",
      "Exhalá por la fosa derecha contando hasta 4.",
      "Inhalá por la derecha, cambiá el tapón y exhalá por la izquierda.",
      "Repetí el ciclo durante 4 a 5 minutos manteniendo un ritmo suave."
    ],
    tips: [
      "No aprietes fuerte la nariz: un contacto suave alcanza.",
      "Si una fosa está congestionada, practicá solo por la que respires mejor.",
      "Empezá con ciclos más cortos (inhalo 3, exhalo 3) si te resulta largo."
    ],
    benefits: [
      "Ayuda a ordenar pensamientos acelerados.",
      "Favorece sensación de equilibrio interno.",
      "Funciona bien como transición hacia el descanso."
    ],
    contraindications: "Evitá forzar si tenés congestión nasal severa o molestias al retener el flujo.",
    tags: ["equilibrio", "respiracion", "foco"],
    featured: false,
    sortOrder: 120
  }),
  buildExercise({
    id: "ex-respiracion-coherente",
    slug: "respiracion-coherente",
    title: "Respiración coherente 5-5",
    summary:
      "Inhalá y exhalá cinco segundos cada fase para sincronizar corazón y respiración y ganar estabilidad emocional.",
    description:
      "La respiración coherente busca un ritmo parejo que muchas personas encuentran reconfortante. Con práctica regular puede ayudarte a notar antes cuándo el cuerpo se acelera y a elegir una pausa consciente. Es una técnica de bienestar, no un tratamiento clínico.",
    category: "respiracion",
    durationMinutes: 6,
    difficulty: "principiante",
    emoji: "💓",
    steps: [
      "Ubicate en un lugar tranquilo, sentada/o o acostada/o.",
      "Colocá una mano en el pecho y otra en el abdomen si te ayuda a enfocarte.",
      "Inhalá por la nariz contando lentamente hasta 5.",
      "Exhalá por la nariz o boca contando hasta 5, sin pausas bruscas.",
      "Mantené el ritmo constante durante 5 a 6 minutos.",
      "Al final, soltá el conteo y respirá natural unos segundos."
    ],
    tips: [
      "Un reloj o app con metrónomo suave puede ayudarte al principio.",
      "Si 5 segundos te cuesta, probá con 4-4 y subí gradualmente.",
      "Practicarlo a la misma hora refuerza el hábito de pausa."
    ],
    benefits: [
      "Promueve sensación de calma sostenida.",
      "Mejora la conciencia del ritmo corporal.",
      "Es útil como rutina diaria breve."
    ],
    contraindications: "",
    tags: ["rutina", "respiracion", "estres"],
    featured: false,
    sortOrder: 130
  }),
  buildExercise({
    id: "ex-respiracion-labios-fruncidos",
    slug: "respiracion-labios-fruncidos",
    title: "Respiración con labios fruncidos",
    summary:
      "Exhalá lento con labios fruncidos para alargar la salida del aire y sentir más control sobre la respiración.",
    description:
      "Esta técnica simple alarga la exhalación y muchas personas la usan cuando sienten opresión en el pecho por estrés o ansiedad leve. Ayuda a bajar el ritmo sin necesidad de contar segundos. Si tenés una condición respiratoria, consultalo con tu equipo de salud.",
    category: "respiracion",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🫦",
    steps: [
      "Sentate erguida/o con los hombros relajados.",
      "Inhalá suave por la nariz durante 2 segundos, sin forzar.",
      "Fruncí los labios como si fueras a soplar una vela sin apagarla.",
      "Exhalá lento por la boca durante 4 a 6 segundos.",
      "Repetí el ciclo de forma continua durante 3 a 4 minutos.",
      "Terminá con respiraciones naturales y mové suavemente hombros y cuello."
    ],
    tips: [
      "La exhalación debe ser el doble o más que la inhalación.",
      "No soplés con fuerza: el aire sale en un hilo fino y constante.",
      "Podés practicarlo caminando lento si te resulta incómodo sentada/o."
    ],
    benefits: [
      "Facilita sensación de control respiratorio.",
      "Reduce sensación de ahogo leve por nervios.",
      "Es muy fácil de enseñar y recordar."
    ],
    contraindications:
      "Si tenés EPOC, asma descompensada u otra condición respiratoria, consultalo antes de practicarlo.",
    tags: ["ansiedad", "respiracion", "control"],
    featured: false,
    sortOrder: 140
  }),
  buildExercise({
    id: "ex-respiracion-pausa-consciente",
    slug: "respiracion-pausa-consciente",
    title: "Respiración con pausa consciente",
    summary:
      "Agregá una pausa breve después de inhalar y después de exhalar para entrenar presencia y calma.",
    description:
      "Las pausas suaves entre fases respiratorias invitan a la mente a quedarse en el presente. Esta práctica intermedia requiere atención pero no retenciones largas. Si en algún momento te sentís incómoda/o, volvé a un ritmo natural sin pausas.",
    category: "respiracion",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "⏸️",
    steps: [
      "Sentate con la espalda apoyada y los pies en el suelo.",
      "Inhalá por la nariz contando hasta 4.",
      "Hacé una pausa breve de 1 a 2 segundos sin tensar.",
      "Exhalá por la boca contando hasta 6.",
      "Pausá 1 a 2 segundos con los pulmones vacíos, sin apuro por inhalar.",
      "Repetí el ciclo durante 4 a 5 minutos.",
      "Cerrá soltando el conteo y observando cómo respirás ahora."
    ],
    tips: [
      "Las pausas son cortas: si aparece incomodidad, acortalas o eliminalas.",
      "Mantené la mandíbula y los hombros sueltos durante todo el ejercicio.",
      "Funciona bien después del almuerzo para evitar somnolencia."
    ],
    benefits: [
      "Entrena la atención plena en el cuerpo.",
      "Ayuda a frenar la mente acelerada.",
      "Complementa otras técnicas de respiración."
    ],
    contraindications: "Evitá pausas largas si tenés vértigo, hipertensión no controlada o mareos frecuentes.",
    tags: ["mindfulness", "respiracion", "foco"],
    featured: false,
    sortOrder: 150
  }),
  buildExercise({
    id: "ex-respiracion-expiracion-prolongada",
    slug: "respiracion-expiracion-prolongada",
    title: "Respiración con exhalación prolongada",
    summary:
      "Inhalá en 4 y exhalá en 8 para activar la respuesta de calma del sistema nervioso parasimpático.",
    description:
      "Alargar la exhalación es una de las formas más accesibles de invitar al cuerpo a soltar tensión. Esta variante es ideal cuando sentís el pecho apretado o los pensamientos acelerados. Recordá que es una herramienta de autorregulación, no un reemplazo de tratamiento profesional.",
    category: "respiracion",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🌊",
    steps: [
      "Ubicate en una posición cómoda, sentada/o o acostada/o.",
      "Inhalá por la nariz contando hasta 4.",
      "Exhalá muy lento por la boca contando hasta 8, como una ola que baja.",
      "No fuerces el final de la exhalación: dejá que el aire salga solo.",
      "Repetí el ciclo durante 3 a 4 minutos.",
      "Si te falta aire, reducí a inhalar 3 y exhalar 6."
    ],
    tips: [
      "Imaginá que la tensión sale con cada exhalación.",
      "Practicá con ojos cerrados o mirada baja para menos distracciones.",
      "Es especialmente útil antes de dormir."
    ],
    benefits: [
      "Favorece relajación muscular leve.",
      "Reduce sensación de urgencia interna.",
      "Mejora la transición hacia el descanso."
    ],
    contraindications: "",
    tags: ["sueño", "respiracion", "calma"],
    featured: false,
    sortOrder: 160
  }),
  buildExercise({
    id: "ex-respiracion-tres-partes",
    slug: "respiracion-tres-partes",
    title: "Respiración en tres partes",
    summary:
      "Llená abdomen, costillas y pecho en secuencia para respirar más completo y consciente.",
    description:
      "La respiración en tres partes enseña a usar todo el volumen disponible del tórax de forma gradual. Muchas personas descubren que respiran solo desde el pecho cuando están estresadas. Este ejercicio ayuda a reconectar con un patrón más amplio y relajado.",
    category: "respiracion",
    durationMinutes: 6,
    difficulty: "intermedio",
    emoji: "🫁",
    steps: [
      "Acostate o sentate con la espalda apoyada y una mano en el abdomen.",
      "Inhalá llenando primero el abdomen (la mano se eleva).",
      "Continuá la inhalación expandiendo las costillas hacia los lados.",
      "Completá llenando suavemente la parte alta del pecho.",
      "Exhalá en orden inverso: pecho, costillas y abdomen.",
      "Repetí durante 5 a 6 minutos con un ritmo pausado.",
      "Al terminar, compará cómo se siente el torso respecto al inicio."
    ],
    tips: [
      "No fuerces el pecho: la secuencia debe sentirse fluida.",
      "Practicá primero acostada/o hasta que el patrón sea familiar.",
      "Si te mareás, volvé a respiración abdominal simple."
    ],
    benefits: [
      "Mejora la conciencia del patrón respiratorio.",
      "Libera tensión en tórax y diafragma.",
      "Es base para meditación y relajación."
    ],
    contraindications: "Suspendé si aparece mareo o sensación de falta de aire; retomá con inhalaciones más cortas.",
    tags: ["respiracion", "conciencia", "cuerpo"],
    featured: false,
    sortOrder: 170
  })
];
