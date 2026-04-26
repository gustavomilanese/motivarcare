/**
 * Catálogo de ejercicios de cortesía (10) que se usa cuando el admin todavía no
 * cargó nada en `SystemConfig` (key `landing-web-exercises`).
 * Si el admin guarda al menos un ejercicio, este fallback deja de aplicarse.
 *
 * El contenido fue revisado para ser seguro y útil entre sesiones, pero NO sustituye
 * tratamiento profesional: cada ejercicio incluye contraindicaciones cuando corresponde.
 */
export type ExerciseCategory =
  | "respiracion"
  | "postura"
  | "grounding"
  | "movimiento"
  | "relajacion"
  | "mindfulness";

export type ExerciseDifficulty = "principiante" | "intermedio" | "avanzado";
export type ExerciseStatus = "published" | "draft";

export interface ExercisePost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: ExerciseCategory;
  durationMinutes: number;
  difficulty: ExerciseDifficulty;
  emoji: string;
  steps: string[];
  tips: string[];
  benefits: string[];
  contraindications: string;
  tags: string[];
  status: ExerciseStatus;
  featured: boolean;
  publishedAt: string;
  sortOrder: number;
}

const TODAY = "2026-04-26";

export const DEFAULT_EXERCISES: ExercisePost[] = [
  {
    id: "ex-respiracion-4-7-8",
    slug: "respiracion-4-7-8",
    title: "Respiración 4-7-8",
    summary: "Calmá el sistema nervioso en menos de 5 minutos respirando con un ritmo guiado.",
    description:
      "La respiración 4-7-8 baja la activación del sistema nervioso simpático y ayuda a recuperar foco y calma. Es ideal antes de dormir, frente a momentos de ansiedad o cuando notás que la cabeza acelera. Con práctica regular notarás que la respuesta de calma aparece más rápido.",
    category: "respiracion",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🌬️",
    steps: [
      "Sentate cómoda/o con la espalda apoyada y los hombros relajados.",
      "Apoyá la punta de la lengua detrás de los dientes superiores y exhalá completamente por la boca haciendo un suave sonido de 'fff'.",
      "Cerrá la boca e inhalá por la nariz contando mentalmente hasta 4.",
      "Mantené el aire reteniendo 7 segundos sin esfuerzo.",
      "Exhalá por la boca durante 8 segundos haciendo el mismo sonido suave.",
      "Repetí el ciclo 4 veces. Si te marea, cortá antes y respirá normal."
    ],
    tips: [
      "Practicalo dos veces al día durante una semana antes de usarlo en momentos de crisis.",
      "Si te cuesta retener 7 segundos, achicá la cuenta proporcional (3-5-6).",
      "Es más efectivo cuando el cuerpo está apoyado y no en movimiento."
    ],
    benefits: [
      "Reduce ansiedad aguda en pocos minutos.",
      "Facilita conciliar el sueño.",
      "Mejora la regulación emocional con la práctica."
    ],
    contraindications:
      "Si tenés un cuadro respiratorio activo, vértigo o consigna médica de no retener aire, hablalo primero con tu profesional.",
    tags: ["ansiedad", "sueño", "respiracion"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 10
  },
  {
    id: "ex-respiracion-diafragmatica",
    slug: "respiracion-diafragmatica",
    title: "Respiración diafragmática",
    summary: "Reentrená al diafragma para respirar más profundo y bajar la tensión muscular.",
    description:
      "Cuando estamos estresadas/os respiramos corto y desde el pecho. La respiración diafragmática (también llamada abdominal) reactiva el patrón natural y baja el ritmo cardíaco en pocos minutos.",
    category: "respiracion",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🫁",
    steps: [
      "Acostate boca arriba con las rodillas flexionadas o sentate con la espalda recta.",
      "Apoyá una mano en el pecho y otra en el abdomen, debajo de las costillas.",
      "Inhalá lento por la nariz durante 4 segundos llevando el aire hacia la mano del abdomen (la del pecho debe moverse poco).",
      "Sostené 1 segundo.",
      "Exhalá despacio por la boca durante 6 segundos sintiendo cómo baja el abdomen.",
      "Repetí durante 5 minutos sin forzar el ritmo."
    ],
    tips: [
      "Si la mano del pecho se mueve más que la del abdomen, aflojá los hombros y bajá el ritmo.",
      "Podés practicarlo viendo una pantalla, leyendo o escuchando música tranquila.",
      "La exhalación más larga que la inhalación es la que activa el efecto calmante."
    ],
    benefits: [
      "Baja la frecuencia cardíaca y la presión.",
      "Mejora la oxigenación y la concentración.",
      "Es base para casi cualquier otra técnica de relajación."
    ],
    contraindications:
      "Suspendé si aparece mareo, hormigueos o falta de aire; volvé a respirar normal y consultalo en próxima sesión.",
    tags: ["respiracion", "estres", "rutina"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 20
  },
  {
    id: "ex-respiracion-cuadrada",
    slug: "respiracion-cuadrada",
    title: "Respiración cuadrada (box)",
    summary: "Ritmo 4-4-4-4 para volver a estar presente y mejorar el foco antes de tareas exigentes.",
    description:
      "La respiración cuadrada es una técnica que usan deportistas y operadores de alta exigencia para regular la atención. Su ritmo simétrico lleva al sistema nervioso a un estado de calma alerta.",
    category: "respiracion",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "⬜",
    steps: [
      "Sentate con la espalda apoyada y los pies en el piso.",
      "Inhalá por la nariz contando 4.",
      "Mantené el aire 4 segundos sin tensar.",
      "Exhalá por la boca contando 4.",
      "Mantené sin aire 4 segundos.",
      "Repetí el ciclo durante 3 a 4 minutos."
    ],
    tips: [
      "Usalo antes de una reunión, examen o conversación difícil.",
      "Si te cuesta sostener 4-4-4-4, comenzá con 3-3-3-3 y subí gradualmente.",
      "Funciona mejor con los ojos cerrados o con la mirada fija en un punto."
    ],
    benefits: [
      "Mejora la concentración y la toma de decisiones.",
      "Estabiliza la respuesta emocional.",
      "Es discreto: podés practicarlo sin que se note."
    ],
    contraindications: "Si tenés hipertensión no controlada, evitá retener aire por períodos largos sin consultar.",
    tags: ["foco", "respiracion", "ansiedad"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 30
  },
  {
    id: "ex-anclaje-54321",
    slug: "anclaje-5-4-3-2-1",
    title: "Anclaje sensorial 5-4-3-2-1",
    summary: "Volvé al presente listando lo que ven, oyen, tocan, huelen y saborean tus sentidos.",
    description:
      "El anclaje 5-4-3-2-1 es una de las técnicas más usadas para frenar pensamientos rumiantes, ataques de pánico o disociación leve. Lleva la atención al cuerpo y al entorno usando los cinco sentidos.",
    category: "grounding",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🌳",
    steps: [
      "Pausá lo que estés haciendo y respirá profundo una vez.",
      "Mirá alrededor y nombrá 5 cosas que estás viendo (formas, colores, texturas).",
      "Notá 4 cosas que podés tocar y describilas (temperatura, peso, textura).",
      "Identificá 3 sonidos del ambiente, cercanos o lejanos.",
      "Detectá 2 olores que estén presentes; si no hay, recordá olores familiares.",
      "Notá 1 sabor en la boca o tomá un sorbo de agua y describilo."
    ],
    tips: [
      "Si una crisis es muy intensa, hacelo en voz alta o describiéndolo a otra persona.",
      "Llevalo a la rutina como ejercicio breve antes de empezar el día.",
      "No es necesario ser preciso: lo importante es volver a percibir."
    ],
    benefits: [
      "Reduce la intensidad de un ataque de pánico.",
      "Devuelve sensación de control en momentos difíciles.",
      "Mejora la conexión con el presente."
    ],
    contraindications: "",
    tags: ["ansiedad", "panico", "presente"],
    status: "published",
    featured: true,
    publishedAt: TODAY,
    sortOrder: 40
  },
  {
    id: "ex-estiramiento-cuello-hombros",
    slug: "estiramiento-cuello-hombros",
    title: "Estiramiento de cuello y hombros",
    summary: "Cinco movimientos para descomprimir la zona más cargada por pantallas y estrés.",
    description:
      "La tensión emocional se acumula en cuello, trapecios y mandíbula. Esta secuencia toma 5 minutos y se puede hacer sentada/o en la silla de trabajo. Mejora la postura y previene cefaleas tensionales.",
    category: "postura",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🧘‍♀️",
    steps: [
      "Sentate erguida/o con los hombros relajados y los pies en el piso.",
      "Inclinación lateral: llevá la oreja derecha al hombro derecho 20 segundos. Cambiá de lado.",
      "Rotación: girá la cabeza lentamente a derecha mirando por encima del hombro 20 segundos. Cambiá de lado.",
      "Encogimientos: subí los hombros hacia las orejas, sostené 5 segundos y soltá. Repetí 5 veces.",
      "Círculos de hombros: 10 hacia atrás y 10 hacia adelante, con respiración tranquila.",
      "Apertura de pecho: entrelazá las manos detrás, abrí pecho y mantené 20 segundos."
    ],
    tips: [
      "No fuerces el movimiento; es estiramiento, no esfuerzo.",
      "Hacelo cada 90 minutos si trabajás muchas horas frente a pantalla.",
      "Acompañá con una respiración 4-6 (inhalo 4, exhalo 6)."
    ],
    benefits: [
      "Alivia tensión cervical.",
      "Mejora la postura sentada.",
      "Reduce dolores de cabeza por contractura."
    ],
    contraindications: "Si tenés hernia cervical o lesión activa, consultá con kinesiólogo/a antes de hacerlo.",
    tags: ["postura", "tension", "trabajo"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 50
  },
  {
    id: "ex-postura-montana",
    slug: "postura-de-la-montana",
    title: "Postura de la montaña",
    summary: "Tres minutos de pie para reorganizar la columna y bajar el ritmo del día.",
    description:
      "Esta postura se hace de pie, con poco esfuerzo, y enseña al cuerpo a sostenerse desde la verticalidad. Es la base de muchas prácticas de yoga y un excelente reset entre tareas.",
    category: "postura",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🏔️",
    steps: [
      "Pará/te con los pies separados al ancho de cadera, paralelos.",
      "Repartí el peso en talones y planta sintiendo la base.",
      "Aflojá las rodillas (sin bloquearlas) y activá suavemente los muslos.",
      "Crecé desde la coronilla, alargando la columna como si te subieran de un hilo.",
      "Hombros lejos de las orejas, brazos relajados al costado, palmas hacia adelante.",
      "Quedate 1-2 minutos respirando lento, sintiendo el cuerpo apoyado y firme."
    ],
    tips: [
      "Hacelo descalza/o si podés, para sentir mejor la base.",
      "Usalo cuando notes hombros tensos o el pecho cerrado.",
      "Sumalo al inicio o cierre del día como anclaje."
    ],
    benefits: [
      "Mejora la conciencia corporal.",
      "Realinea la columna.",
      "Funciona como pausa activa entre tareas."
    ],
    contraindications: "",
    tags: ["postura", "yoga", "presencia"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 60
  },
  {
    id: "ex-relajacion-progresiva",
    slug: "relajacion-muscular-progresiva",
    title: "Relajación muscular progresiva",
    summary: "Tensar y soltar grupos musculares para descargar el cuerpo de tensión acumulada.",
    description:
      "La técnica de Jacobson alterna contracciones suaves y soltadas conscientes en distintas zonas del cuerpo. Ayuda a notar dónde se aloja la tensión y enseña al sistema nervioso a soltar.",
    category: "relajacion",
    durationMinutes: 12,
    difficulty: "intermedio",
    emoji: "💆",
    steps: [
      "Acostate boca arriba en una superficie firme, con una almohada baja.",
      "Apretá los puños 5 segundos y soltá durante 10. Notá la diferencia.",
      "Tensá brazos llevando manos hacia hombros 5 segundos y soltá 10.",
      "Hombros: subilos a las orejas 5 y soltá 10.",
      "Cara: arrugá frente y cara 5 y soltá 10.",
      "Tronco: hundí el ombligo 5 y soltá 10.",
      "Piernas: estirá puntas de pies 5 y soltá 10.",
      "Termina haciendo 3 respiraciones profundas y quedando 1 minuto en quietud."
    ],
    tips: [
      "Hacelo en un horario tranquilo y sin pantallas alrededor.",
      "La clave está en la fase de soltar, no en la contracción.",
      "Si te dormís, es señal de que estaba acumulada la tensión: está bien."
    ],
    benefits: [
      "Reduce ansiedad e insomnio.",
      "Aumenta la conciencia corporal.",
      "Disminuye dolores musculares por estrés."
    ],
    contraindications:
      "Evitá tensar zonas con lesión, hernia o cirugía reciente. Si estás embarazada, evitá la fase de tensión abdominal.",
    tags: ["relajacion", "sueño", "estres"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 70
  },
  {
    id: "ex-body-scan",
    slug: "body-scan-5-minutos",
    title: "Body scan de 5 minutos",
    summary: "Recorrido atencional por el cuerpo, sin juzgar, para ganar presencia y calma.",
    description:
      "El body scan es la práctica fundamental del mindfulness. Llevás la atención por distintas zonas del cuerpo notando lo que aparezca: tensión, temperatura, hormigueo, nada. No se busca cambiar nada, solo observar.",
    category: "mindfulness",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🧘",
    steps: [
      "Sentate o acostate cómoda/o con los ojos cerrados o entreabiertos.",
      "Tomá 3 respiraciones lentas para llegar al momento.",
      "Llevá la atención a los pies. Notá cómo están: peso, temperatura, contacto.",
      "Subí lentamente: piernas, cadera, abdomen, pecho, espalda.",
      "Continuá por brazos, manos, cuello, cara y coronilla.",
      "Termina sintiendo el cuerpo entero como una unidad y abrí los ojos despacio."
    ],
    tips: [
      "Si te distraés, no te juzgues: volvé al cuerpo amablemente.",
      "Funciona mejor practicado todos los días, aunque sean 3 minutos.",
      "Podés acompañarlo con audios guiados si te resulta más fácil."
    ],
    benefits: [
      "Mejora la conciencia corporal.",
      "Reduce reactividad emocional.",
      "Es un puente excelente al sueño."
    ],
    contraindications: "",
    tags: ["mindfulness", "presencia", "atencion"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 80
  },
  {
    id: "ex-caminata-mindful",
    slug: "caminata-mindful",
    title: "Caminata mindful",
    summary: "Diez minutos de caminar con atención plena para ordenar la cabeza.",
    description:
      "Salir a caminar con atención cambia el día. La consigna es simple: caminar más lento de lo habitual prestando atención al cuerpo, los pasos y lo que aparece alrededor. Ideal para pausar entre tareas o iniciar el día.",
    category: "mindfulness",
    durationMinutes: 10,
    difficulty: "intermedio",
    emoji: "🚶",
    steps: [
      "Elegí un recorrido conocido y seguro, idealmente al aire libre.",
      "Empezá caminando un poco más lento que tu paso habitual.",
      "Notá el contacto del pie con el piso: talón, planta, dedos.",
      "Cada minuto, llevá la atención a un sentido distinto: vista, oído, tacto, olfato.",
      "Si aparecen pensamientos, etiquetalos como 'pensando' y volvé a los pasos.",
      "Termina con 3 respiraciones profundas y una nota mental de cómo te sentís."
    ],
    tips: [
      "No mires el celular durante el ejercicio.",
      "Si llueve o hace frío, podés hacerlo dentro de casa caminando lentamente.",
      "Es una excelente práctica entre dos reuniones intensas."
    ],
    benefits: [
      "Combina movimiento + presencia.",
      "Baja la rumiación.",
      "Mejora estado de ánimo y energía."
    ],
    contraindications: "Adecuá el ritmo si tenés alguna lesión articular o si estás cursando un cuadro físico.",
    tags: ["mindfulness", "movimiento", "rutina"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 90
  },
  {
    id: "ex-stretching-matutino",
    slug: "stretching-matutino",
    title: "Stretching matutino",
    summary: "Siete minutos para activar el cuerpo, mejorar postura y arrancar el día con energía.",
    description:
      "Una secuencia corta de estiramientos para hacer ni bien te levantás. Activa la circulación, despierta el sistema nervioso y prepara la postura para una jornada larga frente a pantallas o reuniones.",
    category: "movimiento",
    durationMinutes: 7,
    difficulty: "principiante",
    emoji: "☀️",
    steps: [
      "De pie, levantá los brazos al cielo y estirá todo el cuerpo durante 20 segundos.",
      "Inclinación adelante: relajá la cabeza y los brazos hacia el piso 30 segundos.",
      "Rotación de columna: con los pies separados, abrí los brazos y rotá tronco a un lado y al otro 30 segundos.",
      "Apertura de cadera: con piernas separadas, baja la mano derecha al pie derecho 20 segundos. Cambiá de lado.",
      "Estiramiento de cuádriceps: tomá un pie por detrás 20 segundos. Cambiá de lado.",
      "Cierre con 5 respiraciones profundas y un pequeño salto en el lugar para activar."
    ],
    tips: [
      "Hacelo descalza/o sobre una alfombra o mat.",
      "No es competencia: respetá tu rango de movimiento del día.",
      "Combinalo con un vaso de agua antes y después."
    ],
    benefits: [
      "Activa circulación.",
      "Mejora la postura del día.",
      "Sube energía sin necesidad de cafeína."
    ],
    contraindications:
      "Si tenés vértigo postural, evitá la inclinación profunda y reemplazala por estiramiento sentada/o.",
    tags: ["movimiento", "rutina", "energia"],
    status: "published",
    featured: false,
    publishedAt: TODAY,
    sortOrder: 100
  }
];
