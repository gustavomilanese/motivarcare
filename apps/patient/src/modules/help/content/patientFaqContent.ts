import type { HelpFaqSection } from "./helpTypes";

export const PATIENT_FAQ_SECTIONS: HelpFaqSection[] = [
  {
    title: { es: "Sesiones y reservas", en: "Sessions and booking", pt: "Sessões e reservas" },
    items: [
      {
        question: { es: "¿Cómo reservo una sesión?", en: "How do I book a session?", pt: "Como reservo uma sessão?" },
        answer: {
          es: "Andá a Sesiones y tocá «Reservar sesión». Elegí fecha y horario disponible con tu profesional activo. También podés iniciar desde Inicio si tenés créditos o una sesión de prueba pendiente.",
          en: "Go to Sessions and tap «Book session». Pick an available date and time with your active therapist. You can also start from Home if you have credits or a pending trial session.",
          pt: "Vá em Sessões e toque em «Reservar sessão». Escolha data e horário disponíveis com seu profissional ativo. Também pode começar em Início se tiver créditos ou sessão de teste pendente."
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
          es: "Sí, en Sesiones → Próximas reservas. Cada acción muestra las condiciones de anticipación. Si cancelás tarde o no asistís, pueden aplicarse penalidades según la política indicada en pantalla.",
          en: "Yes, in Sessions → Upcoming bookings. Each action shows notice requirements. Late cancellation or no-show may incur penalties per the on-screen policy.",
          pt: "Sim, em Sessões → Próximas reservas. Cada ação mostra as condições de antecedência. Cancelamento tardio ou falta podem gerar penalidades conforme a política na tela."
        }
      },
      {
        question: { es: "¿Dónde está el enlace de videollamada?", en: "Where is the video call link?", pt: "Onde está o link da videochamada?" },
        answer: {
          es: "Aparece en Próximas reservas cuando la sesión está reservada y próxima. También podés abrir el detalle de la sesión desde Inicio o el calendario en Sesiones.",
          en: "It appears under Upcoming bookings when the session is booked and near. You can also open session details from Home or the calendar in Sessions.",
          pt: "Aparece em Próximas reservas quando a sessão está reservada e próxima. Também pode abrir o detalhe da sessão em Início ou no calendário em Sessões."
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
          es: "En el onboarding o en Profesionales podés explorar el equipo, ver fichas y marcar favoritos. La primera asignación puede hacerse al reservar sesión de prueba o según matching del cuestionario inicial.",
          en: "During onboarding or in Professionals you can explore the team, view profiles and mark favorites. First assignment may happen when booking a trial or via initial questionnaire matching.",
          pt: "No onboarding ou em Profissionais você pode explorar a equipe, ver fichas e marcar favoritos. A primeira atribuição pode ocorrer ao reservar teste ou via matching do questionário inicial."
        }
      },
      {
        question: { es: "¿Cómo hablo con mi profesional?", en: "How do I talk to my therapist?", pt: "Como falo com meu profissional?" },
        answer: {
          es: "Usá Chat en el menú lateral o el botón Chat en la tarjeta de profesional activo en Inicio. Los mensajes son entre vos y tu profesional asignado, no un chat grupal.",
          en: "Use Chat in the sidebar or the Chat button on the active professional card on Home. Messages are between you and your assigned therapist, not a group chat.",
          pt: "Use Chat no menu lateral ou o botão Chat no cartão do profissional ativo em Início. As mensagens são entre você e seu profissional atribuído, não um chat em grupo."
        }
      },
      {
        question: { es: "¿Qué es Maca?", en: "What is Maca?", pt: "O que é a Maca?" },
        answer: {
          es: "Maca es la asistente flotante (botón redondo en la esquina). Ofrece orientación general sobre el portal y bienestar; no reemplaza el chat clínico con tu profesional ni atiende emergencias.",
          en: "Maca is the floating assistant (round button in the corner). She offers general guidance about the portal and wellbeing; she does not replace clinical chat with your therapist or handle emergencies.",
          pt: "A Maca é a assistente flutuante (botão redondo no canto). Oferece orientação geral sobre o portal e bem-estar; não substitui o chat clínico com seu profissional nem atende emergências."
        }
      },
      {
        question: { es: "¿Puedo cambiar de profesional?", en: "Can I change therapist?", pt: "Posso trocar de profissional?" },
        answer: {
          es: "Sí. Andá a Perfil → pestaña Soporte → «Solicitar cambio de profesional». El equipo te contacta por email; el cambio se gestiona manualmente.",
          en: "Yes. Go to Profile → Support tab → «Request therapist change». The team contacts you by email; the change is handled manually.",
          pt: "Sim. Vá em Perfil → aba Suporte → «Solicitar troca de profissional». A equipe entra em contato por e-mail; a troca é feita manualmente."
        }
      },
      {
        question: { es: "¿Para qué sirven los favoritos?", en: "What are favorites for?", pt: "Para que servem os favoritos?" },
        answer: {
          es: "Marcá profesionales con el corazón (icono arriba a la derecha o en su ficha) para encontrarlos rápido en la sección de favoritos y comparar opciones.",
          en: "Mark therapists with the heart (top-right icon or on their profile) to find them quickly in favorites and compare options.",
          pt: "Marque profissionais com o coração (ícone no canto superior direito ou na ficha) para encontrá-los rápido nos favoritos e comparar opções."
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
          es: "Desde Inicio o Sesiones, en la sección de paquetes, elegí el plan y completá el pago seguro (Stripe o Mercado Pago según tu país). Los créditos se acreditan en tu cuenta.",
          en: "From Home or Sessions, in the packages section, pick a plan and complete secure checkout (Stripe or Mercado Pago depending on your country). Credits are added to your account.",
          pt: "Em Início ou Sessões, na seção de pacotes, escolha o plano e conclua o pagamento seguro (Stripe ou Mercado Pago conforme seu país). Os créditos são creditados na conta."
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
          es: "La moneda depende de tu mercado o país de residencia (ARS, USD, BRL, EUR, etc.). Podés revisar idioma y moneda en el menú ☰ → Preferencias.",
          en: "Currency depends on your market or country of residence (ARS, USD, BRL, EUR, etc.). Check language and currency in menu ☰ → Preferences.",
          pt: "A moeda depende do seu mercado ou país de residência (ARS, USD, BRL, EUR, etc.). Verifique idioma e moeda no menu ☰ → Preferências."
        }
      }
    ]
  },
  {
    title: { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" },
    items: [
      {
        question: { es: "¿Qué es el diario emocional?", en: "What is the emotional diary?", pt: "O que é o diário emocional?" },
        answer: {
          es: "Un registro privado para anotar cómo te sentís, qué pasó y qué emociones notaste. Podés ver historial, filtrar por estado y abrir el detalle de cada entrada.",
          en: "A private log to note how you feel, what happened and which emotions you noticed. You can view history, filter by mood and open each entry's detail.",
          pt: "Um registro privado para anotar como você se sente, o que aconteceu e quais emoções notou. Pode ver histórico, filtrar por estado e abrir o detalhe de cada entrada."
        }
      },
      {
        question: { es: "¿Mi profesional ve el diario?", en: "Can my therapist see the diary?", pt: "Meu profissional vê o diário?" },
        answer: {
          es: "Tu profesional asignado puede ver entradas que compartís en el contexto terapéutico según las reglas de la plataforma. Usalo como apoyo; no sustituye una sesión ni una consulta de urgencia.",
          en: "Your assigned therapist may see entries shared in the therapeutic context per platform rules. Use it as support; it does not replace a session or urgent care.",
          pt: "Seu profissional atribuído pode ver entradas compartilhadas no contexto terapêutico conforme as regras da plataforma. Use como apoio; não substitui sessão nem atendimento de urgência."
        }
      },
      {
        question: { es: "¿Hay límite de texto por entrada?", en: "Is there a text limit per entry?", pt: "Há limite de texto por entrada?" },
        answer: {
          es: "Sí, hay un máximo de caracteres en «¿Qué pasó?» para mantener entradas claras y legibles. El contador te muestra cuánto escribiste.",
          en: "Yes, there is a maximum character count for «What happened?» to keep entries clear. The counter shows how much you've written.",
          pt: "Sim, há um máximo de caracteres em «O que aconteceu?» para manter entradas claras. O contador mostra quanto você escreveu."
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
          es: "No. Es un recurso complementario con videos por categoría (lofi, piano, naturaleza, etc.). Si el reproductor no carga en el portal, usá «Abrir en YouTube».",
          en: "No. It is a complementary resource with videos by category (lofi, piano, nature, etc.). If the player does not load in the portal, use «Open in YouTube».",
          pt: "Não. É um recurso complementar com vídeos por categoria (lofi, piano, natureza, etc.). Se o player não carregar no portal, use «Abrir no YouTube»."
        }
      },
      {
        question: { es: "¿Qué son los ejercicios?", en: "What are the exercises?", pt: "O que são os exercícios?" },
        answer: {
          es: "Actividades guiadas (respiración, grounding, etc.) para practicar entre sesiones. Encontrálos en Ejercicios del menú; cada uno tiene instrucciones paso a paso.",
          en: "Guided activities (breathing, grounding, etc.) to practice between sessions. Find them under Exercises in the menu; each has step-by-step instructions.",
          pt: "Atividades guiadas (respiração, grounding, etc.) para praticar entre sessões. Encontre-os em Exercícios no menu; cada um tem instruções passo a passo."
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
          es: "Menú ☰ → Preferencias. Ahí ajustás idioma (español, inglés, portugués), moneda de visualización y zona horaria para que los horarios de sesión coincidan con tu reloj.",
          en: "Menu ☰ → Preferences. Adjust language (Spanish, English, Portuguese), display currency and timezone so session times match your clock.",
          pt: "Menu ☰ → Preferências. Ajuste idioma (espanhol, inglês, português), moeda de exibição e fuso horário para que os horários de sessão coincidam com seu relógio."
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
          es: "Escribí a soporte@motivarcare.com (enlace en el pie de página o Perfil → Soporte). Indicá tu email de cuenta, qué intentabas hacer y captura de pantalla si podés.",
          en: "Email soporte@motivarcare.com (link in footer or Profile → Support). Include your account email, what you tried to do and a screenshot if possible.",
          pt: "Envie e-mail para soporte@motivarcare.com (link no rodapé ou Perfil → Suporte). Informe seu e-mail da conta, o que tentou fazer e captura de tela se possível."
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
