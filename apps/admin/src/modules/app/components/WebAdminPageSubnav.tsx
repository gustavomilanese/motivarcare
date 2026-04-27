import { type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { StickyPageSubnav } from "./StickyPageSubnav";

export const WEB_ADMIN_SCROLL_SECTION_IDS = [
  "web-paquetes-site",
  "web-imagenes",
  "web-reviews",
  "web-articulos",
  "web-ejercicios",
  "web-musica-relax"
] as const;

export type WebAdminScrollSectionId = (typeof WEB_ADMIN_SCROLL_SECTION_IDS)[number];

const SECTION_LINKS: Array<{ id: WebAdminScrollSectionId; label: LocalizedText }> = [
  { id: "web-paquetes-site", label: { es: "Paquetes web", en: "Web packages", pt: "Pacotes web" } },
  { id: "web-imagenes", label: { es: "Imágenes hero", en: "Hero images", pt: "Imagens hero" } },
  { id: "web-reviews", label: { es: "Reviews", en: "Reviews", pt: "Reviews" } },
  { id: "web-articulos", label: { es: "Artículos", en: "Articles", pt: "Artigos" } },
  { id: "web-ejercicios", label: { es: "Ejercicios", en: "Exercises", pt: "Exercícios" } },
  { id: "web-musica-relax", label: { es: "Música relax", en: "Relax music", pt: "Música relax" } }
];

export function WebAdminPageSubnav(props: {
  language: AppLanguage;
  activeId: WebAdminScrollSectionId;
  onSectionClick: (id: WebAdminScrollSectionId) => void;
}) {
  return (
    <StickyPageSubnav
      language={props.language}
      activeId={props.activeId}
      onSectionClick={props.onSectionClick}
      items={SECTION_LINKS}
      ariaLabel={{ es: "Secciones de contenido", en: "Content sections", pt: "Seções de conteúdo" }}
    />
  );
}
