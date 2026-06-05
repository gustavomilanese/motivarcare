import type { HelpManualSection } from "./helpTypes";

export const PATIENT_MANUAL_SECTIONS: HelpManualSection[] = [
  {
    title: { es: "1. Bienvenida", en: "1. Welcome", pt: "1. Boas-vindas" },
    figures: [
      {
        src: "/images/hero-therapy.jpg",
        alt: { es: "Vista del inicio del portal paciente", en: "Patient portal home view", pt: "Vista do início do portal do paciente" },
        caption: {
          es: "Inicio: resumen de sesiones, profesional activo y accesos rápidos.",
          en: "Home: session summary, active therapist and quick links.",
          pt: "Início: resumo de sessões, profissional ativo e atalhos."
        }
      },
      {
        src: "/help/manual/inicio.svg",
        alt: { es: "Esquema del panel de inicio", en: "Home dashboard schematic", pt: "Esquema do painel inicial" },
        caption: {
          es: "Esquema: menú lateral, hero y tarjetas principales.",
          en: "Schematic: sidebar, hero banner and main cards.",
          pt: "Esquema: menu lateral, hero e cartões principais."
        }
      }
    ],
    paragraphs: [
      {
        es: "MotivarCare es tu portal para gestionar terapia online: reservar sesiones, hablar con tu profesional, llevar un diario emocional y acceder a recursos de bienestar.",
        en: "MotivarCare is your portal to manage online therapy: book sessions, talk to your therapist, keep an emotional diary and access wellbeing resources.",
        pt: "MotivarCare é seu portal para gerenciar terapia online: reservar sessões, falar com seu profissional, manter um diário emocional e acessar recursos de bem-estar."
      },
      {
        es: "Este manual describe cada sección. No necesitás leerlo completo: usá el índice mental del menú lateral (escritorio) o la barra inferior (móvil).",
        en: "This manual describes each section. You don't need to read it all: use the sidebar (desktop) or bottom bar (mobile) as your index.",
        pt: "Este manual descreve cada seção. Não precisa ler tudo: use o menu lateral (desktop) ou a barra inferior (móvel) como índice."
      }
    ]
  },
  {
    title: { es: "2. Mapa del menú", en: "2. Menu map", pt: "2. Mapa do menu" },
    figures: [
      {
        src: "/help/manual/menu.svg",
        alt: { es: "Menú lateral e iconos del encabezado", en: "Sidebar and header icons", pt: "Menu lateral e ícones do cabeçalho" },
        caption: {
          es: "Escritorio: navegación lateral e iconos arriba a la derecha.",
          en: "Desktop: sidebar navigation and top-right icons.",
          pt: "Desktop: navegação lateral e ícones no canto superior direito."
        }
      }
    ],
    bullets: [
      {
        label: { es: "Inicio", en: "Home", pt: "Início" },
        body: {
          es: "Panel principal: créditos, profesional activo, próximas reservas, paquetes y accesos rápidos a sesión de prueba.",
          en: "Main dashboard: credits, active therapist, upcoming bookings, packages and quick links to trial session.",
          pt: "Painel principal: créditos, profissional ativo, próximas reservas, pacotes e atalhos para sessão de teste."
        }
      },
      {
        label: { es: "Sesiones", en: "Sessions", pt: "Sessões" },
        body: {
          es: "Reservar, reprogramar, historial, calendario, paquetes comprados y compra de nuevos créditos.",
          en: "Book, reschedule, history, calendar, purchased packages and buying new credits.",
          pt: "Reservar, reagendar, histórico, calendário, pacotes comprados e compra de novos créditos."
        }
      },
      {
        label: { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" },
        body: {
          es: "Nueva entrada, últimas notas y registro completo con detalle por fecha.",
          en: "New entry, recent notes and full log with detail by date.",
          pt: "Nova entrada, últimas notas e registro completo com detalhe por data."
        }
      },
      {
        label: { es: "Profesionales", en: "Professionals", pt: "Profissionais" },
        body: {
          es: "Explorar el equipo, ver especialidades, compatibilidad y marcar favoritos.",
          en: "Explore the team, specialties, match scores and mark favorites.",
          pt: "Explorar a equipe, especialidades, compatibilidade e marcar favoritos."
        }
      },
      {
        label: { es: "Ejercicios", en: "Exercises", pt: "Exercícios" },
        body: {
          es: "Prácticas guiadas breves para usar entre sesiones.",
          en: "Short guided practices to use between sessions.",
          pt: "Práticas guiadas breves para usar entre sessões."
        }
      },
      {
        label: { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" },
        body: {
          es: "Biblioteca por categorías con reproductor integrado y enlace a YouTube.",
          en: "Library by category with built-in player and YouTube link.",
          pt: "Biblioteca por categorias com player integrado e link para YouTube."
        }
      },
      {
        label: { es: "Chat", en: "Chat", pt: "Chat" },
        body: {
          es: "Mensajes asíncronos con tu profesional asignado (no es videollamada).",
          en: "Async messages with your assigned therapist (not video call).",
          pt: "Mensagens assíncronas com seu profissional atribuído (não é videochamada)."
        }
      },
      {
        label: { es: "Mi cuenta", en: "My account", pt: "Minha conta" },
        body: {
          es: "Acceso desde menú ☰ o barra móvil «Mi Cuenta»: perfil, foto, preferencias y soporte.",
          en: "Access via ☰ menu or mobile «My account» bar: profile, photo, preferences and support.",
          pt: "Acesso pelo menu ☰ ou barra móvel «Minha conta»: perfil, foto, preferências e suporte."
        }
      }
    ]
  },
  {
    title: { es: "3. Primeros pasos", en: "3. First steps", pt: "3. Primeiros passos" },
    steps: [
      {
        es: "Completá el registro e inicio de sesión con tu email.",
        en: "Complete registration and sign in with your email.",
        pt: "Conclua o cadastro e entre com seu e-mail."
      },
      {
        es: "Respondé el cuestionario inicial (intake) con honestidad; ayuda al matching y a detectar situaciones de riesgo.",
        en: "Answer the initial questionnaire (intake) honestly; it helps matching and risk detection.",
        pt: "Responda o questionário inicial (intake) com honestidade; ajuda no matching e na detecção de risco."
      },
      {
        es: "Elegí o conocé a tu profesional (sesión de prueba o matching).",
        en: "Choose or meet your therapist (trial session or matching).",
        pt: "Escolha ou conheça seu profissional (sessão de teste ou matching)."
      },
      {
        es: "Reservá tu primera sesión desde Sesiones.",
        en: "Book your first session from Sessions.",
        pt: "Reserve sua primeira sessão em Sessões."
      },
      {
        es: "Opcional: explorá diario, ejercicios y música relajante entre sesiones.",
        en: "Optional: explore diary, exercises and relaxing music between sessions.",
        pt: "Opcional: explore diário, exercícios e música relaxante entre sessões."
      }
    ]
  },
  {
    title: { es: "4. Reservar y gestionar sesiones", en: "4. Book and manage sessions", pt: "4. Reservar e gerenciar sessões" },
    figures: [
      {
        src: "/images/hero-sesiones.png",
        alt: { es: "Página de Sesiones con hero y reservas", en: "Sessions page with hero and bookings", pt: "Página Sessões com hero e reservas" },
        caption: {
          es: "Sesiones: hero, créditos disponibles y próximas reservas.",
          en: "Sessions: hero, available credits and upcoming bookings.",
          pt: "Sessões: hero, créditos disponíveis e próximas reservas."
        }
      },
      {
        src: "/help/manual/sesiones.svg",
        alt: { es: "Esquema de la página Sesiones", en: "Sessions page schematic", pt: "Esquema da página Sessões" },
        caption: {
          es: "Esquema: banner, botón reservar y listado de citas.",
          en: "Schematic: banner, book button and appointment list.",
          pt: "Esquema: banner, botão reservar e lista de consultas."
        }
      }
    ],
    paragraphs: [
      {
        es: "En Sesiones verás un resumen de créditos disponibles arriba. El botón principal abre el flujo de reserva con calendario del profesional activo.",
        en: "In Sessions you'll see available credits at the top. The main button opens booking with your active therapist's calendar.",
        pt: "Em Sessões você verá créditos disponíveis no topo. O botão principal abre a reserva com o calendário do profissional ativo."
      }
    ],
    steps: [
      {
        es: "Elegí día y hora con disponibilidad (bloques en verde o según leyenda).",
        en: "Pick day and time with availability (blocks in green or per legend).",
        pt: "Escolha dia e horário com disponibilidade (blocos em verde ou conforme legenda)."
      },
      {
        es: "Confirmá: se descuenta un crédito al confirmar (o usa la sesión de prueba si aplica).",
        en: "Confirm: one credit is used on confirm (or trial session if applicable).",
        pt: "Confirme: um crédito é usado ao confirmar (ou sessão de teste se aplicável)."
      },
      {
        es: "En «Próximas reservas» podés ver detalle, reprogramar o cancelar.",
        en: "Under «Upcoming bookings» you can view detail, reschedule or cancel.",
        pt: "Em «Próximas reservas» pode ver detalhe, reagendar ou cancelar."
      },
      {
        es: "Minutos antes de la sesión, entrá al enlace de videollamada desde la misma tarjeta.",
        en: "Minutes before the session, open the video link from the same card.",
        pt: "Minutos antes da sessão, entre no link de videochamada pelo mesmo cartão."
      }
    ]
  },
  {
    title: { es: "5. Chat y Maca", en: "5. Chat and Maca", pt: "5. Chat e Maca" },
    figures: [
      {
        src: "/help/manual/chat.svg",
        alt: { es: "Interfaz de chat con el profesional", en: "Chat interface with therapist", pt: "Interface de chat com o profissional" },
        caption: {
          es: "Chat: conversación escrita con tu profesional asignado.",
          en: "Chat: written conversation with your assigned therapist.",
          pt: "Chat: conversa escrita com seu profissional atribuído."
        }
      }
    ],
    bullets: [
      {
        body: {
          es: "Chat: mensajes escritos con tu profesional. Ideal para coordinar, compartir novedades o consultas no urgentes entre sesiones.",
          en: "Chat: written messages with your therapist. Good for coordinating, updates or non-urgent questions between sessions.",
          pt: "Chat: mensagens escritas com seu profissional. Ideal para coordenar, compartilhar novidades ou dúvidas não urgentes entre sessões."
        }
      },
      {
        body: {
          es: "Maca (botón flotante): asistente del portal para orientarte en funciones y bienestar general. No atiende emergencias ni reemplaza al profesional.",
          en: "Maca (floating button): portal assistant for features and general wellbeing. Does not handle emergencies or replace your therapist.",
          pt: "Maca (botão flutuante): assistente do portal para funções e bem-estar geral. Não atende emergências nem substitui o profissional."
        }
      },
      {
        body: {
          es: "Urgencias: usá teléfonos del pie de página o servicios de emergencia de tu país (911, 107, 112, etc.).",
          en: "Emergencies: use footer crisis numbers or your country's emergency services (911, 107, 112, etc.).",
          pt: "Urgências: use telefones do rodapé ou serviços de emergência do seu país (911, 107, 112, etc.)."
        }
      }
    ]
  },
  {
    title: { es: "6. Diario emocional", en: "6. Emotional diary", pt: "6. Diário emocional" },
    figures: [
      {
        src: "/images/diario-emocional-hero.png",
        alt: { es: "Inicio del diario emocional", en: "Emotional diary home", pt: "Início do diário emocional" },
        caption: {
          es: "Diario: hero, nueva entrada e historial de notas.",
          en: "Diary: hero, new entry and note history.",
          pt: "Diário: hero, nova entrada e histórico de notas."
        }
      },
      {
        src: "/help/manual/diario.svg",
        alt: { es: "Esquema del diario emocional", en: "Emotional diary schematic", pt: "Esquema do diário emocional" },
        caption: {
          es: "Esquema: estado de ánimo, texto libre y registro.",
          en: "Schematic: mood, free text and records.",
          pt: "Esquema: humor, texto livre e registro."
        }
      }
    ],
    steps: [
      {
        es: "Entrá a Diario emocional → «Nueva entrada» o el botón equivalente.",
        en: "Go to Emotional diary → «New entry» or equivalent button.",
        pt: "Entre em Diário emocional → «Nova entrada» ou botão equivalente."
      },
      {
        es: "Elegí cómo te sentís (estado de ánimo) y, si querés, emociones o actividades sugeridas.",
        en: "Pick how you feel (mood) and optionally suggested emotions or activities.",
        pt: "Escolha como se sente (humor) e, se quiser, emoções ou atividades sugeridas."
      },
      {
        es: "Escribí qué pasó en tus palabras. Guardá la entrada.",
        en: "Write what happened in your words. Save the entry.",
        pt: "Escreva o que aconteceu com suas palavras. Salve a entrada."
      },
      {
        es: "Revisá «Registro» o «Últimas entradas» y tocá «Detalle» para leer una nota completa.",
        en: "Review «Records» or «Recent entries» and tap «Detail» for the full note.",
        pt: "Revise «Registro» ou «Últimas entradas» e toque «Detalhe» para ler a nota completa."
      }
    ]
  },
  {
    title: { es: "7. Música relajante y ejercicios", en: "7. Relaxing music and exercises", pt: "7. Música relaxante e exercícios" },
    figures: [
      {
        src: "/help/manual/musica.svg",
        alt: { es: "Biblioteca de música relajante", en: "Relaxing music library", pt: "Biblioteca de música relaxante" },
        caption: {
          es: "Música: categorías, reproductor y grilla de videos.",
          en: "Music: categories, player and video grid.",
          pt: "Música: categorias, player e grade de vídeos."
        }
      }
    ],
    paragraphs: [
      {
        es: "Música relajante: filtrá por categoría (lofi, piano, naturaleza…), elegí un video y reproducilo en el portal. Si no carga, «Abrir en YouTube» siempre funciona.",
        en: "Relaxing music: filter by category (lofi, piano, nature…), pick a video and play in the portal. If it doesn't load, «Open in YouTube» always works.",
        pt: "Música relaxante: filtre por categoria (lofi, piano, natureza…), escolha um vídeo e reproduza no portal. Se não carregar, «Abrir no YouTube» sempre funciona."
      },
      {
        es: "Ejercicios: lista de prácticas con duración estimada. Abrí cada una y seguí los pasos en pantalla; podés repetirlas cuando lo necesites.",
        en: "Exercises: list of practices with estimated duration. Open each and follow on-screen steps; repeat whenever you need.",
        pt: "Exercícios: lista de práticas com duração estimada. Abra cada uma e siga os passos na tela; repita quando precisar."
      }
    ]
  },
  {
    title: { es: "8. Profesionales y favoritos", en: "8. Therapists and favorites", pt: "8. Profissionais e favoritos" },
    paragraphs: [
      {
        es: "En Profesionales navegás fichas con foto, título, años de experiencia y áreas de trabajo. Tocá una tarjeta para ver el perfil completo.",
        en: "In Professionals you browse cards with photo, title, years of experience and focus areas. Tap a card for the full profile.",
        pt: "Em Profissionais você navega fichas com foto, título, anos de experiência e áreas de atuação. Toque um cartão para ver o perfil completo."
      },
      {
        es: "El icono de corazón (arriba a la derecha en escritorio) abre favoritos guardados. Útil si estás comparando opciones antes de la sesión de prueba.",
        en: "The heart icon (top right on desktop) opens saved favorites. Useful when comparing options before a trial session.",
        pt: "O ícone de coração (canto superior direito no desktop) abre favoritos salvos. Útil ao comparar opções antes da sessão de teste."
      }
    ]
  },
  {
    title: { es: "9. Perfil, preferencias y soporte", en: "9. Profile, preferences and support", pt: "9. Perfil, preferências e suporte" },
    bullets: [
      {
        label: { es: "Perfil", en: "Profile", pt: "Perfil" },
        body: {
          es: "Actualizá nombre visible, foto (tocá el avatar en Inicio o Perfil) y datos de contacto.",
          en: "Update display name, photo (tap avatar on Home or Profile) and contact details.",
          pt: "Atualize nome exibido, foto (toque o avatar em Início ou Perfil) e dados de contato."
        }
      },
      {
        label: { es: "Preferencias", en: "Preferences", pt: "Preferências" },
        body: {
          es: "Idioma, moneda y zona horaria desde menú ☰.",
          en: "Language, currency and timezone from ☰ menu.",
          pt: "Idioma, moeda e fuso horário pelo menu ☰."
        }
      },
      {
        label: { es: "Soporte", en: "Support", pt: "Suporte" },
        body: {
          es: "Solicitud de cambio de profesional y contacto a soporte@motivarcare.com.",
          en: "Therapist change request and contact at soporte@motivarcare.com.",
          pt: "Solicitação de troca de profissional e contato em soporte@motivarcare.com."
        }
      }
    ]
  },
  {
    title: { es: "10. Iconos del encabezado", en: "10. Header icons", pt: "10. Ícones do cabeçalho" },
    bullets: [
      {
        body: {
          es: "Corazón: lista de profesionales favoritos.",
          en: "Heart: list of favorite therapists.",
          pt: "Coração: lista de profissionais favoritos."
        }
      },
      {
        body: {
          es: "Campana: notificaciones de sesiones, mensajes y avisos del portal.",
          en: "Bell: notifications for sessions, messages and portal alerts.",
          pt: "Sino: notificações de sessões, mensagens e avisos do portal."
        }
      },
      {
        body: {
          es: "Menú ☰: Mi cuenta, Preferencias (idioma/moneda/zona horaria) y Cerrar sesión.",
          en: "Menu ☰: My account, Preferences (language/currency/timezone) and Sign out.",
          pt: "Menu ☰: Minha conta, Preferências (idioma/moeda/fuso) e Sair."
        }
      }
    ]
  },
  {
    title: { es: "11. Móvil vs escritorio", en: "11. Mobile vs desktop", pt: "11. Móvel vs desktop" },
    paragraphs: [
      {
        es: "En celular, el menú principal está en la barra inferior (Inicio, Sesiones, Diario, etc.). Los iconos de favoritos, notificaciones y menú siguen arriba a la derecha en la mayoría de pantallas.",
        en: "On mobile, main navigation is the bottom bar (Home, Sessions, Diary, etc.). Favorites, notifications and menu icons stay top right on most screens.",
        pt: "No celular, a navegação principal é a barra inferior (Início, Sessões, Diário, etc.). Favoritos, notificações e menu permanecem no canto superior direito na maioria das telas."
      },
      {
        es: "En escritorio, usás el menú lateral izquierdo. El pie de página muestra soporte, ayuda, legales y teléfonos según tu país.",
        en: "On desktop, use the left sidebar. The footer shows support, help, legal links and phones for your country.",
        pt: "No desktop, use o menu lateral esquerdo. O rodapé mostra suporte, ajuda, legais e telefones conforme seu país."
      }
    ]
  },
  {
    title: { es: "12. Más ayuda", en: "12. More help", pt: "12. Mais ajuda" },
    paragraphs: [
      {
        es: "Preguntas frecuentes: respuestas cortas a dudas habituales. Pie de página: soporte@motivarcare.com, términos, privacidad y líneas de crisis.",
        en: "FAQ: short answers to common questions. Footer: soporte@motivarcare.com, terms, privacy and crisis lines.",
        pt: "Perguntas frequentes: respostas curtas a dúvidas comuns. Rodapé: soporte@motivarcare.com, termos, privacidade e linhas de crise."
      },
      {
        es: "Si algo no está en esta guía, escribinos con el mayor detalle posible (navegador, dispositivo y pasos que seguiste).",
        en: "If something isn't in this guide, write to us with as much detail as possible (browser, device and steps you followed).",
        pt: "Se algo não estiver neste guia, escreva com o máximo de detalhes (navegador, dispositivo e passos que seguiu)."
      }
    ]
  }
];
