import { useEffect } from "react";
import {
  textByLanguage,
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { CheckoutPackagesPanel } from "./booking/CheckoutPackagesPanel";
import type { PackagePlan } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Modal grande de compra desde Inicio next-action (paquetes + individual). */
export function DashboardHomePurchaseModal(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  residencyCountry?: string | null;
  fxRates?: DisplayFxRates;
  packagesLoading: boolean;
  packagePlans: PackagePlan[];
  featuredPackageId: string | null;
  pricingReady: boolean;
  unitPriceMajor: number | null;
  paymentLoading?: boolean;
  paymentError?: string;
  onClose: () => void;
  onSelectPlan: (plan: PackagePlan) => void;
  onIndividualPurchase: () => void;
  onRequireProfessional: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div
      className="matching-flow-backdrop dashboard-home-purchase-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        className="matching-flow-modal dashboard-home-purchase-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-home-purchase-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dashboard-home-purchase-head">
          <div className="dashboard-home-purchase-head-copy">
            <p className="dashboard-home-purchase-kicker">
              {t(props.language, {
                es: "MotivarCare",
                en: "MotivarCare",
                pt: "MotivarCare"
              })}
            </p>
            <h2 id="dashboard-home-purchase-title" className="dashboard-home-purchase-title">
              {t(props.language, {
                es: "Elegí cómo seguir",
                en: "Choose how to continue",
                pt: "Escolha como continuar"
              })}
            </h2>
            <p className="dashboard-home-purchase-lead">
              {t(props.language, {
                es: "Paquete o sesión suelta, al precio de tu profesional — sin salir de Inicio.",
                en: "Package or single session at your professional’s rate — without leaving Home.",
                pt: "Pacote ou sessao avulsa pelo preco do seu profissional — sem sair do Inicio."
              })}
            </p>
          </div>
          <button type="button" className="dashboard-home-purchase-close" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>

        <div className="dashboard-home-purchase-body">
          <CheckoutPackagesPanel
            language={props.language}
            currency={props.currency}
            residencyCountry={props.residencyCountry}
            fxRates={props.fxRates}
            packagesLoading={props.packagesLoading}
            packagePlans={props.packagePlans}
            featuredPackageId={props.featuredPackageId}
            pricingReady={props.pricingReady}
            unitPriceMajor={props.unitPriceMajor}
            onClose={props.onClose}
            onSelectPlan={props.onSelectPlan}
            onIndividualPurchase={props.onIndividualPurchase}
            onRequireProfessional={props.onRequireProfessional}
            paymentLoading={props.paymentLoading}
            paymentError={props.paymentError}
            hideChrome
          />
        </div>
      </section>
    </div>
  );
}
