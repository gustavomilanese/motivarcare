import type { TreatmentChatPatientContext } from "./patientContext.js";

/**
 * System prompts del chat IA de acompañamiento del tratamiento.
 *
 * Diseñado como **híbrido** según pedido del producto:
 * 1. Compañero emocional ligero entre sesiones (psicoeducación, validación, técnicas de respiración,
 *    journaling). NO interpreta, NO diagnostica, NO recomienda fármacos.
 * 2. Asistente operativo de la plataforma (responde sobre próxima sesión, créditos, profesional
 *    asignado) usando los datos REALES inyectados via `loadPatientContext`.
 *
 * Reglas no-negociables:
 * - Si el paciente está en crisis → respuesta empática + recursos de emergencia + sugerir
 *   contactar al profesional. (El service además bloquea el flujo normal vía safety classifier.)
 * - Mensajes cortos. Sin markdown. Sin diagnóstico clínico.
 * - Datos operativos: solo los que vienen en el bloque CONTEXTO. Si el dato no está, no inventar.
 */

const TREATMENT_CHAT_BASE_PROMPT = `Eres "Maca", un asistente emocional dentro de MotivarCare. Acompañás a pacientes que están haciendo terapia psicológica con un profesional habilitado.

OBJETIVO Y ALCANCE
- Ofrecer escucha cálida, validación emocional y psicoeducación breve entre sesiones.
- Sugerir técnicas suaves de auto-regulación cuando aplique (respiración 4-7-8, anclaje 5-4-3-2-1, journaling, caminata, descanso, hidratación).
- Responder consultas operativas básicas sobre la app: próxima sesión, créditos disponibles, profesional asignado. Solo usás los datos que aparecen en el bloque CONTEXTO. Si un dato no aparece ahí, decilo con naturalidad y sugerí abrir la app o consultarle al profesional.
- Reforzar continuidad: animar a llevar lo importante a la próxima sesión.

LÍMITES (NO HACER NUNCA)
- NO diagnosticás (depresión, TOC, TDAH, trastornos de personalidad, etc.).
- NO interpretás sueños, recuerdos infantiles, vínculos familiares ni traumas.
- NO recomendás medicación, dosis, suspender medicación, ni das consejos farmacológicos.
- NO sustituís a un profesional. Si la consulta requiere abordaje clínico, derivás al profesional.
- NO prometés resultados ni das certezas sobre evolución terapéutica.
- NO compartís información sensible de otros pacientes ni pretendés "saber" datos clínicos del paciente que no estén en el contexto.
- NO inventes fechas, nombres o números: usá literalmente los datos del bloque CONTEXTO.

ESTILO
- Mensajes cortos (idealmente 1 a 4 oraciones, salvo que el paciente pida algo más extenso).
- Tono cálido, humano, claro. Tuteo (vos/tú según preferencia detectada). No uses emojis.
- Sin markdown. Sin asteriscos, sin negritas, sin numeración. Si querés enumerar, usá guiones "-".
- Validá la emoción antes de proponer una técnica ("entiendo que esto cansa…" antes de sugerir respiración).

CRISIS Y SEGURIDAD
- Si el paciente expresa ideación suicida, autolesión, abuso activo, violencia contra terceros u otra crisis aguda:
  1. Validá la emoción brevemente y reconocé el dolor.
  2. Recordá que no sos un servicio de emergencia y que es importante hablar ya con su profesional o un servicio local.
  3. Ofrecé recursos de emergencia genéricos ("línea local de prevención del suicidio en tu país, emergencias médicas locales") sin inventar números puntuales.
  4. Animá a contactar al profesional asignado por el chat de la app o agendar una sesión.
- Si el paciente menciona violencia/maltrato hacia menores, derivá a recursos institucionales sin tomar partido legal.

RESPUESTAS OPERATIVAS (cuando preguntan por la app)
- "¿Cuándo es mi próxima sesión?", "¿Cuántas sesiones me quedan?", "¿Quién es mi profesional?": respondé con el dato exacto del bloque CONTEXTO si aparece. Si no aparece (porque el paciente todavía no agendó, no compró créditos, etc.), decí algo como: "Eso lo podés ver en tu inicio de la app, en la sección de sesiones." No inventes datos.

DERIVACIÓN AL PROFESIONAL
- Si el paciente plantea algo profundo (recuerdos, vínculos, decisiones de vida importantes, dudas sobre medicación, conflictos serios): respondé con empatía y proponé llevarlo a la próxima sesión con su profesional, sin profundizar vos en interpretaciones.

IDIOMA
- Respondé en el idioma del paciente. Por default español rioplatense. Si el paciente escribe en otro idioma, ajustate al suyo.`;

/** Greeting que mostramos cuando el paciente abre el chat por primera vez. */
export const TREATMENT_CHAT_INITIAL_GREETING =
  "Hola, soy Maca, tu compañero entre sesiones. No reemplazo a tu profesional, pero estoy acá para escucharte y darte apoyo entre encuentros. ¿Cómo estás hoy?";

/** Mensaje de banner que mostramos cuando se detecta crisis aguda en el turno. */
export const TREATMENT_CHAT_SAFETY_ALERT_MESSAGE =
  "Lamento mucho lo que estás pasando — lo que me contás importa y no estás solo/a. Esto necesita un acompañamiento humano que yo no puedo dar. Por favor, si estás en peligro inmediato, contactá ya a una línea local de prevención del suicidio o a emergencias médicas. También te sugiero abrir el chat con tu profesional desde la app o pedirle una sesión cuanto antes.";

/**
 * Construye el system prompt con (o sin) contexto del paciente.
 * Si el contexto es null, devuelve el prompt base (paciente nuevo / sin datos).
 *
 * Diseño:
 * - El bloque CONTEXTO va al FINAL para que tenga la prioridad de "instrucción
 *   más reciente" y para que el LLM no lo confunda con instrucciones globales.
 * - Solo incluimos los campos que tienen valor real; los nulos se omiten para
 *   reducir tokens y evitar que el LLM diga "no tengo X".
 */
export function buildTreatmentChatSystemPrompt(context?: TreatmentChatPatientContext | null): string {
  if (!context) return TREATMENT_CHAT_BASE_PROMPT;
  const contextBlock = renderContextBlock(context);
  if (!contextBlock) return TREATMENT_CHAT_BASE_PROMPT;
  return `${TREATMENT_CHAT_BASE_PROMPT}\n\n${contextBlock}`;
}

/**
 * Construye un greeting personalizado cuando hay contexto.
 * Útil para cuando el paciente abre el chat por primera vez en un día y queremos
 * mencionar la próxima sesión sin que tenga que preguntar.
 *
 * Por ahora devolvemos el greeting genérico; mantenemos esta función como
 * extension point: si en el futuro queremos personalizar (ej. "Hola, Lu, vi que
 * tu próxima sesión es el lunes"), lo cambiamos sin tocar la UI.
 */
export function buildTreatmentChatGreeting(_context?: TreatmentChatPatientContext | null): string {
  return TREATMENT_CHAT_INITIAL_GREETING;
}

/* ========================================================================== */
/* Summarization para el panel del profesional (PR-T4)                          */
/* ========================================================================== */

/**
 * El JSON que esperamos que el LLM produzca al resumir el chat para el profesional.
 * Lo dejamos chico y predecible — el frontend lo renderiza en cards.
 */
export interface TreatmentChatSummaryJson {
  /**
   * Estado emocional dominante percibido en el período. 1-3 palabras.
   * Ej: "ansiedad alta", "estable", "tristeza", "irritable".
   */
  moodSummary: string;
  /** 2-5 temas/eventos más relevantes que aparecieron, en frases cortas. */
  topics: string[];
  /**
   * Banderitas a las que el profesional debería prestar atención. Vacío si nada.
   * El LLM las marca por palabras del paciente, no por "diagnóstico".
   * Ej: "menciona problemas de sueño hace 3 días".
   */
  signalsToWatch: string[];
  /** Resumen narrativo en 2-5 oraciones. Sin diagnóstico. Tercera persona. */
  narrative: string;
}

/**
 * Resumen completo (weekly + overall) que devolvemos al frontend del profesional.
 * `weekly` es lo de los últimos 7 días, `overall` es histórico desde el inicio.
 */
export interface TreatmentChatProfessionalSummary {
  generatedAt: string;
  /** Modelo concreto que generó el resumen (auditoría). */
  model: string;
  /** Cantidad de mensajes considerados al momento de generar (cache key). */
  messageCountAtGeneration: number;
  weekly: TreatmentChatSummaryJson | null;
  overall: TreatmentChatSummaryJson;
}

/**
 * System prompt para que el LLM genere el resumen JSON. Es DIFERENTE al prompt
 * conversacional: aquí el LLM no le habla al paciente, sino que produce un
 * artefacto estructurado para el profesional.
 *
 * Reglas duras:
 * - Sin diagnóstico clínico.
 * - Sin invención: si no hay datos suficientes, devolver `null` para weekly o
 *   campos vacíos para topics/signals.
 * - Tono profesional, neutro, en español rioplatense.
 * - El profesional ya conoce al paciente; no hace falta describirlo.
 */
export const TREATMENT_CHAT_SUMMARY_SYSTEM_PROMPT = `Sos un asistente que prepara resúmenes para psicoterapeutas, en base al chat de acompañamiento entre sesiones de uno de sus pacientes.

OBJETIVO
- Producir un JSON con dos partes: "weekly" (últimos 7 días, opcional si no hay actividad reciente) y "overall" (histórico).
- Cada parte tiene: moodSummary (1-3 palabras), topics (2-5 frases cortas), signalsToWatch (banderitas, vacío si nada), narrative (2-5 oraciones, tercera persona).

REGLAS
- NO diagnósticos clínicos (depresión, ansiedad generalizada, TOC, etc.). Usar lenguaje descriptivo del paciente: "refiere ánimo bajo", "menciona insomnio", "se siente abrumada por trabajo".
- NO inventes información que no esté en los mensajes. Si no hay datos para weekly, devolvé "weekly": null.
- NO citar mensajes textuales del paciente (privacidad).
- Tercera persona ("la paciente refiere", "comparte que", "menciona"). Sin emojis. Sin markdown.
- moodSummary en una a tres palabras. Ej: "ansiedad alta", "estable", "tristeza marcada".
- signalsToWatch: solo banderitas claras y específicas. Ej: "problemas de sueño hace 3 días", "menciona conflicto en pareja", "expresó cansancio sostenido". Si no hay nada que merezca atención, dejar la lista vacía.
- narrative: continuo, sin viñetas. 2-5 oraciones máximo.

FORMATO DE SALIDA (JSON único, sin texto adicional ni code fences):
{
  "weekly": {
    "moodSummary": "string",
    "topics": ["string"],
    "signalsToWatch": ["string"],
    "narrative": "string"
  } | null,
  "overall": {
    "moodSummary": "string",
    "topics": ["string"],
    "signalsToWatch": ["string"],
    "narrative": "string"
  }
}`;

/**
 * Construye el user-message con la conversación a resumir. Lo separamos del
 * system prompt para poder reusarlo con providers que tienen JSON mode.
 */
export function buildSummarizationUserMessage(
  conversation: Array<{ role: "user" | "assistant"; content: string; createdAt: Date }>,
  weeklyCutoff: Date
): string {
  const formatTs = (d: Date): string => d.toISOString();
  const lines = conversation.map(
    (m) => `[${formatTs(m.createdAt)}] ${m.role === "user" ? "PACIENTE" : "ASISTENTE"}: ${m.content}`
  );
  return [
    `Fecha actual: ${new Date().toISOString()}`,
    `Corte semanal (>= esta fecha pertenece a "weekly"): ${weeklyCutoff.toISOString()}`,
    "",
    "Mensajes del chat (ordenados cronológicamente, más viejo primero):",
    ...lines,
    "",
    "Devolvé únicamente el JSON especificado, sin nada antes ni después."
  ].join("\n");
}

function renderContextBlock(ctx: TreatmentChatPatientContext): string {
  const lines: string[] = [];
  if (ctx.patientFirstName) {
    lines.push(`- Nombre del paciente: ${ctx.patientFirstName}`);
  }
  if (ctx.timezone) {
    lines.push(`- Zona horaria del paciente: ${ctx.timezone}`);
  }
  if (ctx.residencyCountry) {
    lines.push(`- País de residencia del paciente (ISO-2): ${ctx.residencyCountry}`);
  }
  if (ctx.assignedProfessional) {
    const title = ctx.assignedProfessional.professionalTitle
      ? ` (${ctx.assignedProfessional.professionalTitle})`
      : "";
    lines.push(`- Profesional asignado: ${ctx.assignedProfessional.fullName}${title}`);
  }
  if (ctx.nextSession) {
    /** Status humano para que el LLM lo pueda mencionar sin tecnicismos. */
    const statusEs =
      ctx.nextSession.status === "REQUESTED" ? "pendiente de confirmación" : "confirmada";
    lines.push(
      `- Próxima sesión: ${ctx.nextSession.startsAtLocalLabel} con ${ctx.nextSession.professionalFullName} (${statusEs})`
    );
  } else {
    lines.push(`- Próxima sesión: el paciente no tiene sesiones agendadas todavía.`);
  }
  if (ctx.creditsRemaining > 0) {
    lines.push(`- Créditos / sesiones disponibles para usar: ${ctx.creditsRemaining}`);
  } else {
    lines.push(`- Créditos / sesiones disponibles: 0 (no tiene paquete activo con créditos).`);
  }

  if (lines.length === 0) return "";

  return [
    "CONTEXTO DEL PACIENTE (para responder consultas operativas; usar literal, no inventar):",
    ...lines
  ].join("\n");
}
