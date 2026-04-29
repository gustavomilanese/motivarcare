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

function welcomeInjectHtml(language: AppLanguage): string {
  return `
<div class="patient-tour-welcome-shell">
  <span class="patient-tour-eyebrow">${t(language, {
    es: "Tour guiado",
    en: "Guided tour",
    pt: "Tour guiado"
  })}</span>
  <div class="patient-tour-maca-hero">
    <div class="patient-tour-maca-hero__avatar" aria-hidden="true">${macaAvatarSvg("large")}</div>
    <div class="patient-tour-maca-hero__copy">
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
      <p class="patient-tour-maca-hero__lead">${t(language, {
        es: "Te voy a ayudar a conocer la funcionalidad del portal: en pocos pasos te mostramos el menú, el resumen, tus reservas y dónde encontrarme. Sin prisa, con buena onda.",
        en: "I'll help you get to know the portal: a few quick steps for the menu, your overview, bookings, and where to find me. No rush, just good vibes.",
        pt: "Vou te ajudar a conhecer o portal: em poucos passos mostramos o menu, o resumo, as reservas e onde me achar. Sem pressa."
      })}</p>
      <p class="patient-tour-maca-hero__fine">${t(language, {
        es: "Podés saltear cuando quieras con la × arriba a la derecha.",
        en: "You can skip anytime with the × at the top right.",
        pt: "Voce pode pular quando quiser com o × no canto superior direito."
      })}</p>
    </div>
  </div>
</div>`.trim();
}

function sidebarMenuHtml(language: AppLanguage): string {
  const items: LocalizedText[] = [
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
      es: "<strong>Profesionales</strong> — explorar el equipo",
      en: "<strong>Professionals</strong> — browse the team",
      pt: "<strong>Profissionais</strong> — conhecer a equipe"
    },
    {
      es: "<strong>Notas</strong> — lecturas útiles",
      en: "<strong>Articles</strong> — helpful reads",
      pt: "<strong>Notas</strong> — leituras uteis"
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
    es: "Cada ítem te lleva a un lugar distinto. En una línea:",
    en: "Each item takes you somewhere new. In one line each:",
    pt: "Cada item leva a um lugar. Em uma linha:"
  });
  const lis = items.map((text) => `<li>${t(language, text)}</li>`).join("");
  return `
<div class="patient-tour-sidebar-wrap">
  <div class="patient-tour-maca-mini" aria-hidden="true">${macaAvatarSvg("small")}</div>
  <p class="patient-tour-sidebar-intro">${intro}</p>
  <ul class="patient-tour-menu-hints">${lis}</ul>
</div>`.trim();
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
  return `motivarcare.patient.dashboardTour.v1.${sessionUserId}`;
}

function buildDashboardTourSteps(language: AppLanguage): DriveStep[] {
  const steps: DriveStep[] = [];

  steps.push({
    popover: {
      title: "",
      description: welcomeInjectHtml(language),
      side: "over",
      align: "center"
    }
  });

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
          es: "Tu espacio de inicio",
          en: "Your home space",
          pt: "Seu espaco inicial"
        }),
        description: t(language, {
          es: "Acá está el corazón del panel: mensaje de bienvenida y, si ya tenés plan activo, el atajo para sumar sesiones. Como ves, todo queda cerca.",
          en: "This is the heart of the dashboard: welcome copy and, if you already have an active plan, a shortcut to add sessions — everything stays close at hand.",
          pt: "Aqui esta o coracao do painel: mensagem de boas-vindas e, se ja tiver plano ativo, o atalho para mais sessoes."
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
          es: "Confirmadas, créditos y profesional activo: tocás y saltás directo a lo que necesitás.",
          en: "Confirmed sessions, credits, and your active pro — tap and jump straight to what you need.",
          pt: "Confirmadas, creditos e profissional ativo: toque e va direto ao que precisa."
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
  if (bookings) {
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
          es: "Tu agenda confirmada en limpio: abrís una fila y ves detalle o reprogramás si el horario lo permite.",
          en: "Your confirmed sessions at a glance — open a row for details or reschedule when allowed.",
          pt: "Sua agenda confirmada: abra uma linha para detalhes ou reagendar quando der."
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

function persistTourDone(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // ignore
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

function tourDriverConfig(language: AppLanguage, storageKey: string): Config {
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
      applyStepRichContent(popover, step);
    },
    onHighlighted: (_element, step, opts) => {
      const popover = opts.state.popover;
      if (popover) {
        applyStepRichContent(popover, step);
      }
    },
    onDestroyed: () => {
      persistTourDone(storageKey);
    }
  };
}

export function DashboardGuidedTour(props: { language: AppLanguage; sessionUserId: string | null }) {
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (!props.sessionUserId) {
      return;
    }
    const storageKey = tourStorageKey(props.sessionUserId);
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const steps = buildDashboardTourSteps(props.language);
      if (steps.length === 0) {
        return;
      }

      const driverObj = driver({
        ...tourDriverConfig(props.language, storageKey),
        steps
      });
      driverInstanceRef.current = driverObj;
      driverObj.drive();
    }, 950);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      driverInstanceRef.current?.destroy();
      driverInstanceRef.current = null;
    };
  }, [props.language, props.sessionUserId]);

  return null;
}
