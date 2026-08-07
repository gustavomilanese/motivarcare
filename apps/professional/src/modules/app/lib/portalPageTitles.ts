import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

const PAGE_TITLES: Record<string, LocalizedText> = {
  "/": { es: "Dashboard", en: "Dashboard", pt: "Dashboard" },
  "/horarios": { es: "Mi Agenda", en: "My agenda", pt: "Minha agenda" },
  "/horarios/disponibilidad": { es: "Mi Agenda", en: "My agenda", pt: "Minha agenda" },
  "/agenda/ajustes": { es: "Ajustes de agenda", en: "Schedule preferences", pt: "Ajustes da agenda" },
  "/pacientes": { es: "Pacientes", en: "Patients", pt: "Pacientes" },
  "/reportes": { es: "Reportes", en: "Reports", pt: "Relatórios" },
  "/chat": { es: "Chat", en: "Chat", pt: "Chat" },
  "/ingresos": { es: "Ingresos", en: "Earnings", pt: "Receitas" },
  "/admin": { es: "Administración", en: "Administration", pt: "Administração" },
  "/perfil": { es: "Perfil", en: "Profile", pt: "Perfil" },
  "/ajustes": { es: "Ajustes", en: "Settings", pt: "Configurações" }
};

export function resolvePortalPageTitle(pathname: string, language: AppLanguage): string {
  if (pathname.startsWith("/pacientes/") && pathname !== "/pacientes") {
    return "";
  }
  const exact = PAGE_TITLES[pathname];
  if (exact) {
    return textByLanguage(language, exact);
  }
  return "";
}
