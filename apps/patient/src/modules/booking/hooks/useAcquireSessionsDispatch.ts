import { useCallback, useMemo } from "react";
import {
  resolveAcquireSessionsIntent,
  type AcquireSessionsContext,
  type AcquireSessionsTrigger
} from "@therapy/patient-core";
import type { PackagePlan } from "../../app/types";
import {
  executeAcquireSessionsIntent,
  type AcquireSessionsHandlers
} from "../lib/executeAcquireSessionsIntent";

export function useAcquireSessionsDispatch(params: {
  isMobilePortal: boolean;
  hasAssignedProfessional: boolean;
  creditsRemaining: number;
  packagePlans: PackagePlan[];
  featuredPackageId: string | null;
  handlers: AcquireSessionsHandlers;
}) {
  const presentation = params.isMobilePortal ? "mobile" : "desktop";

  const context = useMemo<AcquireSessionsContext>(
    () => ({
      hasAssignedProfessional: params.hasAssignedProfessional,
      creditsRemaining: params.creditsRemaining,
      plans: params.packagePlans,
      featuredPackageId: params.featuredPackageId
    }),
    [
      params.creditsRemaining,
      params.featuredPackageId,
      params.hasAssignedProfessional,
      params.packagePlans
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
