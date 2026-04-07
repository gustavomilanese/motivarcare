import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PortalSection } from "../types";

export type PortalNavGroup = "agenda" | "patients" | "business";

export type PortalNavItemDef = {
  to: PortalSection;
  label: LocalizedText;
  group?: PortalNavGroup;
};

/** Título visible encima del primer ítem de cada grupo en el sidebar. */
export const PORTAL_NAV_GROUP_LABELS: Record<PortalNavGroup, LocalizedText> = {
  agenda: {
    es: "Tu agenda",
    en: "Your schedule",
    pt: "Sua agenda"
  },
  patients: {
    es: "Tus Pacientes",
    en: "Your patients",
    pt: "Seus pacientes"
  },
  business: {
    es: "Ingresos y preferencias",
    en: "Earnings & preferences",
    pt: "Receitas e preferencias"
  }
};

export const PORTAL_NAV_ITEMS: PortalNavItemDef[] = [
  { to: "/", label: { es: "Dashboard", en: "Dashboard", pt: "Dashboard" } },
  {
    to: "/horarios",
    label: { es: "Horario", en: "Schedule", pt: "Horario" },
    group: "agenda"
  },
  {
    to: "/disponibilidad",
    label: { es: "Disponibilidad", en: "Availability", pt: "Disponibilidade" },
    group: "agenda"
  },
  {
    to: "/pacientes",
    label: { es: "Pacientes", en: "Patients", pt: "Pacientes" },
    group: "patients"
  },
  { to: "/chat", label: { es: "Chat", en: "Chat", pt: "Chat" }, group: "patients" },
  { to: "/ingresos", label: { es: "Ingresos", en: "Earnings", pt: "Receitas" }, group: "business" },
  {
    to: "/agenda/ajustes",
    label: { es: "Ajustes de agenda", en: "Schedule preferences", pt: "Ajustes da agenda" },
    group: "business"
  }
];

export type ResolvedPortalNavLink = {
  to: PortalSection;
  label: string;
  group?: PortalNavGroup;
};

export function getPortalNavLinks(language: AppLanguage): ResolvedPortalNavLink[] {
  return PORTAL_NAV_ITEMS.map((item) => ({
    to: item.to,
    label: textByLanguage(language, item.label),
    group: item.group
  }));
}
