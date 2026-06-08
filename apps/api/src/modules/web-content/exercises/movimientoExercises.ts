import { buildExercise } from "./buildExercise.js";

export const MOVIMIENTO_EXERCISES = [
  buildExercise({
    id: "ex-movimiento-pausa-activa",
    slug: "pausa-activa-3-min",
    title: "Pausa activa de 3 minutos",
    summary:
      "Intercalá estiramiento, respiración y movimiento suave para resetear el cuerpo entre bloques de trabajo.",
    description:
      "El cuerpo necesita micro-pausas cuando estamos mucho tiempo en la misma posición. Esta secuencia corta combina lo esencial: mover columnas, hombros y piernas, más unas respiraciones. Es bienestar laboral, no entrenamiento físico intenso.",
    category: "movimiento",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "⏱️",
    steps: [
      "Pará/te lejos del escritorio con los pies al ancho de cadera.",
      "Estirá los brazos al cielo y estirá todo el cuerpo 15 segundos.",
      "Girá suavemente el tronco a derecha e izquierda, 5 veces cada lado.",
      "Hacé 10 sentadillas parciales (bajá poco) o marchá en el lugar 30 segundos.",
      "Balanceá los brazos cruzados abrazándote y soltá.",
      "Terminá con 3 respiraciones profundas y volvé a tu tarea."
    ],
    tips: [
      "Programá un recordatorio cada 90 minutos.",
      "No necesitás cambiarte de ropa ni sudar.",
      "Si trabajás en casa, caminá hasta otra habitación entre pausas."
    ],
    benefits: [
      "Reduce rigidez por sedentarismo.",
      "Mejora energía y concentración.",
      "Previene tensión acumulada."
    ],
    contraindications: "Adaptá sentadillas si tenés dolor de rodilla; reemplazá por marcha en el lugar.",
    tags: ["trabajo", "pausa", "energia"],
    featured: false,
    sortOrder: 410
  }),
  buildExercise({
    id: "ex-movimiento-circulos-cadera",
    slug: "movimiento-cadera-circulos",
    title: "Círculos de cadera",
    summary:
      "Movilizá la cadera con círculos amplios de pie para liberar tensión lumbar y mejorar la circulación.",
    description:
      "La cadera es un centro de movimiento que se estanca cuando estamos sentadas. Los círculos suaves en ambas direcciones lubrican la articulación y despiertan la zona. Hacelo con rodillas flexionadas y sin forzar.",
    category: "movimiento",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "⭕",
    steps: [
      "Pará/te con los pies al ancho de cadera y manos en la cintura.",
      "Flexioná un poco las rodillas y relajá los hombros.",
      "Hacé 8 círculos de cadera hacia la derecha, amplios pero cómodos.",
      "Repetí 8 círculos hacia la izquierda.",
      "Opcional: separá más los pies y repetí el ciclo.",
      "Cerrá con balanceo suave de piernas alternadas 20 segundos."
    ],
    tips: [
      "Imaginá que movés un hula hoop con la cadera.",
      "Mantené el torso relativamente quieto: el movimiento es de cadera.",
      "Ideal al levantarte o después de viajar sentada/o."
    ],
    benefits: [
      "Moviliza cadera y zona lumbar.",
      "Activa circulación en piernas.",
      "Toma pocos minutos."
    ],
    contraindications: "Evitá amplitud excesiva si tenés dolor de cadera o cirugía reciente.",
    tags: ["cadera", "movilidad", "rutina"],
    featured: false,
    sortOrder: 420
  }),
  buildExercise({
    id: "ex-movimiento-estiramiento-munecas",
    slug: "estiramiento-munecas",
    title: "Estiramiento de muñecas y manos",
    summary:
      "Soltá tensión de teclado y celular con estiramientos suaves para muñecas, dedos y antebrazos.",
    description:
      "Las manos acumulan estrés cuando escribimos o scrolleamos horas. Esta rutina breve previene rigidez y te invita a pausar. Si tenés síndrome del túnel o tendinitis, consultá con tu profesional antes de intensificar.",
    category: "movimiento",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "✋",
    steps: [
      "Extendé un brazo al frente con la palma hacia arriba.",
      "Con la otra mano, llevá suavemente los dedos hacia abajo 20 segundos.",
      "Girá la palma hacia abajo y repetí el estiramiento 20 segundos.",
      "Hacé círculos con las muñecas, 10 en cada dirección.",
      "Abri y cerrá los puños 10 veces, luego estirá los dedos como abanico.",
      "Repetí con el otro brazo.",
      "Masajeá suavemente la base del pulgar con la yema del otro dedo."
    ],
    tips: [
      "Hacelo cada 2 horas si trabajás mucho con teclado.",
      "El estiramiento es suave: no debe doler.",
      "Combiná con mirar a lo lejos para descansar también la vista."
    ],
    benefits: [
      "Alivia tensión en manos y antebrazos.",
      "Mejora comodidad al escribir.",
      "Refuerza el hábito de micro-pausas."
    ],
    contraindications: "Consultá si tenés dolor agudo, entumecimiento o diagnóstico de túnel carpiano.",
    tags: ["trabajo", "manos", "estiramiento"],
    featured: false,
    sortOrder: 430
  }),
  buildExercise({
    id: "ex-movimiento-caminata-en-el-lugar",
    slug: "caminata-en-el-lugar",
    title: "Caminata en el lugar",
    summary:
      "Elevá rodillas suavemente o caminá en el lugar dos minutos para activar el cuerpo sin salir de casa.",
    description:
      "Cuando no podés salir a caminar, moverte en el lugar ayuda a cambiar el estado anímico y despertar el cuerpo. No es cardio intenso: buscá un ritmo cómodo que te permita respirar por la nariz.",
    category: "movimiento",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "👟",
    steps: [
      "Ubicate en un espacio libre de obstáculos.",
      "Empezá caminando en el lugar a ritmo suave.",
      "Opcional: elevá un poco las rodillas alternadas.",
      "Mové los brazos de forma natural, sin tensar hombros.",
      "Mantené el ritmo 2 a 3 minutos.",
      "Bajá la intensidad gradualmente los últimos 30 segundos.",
      "Cerrá con estiramiento de pantorrillas: apoyá el talón adelante y flexioná."
    ],
    tips: [
      "Usá música con buen ritmo si te motiva.",
      "Descalza/o sobre alfombra reduce impacto.",
      "Ideal entre reuniones virtuales consecutivas."
    ],
    benefits: [
      "Sube energía sin equipamiento.",
      "Mejora circulación.",
      "Rompe sedentarismo prolongado."
    ],
    contraindications: "Reducí intensidad si tenés problemas de rodilla, tobillo o presión no controlada.",
    tags: ["energia", "casa", "rapido"],
    featured: false,
    sortOrder: 440
  }),
  buildExercise({
    id: "ex-movimiento-movilidad-columna",
    slug: "secuencia-movilidad-columna",
    title: "Secuencia de movilidad de columna",
    summary:
      "Combiná rotaciones, flexiones laterales y extensiones suaves para despertar toda la espalda en cinco minutos.",
    description:
      "Esta secuencia integra movimientos en distintos planos para que la columna no se quede rígida. Está pensada para el día a día, no para atletas. Mové dentro de tu rango cómodo y consultá en sesión si tenés dolor persistente.",
    category: "movimiento",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "🌀",
    steps: [
      "Calentá con 5 círculos de hombros hacia atrás.",
      "Flexión lateral: brazo derecho arriba, inclinate a la izquierda 20 seg. Cambiá.",
      "Rotación sentada o de pie: girá tronco a cada lado 20 segundos.",
      "Gato-vaca en el piso o sobre la silla: 6 ciclos lentos.",
      "Extensión suave: manos en caderas, mirá al techo sin forzar cuello 15 segundos.",
      "Cerrá con inclinación adelante relajada, brazos colgando 30 segundos."
    ],
    tips: [
      "Sincronizá con respiración cuando puedas.",
      "Mejor por la mañana o después de estar mucho sentada/o.",
      "Evitá rebotes o movimientos bruscos."
    ],
    benefits: [
      "Moviliza columna en varios planos.",
      "Reduce sensación de 'espalda trabada'.",
      "Prepara el cuerpo para el día."
    ],
    contraindications: "Consultá con kinesiólogo/a si tenés hernia, escoliosis dolorosa o cirugía reciente.",
    tags: ["columna", "movilidad", "rutina"],
    featured: true,
    sortOrder: 450
  }),
  buildExercise({
    id: "ex-movimiento-liberacion-mandibula",
    slug: "liberacion-mandibula",
    title: "Liberación de mandíbula y rostro",
    summary:
      "Masaje y movimientos suaves para soltar la tensión que muchas personas acumulan en mandíbula y frente.",
    description:
      "Apretar la mandíbula es una respuesta común al estrés y puede generar dolor de cabeza tensional. Este ejercicio combina autocuidado facial con respiración. No reemplaza tratamiento odontológico si tenés bruxismo severo.",
    category: "movimiento",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "😌",
    steps: [
      "Sentate cómoda/o y relajá hombros y lengua (que descanse en el paladar).",
      "Masajeá círculos suaves en las mejillas, cerca del maxilar, 30 segundos.",
      "Abrí la boca lentamente y cerrá sin chasquidos, 5 repeticiones.",
      "Mové la mandíbula suavemente a derecha e izquierda, sin forzar.",
      "Frotá sienes con yemas de dedos en círculos pequeños 20 segundos.",
      "Fruncí la frente y soltá 3 veces; luego relajá todo el rostro.",
      "Cerrá con 3 respiraciones por la nariz."
    ],
    tips: [
      "Hacelo antes de dormir si tendés a apretar de noche.",
      "Evitá chicle o alimentos duros si ya tenés mandíbula cargada.",
      "Notá si apretás durante el día y soltá conscientemente."
    ],
    benefits: [
      "Reduce tensión facial y mandibular.",
      "Puede aliviar cefaleas leves por contractura.",
      "Aumenta conciencia del hábito de apretar."
    ],
    contraindications: "Consultá con odontólogo/a si tenés dolor articular TMJ, bloqueos o chasquidos dolorosos.",
    tags: ["tension", "cara", "estres"],
    featured: false,
    sortOrder: 460
  }),
  buildExercise({
    id: "ex-movimiento-balanceo-piernas",
    slug: "balanceo-piernas",
    title: "Balanceo de piernas de pie",
    summary:
      "Balanceá cada pierna adelante y atrás sujetándote si hace falta para activar cadera y estabilizar.",
    description:
      "El balanceo libre de piernas despierta flexores y extensores sin impacto. Es un clásico de calentamiento adaptado al día a día. Sujetate a una pared o silla si el equilibrio es inestable.",
    category: "movimiento",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🦿",
    steps: [
      "Pará/te junto a una pared o silla para apoyo opcional.",
      "Balanceá la pierna derecha adelante y atrás 10 veces, movimiento controlado.",
      "Repetí con la pierna izquierda.",
      "Opcional: balanceo lateral (pierna hacia afuera) 8 veces por lado.",
      "Mantené el torso erguido y mirada al frente.",
      "Cerrá con marcha en el lugar 30 segundos."
    ],
    tips: [
      "El movimiento es suave, no pateo.",
      "No arquees la espalda al balancear atrás.",
      "Ideal al levantarte de la silla después de horas."
    ],
    benefits: [
      "Activa cadera y piernas.",
      "Mejora equilibrio leve.",
      "Bajo impacto y accesible."
    ],
    contraindications: "Usá apoyo firme si tenés vértigo o riesgo de caídas.",
    tags: ["piernas", "equilibrio", "activacion"],
    featured: false,
    sortOrder: 470
  }),
  buildExercise({
    id: "ex-movimiento-hombros-pared",
    slug: "movimiento-hombros-pared",
    title: "Deslizamiento de hombros en pared",
    summary:
      "Deslizá los brazos por la pared en forma de 'W' para activar espalda alta y corregir hombros caídos.",
    description:
      "Este ejercicio de movilidad escapular fortalece suavemente la zona entre omóplatos. Muchas personas con postura de escritorio lo encuentran útil. Si sentís dolor agudo, reducí el rango o consultá con kinesiólogo/a.",
    category: "movimiento",
    durationMinutes: 4,
    difficulty: "intermedio",
    emoji: "🤚",
    steps: [
      "Pará/te con la espalda contra la pared, pies un paso adelante.",
      "Llevá los brazos en 'W': codos flexionados, dorso de manos contra la pared.",
      "Deslizá los brazos hacia arriba manteniendo contacto con la pared.",
      "Subí hasta donde puedas sin perder contacto ni arquear lumbar.",
      "Bajá lento a la posición inicial.",
      "Repetí 8 a 10 veces respirando continuo.",
      "Cerrá con hombros hacia atrás y abajo, suave."
    ],
    tips: [
      "La cabeza y glúteos pueden mantener contacto ligero con la pared.",
      "Mejor sin zapatillas si resbalás.",
      "Combiná con apertura de pecho en puerta."
    ],
    benefits: [
      "Activa músculos de la espalda alta.",
      "Mejora movilidad escapular.",
      "Complementa trabajo postural."
    ],
    contraindications: "Evitá si tenés dolor de hombro al elevar brazos o inestabilidad articular.",
    tags: ["hombros", "espalda", "postura"],
    featured: false,
    sortOrder: 480
  }),
  buildExercise({
    id: "ex-movimiento-saludo-sol-simplificado",
    slug: "saludo-al-sol-simplificado",
    title: "Saludo al sol simplificado",
    summary:
      "Secuencia corta de yoga en pie para conectar respiración, estiramiento y energía al empezar el día.",
    description:
      "Versión reducida del saludo al sol, accesible para principiantes. Combina flexión, extensión y respiración en un flujo lento. No es una práctica espiritual obligatoria: usala como movimiento consciente y amable con tu cuerpo.",
    category: "movimiento",
    durationMinutes: 6,
    difficulty: "intermedio",
    emoji: "☀️",
    steps: [
      "Pará/te al inicio del mat, manos en oración al pecho, 1 respiración.",
      "Inhalá y elevá los brazos; exhalá e inclinate adelante suave hacia las piernas.",
      "Inhalá, llevá manos a espinillas y alargá espalda; exhala y flexioná de nuevo.",
      "Paso atrás con una pierna (zancada baja) o rodillas al piso si preferís.",
      "Inclinación atrás suave o cobra baja en el piso, según tu comodidad.",
      "Volvé atrás, flexioná adelante e inhalá subiendo brazos.",
      "Repetí el ciclo 3 veces, alternando pierna atrás."
    ],
    tips: [
      "Modificá con rodillas flexionadas en flexiones.",
      "Priorizá respiración sobre velocidad.",
      "Evitá el paso atrás si no tenés espacio; quedate en flexión simple."
    ],
    benefits: [
      "Integra cuerpo entero en pocos minutos.",
      "Combina movimiento y respiración.",
      "Energiza sin equipamiento."
    ],
    contraindications:
      "Evitá extensiones profundas de columna si tenés hernia o presión ocular elevada; consultá con tu médico/a.",
    tags: ["yoga", "rutina", "energia"],
    featured: false,
    sortOrder: 490
  })
];
