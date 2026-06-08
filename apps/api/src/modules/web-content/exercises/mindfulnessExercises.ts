import { buildExercise } from "./buildExercise.js";

export const MINDFULNESS_EXERCISES = [
  buildExercise({
    id: "ex-mindfulness-respiracion-3-min",
    slug: "atencion-respiracion-3-min",
    title: "Atención a la respiración (3 min)",
    summary:
      "Observá el flujo natural del aire en nariz o pecho durante tres minutos, sin cambiar el ritmo.",
    description:
      "La meditación de respiración es la puerta de entrada al mindfulness. No buscás respirar 'mejor': solo notar. Cuando la mente se vaya, volvé al aire como quien vuelve a casa. Es práctica, no perfección.",
    category: "mindfulness",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🌬️",
    steps: [
      "Sentate cómoda/o con espalda autónoma, no rígida.",
      "Cerrá los ojos o bajá la mirada.",
      "Llevá la atención a la entrada y salida del aire en las fosas nasales.",
      "Notá temperatura, ritmo y pausas sin modificar nada.",
      "Cuando aparezca un pensamiento, etiquetalo 'pensando' y volvé al aire.",
      "Continuá 3 minutos (podés usar un timer suave).",
      "Abrí los ojos despacio y notá cómo te sentís."
    ],
    tips: [
      "Empezá con 1 minuto si 3 te resulta largo.",
      "Practicá a la misma hora para crear hábito.",
      "No te juzgues por distraerte: es parte del ejercicio."
    ],
    benefits: [
      "Entrena atención plena básica.",
      "Reduce reactividad momentánea.",
      "Base para prácticas más largas."
    ],
    contraindications: "",
    tags: ["mindfulness", "respiracion", "basico"],
    featured: false,
    sortOrder: 610
  }),
  buildExercise({
    id: "ex-mindfulness-pensamientos-nubes",
    slug: "observar-pensamientos-nubes",
    title: "Observar pensamientos como nubes",
    summary:
      "Dejá que los pensamientos pasen como nubes en el cielo, sin aferrarte ni empujarlos.",
    description:
      "Esta metáfora ayuda a ganar distancia de pensamientos automáticos sin luchar contra ellos. No elimina pensamientos difíciles, pero cambia la relación con ellos. Es mindfulness cognitivo de baja intensidad.",
    category: "mindfulness",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "☁️",
    steps: [
      "Sentate cómoda/o y respirá lento tres veces.",
      "Imaginá un cielo amplio en tu mente.",
      "Cuando aparezca un pensamiento, colocalo en una nube.",
      "Observá la nube moverse y alejarse sin seguirla.",
      "Si te enganchás con un pensamiento, volvé amablemente al cielo.",
      "Practicá 4 a 5 minutos.",
      "Cerrá notando el contacto de tu cuerpo con la silla o piso."
    ],
    tips: [
      "Pensamientos recurrentes pueden volver: es normal.",
      "No analices el contenido del pensamiento durante el ejercicio.",
      "Útil cuando hay rumiación leve."
    ],
    benefits: [
      "Reduce fusión con pensamientos.",
      "Fomenta actitud de observación.",
      "Complementa terapia cognitiva."
    ],
    contraindications: "Si los pensamientos son muy intrusivos o traumáticos, practicá con guía de tu terapeuta.",
    tags: ["rumiacion", "mindfulness", "cognitivo"],
    featured: false,
    sortOrder: 620
  }),
  buildExercise({
    id: "ex-mindfulness-comer-bocado",
    slug: "mindful-comer-bocado",
    title: "Comer un bocado con atención plena",
    summary:
      "Comé un solo bocado muy lento notando textura, sabor, olor y sensación en la boca.",
    description:
      "El mindful eating enseña a relacionarse distinto con la comida y con la prisa del día. Un solo bocado alcanza para entrenar atención. No es dieta ni recomendación nutricional: es práctica de presencia.",
    category: "mindfulness",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🍇",
    steps: [
      "Elegí un bocado pequeño: uva, trozo de fruta, nuez, lo que tengas.",
      "Miralo: color, forma, textura externa.",
      "Olfatealo antes de llevarlo a la boca.",
      "Colocalo en la boca sin morder todavía; notá salivación.",
      "Masticá muy lento notando cambios de textura y sabor.",
      "Tragá consciente y notá lo que queda de sensación.",
      "Pausá antes del siguiente bocado."
    ],
    tips: [
      "Silenciá pantallas durante el ejercicio.",
      "Probá con chocolate amargo: el sabor cambia con la lentitud.",
      "Extendé la práctica a toda una comida cuando te sientas listo/a."
    ],
    benefits: [
      "Mejora relación con señales de hambre y saciedad.",
      "Contrarresta comer en automático.",
      "Práctica sensorial accesible."
    ],
    contraindications: "Evitá si tenés conductas alimentarias activas que se agraven con foco en comida; consultá con tu equipo.",
    tags: ["mindfulness", "sensorial", "rutina"],
    featured: false,
    sortOrder: 630
  }),
  buildExercise({
    id: "ex-mindfulness-pausa-sabrosa",
    slug: "pausa-sabrosa",
    title: "Pausa sabrosa (S.T.O.P.)",
    summary:
      "Pará, respirá, observá y procedé: cuatro pasos para insertar presencia antes de reaccionar.",
    description:
      "S.T.O.P. es un acrónimo clásico de mindfulness en la vida diaria. Sirve antes de responder un mensaje difícil, levantarte de la silla o entrar a una reunión. Es breve y no requiere meditar sentada/o largo rato.",
    category: "mindfulness",
    durationMinutes: 2,
    difficulty: "principiante",
    emoji: "🛑",
    steps: [
      "S — Pará lo que estés haciendo un instante.",
      "T — Tomá una respiración profunda y soltala lento.",
      "O — Observá cuerpo, emociones y pensamientos sin juzgar.",
      "P — Procedé eligiendo conscientemente el siguiente paso.",
      "Repetí el ciclo si todavía sentís urgencia.",
      "Opcional: anotá qué elegiste hacer distinto gracias a la pausa."
    ],
    tips: [
      "Poné un recordatorio visual (post-it) en el escritorio.",
      "La O no es analizar: es notar en una frase.",
      "Usalo antes de enviar mensajes enojados."
    ],
    benefits: [
      "Inserta espacio entre estímulo y respuesta.",
      "Reduce impulsividad emocional.",
      "Formato memorable de 4 letras."
    ],
    contraindications: "",
    tags: ["mindfulness", "rapido", "vida-cotidiana"],
    featured: true,
    sortOrder: 640
  }),
  buildExercise({
    id: "ex-mindfulness-escucha-atenta",
    slug: "escucha-atenta",
    title: "Escucha atenta de sonidos",
    summary:
      "Cerrá los ojos y mapeá sonidos cercanos, medios y lejanos durante cinco minutos de presencia.",
    description:
      "La escucha mindful entrena atención sin depender de la respiración, útil si la respiración te genera ansiedad. Notás capas de sonido que habitualmente filtrás. Podés hacerlo en casa, parque o transporte.",
    category: "mindfulness",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "👂",
    steps: [
      "Sentate cómoda/o y cerrá los ojos o bajá la mirada.",
      "Tomá tres respiraciones para llegar al momento.",
      "Detectá sonidos cercanos: respiración, ropa, tic-tac.",
      "Ampliá a sonidos a distancia media: electrodomésticos, voces lejanas.",
      "Incluí sonidos lejanos: tráfico, pájaros, viento.",
      "Alterná entre capas sin etiquetar 'bueno' o 'malo'.",
      "Abrí los ojos y notá el silencio relativo que queda."
    ],
    tips: [
      "Usá auriculares solo si no aíslan del entorno que querés observar.",
      "En la calle, mantené seguridad: no cerrés los ojos si hay riesgo.",
      "Repetí en distintos entornos para ampliar la práctica."
    ],
    benefits: [
      "Alternativa a meditación respiratoria.",
      "Mejora capacidad de escucha en conversaciones.",
      "Ancla al presente sensorial."
    ],
    contraindications: "",
    tags: ["mindfulness", "sensorial", "atencion"],
    featured: false,
    sortOrder: 650
  }),
  buildExercise({
    id: "ex-mindfulness-gratitud-breve",
    slug: "gratitud-breve",
    title: "Gratitud mindful de tres ítems",
    summary:
      "Nombrá tres cosas concretas del día por las que sentís gratitud, con atención plena y sin forzar.",
    description:
      "La gratitud mindful no es negar dificultades: es ampliar el foco para incluir también lo que vale la pena. Elegí cosas pequeñas y reales. Si un día cuesta, está bien nombrar una sola.",
    category: "mindfulness",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🙏",
    steps: [
      "Al final del día, sentate 2 minutos sin pantallas.",
      "Respirá lento y preguntate: ¿Qué tres cosas agradecés hoy?",
      "Pueden ser simples: una taza de café, un mensaje amable, sol en la ventana.",
      "Por cada ítem, notá la sensación en el cuerpo al recordarlo.",
      "Decilas en voz alta o escribilas en un cuaderno.",
      "Cerrá con una respiración profunda.",
      "Opcional: repetí la práctica a la misma hora cada noche."
    ],
    tips: [
      "Evitá repetir siempre lo mismo: buscá detalle nuevo.",
      "No uses gratitud para invalidar dolor ('debería estar agradecida/o').",
      "Compartí un ítem con alguien de confianza si te ayuda."
    ],
    benefits: [
      "Amplía perspectiva más allá de lo negativo.",
      "Refuerza hábito de pausa vespertina.",
      "Mejora bienestar subjetivo con práctica regular."
    ],
    contraindications: "",
    tags: ["gratitud", "rutina", "bienestar"],
    featured: false,
    sortOrder: 660
  }),
  buildExercise({
    id: "ex-mindfulness-emociones",
    slug: "mindfulness-emociones",
    title: "Mindfulness de emociones",
    summary:
      "Identificá la emoción presente, ubicála en el cuerpo y observala con curiosidad amable.",
    description:
      "Este ejercicio invita a sentir emociones sin actuar ni reprimir de inmediato. Nombrar y ubicar en el cuerpo puede bajar intensidad. No reemplaza procesamiento terapéutico de emociones complejas.",
    category: "mindfulness",
    durationMinutes: 6,
    difficulty: "intermedio",
    emoji: "💭",
    steps: [
      "Sentate en un lugar tranquilo y respirá lento.",
      "Preguntate: ¿Qué emoción está más presente ahora?",
      "Nombrala con la mayor precisión posible (no solo 'mal').",
      "Buscá dónde la sentís en el cuerpo: pecho, estómago, garganta.",
      "Observá textura, temperatura, intensidad sin cambiar nada.",
      "Decí internamente: 'Puedo hacer espacio para esto'.",
      "Quedate 4 a 5 minutos; luego elegí un paso de cuidado concreto."
    ],
    tips: [
      "Si la emoción es abrumadora, volvé a grounding antes.",
      "No analices el origen durante el ejercicio: solo observá.",
      "Practicá primero con emociones leves."
    ],
    benefits: [
      "Mejora inteligencia emocional.",
      "Reduce impulsos de evitar o reprimir.",
      "Complementa trabajo terapéutico."
    ],
    contraindications: "Si sentís desbordamiento o flashbacks, interrumpí y buscá apoyo de tu terapeuta o red de contención.",
    tags: ["emociones", "mindfulness", "regulacion"],
    featured: false,
    sortOrder: 670
  }),
  buildExercise({
    id: "ex-mindfulness-lavado-manos",
    slug: "mindful-lavado-manos",
    title: "Lavado de manos consciente",
    summary:
      "Transformá el lavado de manos en una práctica de 2 minutos de atención plena al agua y al tacto.",
    description:
      "Rutinas diarias son oportunidades de mindfulness. El lavado de manos consciente ancla al presente usando agua, jabón y temperatura. Ya lo tenés integrado al día: solo falta prestar atención.",
    category: "mindfulness",
    durationMinutes: 2,
    difficulty: "principiante",
    emoji: "🧼",
    steps: [
      "Acercate al lavabo y respirá una vez antes de abrir la canilla.",
      "Notá la temperatura del agua al mojar las manos.",
      "Aplicá jabón y masajeá palmas, dorso, entre dedos, muñecas.",
      "Observá espuma, olor y sonido del agua.",
      "Enjuagá lento sintiendo el agua correr.",
      "Secá con toalla notando textura y presión.",
      "Mirá tus manos un segundo antes de seguir con el día."
    ],
    tips: [
      "Hacelo cada lavado de manos o al menos 2 veces al día.",
      "Silenciá el celular si está cerca.",
      "Ideal como ancla entre actividades."
    ],
    benefits: [
      "Integra mindfulness en hábitos existentes.",
      "No requiere tiempo extra en agenda.",
      "Refuerza pausa breve muchas veces al día."
    ],
    contraindications: "",
    tags: ["mindfulness", "rutina", "vida-cotidiana"],
    featured: false,
    sortOrder: 680
  })
];
