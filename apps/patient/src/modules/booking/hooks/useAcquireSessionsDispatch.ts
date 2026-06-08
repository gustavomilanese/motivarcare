import { useCallback, useMemo } from "react";
import {
  resolveAcquireSessionsIntent,
  type AcquireSessionsContext,
  type AcquireSessionsTrigger,
  type SessionPackagePlan
} from "@therapy/patient-core";
import {
  executeAcquireSessionsIntent,
  type AcquireSessionsHandlers
} from "../lib/executeAcquireSessionsIntent";

export function useAcquireSessionsDispatch(params: {
  isMobilePortal: boolean;
  hasAssignedProfessional: boolean;
  pricingReady: boolean;
  creditsRemaining: number;
  packagePlans: SessionPackagePlan[];
  featuredPackageId: string | null;
  handlers: AcquireSessionsHandlers;
}) {
  const presentation = params.isMobilePortal ? "mobile" : "desktop";

  const context = useMemo<AcquireSessionsContext>(
    () => ({
      hasAssignedProfessional: params.hasAssignedProfessional,
      pricingReady: params.pricingReady,
      creditsRemaining: params.creditsRemaining,
      plans: params.packagePlans,
      featuredPackageId: params.featuredPackageId
    }),
    [
      params.creditsRemaining,
      params.featuredPackageId,
      params.hasAssignedProfessional,
      params.packagePlans,
      params.pricingReady
    ]
  );

  const dispatchAcquireSessions = useCallback(
    (trigger: AcquireSessionsTrigger) => {
      const intent = resolveAcquireSessionsIntent(trigger, presentation, context);
      executeAcquireSessionsIntent(intent, params.handlers);
    },
    [context, params.handlers, presentation]
  );

  return { dispatchAcquireSessions };
}
