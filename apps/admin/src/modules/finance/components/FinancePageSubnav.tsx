import { type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { StickyPageSubnav } from "../../app/components/StickyPageSubnav";

/** Secciones con ancla en la página (scroll). */
export const FINANCE_SCROLL_SECTION_IDS = [
  "fin-resumen",
  "fin-desglose",
  "fin-reglas",
  "fin-liquidaciones",
  "fin-stripe",
  "fin-registros"
] as const;

export type FinanceScrollSectionId = (typeof FINANCE_SCROLL_SECTION_IDS)[number];

const SECTION_LINKS: Array<{ id: FinanceScrollSectionId; label: LocalizedText }> = [
  { id: "fin-resumen", label: { es: "Resumen", en: "Overview", pt: "Resumo" } },
  { id: "fin-desglose", label: { es: "Desglose", en: "Breakdown", pt: "Detalhe" } },
  { id: "fin-reglas", label: { es: "Reglas", en: "Rules", pt: "Regras" } },
  { id: "fin-liquidaciones", label: { es: "Liquidaciones", en: "Payouts", pt: "Liquidações" } },
  { id: "fin-stripe", label: { es: "Stripe", en: "Stripe", pt: "Stripe" } },
  { id: "fin-registros", label: { es: "Registros", en: "Records", pt: "Registros" } }
];

export function FinancePageSubnav(props: {
  language: AppLanguage;
  activeId: FinanceScrollSectionId;
  onSectionClick: (id: FinanceScrollSectionId) => void;
}) {
  return (
    <StickyPageSubnav
      language={props.language}
      activeId={props.activeId}
      onSectionClick={props.onSectionClick}
      items={SECTION_LINKS}
      ariaLabel={{ es: "Secciones de Finanzas", en: "Finance sections", pt: "Seções de finanças" }}
    />
  );
}
