import { buildExercise } from "./buildExercise.js";

export const RELAJACION_EXERCISES = [
  buildExercise({
    id: "ex-relajacion-respiracion-visualizada",
    slug: "respiracion-visualizada",
    title: "Respiración con visualización de luz",
    summary:
      "Imaginá una luz cálida que entra al inhalar y se lleva tensión al exhalar, en un ciclo de calma guiada.",
    description:
      "La visualización combina respiración lenta con una imagen interna reconfortante. No necesitás 'ver' la luz con claridad: alcanza con la sensación de calidez o expansión. Es una herramienta de relajación, no hipnosis terapéutica.",
    category: "relajacion",
    durationMinutes: 6,
    difficulty: "principiante",
    emoji: "✨",
    steps: [
      "Acostate o sentate cómoda/o con los ojos cerrados o mirada baja.",
      "Tomá tres respiraciones naturales para llegar al momento.",
      "Al inhalar, imaginá luz cálida entrando por la coronilla hacia el pecho.",
      "Al exhalar, imaginá que la luz baja por brazos y piernas llevándose tensión.",
      "Repetí el ciclo durante 5 minutos, sin forzar la imagen.",
      "Si te distraés, volvé amablemente a la luz y la respiración.",
      "Abrí los ojos despacio y mové dedos y tobillos antes de levantarte."
    ],
    tips: [
      "Elegí un color que te resulte reconfortante: dorado, azul suave, verde.",
      "Funciona bien con audios de fondo muy suaves o silencio.",
      "No te juzgues si la imagen cambia o se difumina."
    ],
    benefits: [
      "Combina relajación respiratoria e imaginativa.",
      "Facilita transición hacia el sueño.",
      "Reduce sensación de peso en el cuerpo."
    ],
    contraindications: "",
    tags: ["visualizacion", "calma", "sueño"],
    featured: false,
    sortOrder: 510
  }),
  buildExercise({
    id: "ex-relajacion-lugar-seguro",
    slug: "lugar-seguro-guiado",
    title: "Visualización de lugar seguro",
    summary:
      "Creá o recordá un lugar real o imaginario donde te sientas protegida/o y descansá ahí unos minutos.",
    description:
      "El lugar seguro es una técnica clásica de estabilización emocional. Puede ser una playa, un rincón de tu casa o un escenario inventado. El objetivo es activar sensaciones de calma y refugio, no escapar permanentemente de la realidad.",
    category: "relajacion",
    durationMinutes: 8,
    difficulty: "intermedio",
    emoji: "🏡",
    steps: [
      "Sentate o acostate en un espacio donde no te interrumpan.",
      "Cerrá los ojos y respirá lento tres veces.",
      "Imaginá un lugar donde te sientas segura/o: detallá colores, sonidos, olores.",
      "Notá la temperatura del aire y cómo se siente el suelo o asiento bajo vos.",
      "Permanecé en ese lugar 5 a 7 minutos, solo observando.",
      "Antes de salir, guardá una 'foto mental' del lugar para volver cuando lo necesites.",
      "Volvé al presente abriendo los ojos y nombrando tres cosas del cuarto actual."
    ],
    tips: [
      "Elegí un lugar sin personas conflictivas en el recuerdo.",
      "Podés escribir una descripción corta para reforzar la imagen.",
      "Si aparece incomodidad, abrí los ojos y probá otro lugar."
    ],
    benefits: [
      "Refugio mental en momentos difíciles.",
      "Reduce activación del sistema de alarma.",
      "Complementa trabajo terapéutico de regulación."
    ],
    contraindications:
      "Si tenés flashbacks o trauma complejo, practicá primero con acompañamiento de tu terapeuta.",
    tags: ["visualizacion", "seguridad", "estabilizacion"],
    featured: true,
    sortOrder: 520
  }),
  buildExercise({
    id: "ex-relajacion-manos",
    slug: "relajacion-manos",
    title: "Relajación consciente de manos",
    summary:
      "Tensá y soltá manos y antebrazos de forma progresiva para descargar estrés acumulado en extremidades.",
    description:
      "Mini versión de relajación muscular focalizada en manos, donde muchas personas acumulan tensión al escribir o preocuparse. Es rápida y podés hacerla en la silla de trabajo sin que se note demasiado.",
    category: "relajacion",
    durationMinutes: 4,
    difficulty: "principiante",
    emoji: "🤲",
    steps: [
      "Apoyá antebrazos en el escritorio o muslos, palmas hacia arriba.",
      "Apretá los puños con fuerza moderada 5 segundos.",
      "Soltá de golpe y notá la diferencia durante 10 segundos.",
      "Repetí 3 veces, respirando lento.",
      "Estirá los dedos al máximo y soltá 3 veces.",
      "Masajeá la palma con el pulgar de la otra mano 30 segundos cada una.",
      "Sacudí suavemente las manos y dejalas relajadas."
    ],
    tips: [
      "La fase de soltar es más importante que la de tensar.",
      "Hacelo antes de dormir si te quedás con las manos rígidas.",
      "Combiná con relajación de hombros si tenés tiempo."
    ],
    benefits: [
      "Libera tensión localizada rápidamente.",
      "Aumenta conciencia de apretar sin notarlo.",
      "Discreto en entornos laborales."
    ],
    contraindications: "Evitá fuerza excesiva si tenés artritis activa o dolor en articulaciones.",
    tags: ["tension", "manos", "rapido"],
    featured: false,
    sortOrder: 530
  }),
  buildExercise({
    id: "ex-relajacion-mandibula-cuello",
    slug: "relajacion-mandibula-cuello",
    title: "Relajación de mandíbula y cuello",
    summary:
      "Recorré mandíbula, lengua y cuello soltando tensiones con respiración y movimientos muy suaves.",
    description:
      "El cuello y la mandíbula suelen responder al estrés antes que otras zonas. Esta secuencia invita a soltar de forma consciente sin estiramientos agresivos. Complementa ejercicios de movimiento facial del catálogo.",
    category: "relajacion",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🧣",
    steps: [
      "Sentate erguida/o con hombros sueltos.",
      "Separá suavemente los dientes dejando la mandíbula caer.",
      "Descansá la lengua en el paladar, relajada.",
      "Incliná la cabeza a un lado sin forzar, 20 segundos; cambiá de lado.",
      "Rotá la cabeza muy lento mirando por encima del hombro, 15 segundos cada lado.",
      "Masajeá con yemas de dedos la base del cráneo 30 segundos.",
      "Cerrá con 3 respiraciones profundas y mandíbula relajada."
    ],
    tips: [
      "Evitá circular la cabeza completa: puede irritar el cuello.",
      "Si tenés almohada alta, probá bajarla para dormir.",
      "Repetí al final del día laboral."
    ],
    benefits: [
      "Alivia tensión cervical leve.",
      "Reduce bruxismo consciente momentáneo.",
      "Mejora comodidad al hablar o comer después."
    ],
    contraindications: "Consultá si tenés hernia cervical, vértigo cervical o dolor agudo al mover la cabeza.",
    tags: ["cuello", "tension", "mandibula"],
    featured: false,
    sortOrder: 540
  }),
  buildExercise({
    id: "ex-relajacion-imagineria-naturaleza",
    slug: "imagineria-naturaleza",
    title: "Imaginería en entorno natural",
    summary:
      "Visualizá un paisaje natural — bosque, río, montaña — usando todos los sentidos para relajarte.",
    description:
      "La naturaleza imaginada puede activar respuestas de calma similares a estar al aire libre para muchas personas. No reemplaza salir afuera, pero es útil cuando no podés. Elegí un escenario que te resulte amable, no exigente.",
    category: "relajacion",
    durationMinutes: 7,
    difficulty: "intermedio",
    emoji: "🌲",
    steps: [
      "Ubicate cómoda/o y cerrá los ojos.",
      "Elegí un paisaje: bosque, playa, montaña, jardín.",
      "Visualizá qué ves: luz, colores, movimiento de hojas o agua.",
      "Agregá sonidos: pájaros, olas, viento suave.",
      "Notá olores y temperatura del aire en tu piel imaginaria.",
      "Permanecé 5 minutos solo observando el escenario.",
      "Volvé gradualmente sintiendo tu cuerpo apoyado donde estás."
    ],
    tips: [
      "Usá fotos reales de un lugar que ames como punto de partida.",
      "Si un escenario genera tristeza, cambiá a otro sin forzar.",
      "Combiná con respiración 4-6 en la exhalación."
    ],
    benefits: [
      "Reduce estrés percibido.",
      "Fomenta sensación de amplitud y calma.",
      "Accesible sin salir de casa."
    ],
    contraindications: "",
    tags: ["visualizacion", "naturaleza", "calma"],
    featured: false,
    sortOrder: 550
  }),
  buildExercise({
    id: "ex-relajacion-soltar-hombros",
    slug: "soltar-tension-hombros",
    title: "Soltar tensión en hombros",
    summary:
      "Subí hombros a las orejas, soltá de golpe y repetí con respiración para descargar carga acumulada.",
    description:
      "Los hombros son 'almacén' de estrés para muchas personas. Este ejercicio usa contracción-relajación localizada de forma muy simple. Podés hacerlo sentada/o en reuniones discretamente si bajás la amplitud.",
    category: "relajacion",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🔽",
    steps: [
      "Sentate o parate con brazos relajados al costado.",
      "Inhalá y subí los hombros hacia las orejas.",
      "Mantené 3 segundos.",
      "Exhalá soltando los hombros de golpe hacia abajo.",
      "Repetí 8 veces, notando la diferencia en cada soltar.",
      "Masajeá suavemente trapecios con las yemas de los dedos 30 segundos.",
      "Cerrá con hombros hacia atrás y abajo, una posición cómoda."
    ],
    tips: [
      "Exagerá el movimiento las primeras veces para sentir el contraste.",
      "Hacelo al cerrar el día laboral como ritual.",
      "Si hay dolor agudo, reducí la contracción o consultá."
    ],
    benefits: [
      "Libera tensión en trapecios rápidamente.",
      "Fácil de integrar en la rutina.",
      "Mejora sensación de ligereza en tórax."
    ],
    contraindications: "Evitá contracciones fuertes si tenés lesión de hombro o cuello aguda.",
    tags: ["hombros", "tension", "rapido"],
    featured: false,
    sortOrder: 560
  }),
  buildExercise({
    id: "ex-relajacion-pies",
    slug: "relajacion-pies",
    title: "Relajación consciente de pies",
    summary:
      "Masajeá, flexioná y soltá pies y dedos para anclarte al cuerpo y relajar extremidades inferiores.",
    description:
      "Los pies sostienen todo el día y rara vez reciben atención consciente. Este ejercicio combina tacto, movimiento y respiración. Ideal después de mucho tiempo de pie o con zapatos apretados.",
    category: "relajacion",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🧦",
    steps: [
      "Sentate en una silla y sacate zapatos y medias si podés.",
      "Masajeá la planta del pie derecho con los pulgares 45 segundos.",
      "Flexioná y extendé los dedos 5 veces despacio.",
      "Rotá el tobillo suavemente en círculos, 5 por dirección.",
      "Repetí todo con el pie izquierdo.",
      "Apoyá ambos pies en el piso y compará sensaciones.",
      "Cerrá con 3 respiraciones profundas."
    ],
    tips: [
      "Usá una pelota pequeña bajo la planta si tenés.",
      "Hacelo antes de dormir para bajar activación.",
      "Si no podés sacarte zapatos, masajeá sobre medias suavemente."
    ],
    benefits: [
      "Relaja extremidades inferiores.",
      "Mejora conciencia corporal distal.",
      "Complementa ejercicios de grounding."
    ],
    contraindications: "Consultá si tenés neuropatía, úlceras o dolor agudo al presionar.",
    tags: ["pies", "cuerpo", "descanso"],
    featured: false,
    sortOrder: 570
  }),
  buildExercise({
    id: "ex-relajacion-mini-descanso",
    slug: "mini-descanso-ocioso",
    title: "Mini descanso en quietud",
    summary:
      "Quedate 5 minutos sin hacer nada productivo, solo observando respiración y sensaciones corporales.",
    description:
      "La quietud consciente es relajación activa: no dormís ni meditás con objetivo, solo permitís pausa. Muchas personas resisten 'no hacer nada'; este ejercicio entrena tolerancia al descanso sin pantallas.",
    category: "relajacion",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "🛋️",
    steps: [
      "Elegí un lugar cómodo y silenciá notificaciones.",
      "Sentate o acostate sin intención de dormir.",
      "Dejá las manos relajadas, ojos cerrados o entreabiertos.",
      "Observá la respiración sin modificarla durante 2 minutos.",
      "Recorré mentalmente el cuerpo buscando zonas de tensión y aflojá lo que puedas.",
      "Si aparecen pensamientos, dejalos pasar como nubes.",
      "Al terminar, estirá suavemente y retomá la actividad sin apuro."
    ],
    tips: [
      "Programá el timer para no mirar el reloj.",
      "No es fallar si te distraés: volvé al cuerpo.",
      "Empezá con 3 minutos si 5 te resulta mucho."
    ],
    benefits: [
      "Recupera energía mental breve.",
      "Reduce necesidad de estimulación constante.",
      "Complementa higiene del sueño."
    ],
    contraindications: "",
    tags: ["descanso", "quietud", "recuperacion"],
    featured: false,
    sortOrder: 580
  }),
  buildExercise({
    id: "ex-relajacion-antes-dormir",
    slug: "relajacion-antes-dormir",
    title: "Rutina de relajación pre-sueño",
    summary:
      "Secuencia de 10 minutos que combina respiración, soltar mandíbula y escaneo breve para preparar el descanso.",
    description:
      "Esta rutina integra elementos simples en un flujo nocturno. No garantiza dormir al instante, pero señala al cuerpo que el día terminó. Evitá pantallas después de practicarla para reforzar el efecto.",
    category: "relajacion",
    durationMinutes: 10,
    difficulty: "intermedio",
    emoji: "🌙",
    steps: [
      "Apagá pantallas y bajá luces 10 minutos antes.",
      "Acostate boca arriba con una almohada cómoda.",
      "Respirá 4 segundos inhalar, 6 exhalar, durante 3 minutos.",
      "Soltá mandíbula, lengua y hombros conscientemente.",
      "Recorré pies, piernas, abdomen, pecho, brazos, cara soltando cada zona.",
      "Imaginá que el cuerpo se hunde en el colchón con cada exhalación.",
      "Si no dormís en 10 minutos, levantate a un rincón tranquilo y volvé cuando tengas sueño."
    ],
    tips: [
      "Mantené horario regular de acostarte cuando sea posible.",
      "Evitá cafeína tardía y comidas pesadas cerca de dormir.",
      "La cama es para dormir: no trabajes ni scrollees ahí."
    ],
    benefits: [
      "Crea transición clara hacia el sueño.",
      "Reduce rumiación nocturna.",
      "Integra varias técnicas en una sola rutina."
    ],
    contraindications: "Si tenés insomnio persistente, consultá con tu profesional de salud mental o médico/a del sueño.",
    tags: ["sueño", "rutina", "noche"],
    featured: false,
    sortOrder: 590
  })
];
