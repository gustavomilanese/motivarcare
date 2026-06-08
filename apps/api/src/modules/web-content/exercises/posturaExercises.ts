import { buildExercise } from "./buildExercise.js";

export const POSTURA_EXERCISES = [
  buildExercise({
    id: "ex-postura-alineacion-sentado",
    slug: "alineacion-sentado",
    title: "Alineación consciente sentada",
    summary:
      "Reorganizá la columna en la silla en tres minutos para aliviar tensión de escritorio y mejorar la respiración.",
    description:
      "Pasamos muchas horas sentadas y el cuerpo se adapta a posiciones que comprimen la respiración y cargan la espalda. Este reset postural breve no corrige problemas estructurales, pero ayuda a recuperar una base más cómoda durante el día.",
    category: "postura",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🪑",
    steps: [
      "Sentate al fondo de la silla con los pies apoyados en el piso.",
      "Balanceá suavemente la pelvis hasta encontrar el punto medio (ni muy inclinada ni muy recta).",
      "Imaginá que la coronilla se eleva y la columna crece hacia arriba.",
      "Retirá los hombros de las orejas y abrí suavemente el pecho.",
      "Apoyá antebrazos o manos en el escritorio sin hundir la cabeza.",
      "Quedate 1 minuto respirando lento en esa posición."
    ],
    tips: [
      "Repetilo cada 60-90 minutos si trabajás frente a pantalla.",
      "Un cojín bajo en la zona lumbar puede ayudar, pero no reemplaza moverte.",
      "Combiná con estiramientos de cuello si sentís rigidez."
    ],
    benefits: [
      "Reduce fatiga postural al final del día.",
      "Mejora la capacidad de respirar profundo.",
      "Aumenta la conciencia de cómo te sentás."
    ],
    contraindications: "",
    tags: ["postura", "trabajo", "espalda"],
    featured: false,
    sortOrder: 210
  }),
  buildExercise({
    id: "ex-postura-hombros-redondos",
    slug: "correccion-hombros-redondos",
    title: "Corrección de hombros redondos",
    summary:
      "Movimientos suaves para abrir el pecho y contrarrestar la postura encorvada del día a día.",
    description:
      "Los hombros que se proyectan hacia adelante suelen acompañar estrés y muchas horas frente al celular. Esta secuencia corta estira la parte frontal del tórax y activa suavemente la espalda. Hacelo sin dolor ni forzar el rango.",
    category: "postura",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🔄",
    steps: [
      "Pará/te con los pies al ancho de cadera y rodillas suaves.",
      "Entrelazá las manos detrás de la espalda, palmas juntas si podés.",
      "Estirá los brazos hacia abajo y abrí el pecho mirando suavemente hacia arriba.",
      "Mantené 20 segundos respirando lento.",
      "Soltá y hacé 10 círculos de hombros hacia atrás.",
      "Repetí la apertura de pecho dos veces más.",
      "Cerrá con los brazos cruzados en un abrazo propio 15 segundos."
    ],
    tips: [
      "Si no podés entrelazar las manos, usá una toalla o banda elástica.",
      "No arquees la zona lumbar en exceso: el movimiento es del tórax.",
      "Ideal después de largas reuniones virtuales."
    ],
    benefits: [
      "Alivia tensión en pecho y hombros.",
      "Mejora sensación de apertura corporal.",
      "Complementa pausas activas en el trabajo."
    ],
    contraindications: "Evitá arqueos profundos si tenés dolor lumbar agudo o hernia discal reciente.",
    tags: ["postura", "hombros", "tension"],
    featured: false,
    sortOrder: 220
  }),
  buildExercise({
    id: "ex-postura-gato-vaca",
    slug: "postura-gato-vaca",
    title: "Gato-vaca en el piso",
    summary:
      "Movilizá la columna con flexiones suaves alternadas para soltar rigidez y conectar con la respiración.",
    description:
      "El gato-vaca es un clásico de yoga adaptado que mueve cada segmento de la espalda con amabilidad. Ayuda a despertar la columna después de estar mucho tiempo quieto/a. Si tenés lesión activa, mové menos y consultalo en sesión.",
    category: "postura",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🐱",
    steps: [
      "Colocáte en cuatro puntos: manos bajo hombros, rodillas bajo caderas.",
      "Al inhalar, arqueá suavemente la espalda bajando el abdomen (vaca).",
      "Al exhalar, redondeá la espalda llevando ombligo hacia adentro (gato).",
      "Mové la cabeza de forma natural con la columna, sin forzar.",
      "Repetí 8 a 10 ciclos lentos, sincronizados con la respiración.",
      "Terminá en posición neutra y sentí la espalda."
    ],
    tips: [
      "Mové poco al principio y ampliá el rango si se siente bien.",
      "Podés hacerlo sobre la cama si el piso es incómodo.",
      "Ideal como calentamiento antes de estirar cuello u hombros."
    ],
    benefits: [
      "Moviliza columna dorsal y lumbar.",
      "Conecta respiración y movimiento.",
      "Reduce sensación de rigidez matutina."
    ],
    contraindications: "Consultá con kinesiólogo/a si tenés hernia, ciática activa o dolor agudo al flexionar.",
    tags: ["postura", "yoga", "columna"],
    featured: false,
    sortOrder: 230
  }),
  buildExercise({
    id: "ex-postura-estiramiento-cadera-sentado",
    slug: "estiramiento-cadera-sentado",
    title: "Estiramiento de cadera sentada",
    summary:
      "Cuatro minutos para liberar flexores de cadera comprimidos por estar mucho tiempo sentada/o.",
    description:
      "La cadera acortada tira de la pelvis y afecta la postura de toda la columna. Este estiramiento suave se hace en la silla y ayuda a compensar el sedentarismo. No sustituye movimiento regular, pero es un buen complemento entre tareas.",
    category: "postura",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🦵",
    steps: [
      "Sentate al borde de una silla estable, con la espalda recta.",
      "Llevá el tobillo derecho sobre la rodilla izquierda formando un '4'.",
      "Presioná suavemente la rodilla derecha hacia abajo hasta sentir estiramiento leve.",
      "Inclinate levemente hacia adelante desde la cadera, no desde el cuello.",
      "Mantené 30 segundos y cambiá de lado.",
      "Repetí dos veces por pierna.",
      "Cerrá parándote y dando un paso largo adelante para estirar más."
    ],
    tips: [
      "El estiramiento debe ser leve: nunca doloroso.",
      "Si la rodilla molesta, apoyá el pie en el suelo en lugar del tobillo arriba.",
      "Hacelo después de reuniones largas sentada/o."
    ],
    benefits: [
      "Libera tensión en flexores de cadera.",
      "Mejora comodidad al sentarte.",
      "Contribuye a una pelvis más neutra."
    ],
    contraindications: "Evitá si tenés lesión de rodilla o cadera que empeore con flexión profunda.",
    tags: ["postura", "cadera", "oficina"],
    featured: false,
    sortOrder: 240
  }),
  buildExercise({
    id: "ex-postura-reset-pared",
    slug: "reset-postural-pared",
    title: "Reset postural contra la pared",
    summary:
      "Usá la pared como guía para alinear cabeza, hombros y pelvis y reeducar la postura de pie.",
    description:
      "La pared ofrece feedback táctil inmediato sobre cómo estás parada/o. Este ejercicio ayuda a notar hábitos posturales como la cabeza adelantada o los hombros caídos. Es una práctica de conciencia corporal, no un tratamiento ortopédico.",
    category: "postura",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🧱",
    steps: [
      "Pará/te con la espalda contra la pared, talones a unos centímetros.",
      "Llevá occipital, omóplatos y glúteos hacia la pared sin forzar.",
      "Mantené una curva natural en la zona lumbar (no la pegues del todo).",
      "Llevá la barbilla ligeramente hacia adentro, como un pequeño 'sí'.",
      "Separá los brazos de la pared en forma de 'T' y volvé a apoyarlos 5 veces.",
      "Quedate 1 minuto respirando en esa alineación.",
      "Alejate de la pared e intentá mantener la sensación unos segundos."
    ],
    tips: [
      "No presiones la cabeza: buscá contacto suave.",
      "Repetilo al inicio del día o después de mucho tiempo sentada/o.",
      "Podés hacerlo descalza/o para sentir mejor la base."
    ],
    benefits: [
      "Aumenta conciencia de la alineación vertical.",
      "Contrarresta postura de cabeza adelantada.",
      "Es rápido y no requiere equipamiento."
    ],
    contraindications: "",
    tags: ["postura", "alineacion", "conciencia"],
    featured: true,
    sortOrder: 250
  }),
  buildExercise({
    id: "ex-postura-apertura-pecho-puerta",
    slug: "apertura-pecho-puerta",
    title: "Apertura de pecho en marco de puerta",
    summary:
      "Estirá suavemente pectorales y hombros apoyando los antebrazos en un marco de puerta.",
    description:
      "Los músculos del pecho acortados tiran los hombros hacia adelante y pueden limitar la respiración. Este estiramiento clásico abre la parte frontal del tórax en pocos minutos. Ajustá la altura de los codos según tu comodidad.",
    category: "postura",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🚪",
    steps: [
      "Pará/te en el umbral de una puerta con los codos a la altura de los hombros.",
      "Apoyá antebrazos en el marco, codos flexionados a 90 grados.",
      "Dá un paso adelante hasta sentir estiramiento en pecho y brazos.",
      "Mantené 25 segundos respirando lento, sin arquear lumbar en exceso.",
      "Retrocedé, bajá los codos un poco y repetí.",
      "Hacé 3 repeticiones con distintas alturas de brazos.",
      "Cerrá con círculos suaves de hombros."
    ],
    tips: [
      "El estiramiento es leve a moderado, nunca doloroso.",
      "Podés hacer una sola mano a la vez si preferís menos intensidad.",
      "Excelente después de transportarte o cargar mochila."
    ],
    benefits: [
      "Estira pectorales y parte frontal del hombro.",
      "Facilita respiración más amplia.",
      "Complementa trabajo de escritorio."
    ],
    contraindications: "Evitá si tenés inestabilidad de hombro o dolor agudo al elevar los brazos.",
    tags: ["postura", "pecho", "estiramiento"],
    featured: false,
    sortOrder: 260
  }),
  buildExercise({
    id: "ex-postura-nino",
    slug: "postura-del-nino",
    title: "Postura del niño",
    summary:
      "Descansá la columna y los hombros en una posición fetal amplia que invita a soltar y respirar.",
    description:
      "La postura del niño (balasana) es un refugio corporal que muchas personas usan para pausar entre actividades. Comprime suavemente el abdomen y estira la espalda baja. Si te resulta incómoda en rodillas, usá almohadas de apoyo.",
    category: "postura",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🧒",
    steps: [
      "Arrodillate en un mat o superficie acolchada.",
      "Separá las rodillas al ancho de cadera o más si necesitás espacio.",
      "Llevá el torso hacia adelante y apoyá la frente en el piso o en un cojín.",
      "Extendé los brazos adelante o dejalos a los costados del cuerpo.",
      "Respirá lento sintiendo la espalda expandirse.",
      "Quedate 2 a 3 minutos, ajustando rodillas o cojines si hace falta.",
      "Salí despacio, subiendo vértebra por vértebra."
    ],
    tips: [
      "Poné un cojín entre glúteos y talones si las rodillas molestan.",
      "Separá más las rodillas si sentís presión en el abdomen.",
      "Ideal como pausa después de un momento emocional intenso."
    ],
    benefits: [
      "Descarga tensión en espalda y hombros.",
      "Invita a respiración abdominal.",
      "Funciona como pausa restaurativa breve."
    ],
    contraindications: "Evitá presión abdominal fuerte si estás embarazada o con molestias digestivas agudas.",
    tags: ["postura", "yoga", "descanso"],
    featured: false,
    sortOrder: 270
  }),
  buildExercise({
    id: "ex-postura-alineacion-pelvis",
    slug: "alineacion-pelvis",
    title: "Alineación consciente de pelvis",
    summary:
      "Explorá la inclinación de la pelvis de pie para encontrar un punto neutro que sostenga la columna.",
    description:
      "Muchas molestias lumbares se relacionan con cómo llevamos la pelvis al caminar o pararnos. Este ejercicio de exploración te ayuda a sentir la diferencia entre inclinar hacia adelante, hacia atrás y el punto medio. Es educación corporal, no diagnóstico.",
    category: "postura",
    durationMinutes: 4,
    difficulty: "intermedio",
    emoji: "⚖️",
    steps: [
      "Pará/te descalza/o con los pies al ancho de cadera.",
      "Incliná la pelvis hacia adelante arqueando lumbar (lordosis). Notá la sensación.",
      "Incliná la pelvis hacia atrás aplanando lumbar. Notá la diferencia.",
      "Buscá el punto intermedio donde la columna se siente larga y cómoda.",
      "Mantené ese punto neutro 30 segundos respirando lento.",
      "Caminá 10 pasos intentando conservar esa sensación.",
      "Repetí el ciclo de exploración dos veces más."
    ],
    tips: [
      "Imaginá la pelvis como un cuenco de agua que no derrama.",
      "No bloquees las rodillas: mantenelas suaves.",
      "Practicá frente a un espejo lateral si querés más feedback."
    ],
    benefits: [
      "Mejora conciencia lumbo-pélvica.",
      "Ayuda a distribuir mejor el peso al pararte.",
      "Complementa otros ejercicios de postura."
    ],
    contraindications: "Si tenés dolor lumbar agudo, mové menos y consultalo con tu profesional de salud.",
    tags: ["postura", "pelvis", "conciencia"],
    featured: false,
    sortOrder: 280
  })
];
