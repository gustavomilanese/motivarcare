import type { HelpManualSection } from "./helpTypes";

export const PATIENT_MANUAL_SECTIONS: HelpManualSection[] = [
  {
    title: { es: "1. Bienvenida", en: "1. Welcome", pt: "1. Boas-vindas" },
    figures: [
      {
        src: "/help/manual/inicio.png",
        alt: {
          es: "Pantalla de Inicio del portal",
          en: "Portal Home screen",
          pt: "Tela de Início do portal"
        },
        caption: {
          es: "Así se ve Inicio: próxima sesión, tu profesional y Entre sesiones.",
          en: "This is Home: next session, your therapist and Between sessions.",
          pt: "Assim é o Início: próxima sessão, seu profissional e Entre sessões."
        }
      }
    ],
    paragraphs: [
      {
        es: "MotivarCare es tu portal para terapia online: reservar sesiones, escribirle a tu profesional, llevar el diario, practicar bienestar y pagar en moneda local cuando tu país está cubierto.",
        en: "MotivarCare is your portal for online therapy: book sessions, message your therapist, keep a diary, practice wellbeing and pay in local currency when your country is covered.",
        pt: "MotivarCare é seu portal de terapia online: reservar sessões, escrever ao profissional, manter o diário, praticar bem-estar e pagar em moeda local quando o país está coberto."
      },
      {
        es: "Este manual sigue las pantallas actuales del portal (diseño calm). No hace falta leerlo entero: usá el menú lateral en escritorio o la barra inferior en el celular.",
        en: "This manual follows the current portal screens (calm design). You don't need to read it all: use the sidebar on desktop or the bottom bar on mobile.",
        pt: "Este manual segue as telas atuais do portal (design calm). Não precisa ler tudo: use o menu lateral no desktop ou a barra inferior no celular."
      }
    ]
  },
  {
    title: { es: "2. Mapa del portal", en: "2. Portal map", pt: "2. Mapa do portal" },
    figures: [
      {
        src: "/help/manual/cuenta.png",
        alt: {
          es: "Menú de cuenta abierto sobre Inicio",
          en: "Account menu open over Home",
          pt: "Menu da conta aberto sobre o Início"
        },
        caption: {
          es: "Tocá tu nombre (arriba a la derecha) para abrir Cuenta, Preferencias, Ayuda y Legal. A la izquierda está el menú principal.",
          en: "Tap your name (top right) to open Account, Preferences, Help and Legal. The main menu is on the left.",
          pt: "Toque seu nome (canto superior direito) para abrir Conta, Preferências, Ajuda e Legal. O menu principal fica à esquerda."
        }
      }
    ],
    bullets: [
      {
        label: { es: "Inicio", en: "Home", pt: "Início" },
        body: {
          es: "Tu día: próxima sesión, profesional, esta semana y el bloque Entre sesiones (ánimo, respiración, diario).",
          en: "Your day: next session, therapist, this week and Between sessions (mood, breath, diary).",
          pt: "Seu dia: próxima sessão, profissional, esta semana e Entre sessões (humor, respiração, diário)."
        }
      },
      {
        label: { es: "Mensajes", en: "Messages", pt: "Mensagens" },
        body: {
          es: "Chat escrito con tu profesional asignado (no es videollamada ni Maca).",
          en: "Written chat with your assigned therapist (not video call or Maca).",
          pt: "Chat escrito com seu profissional (não é videochamada nem a Maca)."
        }
      },
      {
        label: { es: "Sesiones", en: "Sessions", pt: "Sessões" },
        body: {
          es: "Agenda, calendario, créditos, reservar, reprogramar, cancelar y comprar paquetes.",
          en: "Agenda, calendar, credits, book, reschedule, cancel and buy packages.",
          pt: "Agenda, calendário, créditos, reservar, reagendar, cancelar e comprar pacotes."
        }
      },
      {
        label: { es: "Diario", en: "Diary", pt: "Diário" },
        body: {
          es: "Check-in del día, nuevas entradas y registro. Desde el lateral podés ir a música o ejercicios.",
          en: "Daily check-in, new entries and history. Side links go to music or exercises.",
          pt: "Check-in do dia, novas entradas e registro. O lateral leva a música ou exercícios."
        }
      },
      {
        label: { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" },
        body: {
          es: "Ejercicios guiados con filtros (respiración, postura, anclaje…) y rutinas en el panel lateral.",
          en: "Guided exercises with filters (breath, posture, grounding…) and routines in the side panel.",
          pt: "Exercícios guiados com filtros (respiração, postura, ancoragem…) e rotinas no painel lateral."
        }
      },
      {
        label: { es: "Campana", en: "Bell", pt: "Sino" },
        body: {
          es: "Panel de notificaciones. El engranaje abre Ajustes de avisos.",
          en: "Notifications panel. The gear opens alert settings.",
          pt: "Painel de notificações. A engrenagem abre Ajustes de avisos."
        }
      },
      {
        label: { es: "Menú de cuenta", en: "Account menu", pt: "Menu da conta" },
        body: {
          es: "Tocá tu nombre (inicial + nombre). Ahí están datos, actividad, idioma/moneda, notificaciones, ayuda y cerrar sesión.",
          en: "Tap your name (initial + name). There you find profile data, activity, language/currency, notifications, help and sign out.",
          pt: "Toque seu nome (inicial + nome). Lá estão dados, atividade, idioma/moeda, notificações, ajuda e sair."
        }
      },
      {
        label: { es: "Hablar con Maca", en: "Talk to Maca", pt: "Falar com a Maca" },
        body: {
          es: "Botón flotante: asistente del portal. Orienta en funciones y bienestar; no reemplaza a tu profesional ni atiende urgencias.",
          en: "Floating button: portal assistant. Helps with features and wellbeing; does not replace your therapist or handle emergencies.",
          pt: "Botão flutuante: assistente do portal. Orienta funções e bem-estar; não substitui o profissional nem atende urgências."
        }
      }
    ]
  },
  {
    title: { es: "3. Primeros pasos", en: "3. First steps", pt: "3. Primeiros passos" },
    steps: [
      {
        es: "Registrate e iniciá sesión con tu email.",
        en: "Register and sign in with your email.",
        pt: "Cadastre-se e entre com seu e-mail."
      },
      {
        es: "Completá el cuestionario inicial con honestidad: ayuda al matching y a detectar situaciones de riesgo.",
        en: "Complete the intake questionnaire honestly: it helps matching and risk detection.",
        pt: "Preencha o questionário inicial com honestidade: ajuda no matching e na detecção de risco."
      },
      {
        es: "En Inicio seguí «Tu primera sesión, en 4 pasos» o elegí profesional / sesión de prueba según lo que veas.",
        en: "On Home follow «Your first session, in 4 steps» or pick a therapist / trial session as shown.",
        pt: "Em Início siga «Sua primeira sessão, em 4 passos» ou escolha profissional / sessão de teste conforme a tela."
      },
      {
        es: "Reservá desde Inicio o Sesiones. Si necesitás créditos, usá «Comprar sesiones» y el flujo de pago.",
        en: "Book from Home or Sessions. If you need credits, use «Buy sessions» and the payment flow.",
        pt: "Reserve em Início ou Sessões. Se precisar de créditos, use «Comprar sessões» e o fluxo de pagamento."
      },
      {
        es: "Opcional: abrí Tour con Maca (abajo en el menú lateral) para un recorrido guiado.",
        en: "Optional: open Tour with Maca (bottom of the sidebar) for a guided walkthrough.",
        pt: "Opcional: abra Tour com a Maca (rodapé do menu lateral) para um passeio guiado."
      }
    ]
  },
  {
    title: { es: "4. Inicio", en: "4. Home", pt: "4. Início" },
    paragraphs: [
      {
        es: "El saludo («Hola, …») resume tu momento: bienvenida, próxima sesión o acompañamiento entre encuentros.",
        en: "The greeting («Hi, …») reflects where you are: welcome, next session or between-session support.",
        pt: "A saudação («Olá, …») resume o momento: boas-vindas, próxima sessão ou apoio entre encontros."
      }
    ],
    bullets: [
      {
        label: { es: "Próxima sesión", en: "Next session", pt: "Próxima sessão" },
        body: {
          es: "Card con horario (Hoy / Próxima / En curso). Acciones: Entrar a la sesión, Ver detalle. Si no hay reserva: Reservar sesión, Elegir profesional o Sesión de prueba.",
          en: "Card with timing (Today / Upcoming / In progress). Actions: Join session, View details. If none booked: Book session, Choose therapist or Trial session.",
          pt: "Card com horário (Hoje / Próxima / Em andamento). Ações: Entrar na sessão, Ver detalhe. Sem reserva: Reservar sessão, Escolher profissional ou Sessão de teste."
        }
      },
      {
        label: { es: "Tu profesional", en: "Your therapist", pt: "Seu profissional" },
        body: {
          es: "Panel lateral con Escribile y Ver perfil. También puede mostrar un mensaje reciente con Responder.",
          en: "Side panel with Message them and View profile. It may also show a recent message with Reply.",
          pt: "Painel lateral com Escreva e Ver perfil. Também pode mostrar mensagem recente com Responder."
        }
      },
      {
        label: { es: "Esta semana", en: "This week", pt: "Esta semana" },
        body: {
          es: "Franja de la semana. Ver el mes abre el calendario ampliado.",
          en: "Week strip. View the month opens the wider calendar.",
          pt: "Faixa da semana. Ver o mês abre o calendário ampliado."
        }
      },
      {
        label: { es: "Entre sesiones", en: "Between sessions", pt: "Entre sessões" },
        body: {
          es: "¿Cómo está tu día? (climas Tormenta → Despejado), gráfico Tu semana, respiración con Empezar, e Ir al diario.",
          en: "How is your day? (climates Storm → Clear), Your week chart, breath with Start, and Go to diary.",
          pt: "Como está seu dia? (climas Tempestade → Limpo), gráfico Sua semana, respiração com Começar, e Ir ao diário."
        }
      }
    ]
  },
  {
    title: { es: "5. Sesiones y pagos", en: "5. Sessions and payments", pt: "5. Sessões e pagamentos" },
    figures: [
      {
        src: "/help/manual/sesiones.png",
        alt: {
          es: "Pantalla Tus sesiones",
          en: "Your sessions screen",
          pt: "Tela Suas sessões"
        },
        caption: {
          es: "Pantalla real de Sesiones: próxima cita, listado, calendario y créditos a la derecha.",
          en: "Real Sessions screen: next appointment, list, calendar and credits on the right.",
          pt: "Tela real de Sessões: próxima consulta, lista, calendário e créditos à direita."
        }
      }
    ],
    paragraphs: [
      {
        es: "La página se llama «Tus sesiones». Arriba ves sesiones disponibles y acciones Reservar / Comprar sesiones. El detalle de una cita permite Entrar a la sesión, Reprogramar o Cancelar sesión.",
        en: "The page is titled «Your sessions». At the top you see available sessions and Book / Buy sessions. Session detail allows Join session, Reschedule or Cancel session.",
        pt: "A página se chama «Suas sessões». No topo vê sessões disponíveis e Reservar / Comprar sessões. O detalhe permite Entrar na sessão, Reagendar ou Cancelar sessão."
      }
    ],
    steps: [
      {
        es: "Tocá Reservar (o Reservar sesión) y elegí un horario disponible con tu profesional.",
        en: "Tap Book (or Book session) and pick an available time with your therapist.",
        pt: "Toque Reservar (ou Reservar sessão) e escolha um horário disponível com seu profissional."
      },
      {
        es: "Si no tenés créditos: Elegí cómo pagar → una sesión o un paquete (el precio se muestra en tu moneda local cuando aplica) → Continuar al pago.",
        en: "If you have no credits: Choose how to pay → one session or a package (price shows in your local currency when applicable) → Continue to payment.",
        pt: "Se não tiver créditos: Escolha como pagar → uma sessão ou um pacote (preço na moeda local quando aplicável) → Continuar para o pagamento."
      },
      {
        es: "Completá el checkout (DLocal). Al volver, los créditos o la reserva se confirman en el portal.",
        en: "Complete checkout (DLocal). When you return, credits or the booking are confirmed in the portal.",
        pt: "Conclua o checkout (DLocal). Ao voltar, os créditos ou a reserva se confirmam no portal."
      },
      {
        es: "Minutos antes del encuentro, usá Entrar a la sesión desde Inicio o desde la tarjeta de Sesiones.",
        en: "Minutes before the meeting, use Join session from Home or from the Sessions card.",
        pt: "Minutos antes do encontro, use Entrar na sessão em Início ou no card de Sessões."
      }
    ]
  },
  {
    title: { es: "6. Mensajes y Maca", en: "6. Messages and Maca", pt: "6. Mensagens e Maca" },
    figures: [
      {
        src: "/help/manual/mensajes.png",
        alt: {
          es: "Pantalla Mensajes",
          en: "Messages screen",
          pt: "Tela Mensagens"
        },
        caption: {
          es: "Pantalla real de Mensajes con tu profesional, el cuadro para escribir y el panel lateral.",
          en: "Real Messages screen with your therapist, the compose box and the side panel.",
          pt: "Tela real de Mensagens com seu profissional, a caixa de texto e o painel lateral."
        }
      }
    ],
    bullets: [
      {
        body: {
          es: "Mensajes: conversación escrita. Podés Reservar sesión desde el encabezado, compartir una entrada del diario (Compartir del diario) y ver Compartido en el chat.",
          en: "Messages: written conversation. You can Book session from the header, share a diary entry (Share from diary) and see Shared in chat.",
          pt: "Mensagens: conversa escrita. Pode Reservar sessão no cabeçalho, compartilhar entrada do diário e ver Compartilhado no chat."
        }
      },
      {
        body: {
          es: "El aviso «Este chat no es para urgencias» remite a Líneas de apoyo.",
          en: "The notice «This chat is not for emergencies» links to Support lines.",
          pt: "O aviso «Este chat não é para urgências» aponta para Linhas de apoio."
        }
      },
      {
        body: {
          es: "Hablar con Maca (flotante): ayuda del portal. Podés aceptar compartir un resumen con tu profesional cuando la app lo ofrezca. No atiende emergencias.",
          en: "Talk to Maca (floating): portal help. You may agree to share a summary with your therapist when offered. Does not handle emergencies.",
          pt: "Falar com a Maca (flutuante): ajuda do portal. Pode aceitar compartilhar um resumo com o profissional quando a app oferecer. Não atende emergências."
        }
      }
    ]
  },
  {
    title: { es: "7. Diario", en: "7. Diary", pt: "7. Diário" },
    figures: [
      {
        src: "/help/manual/diario.png",
        alt: {
          es: "Pantalla Tu diario",
          en: "Your diary screen",
          pt: "Tela Seu diário"
        },
        caption: {
          es: "Pantalla real del Diario: ¿Cómo está tu día?, entradas recientes y recursos a la derecha.",
          en: "Real Diary screen: How is your day?, recent entries and resources on the right.",
          pt: "Tela real do Diário: Como está seu dia?, entradas recentes e recursos à direita."
        }
      }
    ],
    steps: [
      {
        es: "En Diario («Tu diario») marcá ¿Cómo está tu día? o tocá Nueva entrada.",
        en: "In Diary («Your diary») set How is your day? or tap New entry.",
        pt: "Em Diário («Seu diário») marque Como está seu dia? ou toque Nova entrada."
      },
      {
        es: "En Contale a tu diario: clima, ¿Qué pasó hoy?, ¿Qué sentiste?, pensamiento y ¿Qué necesitás ahora?",
        en: "In Tell your diary: climate, What happened today?, What did you feel?, thought and What do you need now?",
        pt: "Em Conte ao seu diário: clima, O que aconteceu hoje?, O que sentiu?, pensamento e Do que precisa agora?"
      },
      {
        es: "Elegí visibilidad Solo yo o Para mi psicólogo/a y Guardar entrada.",
        en: "Choose visibility Only me or For my therapist and Save entry.",
        pt: "Escolha visibilidade Só eu ou Para meu psicólogo/a e Salvar entrada."
      },
      {
        es: "Volvé al listado Últimas entradas para releer. El lateral ofrece Música relajante, ejercicios y preparar la próxima sesión.",
        en: "Return to Recent entries to reread. The side panel offers Relaxing music, exercises and prepare next session.",
        pt: "Volte às Últimas entradas para reler. O lateral oferece Música relaxante, exercícios e preparar a próxima sessão."
      }
    ]
  },
  {
    title: { es: "8. Bienestar y música", en: "8. Wellbeing and music", pt: "8. Bem-estar e música" },
    figures: [
      {
        src: "/help/manual/bienestar.png",
        alt: {
          es: "Pantalla Tu bienestar",
          en: "Your wellbeing screen",
          pt: "Tela Seu bem-estar"
        },
        caption: {
          es: "Pantalla real de Bienestar: filtros, prácticas y rutinas guiadas a la derecha.",
          en: "Real Wellbeing screen: filters, practices and guided routines on the right.",
          pt: "Tela real de Bem-estar: filtros, práticas e rotinas guiadas à direita."
        }
      }
    ],
    paragraphs: [
      {
        es: "En Bienestar («Tu bienestar») filtrá por Todos, Respiración, Postura, Anclaje, Movimiento, Relajación o Mindfulness. Abrí una tarjeta para seguir los pasos; las rutinas aparecen a la derecha y el reproductor ocupa el centro al iniciarlas.",
        en: "In Wellbeing («Your wellbeing») filter by All, Breath, Posture, Grounding, Movement, Relaxation or Mindfulness. Open a card to follow the steps; routines appear on the right and the player takes the center when you start one.",
        pt: "Em Bem-estar («Seu bem-estar») filtre por Todos, Respiração, Postura, Ancoragem, Movimento, Relaxamento ou Mindfulness. Abra um card para seguir os passos; as rotinas ficam à direita e o player ocupa o centro ao iniciar."
      },
      {
        es: "Música para relajar está en /bienestar/musica (también desde el lateral del Diario). Filtrá por categoría y reproducí en el portal.",
        en: "Music to relax is at /bienestar/musica (also from the Diary side panel). Filter by category and play in the portal.",
        pt: "Música para relaxar está em /bienestar/musica (também pelo lateral do Diário). Filtre por categoria e reproduza no portal."
      }
    ]
  },
  {
    title: { es: "9. Cuenta, ajustes y soporte", en: "9. Account, settings and support", pt: "9. Conta, ajustes e suporte" },
    bullets: [
      {
        label: { es: "Datos personales", en: "Personal details", pt: "Dados pessoais" },
        body: {
          es: "Menú de cuenta → Datos personales: foto, teléfono, contacto de emergencia, zona horaria y Guardar perfil.",
          en: "Account menu → Personal details: photo, phone, emergency contact, time zone and Save profile.",
          pt: "Menu da conta → Dados pessoais: foto, telefone, contato de emergência, fuso e Salvar perfil."
        }
      },
      {
        label: { es: "Actividad de sesiones", en: "Session activity", pt: "Atividade de sessões" },
        body: {
          es: "Resumen de paquete y sesiones disponibles. Las compras se hacen desde Sesiones.",
          en: "Package summary and available sessions. Purchases happen from Sessions.",
          pt: "Resumo do pacote e sessões disponíveis. As compras são em Sessões."
        }
      },
      {
        label: { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" },
        body: {
          es: "Modal desde Preferencias. Afecta textos del portal y cómo se muestran precios en este dispositivo.",
          en: "Modal from Preferences. Affects portal text and how prices display on this device.",
          pt: "Modal em Preferências. Afeta textos do portal e como os preços aparecem neste dispositivo."
        }
      },
      {
        label: { es: "Notificaciones", en: "Notifications", pt: "Notificações" },
        body: {
          es: "Ajustes: email, recordatorios de sesión, tipos de aviso en el panel y Google Calendar.",
          en: "Settings: email, session reminders, panel alert types and Google Calendar.",
          pt: "Ajustes: e-mail, lembretes de sessão, tipos de aviso no painel e Google Calendar."
        }
      },
      {
        label: { es: "Soporte", en: "Support", pt: "Suporte" },
        body: {
          es: "Solicitar cambio de profesional y otras consultas. También soporte@motivarcare.com.",
          en: "Request a therapist change and other requests. Also soporte@motivarcare.com.",
          pt: "Solicitar troca de profissional e outras consultas. Também soporte@motivarcare.com."
        }
      },
      {
        label: { es: "Ayuda y legal", en: "Help and legal", pt: "Ajuda e legal" },
        body: {
          es: "Preguntas frecuentes, este manual, términos, privacidad y líneas de apoyo.",
          en: "FAQ, this manual, terms, privacy and support lines.",
          pt: "Perguntas frequentes, este manual, termos, privacidade e linhas de apoio."
        }
      }
    ]
  },
  {
    title: { es: "10. Escritorio y móvil", en: "10. Desktop and mobile", pt: "10. Desktop e móvel" },
    paragraphs: [
      {
        es: "Escritorio: menú lateral izquierdo (Inicio, Mensajes, Sesiones, Diario, Bienestar), Tour con Maca y Líneas de apoyo abajo. Campana y cuenta arriba a la derecha.",
        en: "Desktop: left sidebar (Home, Messages, Sessions, Diary, Wellbeing), Tour with Maca and Support lines at the bottom. Bell and account top right.",
        pt: "Desktop: menu lateral esquerdo (Início, Mensagens, Sessões, Diário, Bem-estar), Tour com a Maca e Linhas de apoio embaixo. Sino e conta no canto superior direito."
      },
      {
        es: "Móvil: la misma navegación en la barra inferior. Notificaciones y cuenta siguen arriba. El menú de cuenta y el de notificaciones pueden abrirse como hoja desde abajo.",
        en: "Mobile: the same navigation in the bottom bar. Notifications and account stay on top. Account and notifications menus may open as bottom sheets.",
        pt: "Móvel: a mesma navegação na barra inferior. Notificações e conta ficam no topo. Menus de conta e notificações podem abrir como folhas de baixo."
      }
    ]
  },
  {
    title: { es: "11. Más ayuda", en: "11. More help", pt: "11. Mais ajuda" },
    paragraphs: [
      {
        es: "Preguntas frecuentes: respuestas cortas. Pie de página: soporte@motivarcare.com, legales y teléfonos útiles según tu país.",
        en: "FAQ: short answers. Footer: soporte@motivarcare.com, legal links and useful numbers for your country.",
        pt: "Perguntas frequentes: respostas curtas. Rodapé: soporte@motivarcare.com, legais e telefones úteis conforme seu país."
      },
      {
        es: "Si algo no está en esta guía, escribinos con navegador, dispositivo y los pasos que seguiste.",
        en: "If something isn't in this guide, write with browser, device and the steps you followed.",
        pt: "Se algo não estiver neste guia, escreva com navegador, dispositivo e os passos que seguiu."
      }
    ]
  }
];
