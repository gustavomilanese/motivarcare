import { useEffect, useRef } from "react";
import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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
      title: t(language, {
        es: "Te damos la bienvenida",
        en: "Welcome",
        pt: "Boas-vindas"
      }),
      description: t(language, {
        es: "En menos de un minuto te mostramos las funciones clave del portal: navegación, resumen, reservas y Maca, tu asistente. Podés cerrar el tour cuando quieras con la X.",
        en: "In under a minute we will show you the main areas of the portal: navigation, overview, bookings, and Maca, your assistant. You can close the tour anytime with the X.",
        pt: "Em menos de um minuto mostramos as areas principais do portal: navegacao, resumo, reservas e Maca, sua assistente. Voce pode fechar o tour a qualquer momento com o X."
      }),
      side: "over",
      align: "center"
    }
  });

  if (pickVisible('[data-tour="patient-tour-sidebar"]')) {
    steps.push({
      element: '[data-tour="patient-tour-sidebar"]',
      popover: {
        title: t(language, {
          es: "Tu menú principal",
          en: "Main menu",
          pt: "Menu principal"
        }),
        description: t(language, {
          es: "Desde acá accedés a Inicio, Sesiones, Profesionales, notas útiles, ejercicios, música relajante y el chat con tu equipo.",
          en: "From here you can open Home, Sessions, Professionals, articles, exercises, relaxing music, and chat with your care team.",
          pt: "Daqui voce acessa Inicio, Sessoes, Profissionais, notas, exercicios, musica relaxante e o chat com sua equipe."
        }),
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
          es: "Acá encontrás el resumen del portal y, si ya tenés un plan activo, el acceso para adquirir nuevas sesiones.",
          en: "Here you see a summary of the portal and, if you already have an active plan, a shortcut to buy more sessions.",
          pt: "Aqui voce ve um resumo do portal e, se ja tiver um plano ativo, o atalho para comprar novas sessoes."
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
          es: "Cuando corresponda, este bloque te ayuda a reservar o modificar tu primera sesión de prueba con un profesional.",
          en: "When relevant, this block helps you book or change your first trial session with a professional.",
          pt: "Quando aplicavel, este bloco ajuda a agendar ou alterar sua primeira sessao de teste."
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
          es: "Resumen en un vistazo",
          en: "At-a-glance summary",
          pt: "Resumo rapido"
        }),
        description: t(language, {
          es: "Sesiones confirmadas, créditos disponibles y tu profesional activo. Podés tocar cada tarjeta para ir a reservar o ver la ficha.",
          en: "Confirmed sessions, available credits, and your active professional. Tap each card to book or open their profile.",
          pt: "Sessoes confirmadas, creditos disponiveis e seu profissional ativo. Toque cada cartao para reservar ou ver a ficha."
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
          es: "Saldo y agenda rápida",
          en: "Balance and quick booking",
          pt: "Saldo e agenda rapida"
        }),
        description: t(language, {
          es: "Acá ves cuántas sesiones tenés disponibles y el botón para elegir fecha con tu profesional.",
          en: "Here you see how many sessions you have left and the button to pick a time with your professional.",
          pt: "Aqui voce ve quantas sessoes tem disponiveis e o botao para escolher horario com seu profissional."
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
          es: "Listado de tus sesiones confirmadas. Podés abrir cada una para ver detalle, reprogramar cuando aplique o prepararte para la videollamada.",
          en: "Your confirmed sessions. Open any row for details, reschedule when allowed, or get ready for the video call.",
          pt: "Suas sessoes confirmadas. Abra cada uma para detalhes, reagendar quando possivel ou se preparar para a videochamada."
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
          es: "Maca, tu asistente",
          en: "Maca, your assistant",
          pt: "Maca, sua assistente"
        }),
        description: t(language, {
          es: "En cualquier momento podés abrir este botón para conversar con Maca: apoyo entre sesiones, recordatorios y buenas prácticas. Siempre está a mano.",
          en: "Anytime you can open this button to chat with Maca: support between sessions, reminders, and helpful tips. It is always one tap away.",
          pt: "A qualquer momento abra este botao para conversar com Maca: apoio entre sessoes, lembretes e dicas. Sempre a mao."
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

function tourDriverConfig(language: AppLanguage, storageKey: string): Config {
  return {
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.55,
    overlayColor: "#0f172a",
    stagePadding: 10,
    stageRadius: 14,
    disableActiveInteraction: true,
    allowKeyboardControl: true,
    popoverClass: "patient-guided-tour-popover",
    showProgress: true,
    progressText: t(language, {
      es: "{{current}} de {{total}}",
      en: "{{current}} of {{total}}",
      pt: "{{current}} de {{total}}"
    }),
    nextBtnText: t(language, {
      es: "Siguiente",
      en: "Next",
      pt: "Proximo"
    }),
    prevBtnText: t(language, {
      es: "Atrás",
      en: "Back",
      pt: "Voltar"
    }),
    doneBtnText: t(language, {
      es: "Listo",
      en: "Done",
      pt: "Pronto"
    }),
    showButtons: ["next", "previous", "close"],
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
