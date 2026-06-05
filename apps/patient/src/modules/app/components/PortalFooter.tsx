import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { PortalHelpLegalFooter } from "./PortalHelpLegalLinks";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export interface PortalFooterProps {
  language: AppLanguage;
  residencyCountry: string | null;
  patientMarket: Market;
}

export function PortalFooter(props: PortalFooterProps) {
  return (
    <footer className="portal-site-footer" aria-label={t(props.language, { es: "Pie de página", en: "Footer", pt: "Rodapé" })}>
      <PortalHelpLegalFooter
        language={props.language}
        residencyCountry={props.residencyCountry}
        patientMarket={props.patientMarket}
      />
    </footer>
  );
}
