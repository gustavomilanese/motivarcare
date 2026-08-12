export type FaqItem = { q: string; a: string };
export type FaqSection = { title: string; items: FaqItem[] };

/** Subset ES del FAQ web (Ola 4). */
export const PATIENT_FAQ_ES: FaqSection[] = [
  {
    title: "Sesiones y reservas",
    items: [
      {
        q: "¿Cómo reservo una sesión?",
        a: "Andá a Sesiones y tocá «Reservar». Elegí fecha y horario con tu profesional. También podés empezar desde Inicio si tenés créditos o una sesión de prueba pendiente."
      },
      {
        q: "¿Qué es la sesión de prueba?",
        a: "Es una primera sesión para conocer al profesional y el formato online. Consume el beneficio de prueba una sola vez."
      },
      {
        q: "¿Puedo reprogramar o cancelar?",
        a: "Sí, en Sesiones → próximas. Cada acción muestra las condiciones de anticipación."
      },
      {
        q: "¿Dónde está el enlace de videollamada?",
        a: "Aparece en la tarjeta de la sesión cuando está confirmada y próxima."
      }
    ]
  },
  {
    title: "Profesional y chat",
    items: [
      {
        q: "¿Cómo hablo con mi profesional?",
        a: "Usá la pestaña Chat o el botón Chat en la tarjeta de profesional en Inicio."
      },
      {
        q: "¿Qué es Maca?",
        a: "Maca es la asistente flotante. Ofrece orientación general sobre el portal y bienestar; no reemplaza el chat clínico ni atiende emergencias."
      },
      {
        q: "¿Puedo cambiar de profesional?",
        a: "Sí. En Mi cuenta → Soporte podés solicitar un cambio. El equipo te contacta por email."
      }
    ]
  },
  {
    title: "Pagos y cuenta",
    items: [
      {
        q: "¿Cómo compro sesiones?",
        a: "Desde Inicio en «Sumá sesiones» o Comprar. Si tu país tiene cobertura dLocal, el pago se abre en el checkout seguro."
      },
      {
        q: "¿Olvidé mi contraseña?",
        a: "En el login tocá «¿Olvidaste tu contraseña?» y seguí el mail de restablecimiento."
      }
    ]
  },
  {
    title: "Bienestar",
    items: [
      {
        q: "¿Qué hay en Diario / Ejercicios / Música?",
        a: "Desde Inicio podés abrir el diario emocional, ejercicios guiados y música relajante in-app."
      }
    ]
  }
];
