import { useEffect } from "react";
import {
  textByLanguage,
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { CheckoutPackagesPanel } from "../../app/components/booking/CheckoutPackagesPanel";
import type { PackagePlan } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Modal de compra desde Inicio — mismo modelo calm-pay del DS que el checkout. */
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
  needsResidencyConfirm?: boolean;
  residencySaving?: boolean;
  onConfirmResidency?: (iso: string) => Promise<void> | void;
  onClose: () => void;
  onSelectPlan: (plan: PackagePlan) => void;
  onIndividualPurchase: () => void;
  onRequireProfessional: () => void;
  professionalName?: string | null;
  professionalFirstName?: string | null;
  professionalLastName?: string | null;
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
        className="matching-flow-modal dashboard-home-purchase-modal dashboard-home-purchase-modal--calm"
        role="dialog"
        aria-modal="true"
        aria-label={t(props.language, {
          es: "Elegí cómo pagar",
          en: "Choose how to pay",
          pt: "Escolha como pagar"
        })}
        onClick={(event) => event.stopPropagation()}
      >
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
            needsResidencyConfirm={props.needsResidencyConfirm}
            residencySaving={props.residencySaving}
            onConfirmResidency={props.onConfirmResidency}
            hideChrome
            variant="calm"
            professionalName={props.professionalName}
            professionalFirstName={props.professionalFirstName}
            professionalLastName={props.professionalLastName}
          />
        </div>
      </section>
    </div>
  );
}
