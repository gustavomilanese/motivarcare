import { useEffect, useRef } from "react";
import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** SVG compacto de Maca (asistente); gradiente violeta, sin asset externo. */
function macaAvatarSvg(size: "large" | "small"): string {
  const dim = size === "large" ? 72 : 44;
  const uid = `maca-${size}-${Math.random().toString(36).slice(2, 9)}`;
  return `
<svg class="patient-tour-maca-svg patient-tour-maca-svg--${size}" width="${dim}" height="${dim}" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="${uid}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#5f44eb"/>
    </linearGradient>
    <filter id="${uid}-s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <circle cx="32" cy="34" r="26" fill="url(#${uid}-g)" filter="url(#${uid}-s)"/>
  <ellipse cx="32" cy="30" rx="18" ry="16" fill="rgba(255,255,255,0.22)"/>
  <ellipse cx="24" cy="28" rx="4.5" ry="5.5" fill="#fff"/>
  <ellipse cx="40" cy="28" rx="4.5" ry="5.5" fill="#fff"/>
  <ellipse cx="24" cy="29" rx="2" ry="2.5" fill="#3730a3"/>
  <ellipse cx="40" cy="29" rx="2" ry="2.5" fill="#3730a3"/>
  <path d="M26 38 Q32 44 38 38" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse cx="32" cy="48" rx="6" ry="3" fill="rgba(255,255,255,0.35)"/>
</svg>`.trim();
}

function isHomeMlChrome(): boolean {
  return Boolean(document.querySelector(".portal-shell--home-ml"));
}

function welcomeInjectHtml(language: AppLanguage): string {
  return `
<div class="patient-tour-welcome-shell patient-tour-welcome-shell--cinematic">
  <div class="patient-tour-cinematic-hero" aria-hidden="true">
    <video
      class="patient-tour-cinematic-video"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      poster="/images/hero-therapy.jpg"
    >
      <source src="/videos/tour-welcome.mp4" type="video/mp4" />
    </video>
    <div class="patient-tour-cinematic-fade"></div>
  </div>
  <div class="patient-tour-welcome-body">
    <span class="patient-tour-eyebrow">${t(language, {
      es: "Tour guiado",
      en: "Guided tour",
      pt: "Tour guiado"
    })}</span>
    <div class="patient-tour-welcome-head">
      <div class="patient-tour-maca-hero__avatar" aria-hidden="true">${macaAvatarSvg("large")}</div>
      <div>
        <h2 class="patient-tour-welcome-h">${t(language, {
          es: "Un tour con Maca",
          en: "A tour with Maca",
          pt: "Um tour com a Maca"
        })}</h2>
        <p class="patient-tour-maca-hero__hi">${t(language, {
          es: "¡Hola! Yo soy <strong>Maca</strong> y te acompaño en esto.",
          en: "Hi! I'm <strong>Maca</strong> and I'll walk you through this.",
          pt: "Ola! Eu sou a <strong>Maca</strong> e vou te acompanhar."
        })}</p>
      </div>
    </div>
    <p class="patient-tour-maca-hero__lead">${t(language, {
      es: isHomeMlChrome()
        ? "Te muestro el menú, tu saldo, los atajos, Sesiones, Diario, Ejercicios, Música y dónde encontrarme. Sin prisa."
        : "En pocos pasos te muestro el menú, tus reservas y dónde encontrarme. Sin prisa, con buena onda.",
      en: isHomeMlChrome()
        ? "I'll show you the menu, your balance, shortcuts, Sessions, Diary, Exercises, Music, and where to find me. No rush."
        : "In a few steps I'll show you the menu, your bookings, and where to find me. No rush — just good vibes.",
      pt: isHomeMlChrome()
        ? "Mostro o menu, seu saldo, atalhos, Sessoes, Diario, Exercicios, Musica e onde me achar. Sem pressa."
        : "Em poucos passos mostro o menu, suas reservas e onde me achar. Sem pressa."
    })}</p>
    <p class="patient-tour-maca-hero__fine">${t(language, {
      es: "Podés saltear cuando quieras con la × arriba a la derecha.",
      en: "You can skip anytime with the × at the top right.",
      pt: "Voce pode pular quando quiser com o × no canto superior direito."
    })}</p>
  </div>
</div>`.trim();
}

function sidebarMenuHtml(language: AppLanguage): string {
  const isHomeMl = isHomeMlChrome();
  const items: LocalizedText[] = isHomeMl
    ? [
        {
          es: "<strong>Inicio</strong> — tu panel y próximos pasos",
          en: "<strong>Home</strong> — your dashboard and next steps",
          pt: "<strong>Inicio</strong> — seu painel e proximos passos"
        },
        {
          es: "<strong>Sesiones</strong> — reservar y ver turnos",
          en: "<strong>Sessions</strong> — book and manage slots",
          pt: "<strong>Sessoes</strong> — agendar e ver horarios"
        },
        {
          es: "<strong>Chat</strong> — mensajes con tu profesional",
          en: "<strong>Chat</strong> — message your professional",
          pt: "<strong>Chat</strong> — mensagens com seu profissional"
        },
        {
          es: "<strong>Diario</strong> — registrá cómo te sentís",
          en: "<strong>Diary</strong> — log how you feel",
          pt: "<strong>Diario</strong> — registre como se sente"
        },
        {
          es: "<strong>Ejercicios</strong> — recursos entre sesiones",
          en: "<strong>Exercises</strong> — resources between sessions",
          pt: "<strong>Exercicios</strong> — recursos entre sessoes"
        },
        {
          es: "<strong>Música</strong> — sonidos para acompañarte",
          en: "<strong>Music</strong> — sounds to unwind",
          pt: "<strong>Musica</strong> — sons para relaxar"
        }
      ]
    : [
        {
          es: "<strong>Inicio</strong> — tu panel y resumen",
          en: "<strong>Home</strong> — your dashboard snapshot",
          pt: "<strong>Inicio</strong> — seu painel e resumo"
        },
        {
          es: "<strong>Sesiones</strong> — reservar y ver turnos",
          en: "<strong>Sessions</strong> — book and manage slots",
          pt: "<strong>Sessoes</strong> — agendar e ver horarios"
        },
        {
          es: "<strong>Diario emocional</strong> — registrá cómo te sentís",
          en: "<strong>Emotional diary</strong> — log how you feel",
          pt: "<strong>Diário emocional</strong> — registre como se sente"
        },
        {
          es: "<strong>Ejercicios</strong> — recursos entre sesión y sesión",
          en: "<strong>Exercises</strong> — resources between sessions",
          pt: "<strong>Exercicios</strong> — recursos entre sessoes"
        },
        {
          es: "<strong>Música relajante</strong> — sonidos para acompañarte",
          en: "<strong>Relaxing music</strong> — sounds to unwind",
          pt: "<strong>Musica relaxante</strong> — sons para relaxar"
        },
        {
          es: "<strong>Chat</strong> — mensajes con tu equipo",
          en: "<strong>Chat</strong> — message your team",
          pt: "<strong>Chat</strong> — mensagens com a equipe"
        }
      ];
  const intro = t(language, {
    es: isHomeMl
      ? "Pasá el mouse por el borde izquierdo para abrirlo. Abajo también están el tour y tu cuenta."
      : "Cada ítem te lleva a un lugar distinto. En una línea:",
    en: isHomeMl
      ? "Hover the left edge to open it. The tour and your account sit at the bottom."
      : "Each item takes you somewhere new. In one line each:",
    pt: isHomeMl
      ? "Passe o mouse na borda esquerda para abrir. Embaixo ficam o tour e sua conta."
      : "Cada item leva a um lugar. Em uma linha:"
  });
  const lis = items.map((text) => `<li>${t(language, text)}</li>`).join("");
  return `
<div class="patient-tour-sidebar-wrap">
  <div class="patient-tour-maca-mini" aria-hidden="true">${macaAvatarSvg("small")}</div>
  <p class="patient-tour-sidebar-intro">${intro}</p>
  <ul class="patient-tour-menu-hints">${lis}</ul>
</div>`.trim();
}

function setHomeMlRailTourExpanded(expanded: boolean): void {
  const rail = document.querySelector(".portal-home-ml-rail");
  if (!(rail instanceof HTMLElement)) {
    return;
  }
  rail.classList.toggle("is-tour-expanded", expanded);
}

function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function pickVisible(...selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (isVisible(el)) {
      return el;
    }
  }
  return null;
}

function tourStorageKey(sessionUserId: string): string {
  // v3: tour reescrito para Inicio ML (atajos, créditos, menú rail).
  return `motivarcare.patient.dashboardTour.v3.${sessionUserId}`;
}

export interface DashboardTourBookingContext {
  /** Hay al menos una reserva confirmada futura (p. ej. cuenta demo / reviewer). */
  hasUpcomingConfirmed: boolean;
  /** Alguna reserva futura ya tiene enlace de videollamada (Meet u otro). */
  hasUpcomingMeetLink: boolean;
}

function pushJoinMeetStep(steps: DriveStep[], language: AppLanguage): void {
  if (!pickVisible('[data-tour="patient-join-first-meet"]')) {
    return;
  }
  steps.push({
    element: '[data-tour="patient-join-first-meet"]',
    popover: {
      title: t(language, {
        es: "Unirte a la sesión (Meet)",
        en: "Join your session (Meet)",
        pt: "Entrar na sessao (Meet)"
      }),
      description: t(language, {
        es: "Cuando llegue el horario, tocá acá para entrar. Se abre Google Meet en una pestaña nueva.",
        en: "When it is time, tap here to join. Google Meet opens in a new tab.",
        pt: "Na hora, toque aqui para entrar. O Google Meet abre numa nova aba."
      }),
      side: "bottom",
      align: "center"
    }
  });
}

function buildHomeMlTourSteps(
  language: AppLanguage,
  bookingContext?: DashboardTourBookingContext | null
): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: "",
        description: welcomeInjectHtml(language),
        side: "over",
        align: "center"
      }
    }
  ];

  if (pickVisible('[data-tour="patient-tour-sidebar"]')) {
    steps.push({
      element: '[data-tour="patient-tour-sidebar"]',
      popover: {
        title: t(language, {
          es: "Menú a la izquierda",
          en: "Left-side menu",
          pt: "Menu a esquerda"
        }),
        description: sidebarMenuHtml(language),
        side: "right",
        align: "start"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-home-ml-chrome"]')) {
    steps.push({
      element: '[data-tour="patient-tour-home-ml-chrome"]',
      popover: {
        title: t(language, {
          es: "Barra superior",
          en: "Top bar",
          pt: "Barra superior"
        }),
        description: t(language, {
          es: "MotivarCare, las secciones principales, notificaciones y <strong>Cuenta</strong> (perfil, preferencias y salir).",
          en: "MotivarCare, main sections, notifications, and <strong>Account</strong> (profile, preferences, and sign out).",
          pt: "MotivarCare, secoes principais, notificacoes e <strong>Conta</strong> (perfil, preferencias e sair)."
        }),
        side: "bottom",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-credits"]')) {
    steps.push({
      element: '[data-tour="patient-tour-credits"]',
      popover: {
        title: t(language, {
          es: "Tu saldo y reservar",
          en: "Your balance & book",
          pt: "Seu saldo e reservar"
        }),
        description: t(language, {
          es: "Acá ves cuántas sesiones te quedan y el botón para <strong>Reservar sesión</strong> con tu profesional.",
          en: "See how many sessions you have left and the button to <strong>Book a session</strong> with your professional.",
          pt: "Veja quantas sessoes restam e o botao para <strong>Reservar sessao</strong> com seu profissional."
        }),
        side: "bottom",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-kpis"]')) {
    steps.push({
      element: '[data-tour="patient-tour-kpis"]',
      popover: {
        title: t(language, {
          es: "Atajos de Inicio",
          en: "Home shortcuts",
          pt: "Atalhos do Inicio"
        }),
        description: t(language, {
          es: "<strong>Tu profesional</strong>, <strong>Comprar sesiones</strong>, <strong>Próximas</strong>, <strong>Diario</strong>, <strong>Ejercicios</strong> y <strong>Música</strong>: un toque y vas directo.",
          en: "<strong>Your professional</strong>, <strong>Buy sessions</strong>, <strong>Upcoming</strong>, <strong>Diary</strong>, <strong>Exercises</strong>, and <strong>Music</strong> — one tap and you go straight there.",
          pt: "<strong>Seu profissional</strong>, <strong>Comprar sessoes</strong>, <strong>Proximas</strong>, <strong>Diario</strong>, <strong>Exercicios</strong> e <strong>Musica</strong>: um toque e vai direto."
        }),
        side: "bottom",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-bookings"]')) {
    steps.push({
      element: '[data-tour="patient-tour-bookings"]',
      popover: {
        title: t(language, {
          es: "Bloque Sesiones",
          en: "Sessions block",
          pt: "Bloco Sessoes"
        }),
        description: bookingContext?.hasUpcomingConfirmed
          ? t(language, {
              es: "Tus próximas reservas, calendario, paquetes, historial y actividad de compras. Abrí una reserva para ver detalle o reprogramar.",
              en: "Your upcoming bookings, calendar, packages, history, and purchase activity. Open a booking for details or to reschedule.",
              pt: "Suas proximas reservas, calendario, pacotes, historico e atividade de compras. Abra uma reserva para detalhes ou reagendar."
            })
          : t(language, {
              es: "Desde acá reservás, ves el calendario y abrís paquetes, historial o actividad de compras. Si todavía no tenés turnos, el vacío te lleva a Sesiones.",
              en: "From here you book, check the calendar, and open packages, history, or purchase activity. If you have no slots yet, the empty state takes you to Sessions.",
              pt: "Daqui voce reserva, ve o calendario e abre pacotes, historico ou atividade de compras. Se ainda nao tiver horarios, o vazio leva a Sessoes."
            }),
        side: "top",
        align: "center"
      }
    });
    if (bookingContext?.hasUpcomingMeetLink) {
      pushJoinMeetStep(steps, language);
    }
  }

  if (pickVisible('[data-tour="patient-tour-diary"]')) {
    steps.push({
      element: '[data-tour="patient-tour-diary"]',
      popover: {
        title: t(language, {
          es: "Diario emocional",
          en: "Emotional diary",
          pt: "Diario emocional"
        }),
        description: t(language, {
          es: "Escribí cómo te sentís, revisá registros o abrí el diario completo cuando lo necesites.",
          en: "Write how you feel, review entries, or open the full diary whenever you need.",
          pt: "Escreva como se sente, revise registros ou abra o diario completo quando precisar."
        }),
        side: "top",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-exercises"]')) {
    steps.push({
      element: '[data-tour="patient-tour-exercises"]',
      popover: {
        title: t(language, {
          es: "Ejercicios",
          en: "Exercises",
          pt: "Exercicios"
        }),
        description: t(language, {
          es: "Prácticas breves entre sesiones: respiración, postura y presencia. Tocá <strong>Ver ejercicios</strong> para abrir el catálogo completo.",
          en: "Short practices between sessions — breathing, posture, and presence. Tap <strong>View exercises</strong> for the full catalog.",
          pt: "Praticas breves entre sessoes: respiracao, postura e presenca. Toque <strong>Ver exercicios</strong> para o catalogo completo."
        }),
        side: "top",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-music"]')) {
    steps.push({
      element: '[data-tour="patient-tour-music"]',
      popover: {
        title: t(language, {
          es: "Música",
          en: "Music",
          pt: "Musica"
        }),
        description: t(language, {
          es: "Playlists para relajar y acompañarte. Abrí <strong>Música</strong> para escuchar y elegir lo que mejor te siente.",
          en: "Playlists to relax and support you. Open <strong>Music</strong> to listen and pick what fits you best.",
          pt: "Playlists para relaxar e acompanhar voce. Abra <strong>Musica</strong> para ouvir e escolher o que melhor te serve."
        }),
        side: "top",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-maca"]')) {
    steps.push({
      element: '[data-tour="patient-tour-maca"]',
      popover: {
        title: t(language, {
          es: "¡Acá estoy yo!",
          en: "Here I am!",
          pt: "Aqui estou eu!"
        }),
        description: t(language, {
          es: "Soy el botón flotante de Maca: tocá cuando quieras charlar entre sesiones — un recordatorio, una duda o un empujoncito. Siempre cerca.",
          en: "I'm Maca's floating button — tap anytime between sessions for a reminder, a question, or a little nudge. Always nearby.",
          pt: "Sou o botao flutuante da Maca: toque entre sessoes para um lembrete, uma duvida ou um empurrarzinho. Sempre por perto."
        }),
        side: "top",
        align: "end"
      }
    });
  }

  return steps;
}

function buildClassicTourSteps(
  language: AppLanguage,
  bookingContext?: DashboardTourBookingContext | null
): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: "",
        description: welcomeInjectHtml(language),
        side: "over",
        align: "center"
      }
    }
  ];

  const earlyBookingsPanel: HTMLElement | null =
    bookingContext?.hasUpcomingConfirmed
      ? pickVisible('[data-tour="patient-tour-bookings"]', '[data-tour="patient-tour-bookings-rn"]')
      : null;
  if (earlyBookingsPanel) {
    const tourAttr = earlyBookingsPanel.getAttribute("data-tour");
    const bookingsSelector =
      tourAttr === "patient-tour-bookings-rn"
        ? '[data-tour="patient-tour-bookings-rn"]'
        : '[data-tour="patient-tour-bookings"]';
    steps.push({
      element: bookingsSelector,
      popover: {
        title: t(language, {
          es: "Tu sesión reservada",
          en: "Your booked session",
          pt: "Sua sessao reservada"
        }),
        description: bookingContext?.hasUpcomingMeetLink
          ? t(language, {
              es: "Acá está tu próxima sesión reservada. En el paso siguiente te señalamos el botón para <strong>entrar con Google Meet</strong> (videollamada).",
              en: "Here is your next booked session. Next we will point to the <strong>Join with Google Meet</strong> button (video call).",
              pt: "Aqui esta sua proxima sessao reservada. No proximo passo indicamos o botao para <strong>entrar com Google Meet</strong>."
            })
          : t(language, {
              es: "Acá está tu próxima sesión reservada. Cuando conectes Google Calendar, vas a ver el enlace para unirte a la videollamada.",
              en: "Here is your next booked session. After you connect Google Calendar, you will see the link to join the video call.",
              pt: "Aqui esta sua proxima sessao reservada. Ao conectar o Google Calendar, voce vera o link da videochamada."
            }),
        side: "top",
        align: "center"
      }
    });
    if (bookingContext?.hasUpcomingMeetLink) {
      pushJoinMeetStep(steps, language);
    }
  }

  if (pickVisible('[data-tour="patient-tour-sidebar"]')) {
    steps.push({
      element: '[data-tour="patient-tour-sidebar"]',
      popover: {
        title: t(language, {
          es: "Tu menú lateral",
          en: "Side menu",
          pt: "Menu lateral"
        }),
        description: sidebarMenuHtml(language),
        side: "right",
        align: "start"
      }
    });
  }

  const heroEl = pickVisible('[data-tour="patient-tour-hero"]', '[data-tour="patient-tour-hero-rn"]');
  if (heroEl) {
    const tour = heroEl.getAttribute("data-tour");
    const selector =
      tour === "patient-tour-hero-rn" ? '[data-tour="patient-tour-hero-rn"]' : '[data-tour="patient-tour-hero"]';
    steps.push({
      element: selector,
      popover: {
        title: t(language, {
          es: "Tu bienvenida",
          en: "Your welcome banner",
          pt: "Sua boas-vindas"
        }),
        description: t(language, {
          es: "Este banner es solo tu bienvenida. Lo que usás está a mano: arriba tenés el saludo, las notificaciones y el menú, y si ya tenés plan activo, el botón para adquirir nuevas sesiones.",
          en: "This banner is just your welcome. The controls are close by: up top you have the greeting, notifications and the menu, and if you already have an active plan, the button to get new sessions.",
          pt: "Este banner e apenas sua boas-vindas. O que voce usa fica a mao: em cima tem a saudacao, as notificacoes e o menu, e se ja tiver plano ativo, o botao para adquirir novas sessoes."
        }),
        side: "left",
        align: "start"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-trial"]')) {
    steps.push({
      element: '[data-tour="patient-tour-trial"]',
      popover: {
        title: t(language, {
          es: "Sesión de prueba",
          en: "Trial session",
          pt: "Sessao de teste"
        }),
        description: t(language, {
          es: "Cuando toca, este bloque te avisa y te ayuda a reservar o cambiar tu primera sesión. Sin estrés: lo ves cuando aplica.",
          en: "When it matters, this block nudges you to book or tweak your first session. No stress — it shows up when it applies.",
          pt: "Quando for o caso, este bloco lembra de agendar ou ajustar sua primeira sessao."
        }),
        side: "bottom",
        align: "center"
      }
    });
  }

  const kpis = pickVisible('[data-tour="patient-tour-kpis"]');
  const rnToolbar = pickVisible('[data-tour="patient-tour-rn-toolbar"]');
  if (kpis) {
    steps.push({
      element: '[data-tour="patient-tour-kpis"]',
      popover: {
        title: t(language, {
          es: "Tres miradas rápidas",
          en: "Three quick views",
          pt: "Tres visoes rapidas"
        }),
        description: t(language, {
          es: "Reservadas, créditos y profesional activo: tocás y saltás directo a lo que necesitás.",
          en: "Booked sessions, credits, and your active pro — tap and jump straight to what you need.",
          pt: "Reservadas, creditos e profissional ativo: toque e va direto ao que precisa."
        }),
        side: "bottom",
        align: "center"
      }
    });
  } else if (rnToolbar) {
    steps.push({
      element: '[data-tour="patient-tour-rn-toolbar"]',
      popover: {
        title: t(language, {
          es: "Saldo y un toque para agendar",
          en: "Balance & quick book",
          pt: "Saldo e agendar rapido"
        }),
        description: t(language, {
          es: "Tu saldo de sesiones bien visible y el botón + para elegir fecha con tu profesional. Simple.",
          en: "Your session balance front and center, plus the + button to pick a time with your professional. Simple.",
          pt: "Seu saldo em destaque e o botao + para escolher horario. Simples."
        }),
        side: "bottom",
        align: "center"
      }
    });
  }

  const bookings = pickVisible('[data-tour="patient-tour-bookings"]', '[data-tour="patient-tour-bookings-rn"]');
  if (bookings && !earlyBookingsPanel) {
    const sel =
      bookings.getAttribute("data-tour") === "patient-tour-bookings-rn"
        ? '[data-tour="patient-tour-bookings-rn"]'
        : '[data-tour="patient-tour-bookings"]';
    steps.push({
      element: sel,
      popover: {
        title: t(language, {
          es: "Próximas reservas",
          en: "Upcoming bookings",
          pt: "Proximas reservas"
        }),
        description: t(language, {
          es: "Tu agenda reservada en limpio: abrís una fila y ves detalle o reprogramás si el horario lo permite.",
          en: "Your booked sessions at a glance — open a row for details or reschedule when allowed.",
          pt: "Sua agenda reservada: abra uma linha para detalhes ou reagendar quando der."
        }),
        side: "top",
        align: "center"
      }
    });
  }

  if (pickVisible('[data-tour="patient-tour-maca"]')) {
    steps.push({
      element: '[data-tour="patient-tour-maca"]',
      popover: {
        title: t(language, {
          es: "¡Acá estoy yo!",
          en: "Here I am!",
          pt: "Aqui estou eu!"
        }),
        description: t(language, {
          es: "Este soy yo en modo botón: tocás y charlamos cuando quieras — entre sesión y sesión, un recordatorio o una duda. Siempre cerca.",
          en: "That's me as a button — tap anytime to chat between sessions: reminders, doubts, or a little support. Always nearby.",
          pt: "Sou eu em modo botao: toque quando quiser entre sessoes — lembretes, duvidas. Sempre por perto."
        }),
        side: "top",
        align: "end"
      }
    });
  }

  return steps;
}

function buildDashboardTourSteps(
  language: AppLanguage,
  bookingContext?: DashboardTourBookingContext | null
): DriveStep[] {
  return isHomeMlChrome()
    ? buildHomeMlTourSteps(language, bookingContext)
    : buildClassicTourSteps(language, bookingContext);
}

function persistTourDone(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // ignore
  }
}

function clearTourDone(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export const PATIENT_DASHBOARD_TOUR_EVENT = "motivarcare:patient-dashboard-tour";

/** Pide arrancar (o reabrir) el tour del dashboard. Si no estás en Inicio, navegá a `/` antes. */
export function requestPatientDashboardTour(options?: { force?: boolean }): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(PATIENT_DASHBOARD_TOUR_EVENT, {
      detail: { force: options?.force !== false }
    })
  );
}

function applyWelcomePopoverLayout(
  popover: { title: HTMLElement; description: HTMLElement },
  isWelcome: boolean
): void {
  const root = popover.description.closest(".driver-popover");
  if (root) {
    root.classList.toggle("patient-guided-tour-popover--welcome-cinematic", isWelcome);
  }
}

/** driver.js asigna texto plano; volvemos a aplicar HTML donde corresponde. */
function applyStepRichContent(popover: {
  title: HTMLElement;
  description: HTMLElement;
}, step: { popover?: { title?: string; description?: string } } | undefined): void {
  const rawTitle = step?.popover?.title ?? "";
  const rawDesc = step?.popover?.description ?? "";
  if (!rawTitle.trim()) {
    popover.title.style.display = "none";
  } else {
    popover.title.style.display = "";
    if (rawTitle.includes("<")) {
      popover.title.innerHTML = rawTitle;
    }
  }
  if (rawDesc.includes("<")) {
    popover.description.innerHTML = rawDesc;
  }
}

function tourDriverConfig(language: AppLanguage, markIntentionalEnd: () => void): Config {
  return {
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.48,
    overlayColor: "#1e1b4b",
    stagePadding: 10,
    stageRadius: 16,
    disableActiveInteraction: true,
    allowKeyboardControl: true,
    popoverClass: "patient-guided-tour-popover patient-guided-tour-popover--maca",
    showProgress: true,
    progressText: t(language, {
      es: "{{current}} / {{total}} pasos",
      en: "{{current}} / {{total}} steps",
      pt: "{{current}} / {{total}} passos"
    }),
    nextBtnText: t(language, {
      es: "Dale",
      en: "Next",
      pt: "Seguir"
    }),
    prevBtnText: t(language, {
      es: "Atrás",
      en: "Back",
      pt: "Voltar"
    }),
    doneBtnText: t(language, {
      es: "¡Listo!",
      en: "Done!",
      pt: "Pronto!"
    }),
    showButtons: ["next", "previous", "close"],
    onPopoverRender: (popover, opts) => {
      const step = opts.driver.getActiveStep();
      const stepIndex = opts.state.activeIndex ?? 0;
      applyWelcomePopoverLayout(popover, stepIndex === 0);
      applyStepRichContent(popover, step);
    },
    onHighlightStarted: (_element, step) => {
      const stepEl = typeof step?.element === "string" ? step.element : "";
      setHomeMlRailTourExpanded(stepEl.includes("patient-tour-sidebar"));
    },
    onHighlighted: (_element, step, opts) => {
      const popover = opts.state.popover;
      const stepIndex = opts.state.activeIndex ?? 0;
      if (popover) {
        applyWelcomePopoverLayout(popover, stepIndex === 0);
        applyStepRichContent(popover, step);
      }
      const stepEl = typeof step?.element === "string" ? step.element : "";
      if (stepEl.includes("patient-tour-sidebar")) {
        window.setTimeout(() => opts.driver.refresh(), 320);
      }
    },
    onCloseClick: (_element, _step, opts) => {
      markIntentionalEnd();
      setHomeMlRailTourExpanded(false);
      opts.driver.destroy();
    },
    onNextClick: (_element, _step, opts) => {
      if (opts.driver.isLastStep()) {
        markIntentionalEnd();
        setHomeMlRailTourExpanded(false);
        opts.driver.destroy();
        return;
      }
      opts.driver.moveNext();
    }
  };
}

export function DashboardGuidedTour(props: {
  language: AppLanguage;
  sessionUserId: string | null;
  /**
   * Mientras hay modales que deben resolverse primero (p. ej. elegir profesional),
   * no arrancamos el tour: evita dos capas dialog superpuestas con driver.js.
   */
  suppressTour?: boolean;
  /** Ajusta el tour cuando ya hay sesiones confirmadas (p. ej. flujo reviewer / demo). */
  bookingContext?: DashboardTourBookingContext | null;
}) {
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const suppressTour = Boolean(props.suppressTour);

  const startTour = (force: boolean) => {
    const current = propsRef.current;
    if (!current.sessionUserId || current.suppressTour) {
      return;
    }
    if (!force && driverInstanceRef.current) {
      return;
    }
    const storageKey = tourStorageKey(current.sessionUserId);
    if (!force) {
      try {
        if (window.localStorage.getItem(storageKey) === "1") {
          return;
        }
      } catch {
        return;
      }
    } else {
      clearTourDone(storageKey);
    }

    driverInstanceRef.current?.destroy();
    driverInstanceRef.current = null;

    const steps = buildDashboardTourSteps(current.language, current.bookingContext ?? null);
    if (steps.length === 0) {
      return;
    }

    const markIntentionalEnd = () => {
      persistTourDone(storageKey);
    };

    const driverObj = driver({
      ...tourDriverConfig(current.language, markIntentionalEnd),
      steps,
      onDestroyed: () => {
        setHomeMlRailTourExpanded(false);
        driverInstanceRef.current = null;
      }
    });
    driverInstanceRef.current = driverObj;
    driverObj.drive();
  };

  useEffect(() => {
    if (!props.sessionUserId) {
      return;
    }
    if (suppressTour) {
      driverInstanceRef.current?.destroy();
      driverInstanceRef.current = null;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      startTour(false);
    }, 950);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Destroy por cleanup/re-render: NO marcar tour como hecho.
      driverInstanceRef.current?.destroy();
      driverInstanceRef.current = null;
    };
  }, [props.language, props.sessionUserId, suppressTour]);

  useEffect(() => {
    if (!props.sessionUserId) {
      return;
    }
    const onRequest = () => {
      window.setTimeout(() => {
        startTour(true);
      }, propsRef.current.suppressTour ? 450 : 80);
    };
    window.addEventListener(PATIENT_DASHBOARD_TOUR_EVENT, onRequest);
    return () => window.removeEventListener(PATIENT_DASHBOARD_TOUR_EVENT, onRequest);
  }, [props.sessionUserId]);

  return null;
}
