import type { HelpFaqSection } from "./helpTypes";

export const PATIENT_FAQ_SECTIONS: HelpFaqSection[] = [
  {
    title: { es: "Sesiones y reservas", en: "Sessions and booking", pt: "Sessões e reservas" },
    items: [
      {
        question: { es: "¿Cómo reservo una sesión?", en: "How do I book a session?", pt: "Como reservo uma sessão?" },
        answer: {
          es: "Andá a Sesiones («Tus sesiones») y tocá Reservar / Reservar sesión. Elegí un horario disponible. También podés empezar desde la card de Inicio si tenés créditos o una sesión de prueba pendiente.",
          en: "Go to Sessions («Your sessions») and tap Book / Book session. Pick an available time. You can also start from the Home card if you have credits or a pending trial session.",
          pt: "Vá em Sessões («Suas sessões») e toque Reservar / Reservar sessão. Escolha um horário disponível. Também pode começar pelo card de Início se tiver créditos ou sessão de teste pendente."
        }
      },
      {
        question: { es: "¿Qué es la sesión de prueba?", en: "What is the trial session?", pt: "O que é a sessão de teste?" },
        answer: {
          es: "Es una primera sesión para conocer al profesional y el formato online. Si aparece el banner en Inicio, seguí los pasos para elegir horario. Consume el beneficio de prueba una sola vez.",
          en: "It is a first session to meet your therapist and the online format. If the banner appears on Home, follow the steps to pick a time. The trial benefit is used once.",
          pt: "É uma primeira sessão para conhecer o profissional e o formato online. Se o banner aparecer em Início, siga os passos para escolher horário. O benefício de teste é usado uma vez."
        }
      },
      {
        question: { es: "¿Qué son los créditos de sesión?", en: "What are session credits?", pt: "O que são créditos de sessão?" },
        answer: {
          es: "Cada crédito equivale a una sesión reservada. Los paquetes que comprás suman créditos a tu cuenta. En Sesiones ves cuántos tenés disponibles antes de reservar.",
          en: "Each credit equals one booked session. Packages you buy add credits to your account. In Sessions you see how many you have before booking.",
          pt: "Cada crédito equivale a uma sessão reservada. Os pacotes que você compra somam créditos na conta. Em Sessões você vê quantos tem antes de reservar."
        }
      },
      {
        question: { es: "¿Puedo reprogramar o cancelar?", en: "Can I reschedule or cancel?", pt: "Posso reagendar ou cancelar?" },
        answer: {
          es: "Sí, en Sesiones → Próximas sesiones (o Ver detalle en la card). Cada acción muestra las condiciones de anticipación. Si cancelás tarde o no asistís, pueden aplicarse penalidades según la política en pantalla.",
          en: "Yes, in Sessions → Upcoming sessions (or View details on the card). Each action shows notice requirements. Late cancellation or no-show may incur penalties per the on-screen policy.",
          pt: "Sim, em Sessões → Próximas sessões (ou Ver detalhe no card). Cada ação mostra as condições de antecedência. Cancelamento tardio ou falta podem gerar penalidades conforme a política na tela."
        }
      },
      {
        question: { es: "¿Dónde está el enlace de videollamada?", en: "Where is the video call link?", pt: "Onde está o link da videochamada?" },
        answer: {
          es: "Usá Entrar a la sesión en la card de Inicio o en Sesiones cuando la cita está próxima. También está en Ver detalle de la sesión.",
          en: "Use Join session on the Home or Sessions card when the appointment is near. It is also in View details.",
          pt: "Use Entrar na sessão no card de Início ou Sessões quando a consulta estiver próxima. Também está em Ver detalhe."
        }
      },
      {
        question: { es: "¿Puedo conectar Google Calendar?", en: "Can I connect Google Calendar?", pt: "Posso conectar o Google Calendar?" },
        answer: {
          es: "Si tu cuenta lo ofrece, verás un aviso en Inicio o Perfil para vincular Google Calendar y sincronizar tus sesiones. Seguí el flujo de autorización de Google.",
          en: "If your account offers it, you'll see a prompt on Home or Profile to link Google Calendar and sync sessions. Follow Google's authorization flow.",
          pt: "Se sua conta oferecer, verá um aviso em Início ou Perfil para vincular o Google Calendar e sincronizar sessões. Siga o fluxo de autorização do Google."
        }
      }
    ]
  },
  {
    title: { es: "Profesional y chat", en: "Therapist and chat", pt: "Profissional e chat" },
    items: [
      {
        question: { es: "¿Cómo elijo mi profesional?", en: "How do I choose my therapist?", pt: "Como escolho meu profissional?" },
        answer: {
          es: "En el onboarding y desde Inicio (Elegir profesional / Sesión de prueba) seguís el matching según el cuestionario. La primera asignación suele cerrarse al reservar la sesión de prueba o al completar el matching.",
          en: "During onboarding and from Home (Choose therapist / Trial session) you follow matching from the questionnaire. First assignment usually completes when you book the trial or finish matching.",
          pt: "No onboarding e em Início (Escolher profissional / Sessão de teste) você segue o matching do questionário. A primeira atribuição costuma fechar ao reservar o teste ou concluir o matching."
        }
      },
      {
        question: { es: "¿Cómo hablo con mi profesional?", en: "How do I talk to my therapist?", pt: "Como falo com meu profissional?" },
        answer: {
          es: "Abrí Mensajes en el menú (o Escribile / Responder en Inicio). Es un chat escrito entre vos y tu profesional asignado, no grupal ni con Maca.",
          en: "Open Messages in the menu (or Message them / Reply on Home). It is a written chat between you and your assigned therapist — not group chat and not Maca.",
          pt: "Abra Mensagens no menu (ou Escreva / Responder em Início). É um chat escrito entre você e seu profissional — não é grupo nem a Maca."
        }
      },
      {
        question: { es: "¿Qué es Maca?", en: "What is Maca?", pt: "O que é a Maca?" },
        answer: {
          es: "Maca es la asistente del portal (botón Hablar con Maca). Orienta en funciones y bienestar; no reemplaza Mensajes con tu profesional ni atiende emergencias. También podés hacer el Tour con Maca desde el menú lateral.",
          en: "Maca is the portal assistant (Talk to Maca button). She helps with features and wellbeing; she does not replace Messages with your therapist or handle emergencies. You can also take Tour with Maca from the sidebar.",
          pt: "A Maca é a assistente do portal (botão Falar com a Maca). Orienta funções e bem-estar; não substitui Mensagens com seu profissional nem atende emergências. Também pode fazer o Tour com a Maca no menu lateral."
        }
      },
      {
        question: { es: "¿Puedo cambiar de profesional?", en: "Can I change therapist?", pt: "Posso trocar de profissional?" },
        answer: {
          es: "Sí. Menú de cuenta (tu nombre) → Soporte → Solicitar cambio de profesional. Si no tenés créditos ni reservas, a veces también podés cambiar desde Inicio. El equipo te guía por email cuando hace falta.",
          en: "Yes. Account menu (your name) → Support → Request a therapist change. If you have no credits or bookings, you can sometimes also change from Home. The team guides you by email when needed.",
          pt: "Sim. Menu da conta (seu nome) → Suporte → Solicitar troca de profissional. Sem créditos nem reservas, às vezes também pode trocar em Início. A equipe orienta por e-mail quando preciso."
        }
      },
      {
        question: { es: "¿Dónde veo el perfil de mi profesional?", en: "Where do I see my therapist’s profile?", pt: "Onde vejo o perfil do meu profissional?" },
        answer: {
          es: "En Inicio, en el panel Tu profesional → Ver perfil. Desde Mensajes también tenés Ver perfil en el lateral.",
          en: "On Home, in Your therapist → View profile. From Messages you also have View profile in the side panel.",
          pt: "Em Início, no painel Seu profissional → Ver perfil. Em Mensagens também há Ver perfil no lateral."
        }
      }
    ]
  },
  {
    title: { es: "Pagos y paquetes", en: "Payments and packages", pt: "Pagamentos e pacotes" },
    items: [
      {
        question: { es: "¿Cómo compro un paquete de sesiones?", en: "How do I buy a session package?", pt: "Como compro um pacote de sessões?" },
        answer: {
          es: "En Sesiones tocá Comprar sesiones / Comprar más. En Elegí cómo pagar seleccioná una sesión o un paquete (precio en moneda local cuando aplica) y Continuar al pago. Completás el checkout con DLocal; al volver se acreditan los créditos.",
          en: "In Sessions tap Buy sessions / Buy more. In Choose how to pay pick one session or a package (local currency when applicable) and Continue to payment. Complete DLocal checkout; credits appear when you return.",
          pt: "Em Sessões toque Comprar sessões / Comprar mais. Em Escolha como pagar selecione uma sessão ou um pacote (moeda local quando aplicável) e Continuar para o pagamento. Conclua o checkout DLocal; os créditos aparecem ao voltar."
        }
      },
      {
        question: { es: "¿Dónde veo mis compras?", en: "Where do I see my purchases?", pt: "Onde vejo minhas compras?" },
        answer: {
          es: "En Sesiones, la sección «Paquetes comprados» muestra el historial de paquetes adquiridos y créditos asociados.",
          en: "In Sessions, the «Purchased packages» section shows your package history and associated credits.",
          pt: "Em Sessões, a seção «Pacotes comprados» mostra o histórico de pacotes adquiridos e créditos associados."
        }
      },
      {
        question: { es: "¿Por qué el precio está en otra moneda?", en: "Why is the price in another currency?", pt: "Por que o preço está em outra moeda?" },
        answer: {
          es: "Los precios se muestran según tu país de residencia (moneda local cuando hay cobertura de pago). Idioma y moneda de preferencia: menú de cuenta → Idioma y moneda.",
          en: "Prices follow your country of residence (local currency when payment coverage applies). Language and preferred currency: account menu → Language and currency.",
          pt: "Os preços seguem seu país de residência (moeda local quando há cobertura de pagamento). Idioma e moeda: menu da conta → Idioma e moeda."
        }
      }
    ]
  },
  {
    title: { es: "Diario", en: "Diary", pt: "Diário" },
    items: [
      {
        question: { es: "¿Qué es el diario?", en: "What is the diary?", pt: "O que é o diário?" },
        answer: {
          es: "En Diario («Tu diario») registrás cómo está tu día (climas), qué pasó y qué sentiste. Ves Últimas entradas y podés crear una Nueva entrada.",
          en: "In Diary («Your diary») you log how your day is (climates), what happened and what you felt. You see Recent entries and can create a New entry.",
          pt: "Em Diário («Seu diário») você registra como está o dia (climas), o que aconteceu e o que sentiu. Vê Últimas entradas e pode criar uma Nova entrada."
        }
      },
      {
        question: { es: "¿Mi profesional ve el diario?", en: "Can my therapist see the diary?", pt: "Meu profissional vê o diário?" },
        answer: {
          es: "Al guardar elegís Solo yo o Para mi psicólogo/a. También podés compartir una entrada desde Mensajes (Compartir del diario). No sustituye una sesión ni una urgencia.",
          en: "When saving you choose Only me or For my therapist. You can also share an entry from Messages (Share from diary). It does not replace a session or urgent care.",
          pt: "Ao salvar você escolhe Só eu ou Para meu psicólogo/a. Também pode compartilhar uma entrada em Mensagens. Não substitui sessão nem urgência."
        }
      },
      {
        question: { es: "¿Hay límite de texto por entrada?", en: "Is there a text limit per entry?", pt: "Há limite de texto por entrada?" },
        answer: {
          es: "Sí, hay un máximo de caracteres en ¿Qué pasó hoy? para mantener entradas claras. El contador te muestra cuánto escribiste.",
          en: "Yes, there is a maximum character count for What happened today? to keep entries clear. The counter shows how much you've written.",
          pt: "Sim, há um máximo de caracteres em O que aconteceu hoje? para manter entradas claras. O contador mostra quanto você escreveu."
        }
      }
    ]
  },
  {
    title: { es: "Bienestar y recursos", en: "Wellbeing and resources", pt: "Bem-estar e recursos" },
    items: [
      {
        question: { es: "¿La música relajante reemplaza la terapia?", en: "Does relaxing music replace therapy?", pt: "A música relaxante substitui a terapia?" },
        answer: {
          es: "No. Es un recurso complementario con videos por categoría (lofi, piano, naturaleza, etc.) que se reproducen dentro del portal.",
          en: "No. It is a complementary resource with videos by category (lofi, piano, nature, etc.) that play inside the portal.",
          pt: "Não. É um recurso complementar com vídeos por categoria (lofi, piano, natureza, etc.) que tocam dentro do portal."
        }
      },
      {
        question: { es: "¿Qué son los ejercicios?", en: "What are the exercises?", pt: "O que são os exercícios?" },
        answer: {
          es: "Prácticas guiadas (respiración, anclaje, etc.) entre sesiones. Están en Bienestar, con filtros por tipo; cada tarjeta tiene pasos. También hay rutinas en el panel lateral.",
          en: "Guided practices (breath, grounding, etc.) between sessions. They live in Wellbeing, with type filters; each card has steps. Routines are also in the side panel.",
          pt: "Práticas guiadas (respiração, ancoragem, etc.) entre sessões. Ficam em Bem-estar, com filtros por tipo; cada card tem passos. Também há rotinas no painel lateral."
        }
      },
      {
        question: { es: "¿Hay artículos o lecturas?", en: "Are there articles to read?", pt: "Há artigos ou leituras?" },
        answer: {
          es: "Sí, el portal incluye artículos de bienestar accesibles desde el flujo de contenidos (según disponibilidad en tu cuenta). Son material informativo, no consejo clínico individual.",
          en: "Yes, the portal includes wellbeing articles (depending on availability in your account). They are informational, not individual clinical advice.",
          pt: "Sim, o portal inclui artigos de bem-estar (conforme disponibilidade na sua conta). São material informativo, não aconselhamento clínico individual."
        }
      }
    ]
  },
  {
    title: { es: "Cuenta, privacidad y seguridad", en: "Account, privacy and safety", pt: "Conta, privacidade e segurança" },
    items: [
      {
        question: { es: "¿Cómo cambio idioma o zona horaria?", en: "How do I change language or timezone?", pt: "Como altero idioma ou fuso horário?" },
        answer: {
          es: "Menú de cuenta (tu nombre) → Idioma y moneda para idioma y moneda. La zona horaria se edita en Datos personales. Así los horarios de sesión coinciden con tu reloj.",
          en: "Account menu (your name) → Language and currency for language and currency. Time zone is edited in Personal details. That keeps session times aligned with your clock.",
          pt: "Menu da conta (seu nome) → Idioma e moeda para idioma e moeda. O fuso horário se edita em Dados pessoais. Assim os horários de sessão batem com seu relógio."
        }
      },
      {
        question: { es: "¿Qué pasa si el cuestionario detecta riesgo?", en: "What if the questionnaire detects risk?", pt: "O que acontece se o questionário detectar risco?" },
        answer: {
          es: "Por seguridad, la reserva online puede quedar bloqueada hasta revisión manual del equipo. Verás un aviso en pantalla. En una urgencia, usá los teléfonos del pie de página o servicios de emergencia locales.",
          en: "For safety, online booking may be blocked until manual team review. You'll see an on-screen notice. In an emergency, use footer crisis numbers or local emergency services.",
          pt: "Por segurança, a reserva online pode ficar bloqueada até revisão manual da equipe. Verá um aviso na tela. Em urgência, use os telefones do rodapé ou serviços de emergência locais."
        }
      },
      {
        question: { es: "¿Dónde están términos y privacidad?", en: "Where are terms and privacy?", pt: "Onde estão termos e privacidade?" },
        answer: {
          es: "En el pie de página del portal: Términos y condiciones, Política de privacidad y Líneas de apoyo. Se abren en una pestaña nueva.",
          en: "In the portal footer: Terms and conditions, Privacy policy and Crisis lines. They open in a new tab.",
          pt: "No rodapé do portal: Termos e condições, Política de privacidade e Linhas de apoio. Abrem em nova aba."
        }
      }
    ]
  },
  {
    title: { es: "Soporte técnico", en: "Technical support", pt: "Suporte técnico" },
    items: [
      {
        question: { es: "¿A quién contacto si algo falla?", en: "Who do I contact if something fails?", pt: "Quem contato se algo falhar?" },
        answer: {
          es: "Escribí a soporte@motivarcare.com (pie de página o menú de cuenta → Soporte / Contactar soporte). Indicá tu email de cuenta, qué intentabas hacer y una captura si podés.",
          en: "Email soporte@motivarcare.com (footer or account menu → Support / Contact support). Include your account email, what you tried and a screenshot if you can.",
          pt: "Envie e-mail para soporte@motivarcare.com (rodapé ou menu da conta → Suporte / Contactar suporte). Informe seu e-mail, o que tentou fazer e uma captura se puder."
        }
      },
      {
        question: { es: "No recibo notificaciones", en: "I'm not getting notifications", pt: "Não recebo notificações" },
        answer: {
          es: "Revisá la campana arriba a la derecha: ahí ves avisos de sesiones y mensajes dentro del portal. Para email, revisá spam y que tu dirección en Perfil sea correcta.",
          en: "Check the bell top right: session and message alerts appear there inside the portal. For email, check spam and that your Profile address is correct.",
          pt: "Verifique o sino no canto superior direito: alertas de sessões e mensagens aparecem ali no portal. Para e-mail, confira spam e se o endereço em Perfil está correto."
        }
      },
      {
        question: { es: "La videollamada no abre", en: "The video call won't open", pt: "A videochamada não abre" },
        answer: {
          es: "Probá otro navegador (Chrome o Edge recomendados), permití cámara/micrófono y cerrá otras apps que usen la cámara. Si persiste, contactá soporte antes del horario de la sesión.",
          en: "Try another browser (Chrome or Edge recommended), allow camera/microphone and close other apps using the camera. If it persists, contact support before session time.",
          pt: "Tente outro navegador (Chrome ou Edge recomendados), permita câmera/microfone e feche outros apps que usem a câmera. Se persistir, contate suporte antes do horário da sessão."
        }
      }
    ]
  }
];
