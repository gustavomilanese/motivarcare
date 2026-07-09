import { useCallback, useState } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import { resolvePackagePurchaseGate } from "@therapy/patient-core";
import { friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import { isClientFallbackPackagePlanId } from "../lib/packageCatalog";
import { savePendingCheckoutDlocalReturn } from "../lib/checkoutDlocalReturn";
import type { PackagePlan } from "../types";
import type { PortalPurchaseResult } from "./usePortalActions";

export type UsePackageCheckoutOptions = {
  language: AppLanguage;
  pricingReady: boolean;
  packageCatalogFromApi: boolean;
  usesDlocalCheckout: boolean;
  onPurchasePackage: (plan: PackagePlan) => Promise<PortalPurchaseResult>;
  /** Cuando el paciente no usa dLocal (p. ej. dev simulado o flujo legacy). */
  onNonDlocalCheckout?: (plan: PackagePlan) => void | Promise<void>;
  onGateBlocked?: () => void;
};

export function usePackageCheckout(options: UsePackageCheckoutOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startPackageCheckout = useCallback(
    async (plan: PackagePlan): Promise<boolean> => {
      const gate = resolvePackagePurchaseGate({ pricingReady: options.pricingReady, planId: plan.id });
      if (!gate.allowed) {
        options.onGateBlocked?.();
        return false;
      }

      if (!options.usesDlocalCheckout) {
        if (options.onNonDlocalCheckout) {
          await options.onNonDlocalCheckout(plan);
          return true;
        }
        setError(friendlyCheckoutPackageMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, options.language));
        return false;
      }

      if (!options.packageCatalogFromApi || isClientFallbackPackagePlanId(plan.id)) {
        setError(friendlyCheckoutPackageMessage("Catalog unavailable", options.language));
        return false;
      }

      if (loading) {
        return false;
      }

      setError("");
      setLoading(true);
      try {
        const purchased = await options.onPurchasePackage(plan);
        if (purchased.checkoutUrl) {
          savePendingCheckoutDlocalReturn({
            kind: "package",
            packageId: plan.id,
            packageName: plan.name,
            paymentId: purchased.paymentId,
            orderId: purchased.orderId
          });
          window.location.assign(purchased.checkoutUrl);
          return true;
        }
        if (!purchased.ok) {
          setError(friendlyCheckoutPackageMessage(purchased.error ?? "", options.language));
        }
        return false;
      } catch (checkoutError) {
        setError(
          friendlyCheckoutPackageMessage(
            checkoutError instanceof Error ? checkoutError.message : "",
            options.language
          )
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      options.language,
      options.onGateBlocked,
      options.onNonDlocalCheckout,
      options.onPurchasePackage,
      options.packageCatalogFromApi,
      options.pricingReady,
      options.usesDlocalCheckout
    ]
  );

  return {
    packageCheckoutLoading: loading,
    packageCheckoutError: error,
    setPackageCheckoutError: setError,
    startPackageCheckout
  };
}
