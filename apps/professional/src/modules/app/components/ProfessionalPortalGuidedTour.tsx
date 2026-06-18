import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { buildProfessionalStatsQuery, ymLocal, ymdLocal } from "../lib/professionalStatsRangeQuery";
import { apiRequest } from "../services/api";
import type { DashboardResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type TourSection = "welcome" | "dashboard" | "agenda" | "pacientes" | "chat" | "ingresos" | "done";

type TourStepDef = {
  id: string;
  route: string;
  section: TourSection;
  selectors?: string[];
  navKey?: string;
  kind?: "welcome" | "section-intro" | "element" | "closing";
  optional?: boolean;
  title: LocalizedText;
  description: LocalizedText;
  side?: "top" | "bottom" | "left" | "right" | "over";
  align?: "start" | "center" | "end";
};

const SECTION_OVERLAY: Record<TourSection, string> = {
  welcome: "#1e1b4b",
  dashboard: "#312e81",
  agenda: "#134e4a",
  pacientes: "#1e3a8a",
  chat: "#78350f",
  ingresos: "#064e3b",
  done: "#1e1b4b"
};

function macaAvatarSvg(size: "large" | "small"): string {
  const dim = size === "large" ? 72 : 44;
  const uid = `maca-pro-${size}-${Math.random().toString(36).slice(2, 9)}`;
  return `
<svg class="pro-tour-maca-svg pro-tour-maca-svg--${size}" width="${dim}" height="${dim}" viewBox="0 0 64 64" aria-hidden="true">
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

function welcomeHtml(language: AppLanguage): string {
  return `
<div class="pro-tour-welcome-shell">
  <span class="pro-tour-eyebrow">${t(language, { es: "Tour con Maca", en: "Tour with Maca", pt: "Tour com Maca" })}</span>
  <div class="pro-tour-maca-hero">
    <div class="pro-tour-maca-hero__avatar" aria-hidden="true">${macaAvatarSvg("large")}</div>
    <div class="pro-tour-maca-hero__copy">
      <h2 class="pro-tour-welcome-h">${t(language, {
        es: "Te muestro todo el portal",
        en: "I'll show you the whole portal",
        pt: "Vou te mostrar todo o portal"
      })}</h2>
      <p class="pro-tour-maca-hero__lead">${t(language, {
        es: "Recorreremos <strong>Dashboard</strong>, <strong>Mi Agenda</strong>, <strong>Pacientes</strong>, <strong>Chat</strong> e <strong>Ingresos</strong>. En cada sección cambia el color del recuadro para que veas dónde estás.",
        en: "We'll walk through <strong>Dashboard</strong>, <strong>My agenda</strong>, <strong>Patients</strong>, <strong>Chat</strong>, and <strong>Earnings</strong>. Each section uses a different highlight color so you always know where you are.",
        pt: "Vamos percorrer <strong>Dashboard</strong>, <strong>Minha agenda</strong>, <strong>Pacientes</strong>, <strong>Chat</strong> e <strong>Receitas</strong>. Cada secao muda a cor do destaque."
      })}</p>
      <p class="pro-tour-maca-hero__fine">${t(language, {
        es: "Podés saltear con la × cuando quieras.",
        en: "Skip anytime with ×.",
        pt: "Pode pular com × quando quiser."
      })}</p>
    </div>
  </div>
</div>`.trim();
}

function sectionIntroHtml(language: AppLanguage, section: Exclude<TourSection, "welcome" | "done">, lead: LocalizedText): string {
  const labels: Record<typeof section, LocalizedText> = {
    dashboard: { es: "Dashboard", en: "Dashboard", pt: "Dashboard" },
    agenda: { es: "Mi Agenda", en: "My agenda", pt: "Minha agenda" },
    pacientes: { es: "Pacientes", en: "Patients", pt: "Pacientes" },
    chat: { es: "Chat", en: "Chat", pt: "Chat" },
    ingresos: { es: "Ingresos", en: "Earnings", pt: "Receitas" }
  };
  const nums = { dashboard: 1, agenda: 2, pacientes: 3, chat: 4, ingresos: 5 };
  return `
<div class="pro-tour-section-intro pro-tour-section-intro--${section}">
  <span class="pro-tour-section-chip">${t(language, { es: `Sección ${nums[section]}`, en: `Section ${nums[section]}`, pt: `Secao ${nums[section]}` })}</span>
  <h3 class="pro-tour-section-title">${t(language, labels[section])}</h3>
  <p class="pro-tour-section-lead">${t(language, lead)}</p>
</div>`.trim();
}

function closingHtml(language: AppLanguage): string {
  return `
<div class="pro-tour-section-intro pro-tour-section-intro--done">
  <span class="pro-tour-section-chip pro-tour-section-chip--done">${t(language, { es: "Listo", en: "All set", pt: "Pronto" })}</span>
  <h3 class="pro-tour-section-title">${t(language, {
    es: "Ya conocés las 5 áreas clave",
    en: "You know the 5 key areas",
    pt: "Voce ja conhece as 5 areas-chave"
  })}</h3>
  <p class="pro-tour-section-lead">${t(language, {
    es: "Volvé al menú cuando quieras. Si tenés dudas, Maca sigue en el portal para ayudarte.",
    en: "Use the menu anytime. Maca remains in the portal if you need help.",
    pt: "Use o menu quando quiser. A Maca continua no portal se precisar de ajuda."
  })}</p>
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

function navSelector(navKey: string): string {
  return `[data-tour-nav="${navKey}"]`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForVisible(selectors: string[], timeoutMs = 6000): Promise<HTMLElement | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const el = pickVisible(...selectors);
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      return el;
    }
    await delay(120);
  }
  return null;
}

async function waitForRoute(pathname: string, timeoutMs = 6000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (window.location.pathname === pathname) {
      return true;
    }
    await delay(50);
  }
  return false;
}

/** Selectors that confirm the destination page has mounted (not just the sidebar link). */
const ROUTE_READY_SELECTORS: Partial<Record<TourSection, string[]>> = {
  dashboard: ['[data-tour="pro-tour-kpis"]', '[data-tour="pro-tour-sidebar"]'],
  agenda: ['[data-tour="pro-tour-agenda-tabs"]'],
  pacientes: ['[data-tour="pro-tour-patients-body"]'],
  chat: ['[data-tour="pro-tour-chat-shell"]'],
  ingresos: ['[data-tour="pro-tour-income-summary"]', '[data-tour="pro-tour-income-sessions"]']
};

function stepTargetSelectors(def: TourStepDef): string[] | undefined {
  if (def.selectors?.length) {
    return def.selectors;
  }
  if (def.navKey) {
    return [navSelector(def.navKey)];
  }
  return undefined;
}

function stepHighlightsStableNav(def: TourStepDef): boolean {
  return Boolean(def.navKey);
}

async function waitForRouteReady(section: TourSection, timeoutMs = 6000): Promise<void> {
  const selectors = ROUTE_READY_SELECTORS[section];
  if (!selectors?.length) {
    await delay(150);
    return;
  }
  await waitForVisible(selectors, timeoutMs);
}

function tourStorageKey(sessionUserId: string): string {
  return `motivarcare.pro.portalTour.v2.${sessionUserId}`;
}

export type ProfessionalTourBookingContext = {
  hasUpcomingBookings: boolean;
  hasUpcomingMeetLink: boolean;
};

function sectionIntroDescription(
  section: Exclude<TourSection, "welcome" | "done">,
  lead: LocalizedText
): LocalizedText {
  return {
    es: sectionIntroHtml("es", section, lead),
    en: sectionIntroHtml("en", section, lead),
    pt: sectionIntroHtml("pt", section, lead)
  };
}

function buildStepDefs(language: AppLanguage, booking?: ProfessionalTourBookingContext | null): TourStepDef[] {
  const defs: TourStepDef[] = [
    {
      id: "welcome",
      route: "/",
      section: "welcome",
      kind: "welcome",
      title: { es: "", en: "", pt: "" },
      description: {
        es: welcomeHtml("es"),
        en: welcomeHtml("en"),
        pt: welcomeHtml("pt")
      },
      side: "over",
      align: "center"
    },
    {
      id: "nav",
      route: "/",
      section: "dashboard",
      selectors: ['[data-tour="pro-tour-sidebar"]', '[data-tour="pro-tour-mobile-nav"]'],
      title: {
        es: "Menú principal",
        en: "Main menu",
        pt: "Menu principal"
      },
      description: {
        es: "Desde acá saltamos entre secciones. Durante el tour vas a ver cómo cambia el color del foco en cada área.",
        en: "Jump between sections from here. During the tour the highlight color changes per area.",
        pt: "Daqui voce muda de secao. Durante o tour a cor do destaque muda em cada area."
      },
      side: "right",
      align: "start"
    },
    {
      id: "dashboard-intro",
      route: "/",
      section: "dashboard",
      kind: "section-intro",
      navKey: "dashboard",
      title: { es: "", en: "", pt: "" },
      description: sectionIntroDescription("dashboard", {
        es: "Tu centro de mando: ingresos del período, sesiones agendadas, pacientes activos y lo pendiente de cobrar.",
        en: "Your command center: period earnings, scheduled sessions, active patients, and pending payouts.",
        pt: "Seu centro de comando: receitas do periodo, sessoes agendadas, pacientes ativos e pendencias."
      }),
      side: "right"
    },
    {
      id: "dashboard-period",
      route: "/",
      section: "dashboard",
      selectors: [
        '[data-tour="pro-tour-period-trigger"]',
        '[data-tour="pro-tour-period"]',
        ".pro-dashboard-period-control-trigger"
      ],
      optional: true,
      title: { es: "Período de análisis", en: "Analysis period", pt: "Periodo de analise" },
      description: {
        es: "Arriba a la derecha, junto a las notificaciones: elegí día, semana, mes o año. Los KPIs de abajo se recalculan con este filtro.",
        en: "Top right, next to notifications: pick day, week, month, or year. The KPIs below recalculate from this filter.",
        pt: "No canto superior direito, ao lado das notificacoes: escolha dia, semana, mes ou ano. Os KPIs abaixo recalculam com este filtro."
      },
      side: "bottom",
      align: "end"
    },
    {
      id: "dashboard-kpis",
      route: "/",
      section: "dashboard",
      selectors: ['[data-tour="pro-tour-kpis"]'],
      title: { es: "Indicadores del Dashboard", en: "Dashboard metrics", pt: "Indicadores do Dashboard" },
      description: {
        es: "<strong>Dinero ejecutado</strong> · sesiones ya realizadas.<br><strong>Sesiones agendadas</strong> · confirmadas en el período.<br><strong>Pacientes activos</strong> · en tu consultorio.<br><strong>A cobrar</strong> · neto pendiente de payout.<br><br>Tocá una tarjeta para ir al detalle.",
        en: "<strong>Executed revenue</strong> · completed sessions.<br><strong>Scheduled sessions</strong> · confirmed in the period.<br><strong>Active patients</strong> · in your practice.<br><strong>To collect</strong> · net pending payout.<br><br>Tap a card for details.",
        pt: "<strong>Receita executada</strong> · sessoes concluidas.<br><strong>Sessoes agendadas</strong> · confirmadas no periodo.<br><strong>Pacientes ativos</strong> · na sua carteira.<br><strong>A receber</strong> · liquido pendente.<br><br>Toque um cartao para ver detalhes."
      },
      side: "bottom",
      align: "center"
    },
    {
      id: "dashboard-bookings",
      route: "/",
      section: "dashboard",
      selectors: ['[data-tour="pro-tour-bookings"]'],
      optional: true,
      title: { es: "Próximas reservas", en: "Upcoming bookings", pt: "Proximas reservas" },
      description: {
        es: "Acá ves quién te espera y cuándo. Podés reprogramar o cancelar desde cada fila.",
        en: "See who is coming and when. Reschedule or cancel from each row.",
        pt: "Veja quem vem e quando. Reagende ou cancele em cada linha."
      },
      side: "top",
      align: "center"
    },
    {
      id: "dashboard-meet",
      route: "/",
      section: "dashboard",
      selectors: ['[data-tour="pro-join-first-meet"]'],
      optional: true,
      title: { es: "Unirse a Meet", en: "Join Meet", pt: "Entrar no Meet" },
      description: {
        es: "Cuando llegue la hora, este botón abre la videollamada con tu paciente.",
        en: "When it's time, this button opens the video call with your patient.",
        pt: "Na hora, este botao abre a videochamada com seu paciente."
      },
      side: "bottom",
      align: "center"
    },
    {
      id: "agenda-intro",
      route: "/horarios",
      section: "agenda",
      kind: "section-intro",
      navKey: "agenda",
      title: { es: "", en: "", pt: "" },
      description: sectionIntroDescription("agenda", {
        es: "Definís cuándo trabajás y qué slots publicás para que los pacientes reserven.",
        en: "Set when you work and which slots patients can book.",
        pt: "Defina quando trabalha e quais horarios os pacientes podem reservar."
      }),
      side: "right"
    },
    {
      id: "agenda-tabs",
      route: "/horarios",
      section: "agenda",
      selectors: ['[data-tour="pro-tour-agenda-tabs"]'],
      title: { es: "Dos vistas de agenda", en: "Two agenda views", pt: "Duas visoes da agenda" },
      description: {
        es: "<strong>Horarios de trabajo</strong> · plantilla semanal (días y franjas).<br><strong>Disponibilidad configurada</strong> · slots publicados mes a mes.",
        en: "<strong>Work hours</strong> · weekly template (days and time blocks).<br><strong>Configured availability</strong> · published slots month by month.",
        pt: "<strong>Horarios de trabalho</strong> · modelo semanal.<br><strong>Disponibilidade configurada</strong> · horarios publicados mes a mes."
      },
      side: "bottom",
      align: "center"
    },
    {
      id: "agenda-work",
      route: "/horarios",
      section: "agenda",
      selectors: ['[data-tour="pro-tour-agenda-work"]'],
      title: { es: "Plantilla semanal", en: "Weekly template", pt: "Modelo semanal" },
      description: {
        es: "Elegí días y horarios para armar tu plantilla semanal. Guardá para publicar esa disponibilidad hacia adelante.",
        en: "Pick days and times to build your weekly template. Save to publish that availability going forward.",
        pt: "Escolha dias e horarios para montar seu modelo semanal. Salve para publicar essa disponibilidade adiante."
      },
      side: "top",
      align: "center"
    },
    {
      id: "pacientes-intro",
      route: "/pacientes",
      section: "pacientes",
      kind: "section-intro",
      navKey: "pacientes",
      title: { es: "", en: "", pt: "" },
      description: sectionIntroDescription("pacientes", {
        es: "Tu consultorio digital: estado de cada paciente, sesiones y accesos rápidos.",
        en: "Your digital practice: each patient's status, sessions, and quick actions.",
        pt: "Seu consultorio digital: status, sessoes e acoes rapidas por paciente."
      }),
      side: "right"
    },
    {
      id: "pacientes-toolbar",
      route: "/pacientes",
      section: "pacientes",
      selectors: ['[data-tour="pro-tour-patients-toolbar"]'],
      optional: true,
      title: { es: "Filtros por estado", en: "Status filters", pt: "Filtros por status" },
      description: {
        es: "Activos, en prueba, pausa o cancelados. El contador te dice cuántos hay en cada grupo.",
        en: "Active, trial, paused, or cancelled. Counts show how many in each group.",
        pt: "Ativos, teste, pausa ou cancelados. Os contadores mostram quantos ha em cada grupo."
      },
      side: "bottom",
      align: "start"
    },
    {
      id: "pacientes-body",
      route: "/pacientes",
      section: "pacientes",
      selectors: ['[data-tour="pro-tour-patients-body"]'],
      title: { es: "Listado de pacientes", en: "Patient list", pt: "Lista de pacientes" },
      description: {
        es: "Cada tarjeta muestra sesiones totales y última actividad. Desde acá abrís <strong>Chat</strong> o el <strong>perfil completo</strong>.",
        en: "Each card shows total sessions and last activity. Open <strong>Chat</strong> or the <strong>full profile</strong> from here.",
        pt: "Cada cartao mostra sessoes e ultima atividade. Abra <strong>Chat</strong> ou o <strong>perfil</strong> daqui."
      },
      side: "top",
      align: "center"
    },
    {
      id: "chat-intro",
      route: "/chat",
      section: "chat",
      kind: "section-intro",
      navKey: "chat",
      title: { es: "", en: "", pt: "" },
      description: sectionIntroDescription("chat", {
        es: "Mensajes seguros con tus pacientes, ligados a cada consultorio.",
        en: "Secure messages with patients, tied to your practice.",
        pt: "Mensagens seguras com pacientes, ligadas ao seu consultorio."
      }),
      side: "right"
    },
    {
      id: "chat-threads",
      route: "/chat",
      section: "chat",
      selectors: ['[data-tour="pro-tour-chat-threads"]'],
      title: { es: "Conversaciones", en: "Conversations", pt: "Conversas" },
      description: {
        es: "Lista de hilos por paciente. El badge violeta indica mensajes sin leer.",
        en: "Threads per patient. The purple badge marks unread messages.",
        pt: "Threads por paciente. O badge violeta indica mensagens nao lidas."
      },
      side: "right",
      align: "start"
    },
    {
      id: "chat-composer",
      route: "/chat",
      section: "chat",
      selectors: ['[data-tour="pro-tour-chat-composer"]'],
      title: { es: "Enviar mensajes", en: "Send messages", pt: "Enviar mensagens" },
      description: {
        es: "Escribí acá y Enter para enviar (Shift+Enter para nueva línea). Los mensajes quedan en el historial del paciente.",
        en: "Type here and press Enter to send (Shift+Enter for a new line). Messages stay in the patient history.",
        pt: "Digite aqui e Enter para enviar (Shift+Enter para nova linha)."
      },
      side: "top",
      align: "center"
    },
    {
      id: "ingresos-intro",
      route: "/ingresos",
      section: "ingresos",
      kind: "section-intro",
      navKey: "ingresos",
      title: { es: "", en: "", pt: "" },
      description: sectionIntroDescription("ingresos", {
        es: "Detalle financiero: lo ejecutado, comisión de plataforma y lo que falta cobrar.",
        en: "Financial detail: executed amounts, platform fee, and pending payout.",
        pt: "Detalhe financeiro: executado, comissao da plataforma e pendente a receber."
      }),
      side: "right"
    },
    {
      id: "ingresos-kpis",
      route: "/ingresos",
      section: "ingresos",
      selectors: ['[data-tour="pro-tour-income-kpis"]'],
      optional: true,
      title: { es: "Resumen del período", en: "Period summary", pt: "Resumo do periodo" },
      description: {
        es: "<strong>Ejecutado</strong> · bruto de sesiones completadas.<br><strong>Comisión</strong> · fee de MotivarCare.<br><strong>Pendiente</strong> · neto aún no cobrado.",
        en: "<strong>Executed</strong> · gross from completed sessions.<br><strong>Fee</strong> · MotivarCare commission.<br><strong>Pending</strong> · net not yet paid out.",
        pt: "<strong>Executado</strong> · bruto de sessoes concluidas.<br><strong>Comissao</strong> · fee MotivarCare.<br><strong>Pendente</strong> · liquido nao recebido."
      },
      side: "bottom",
      align: "center"
    },
    {
      id: "ingresos-sessions",
      route: "/ingresos",
      section: "ingresos",
      selectors: ['[data-tour="pro-tour-income-sessions"]'],
      title: { es: "Sesiones ejecutadas", en: "Completed sessions", pt: "Sessoes executadas" },
      description: {
        es: "Tabla con búsqueda, filtros y exportación. Cada fila es una sesión ya realizada con monto y estado de cobro.",
        en: "Table with search, filters, and export. Each row is a completed session with amount and payout status.",
        pt: "Tabela com busca, filtros e exportacao. Cada linha e uma sessao concluida com valor e status."
      },
      side: "top",
      align: "center"
    },
    {
      id: "closing",
      route: "/",
      section: "done",
      kind: "closing",
      title: { es: "", en: "", pt: "" },
      description: {
        es: closingHtml("es"),
        en: closingHtml("en"),
        pt: closingHtml("pt")
      },
      side: "over",
      align: "center"
    }
  ];

  if (!booking?.hasUpcomingBookings) {
    return defs.filter((step) => step.id !== "dashboard-bookings" && step.id !== "dashboard-meet");
  }
  if (!booking?.hasUpcomingMeetLink) {
    return defs.filter((step) => step.id !== "dashboard-meet");
  }
  return defs;
}

function buildActiveStepDefs(defs: TourStepDef[]): TourStepDef[] {
  return defs.filter((def) => {
    if (!def.optional) {
      return true;
    }
    const selectors = stepTargetSelectors(def);
    if (!selectors?.length) {
      return true;
    }
    return pickVisible(...selectors) !== null;
  });
}

function buildDriveSteps(defs: TourStepDef[], language: AppLanguage): DriveStep[] {
  return defs.map((def) => {
    const description = t(language, def.description);
    const popoverBase = {
      title: t(language, def.title),
      description,
      side: def.side ?? "bottom",
      align: def.align ?? "center"
    };

    if (def.kind === "welcome" || def.kind === "closing") {
      return {
        popover: { ...popoverBase, side: "over", align: "center" }
      };
    }

    if (def.kind === "section-intro" && def.navKey) {
      return {
        element: navSelector(def.navKey),
        popover: { ...popoverBase, side: "right", align: "start" }
      };
    }

    const selector = def.selectors?.find((candidate) => pickVisible(candidate)) ?? def.selectors?.[0];
    if (selector) {
      return {
        element: selector,
        popover: popoverBase
      };
    }

    return {
      popover: { ...popoverBase, side: "over", align: "center" }
    };
  });
}

function applySectionTheme(section: TourSection): void {
  const body = document.body;
  body.classList.remove(
    "pro-tour-zone-welcome",
    "pro-tour-zone-dashboard",
    "pro-tour-zone-agenda",
    "pro-tour-zone-pacientes",
    "pro-tour-zone-chat",
    "pro-tour-zone-ingresos",
    "pro-tour-zone-done"
  );
  if (section !== "welcome") {
    body.classList.add(`pro-tour-zone-${section}`);
  }

  const overlayPath = document.querySelector(".driver-overlay path") as SVGPathElement | null;
  if (overlayPath) {
    overlayPath.style.fill = SECTION_OVERLAY[section];
  }
}

function persistTourDone(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // ignore
  }
}

function applyStepRichContent(
  popover: { title: HTMLElement; description: HTMLElement },
  step: { popover?: { title?: string; description?: string } } | undefined
): void {
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

function tourDriverConfig(
  language: AppLanguage,
  storageKey: string,
  defs: TourStepDef[],
  navigate: (path: string) => void
): Config {
  let navBusy = false;

  const refreshTour = (driverObj: ReturnType<typeof driver>) => {
    window.requestAnimationFrame(() => {
      if (driverObj.isActive()) {
        driverObj.refresh();
      }
    });
  };

  const runStepTransition = async (
    targetIndex: number,
    driverObj: ReturnType<typeof driver>,
    move: () => void
  ) => {
    if (navBusy) {
      return;
    }
    const def = defs[targetIndex];
    navBusy = true;
    try {
      if (!def) {
        move();
        return;
      }

      const needsRouteChange = window.location.pathname !== def.route;
      const stableNav = stepHighlightsStableNav(def);
      const targetSelectors = stepTargetSelectors(def);

      if (needsRouteChange && stableNav) {
        // Section intros target the sidebar — advance first so driver.js keeps a live element,
        // then navigate and wait for the destination page to mount.
        applySectionTheme(def.section);
        move();
        navigate(def.route);
        await waitForRoute(def.route);
        await waitForRouteReady(def.section);
        refreshTour(driverObj);
        return;
      }

      if (needsRouteChange) {
        // Page-specific targets must exist before advancing (e.g. returning to Dashboard KPIs).
        applySectionTheme(def.section);
        navigate(def.route);
        await waitForRoute(def.route);
        if (targetSelectors?.length) {
          await waitForVisible(targetSelectors, def.optional ? 2000 : 6000);
        } else {
          await waitForRouteReady(def.section);
        }
        move();
        refreshTour(driverObj);
        return;
      }

      if (targetSelectors?.length) {
        await waitForVisible(targetSelectors, def.optional ? 2000 : 5000);
      }
      applySectionTheme(def.section);
      move();
      refreshTour(driverObj);
    } finally {
      navBusy = false;
    }
  };

  return {
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.52,
    overlayColor: SECTION_OVERLAY.dashboard,
    stagePadding: 12,
    stageRadius: 14,
    disableActiveInteraction: true,
    allowKeyboardControl: true,
    popoverClass: "pro-guided-tour-popover pro-guided-tour-popover--maca",
    showProgress: true,
    progressText: t(language, {
      es: "{{current}} / {{total}} pasos",
      en: "{{current}} / {{total}} steps",
      pt: "{{current}} / {{total}} passos"
    }),
    nextBtnText: t(language, { es: "Dale", en: "Next", pt: "Seguir" }),
    prevBtnText: t(language, { es: "Atrás", en: "Back", pt: "Voltar" }),
    doneBtnText: t(language, { es: "¡Listo!", en: "Done!", pt: "Pronto!" }),
    showButtons: ["next", "previous", "close"],
    onPopoverRender: (popover, opts) => {
      applyStepRichContent(popover, opts.driver.getActiveStep());
    },
    onHighlighted: (_element, step, opts) => {
      const popover = opts.state.popover;
      if (popover) {
        applyStepRichContent(popover, step);
      }
      const idx = opts.state.activeIndex ?? 0;
      const def = defs[idx];
      if (def) {
        applySectionTheme(def.section);
      }
    },
    onNextClick: (_element, _step, opts) => {
      const driverObj = opts.driver;
      const nextIndex = (driverObj.getActiveIndex() ?? 0) + 1;
      void runStepTransition(nextIndex, driverObj, () => {
        driverObj.moveNext();
      });
    },
    onPrevClick: (_element, _step, opts) => {
      const driverObj = opts.driver;
      const prevIndex = (driverObj.getActiveIndex() ?? 0) - 1;
      if (prevIndex < 0) {
        return;
      }
      void runStepTransition(prevIndex, driverObj, () => {
        driverObj.movePrevious();
      });
    },
    onDestroyed: () => {
      document.body.classList.remove(
        "pro-tour-zone-welcome",
        "pro-tour-zone-dashboard",
        "pro-tour-zone-agenda",
        "pro-tour-zone-pacientes",
        "pro-tour-zone-chat",
        "pro-tour-zone-ingresos",
        "pro-tour-zone-done"
      );
      persistTourDone(storageKey);
    }
  };
}

export function ProfessionalPortalGuidedTour(props: {
  language: AppLanguage;
  sessionUserId: string | null;
  token?: string;
  suppressTour?: boolean;
  bookingContext?: ProfessionalTourBookingContext | null;
}) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);
  const defsRef = useRef<TourStepDef[]>([]);

  useEffect(() => {
    if (!props.sessionUserId) {
      return;
    }
    if (props.suppressTour) {
      driverInstanceRef.current?.destroy();
      driverInstanceRef.current = null;
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
    const timer = window.setTimeout(async () => {
      if (cancelled) {
        return;
      }
      let booking = props.bookingContext ?? null;
      if (!booking && props.token) {
        try {
          const day = ymdLocal(new Date());
          const month = ymLocal(new Date());
          const year = String(new Date().getFullYear());
          const query = buildProfessionalStatsQuery("month", day, month, year);
          const response = await apiRequest<DashboardResponse>(`/api/professional/dashboard${query}`, props.token);
          const upcoming = response.upcomingSessions ?? [];
          booking = {
            hasUpcomingBookings: upcoming.some((b) => b.status === "confirmed" || b.status === "requested"),
            hasUpcomingMeetLink: upcoming.some((b) => Boolean(b.joinUrl?.trim()))
          };
        } catch {
          booking = { hasUpcomingBookings: false, hasUpcomingMeetLink: false };
        }
      }
      if (cancelled) {
        return;
      }
      const defs = buildActiveStepDefs(buildStepDefs(props.language, booking));
      defsRef.current = defs;
      const steps = buildDriveSteps(defs, props.language);
      if (steps.length === 0) {
        return;
      }
      if (window.location.pathname !== "/") {
        navigateRef.current("/");
        await delay(400);
      }
      const driverObj = driver({
        ...tourDriverConfig(props.language, storageKey, defs, (path) => navigateRef.current(path)),
        steps
      });
      driverInstanceRef.current = driverObj;
      applySectionTheme("welcome");
      driverObj.drive();
    }, 1100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      driverInstanceRef.current?.destroy();
      driverInstanceRef.current = null;
    };
  }, [props.language, props.sessionUserId, props.token, props.suppressTour, props.bookingContext]);

  return null;
}

/** @deprecated Use ProfessionalPortalGuidedTour — alias for backwards compatibility */
export const ProfessionalDashboardGuidedTour = ProfessionalPortalGuidedTour;
