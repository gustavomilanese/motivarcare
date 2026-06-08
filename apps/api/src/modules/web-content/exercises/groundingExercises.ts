import { buildExercise } from "./buildExercise.js";

export const GROUNDING_EXERCISES = [
  buildExercise({
    id: "ex-grounding-temperatura-agua",
    slug: "anclaje-temperatura-agua",
    title: "Anclaje con temperatura del agua",
    summary:
      "Usá agua fría o tibia en manos y cara para traer la atención al cuerpo y bajar la intensidad emocional.",
    description:
      "Cambiar la temperatura en la piel es una forma directa de anclarte al presente. Muchas personas lo usan cuando sienten ansiedad subiendo o pensamientos muy acelerados. Es una herramienta de autorregulación sensorial, no un tratamiento médico.",
    category: "grounding",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "💧",
    steps: [
      "Acercate a un lavabo o tené a mano agua en un vaso.",
      "Mojá las manos y sentí la temperatura: fría, tibia, caliente.",
      "Llevá agua fresca a la cara o muñecas durante 20 segundos.",
      "Describí en voz alta o mentalmente tres sensaciones (temperatura, presión, textura).",
      "Secá las manos despacio notando el contacto de la toalla.",
      "Tomá tres respiraciones profundas antes de retomar la actividad."
    ],
    tips: [
      "Un cubito de hielo en la mano también funciona si lo tolerás.",
      "Evitá agua muy fría si tenés sensibilidad circulatoria.",
      "Combiná con respiración lenta para reforzar el efecto."
    ],
    benefits: [
      "Interrumpe espirales de ansiedad rápidamente.",
      "Reconecta con sensaciones concretas del cuerpo.",
      "Es accesible en casi cualquier entorno."
    ],
    contraindications: "Consultá con tu médico/a si tenés Raynaud, urticaria por frío u otra condición vascular.",
    tags: ["ansiedad", "sensorial", "presente"],
    featured: false,
    sortOrder: 310
  }),
  buildExercise({
    id: "ex-grounding-333",
    slug: "anclaje-3-3-3",
    title: "Anclaje 3-3-3 simplificado",
    summary:
      "Nombrá tres cosas que ves, tres que oís y mové tres partes del cuerpo para volver al acá y ahora.",
    description:
      "Versión breve del anclaje sensorial para momentos en los que necesitás algo rápido. No hace falta ser exacto: el objetivo es sacar la mente del loop de preocupación y volver al entorno inmediato.",
    category: "grounding",
    durationMinutes: 2,
    difficulty: "principiante",
    emoji: "3️⃣",
    steps: [
      "Pará lo que estés haciendo y plantá los pies en el suelo.",
      "Mirá alrededor y decí en voz alta o mentalmente 3 cosas que ves.",
      "Escuchá y nombrá 3 sonidos del ambiente, cercanos o lejanos.",
      "Mové 3 partes del cuerpo: dedos, hombros, mandíbula, tobillos.",
      "Repetí el ciclo una vez si todavía te sentís desconectada/o.",
      "Cerrá con una respiración profunda."
    ],
    tips: [
      "Decilo en voz alta si la mente sigue acelerada.",
      "Funciona bien en transporte, filas o antes de entrar a una reunión.",
      "No juzgues si las cosas que nombrás son simples."
    ],
    benefits: [
      "Formato corto fácil de memorizar.",
      "Reduce sensación de desborde emocional.",
      "Combina sentidos y movimiento."
    ],
    contraindications: "",
    tags: ["ansiedad", "rapido", "presente"],
    featured: false,
    sortOrder: 320
  }),
  buildExercise({
    id: "ex-grounding-contar-atras",
    slug: "contar-hacia-atras",
    title: "Contar hacia atrás desde 100",
    summary:
      "Contá de 100 hacia atrás restando 7 (o de a 1) para ocupar la mente y ganar distancia del pensamiento automático.",
    description:
      "Esta técnica cognitiva simple desvía la atención hacia una tarea concreta. No elimina emociones, pero puede bajar la intensidad cuando los pensamientos dan vueltas. Elegí un ritmo que no te frustre.",
    category: "grounding",
    durationMinutes: 4,
    difficulty: "intermedio",
    emoji: "🔢",
    steps: [
      "Sentate cómoda/o y elegí si restás de a 7, 5 o simplemente de a 1.",
      "Empezá desde 100 (o 50 si preferís algo más corto).",
      "Decí cada número en voz baja o mentalmente, sin apuro.",
      "Si te perdés, volvé al último número que recordés sin criticarte.",
      "Continuá hasta sentir que la mente bajó un cambio o hasta 5 minutos.",
      "Cerrá notando tres cosas del entorno actual."
    ],
    tips: [
      "Restar de a 7 es más exigente; de a 1 es más accesible.",
      "Usalo cuando no podés hacer ejercicios que requieran moverte mucho.",
      "Si te aburís, es señal de que la mente ya cambió de foco."
    ],
    benefits: [
      "Interrumpe rumiación persistente.",
      "No requiere materiales ni espacio.",
      "Entrena tolerancia a la distracción."
    ],
    contraindications: "",
    tags: ["rumiacion", "cognitivo", "ansiedad"],
    featured: false,
    sortOrder: 330
  }),
  buildExercise({
    id: "ex-grounding-objeto-cercano",
    slug: "anclaje-objeto-cercano",
    title: "Anclaje con objeto cercano",
    summary:
      "Elegí un objeto al alcance y explorá su textura, peso y detalles para anclarte al presente.",
    description:
      "Focalizar un objeto concreto activa la atención sensorial y aleja la mente de escenarios futuros o pasados. Es especialmente útil cuando sentís desconexión leve o necesitás bajar revoluciones antes de una tarea.",
    category: "grounding",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🔍",
    steps: [
      "Elegí un objeto cercano: lapicera, llave, taza, piedra, lo que tengas.",
      "Miralo con atención: color, forma, marcas, reflejos.",
      "Tocalo: textura, temperatura, peso en la mano.",
      "Si tiene olor o sonido al moverlo, notalo también.",
      "Describí el objeto en una frase completa en voz alta.",
      "Dejalo en su lugar y respirá profundo tres veces."
    ],
    tips: [
      "Elegí algo con textura interesante, no liso y anónimo.",
      "Hacelo con los ojos abiertos para reforzar el anclaje visual.",
      "Podés guardar un objeto 'ancla' en la mochila o escritorio."
    ],
    benefits: [
      "Muy accesible en cualquier momento.",
      "Entrena observación sin juicio.",
      "Útil en espacios públicos sin llamar la atención."
    ],
    contraindications: "",
    tags: ["presente", "sensorial", "atencion"],
    featured: false,
    sortOrder: 340
  }),
  buildExercise({
    id: "ex-grounding-tecnica-ace",
    slug: "tecnica-ace",
    title: "Técnica ACE (Aceptar, Controlar, Elegir)",
    summary:
      "Aceptá lo que sentís, identificá qué podés controlar y elegí una acción pequeña para recuperar agencia.",
    description:
      "ACE es un marco breve de grounding cognitivo que combina validación emocional con acción concreta. No resuelve problemas grandes de golpe, pero ayuda a salir del paralizamiento cuando todo parece abrumador.",
    category: "grounding",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "🎯",
    steps: [
      "Nombrá en voz alta qué emoción o sensación sentís ahora (Aceptar).",
      "Decí: 'Tiene sentido que me sienta así dado lo que pasó.'",
      "Listá tres cosas que SÍ podés controlar en los próximos minutos (Controlar).",
      "Elegí una acción pequeña y concreta: tomar agua, abrir ventana, escribir una frase (Elegir).",
      "Hacé esa acción antes de seguir pensando en lo demás.",
      "Revisá cómo te sentís después, sin expectativa de sentirte 'bien'."
    ],
    tips: [
      "La acción elegida debe ser de menos de 2 minutos.",
      "No uses ACE para invalidarte ('no debería sentir esto').",
      "Anotá el paso Elegir si te cuesta recordarlo después."
    ],
    benefits: [
      "Combina validación emocional y acción.",
      "Reduce sensación de impotencia.",
      "Es aplicable a situaciones cotidianas."
    ],
    contraindications: "",
    tags: ["agencia", "emociones", "cognitivo"],
    featured: true,
    sortOrder: 350
  }),
  buildExercise({
    id: "ex-grounding-pies-tierra",
    slug: "anclaje-pies-tierra",
    title: "Anclaje pies en la tierra",
    summary:
      "Sentí el contacto de los pies con el suelo y la transferencia de peso para estabilizarte emocionalmente.",
    description:
      "Conectar con la base del cuerpo es una forma clásica de grounding. Muchas personas sienten más estabilidad cuando prestan atención a cómo apoyan los pies. Funciona parada/o o sentada/o con pies en el piso.",
    category: "grounding",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🦶",
    steps: [
      "Pará/te o sentate con los pies apoyados en el suelo.",
      "Presioná suavemente talones, planta y dedos contra el piso.",
      "Notá temperatura, textura y firmeza del suelo.",
      "Transferí el peso de un pie al otro tres veces, lento.",
      "Imaginá raíces que bajan desde tus pies hacia el centro de la tierra.",
      "Quedate 1 minuto respirando con los pies 'plantados'.",
      "Cerrá moviendo dedos y observando cómo se siente el cuerpo."
    ],
    tips: [
      "Descalza/o si el entorno lo permite: más sensaciones.",
      "Repetilo antes de conversaciones difíciles.",
      "Combiná con exhalar largo en cada transferencia de peso."
    ],
    benefits: [
      "Aumenta sensación de estabilidad.",
      "Es discreto y rápido.",
      "Conecta cuerpo y entorno físico."
    ],
    contraindications: "",
    tags: ["estabilidad", "cuerpo", "presente"],
    featured: false,
    sortOrder: 360
  }),
  buildExercise({
    id: "ex-grounding-nombre-colores",
    slug: "anclaje-nombre-colores",
    title: "Anclaje nombrando colores",
    summary:
      "Recorré el espacio nombrando colores en voz alta o mentalmente hasta sentir que la mente se aquieta.",
    description:
      "Buscar colores activa la atención visual de forma simple y repetitiva. Es una variante suave del anclaje sensorial que podés hacer caminando, sentada/o o en transporte. No necesitás encontrar todos los colores del arcoíris.",
    category: "grounding",
    durationMinutes: 3,
    difficulty: "principiante",
    emoji: "🎨",
    steps: [
      "Mirá alrededor y encontrá algo rojo (o bordó, rosa, naranja).",
      "Buscá algo azul o celeste.",
      "Continuá con verde, amarillo, blanco, negro, el orden que quieras.",
      "Nombrá el objeto y su color: 'La silla es gris', 'El cielo es celeste'.",
      "Repetí el recorrido hasta completar 2 rondas o 3 minutos.",
      "Cerrá con una respiración profunda y volvé a la tarea."
    ],
    tips: [
      "Si un color no aparece, pasá al siguiente sin frustrarte.",
      "Hacelo caminando lento si necesitás más movimiento.",
      "Involucrá a otra persona si estás con alguien de confianza."
    ],
    benefits: [
      "Formato lúdico y fácil de recordar.",
      "Funciona bien con niños y adolescentes también.",
      "Redirige atención sin esfuerzo cognitivo alto."
    ],
    contraindications: "",
    tags: ["visual", "presente", "ansiedad"],
    featured: false,
    sortOrder: 370
  }),
  buildExercise({
    id: "ex-grounding-frase-ancla",
    slug: "anclaje-frase-ancla",
    title: "Anclaje con frase personal",
    summary:
      "Repetí una frase breve que te recuerde que estás a salvo en este momento y que la emoción pasará.",
    description:
      "Las frases ancla combinan grounding cognitivo con autocompasión. Elegí palabras que te resulten creíbles, no afirmaciones forzadas. La repetición lenta ayuda a bajar la activación cuando el cuerpo está en alerta.",
    category: "grounding",
    durationMinutes: 4,
    difficulty: "intermedio",
    emoji: "💬",
    steps: [
      "Elegí o creá una frase corta: 'Estoy acá, estoy a salvo', 'Esto también pasará', 'Puedo tolerar este momento'.",
      "Sentate cómoda/o, mano en el pecho o abdomen si te ayuda.",
      "Repetí la frase en voz baja sincronizada con la respiración.",
      "Si la mente se va, volvé a la frase sin juzgarte.",
      "Continuá 3 a 4 minutos o hasta sentir un leve cambio.",
      "Anotá la frase en el celular para usarla cuando la necesites."
    ],
    tips: [
      "La frase debe ser personal y realista para vos.",
      "Evitá negaciones ('no tengo miedo'): preferí afirmaciones posibles.",
      "Probá distintas frases hasta encontrar la que más resuene."
    ],
    benefits: [
      "Combina grounding y autocompasión.",
      "Portable: la llevás en la mente.",
      "Refuerza sensación de seguridad interna."
    ],
    contraindications: "",
    tags: ["autocompasion", "ansiedad", "cognitivo"],
    featured: false,
    sortOrder: 380
  }),
  buildExercise({
    id: "ex-grounding-movimiento-lento",
    slug: "anclaje-movimiento-lento",
    title: "Anclaje con movimiento lento",
    summary:
      "Mové brazos, manos o caminá muy lento prestando atención a cada sensación para salir del automatismo.",
    description:
      "El movimiento consciente y lento invita al sistema nervioso a cambiar de marcha. Es útil cuando sentís inquietud corporal, nervios en el estómago o ganas de hacer algo pero no sabés qué. No reemplaza actividad física regular.",
    category: "grounding",
    durationMinutes: 5,
    difficulty: "intermedio",
    emoji: "🐢",
    steps: [
      "Pará/te con espacio para mover brazos sin obstáculos.",
      "Levantá un brazo muy lento, notando hombro, codo, muñeca.",
      "Bajá el brazo igual de lento, sintiendo el peso.",
      "Repetí con el otro brazo, luego con ambos alternados.",
      "Opcional: caminá 10 pasos al 30% de tu velocidad habitual.",
      "En cada paso, notá talón, planta, dedos.",
      "Cerrá de pie quieto/a tres respiraciones."
    ],
    tips: [
      "Más lento es mejor que más largo.",
      "Si te da vergüenza, hacelo en un espacio privado.",
      "Combiná con música instrumental suave si te ayuda."
    ],
    benefits: [
      "Canaliza inquietud sin agitar más.",
      "Integra cuerpo y presente.",
      "Útil cuando sentís 'energía atrapada'."
    ],
    contraindications: "Adaptá el rango si tenés lesión articular o vértigo al moverte lento con los ojos cerrados.",
    tags: ["movimiento", "presente", "inquietud"],
    featured: false,
    sortOrder: 390
  })
];
