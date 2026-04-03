import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PortalSection } from "../types";

export type PortalNavGroup = "agenda";

export type PortalNavItemDef = {
  to: PortalSection;
  label: LocalizedText;
  group?: PortalNavGroup;
};

export const PORTAL_NAV_GROUP_AGENDA_LABEL: LocalizedText = {
  es: "Tu agenda",
  en: "Your schedule",
  pt: "Sua agenda"
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
  { to: "/pacientes", label: { es: "Pacientes", en: "Patients", pt: "Pacientes" } },
  { to: "/chat", label: { es: "Chat", en: "Chat", pt: "Chat" } },
  { to: "/ingresos", label: { es: "Ingresos", en: "Earnings", pt: "Receitas" } }
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
