import { type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import { mergeRescheduledBooking, sortBookingsByStartsAtAsc, type BookingMutationApiItem } from "../../booking/bookingMappers";
import { apiRequest } from "../services/api";
import { POST_TRIAL_CALENDAR_PENDING_SESSION_KEY } from "../constants";
import { friendlyBookingFailureMessage } from "../lib/friendlyPatientMessages";
import {
  acquireDlocalCheckoutIdempotencyKey,
  clearDlocalCheckoutIdempotencyKey,
  dlocalIndividualIdempotencyScope,
  dlocalPackageIdempotencyScope
} from "../lib/dlocalCheckoutIdempotency";
import { patientUsesDlocalCheckout } from "../lib/patientDlocalCheckout";
import { resolvePortalPricingProfessionalId } from "../lib/patientPricingProfessional";
import { findProfessionalById, findSlotIdForBooking } from "../lib/professionals";
import type {
  Booking,
  PackagePlan,
  PackagePurchaseSource,
  PatientAppState,
  ProfileMeApiResponse,
  PurchasePackageApiResponse,
  Professional,
  TimeSlot
} from "../types";

function t(language: PatientAppState["language"], values: { es: string; en: string; pt: string }): string {
  return textByLanguage(language, values);
}

/** Solo en dev local permitimos créditos/reservas ficticias si el API falla. */
const allowLocalDemoFallback = import.meta.env.DEV;

function usesDlocalCheckout(state: PatientAppState): boolean {
  return patientUsesDlocalCheckout({
    patientMarket: state.patientMarket,
    residencyCountry: state.profileResidencyCountry
  });
}

export type PortalPurchaseResult = {
  ok: boolean;
  error?: string;
  checkoutUrl?: string;
  paymentId?: string;
  orderId?: string;
};

export type DlocalPaymentSyncResult = {
  ok: boolean;
  fulfilled?: boolean;
  paymentStatus?: string;
  error?: string;
};

export function usePortalActions(params: {
  state: PatientAppState;
  sessionTimezone: string;
  professionalDirectory: Professional[];
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onRefreshPortalFromApi?: () => void | Promise<void>;
}) {
  const syncActiveProfessionalAssignment = async (professionalId: string | null) => {
    if (!params.state.authToken) {
      return;
    }

    try {
      await apiRequest(
        "/api/profiles/me/active-professional",
        {
          method: "PATCH",
          body: JSON.stringify({ professionalId })
        },
        params.state.authToken
      );
    } catch (error) {
      console.error("Could not sync active professional assignment", error);
    }
  };

  const addPackage = async (plan: PackagePlan, source: PackagePurchaseSource): Promise<PortalPurchaseResult> => {
    if (source !== "checkout_button") {
      return { ok: false, error: "Invalid purchase source" };
    }

    const selectedProfessionalId = params.state.selectedProfessionalId;
    const authToken = params.state.authToken;
    let purchasedPackage: PurchasePackageApiResponse["purchase"] | null = null;
    let lastError = "";

    if (authToken) {
      if (usesDlocalCheckout(params.state)) {
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
          const idempotencyKey = acquireDlocalCheckoutIdempotencyKey(dlocalPackageIdempotencyScope(plan.id));
          const checkout = await apiRequest<{ checkoutUrl: string; paymentId?: string; orderId?: string }>(
            "/api/payments/dlocal/checkout",
            {
              method: "POST",
              headers: { "x-idempotency-key": idempotencyKey },
              body: JSON.stringify({
                packageId: plan.id,
                idempotencyKey,
                successUrl: `${origin}/?payment=success&purchase=package`,
                cancelUrl: `${origin}/?payment=cancel&purchase=package`
              })
            },
            authToken
          );
          if (checkout.checkoutUrl) {
            return {
              ok: true,
              checkoutUrl: checkout.checkoutUrl,
              paymentId: checkout.paymentId,
              orderId: checkout.orderId
            };
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "";
          if (!allowLocalDemoFallback) {
            return { ok: false, error: lastError };
          }
        }
      }

      if (!usesDlocalCheckout(params.state) && !allowLocalDemoFallback) {
        return { ok: false, error: DLOCAL_CHECKOUT_UNAVAILABLE_ERROR };
      }

      try {
        const response = await apiRequest<PurchasePackageApiResponse>(
          "/api/profiles/me/purchase-package",
          {
            method: "POST",
            body: JSON.stringify({ packageId: plan.id })
          },
          authToken
        );
        purchasedPackage = response.purchase;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "";
        console.warn("Package purchase API unavailable", lastError);
        if (!allowLocalDemoFallback) {
          return { ok: false, error: lastError };
        }
        console.warn("Applying demo credits locally (dev only)");
      }
    }

    if (authToken && !purchasedPackage && !allowLocalDemoFallback) {
      return { ok: false, error: lastError || "Purchase failed" };
    }

    params.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      onboardingFinalCompleted: true,
      assignedProfessionalId: current.selectedProfessionalId,
      subscription: {
        packageId: purchasedPackage?.packageId ?? plan.id,
        packageName: purchasedPackage?.packageName ?? plan.name,
        creditsTotal: purchasedPackage?.totalCredits ?? current.subscription.creditsTotal + plan.credits,
        creditsRemaining: purchasedPackage?.remainingCredits ?? current.subscription.creditsRemaining + plan.credits,
        purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString(),
        purchaseHistory: [
          {
            id: purchasedPackage?.id ?? `local-${Date.now().toString(36)}`,
            name: purchasedPackage?.packageName ?? plan.name,
            credits: plan.credits,
            purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString(),
            priceCents: purchasedPackage?.packagePriceCents ?? plan.priceCents ?? null,
            currency: purchasedPackage?.packageCurrency ?? plan.currency ?? null
          },
          ...current.subscription.purchaseHistory
        ].slice(0, 20)
      }
    }));

    if (selectedProfessionalId) {
      void syncActiveProfessionalAssignment(selectedProfessionalId);
    }

    return { ok: true };
  };

  const purchaseIndividualSessions = async (sessionCount: number): Promise<PortalPurchaseResult> => {
    if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 99) {
      return { ok: false, error: "Invalid session count" };
    }

    const pricingProfessionalId = resolvePortalPricingProfessionalId({
      assignedProfessionalId: params.state.assignedProfessionalId,
      selectedProfessionalId: params.state.selectedProfessionalId,
      bookings: params.state.bookings
    });
    const authToken = params.state.authToken;
    const selectedProfessionalId = params.state.selectedProfessionalId;
    let purchasedPackage: PurchasePackageApiResponse["purchase"] | null = null;
    let lastError = "";

    if (authToken) {
      if (usesDlocalCheckout(params.state)) {
        const idempotencyScope = dlocalIndividualIdempotencyScope(sessionCount);
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
          const idempotencyKey = acquireDlocalCheckoutIdempotencyKey(idempotencyScope);
          const checkout = await apiRequest<{ checkoutUrl: string; paymentId?: string; orderId?: string }>(
            "/api/payments/dlocal/checkout-individual",
            {
              method: "POST",
              headers: { "x-idempotency-key": idempotencyKey },
              body: JSON.stringify({
                sessionCount,
                ...(pricingProfessionalId ? { professionalId: pricingProfessionalId } : {}),
                idempotencyKey,
                successUrl: `${origin}/?payment=success&purchase=individual`,
                cancelUrl: `${origin}/?payment=cancel&purchase=individual`
              })
            },
            authToken
          );
          const checkoutUrl = checkout.checkoutUrl?.trim() ?? "";
          if (/^https?:\/\//i.test(checkoutUrl)) {
            return {
              ok: true,
              checkoutUrl,
              paymentId: checkout.paymentId,
              orderId: checkout.orderId
            };
          }
          lastError = "dLocal Go did not return a checkout redirect URL";
          clearDlocalCheckoutIdempotencyKey(idempotencyScope);
          if (!allowLocalDemoFallback) {
            return { ok: false, error: lastError };
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "";
          clearDlocalCheckoutIdempotencyKey(idempotencyScope);
          if (!allowLocalDemoFallback) {
            return { ok: false, error: lastError || "Could not create dLocal Go checkout" };
          }
        }
      }

      if (!usesDlocalCheckout(params.state) && !allowLocalDemoFallback) {
        return { ok: false, error: DLOCAL_CHECKOUT_UNAVAILABLE_ERROR };
      }

      try {
        const response = await apiRequest<PurchasePackageApiResponse>(
          "/api/profiles/me/purchase-individual-sessions",
          {
            method: "POST",
            body: JSON.stringify({ sessionCount })
          },
          authToken
        );
        purchasedPackage = response.purchase;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "";
        console.warn("Individual sessions purchase API unavailable", lastError);
        if (!allowLocalDemoFallback) {
          return { ok: false, error: lastError };
        }
      }
    }

    if (authToken && !purchasedPackage && !allowLocalDemoFallback) {
      return { ok: false, error: lastError || "Purchase failed" };
    }

    params.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      onboardingFinalCompleted: true,
      assignedProfessionalId: current.selectedProfessionalId,
      subscription: {
        packageId: purchasedPackage?.packageId ?? current.subscription.packageId,
        packageName: purchasedPackage?.packageName ?? current.subscription.packageName,
        creditsTotal: purchasedPackage?.totalCredits ?? current.subscription.creditsTotal + sessionCount,
        creditsRemaining: purchasedPackage?.remainingCredits ?? current.subscription.creditsRemaining + sessionCount,
        purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString(),
        purchaseHistory: [
          {
            id: purchasedPackage?.id ?? `local-ind-${Date.now().toString(36)}`,
            name: purchasedPackage?.packageName ?? `${sessionCount} sesiones`,
            credits: sessionCount,
            purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString(),
            priceCents: purchasedPackage?.packagePriceCents ?? null,
            currency: purchasedPackage?.packageCurrency ?? null
          },
          ...current.subscription.purchaseHistory
        ].slice(0, 20)
      }
    }));

    if (selectedProfessionalId) {
      void syncActiveProfessionalAssignment(selectedProfessionalId);
    }

    return { ok: true };
  };

  const startTrialCheckout = async (
    professionalId: string,
    slot: TimeSlot,
    holdId: string
  ): Promise<PortalPurchaseResult> => {
    const authToken = params.state.authToken;
    if (!authToken) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "Iniciá sesión para continuar con el pago.",
          en: "Sign in to continue with payment.",
          pt: "Faca login para continuar com o pagamento."
        })
      };
    }

    if (!usesDlocalCheckout(params.state)) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "El pago en línea aún no está disponible para tu país de residencia. Escribinos a soporte si necesitás ayuda.",
          en: "Online payment isn’t available yet for your country of residence. Contact support if you need help.",
          pt: "O pagamento online ainda nao esta disponivel para seu pais de residencia. Fale com o suporte se precisar de ajuda."
        })
      };
    }

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
      const checkout = await apiRequest<{ checkoutUrl: string; paymentId: string }>(
        "/api/payments/dlocal/checkout-trial",
        {
          method: "POST",
            body: JSON.stringify({
              professionalId,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              holdId,
              patientTimezone: params.sessionTimezone,
              successUrl: `${origin}/?trialPayment=success`,
              cancelUrl: `${origin}/?trialPayment=cancel`
            })
        },
        authToken
      );
      if (checkout.checkoutUrl) {
        return {
          ok: true,
          checkoutUrl: checkout.checkoutUrl,
          paymentId: checkout.paymentId
        };
      }
      return {
        ok: false,
        error: t(params.state.language, {
          es: "No pudimos iniciar el pago. Probá de nuevo en unos segundos.",
          en: "We couldn't start payment. Please try again in a few seconds.",
          pt: "Nao foi possivel iniciar o pagamento. Tente novamente em alguns segundos."
        })
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not start trial checkout"
      };
    }
  };

  const refreshSubscriptionFromApi = async (): Promise<void> => {
    const authToken = params.state.authToken;
    if (!authToken) {
      return;
    }

    try {
      const response = await apiRequest<ProfileMeApiResponse>("/api/profiles/me", {}, authToken);
      const latestPackage = response.profile?.latestPackage;
      const recentPackages = response.profile?.recentPackages;
      const purchaseHistory = recentPackages?.length
        ? [...recentPackages]
            .map((item) => ({
              id: item.id,
              name: item.name,
              credits: item.credits,
              purchasedAt: item.purchasedAt,
              priceCents: item.priceCents ?? null,
              currency: item.currency ?? null
            }))
            .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        : null;

      params.onStateChange((current) => ({
        ...current,
        subscription: latestPackage
          ? {
              packageId: latestPackage.id,
              packageName: latestPackage.name,
              creditsTotal: latestPackage.totalCredits,
              creditsRemaining: latestPackage.remainingCredits,
              purchasedAt: latestPackage.purchasedAt,
              purchaseHistory: purchaseHistory ?? current.subscription.purchaseHistory
            }
          : {
              ...current.subscription,
              ...(purchaseHistory ? { purchaseHistory } : {})
            },
        trialRebookAvailable:
          typeof response.profile?.trialRebookAvailable === "boolean"
            ? response.profile.trialRebookAvailable
            : current.trialRebookAvailable
      }));
    } catch (error) {
      console.error("Could not refresh subscription from API", error);
    }
  };

  const requestDlocalPaymentSyncOnce = async (syncParams: {
    paymentId?: string | null;
    orderId?: string | null;
  }): Promise<DlocalPaymentSyncResult> => {
    const authToken = params.state.authToken;
    if (!authToken) {
      return { ok: false, error: "Unauthorized" };
    }

    const paymentId = syncParams.paymentId?.trim() || null;
    const orderId = syncParams.orderId?.trim() || null;
    if (!paymentId && !orderId) {
      return { ok: false, error: "Missing payment reference" };
    }

    try {
      const result = paymentId
        ? await apiRequest<{ ok: boolean; fulfilled: boolean; paymentStatus: string }>(
            "/api/payments/dlocal/sync-payment",
            {
              method: "POST",
              body: JSON.stringify({ paymentId })
            },
            authToken
          )
        : await apiRequest<{ ok: boolean; fulfilled: boolean; paymentStatus: string }>(
            "/api/payments/dlocal/sync-order",
            {
              method: "POST",
              body: JSON.stringify({ orderId })
            },
            authToken
          );
      return {
        ok: true,
        fulfilled: result.fulfilled,
        paymentStatus: result.paymentStatus
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not sync payment"
      };
    }
  };

  const syncDlocalPayment = async (syncParams: {
    paymentId?: string | null;
    orderId?: string | null;
  }): Promise<DlocalPaymentSyncResult> => {
    // Cuando el paciente vuelve de dLocal, el pago ya está aprobado del lado del proveedor,
    // así que el primer intento suele acreditar de inmediato (o el webhook ya lo hizo). Los
    // reintentos cubren el pequeño lag del sandbox en pasar a PAID; los mantenemos cortos y
    // acotados (~4,5s techo) para no dejar al paciente esperando >10s por el popup/créditos.
    const retryDelaysMs = [0, 700, 1200, 2500];
    let lastResult: DlocalPaymentSyncResult = { ok: false, error: "Could not sync payment" };

    for (const delayMs of retryDelaysMs) {
      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      const result = await requestDlocalPaymentSyncOnce(syncParams);
      lastResult = result;
      if (!result.ok) {
        return result;
      }
      if (result.fulfilled) {
        await refreshSubscriptionFromApi();
        return result;
      }
    }

    return lastResult;
  };

  const syncTrialPayment = async (paymentId: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await syncDlocalPayment({ paymentId });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  };

  const confirmBooking = async (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const trialAlreadyUsed = params.state.trialUsedProfessionalIds.includes(professionalId);
    const bookingAsTrial = useTrialSession && !trialAlreadyUsed;
    const authToken = params.state.authToken;
    let remoteBooking:
      | {
          id: string;
          startsAt: string;
          endsAt: string;
          bookingMode?: "credit" | "trial";
          joinUrlPatient?: string;
          patientTimezoneAtBooking?: string;
          professionalTimezoneAtBooking?: string;
        }
      | null = null;

    if (authToken) {
      try {
        const idempotencyKey = `booking-${professionalId}-${slot.startsAt}-${slot.endsAt}`;
        const response = await apiRequest<{
          booking: BookingMutationApiItem;
        }>(
          "/api/bookings",
          {
            method: "POST",
            headers: {
              "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
              professionalId,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              patientTimezone: params.sessionTimezone,
              idempotencyKey,
              ...(holdId ? { holdId } : {})
            })
          },
          authToken
        );
        remoteBooking = response.booking;
      } catch (error) {
        console.error("Could not create booking", error);
        const errorMessage = error instanceof Error ? error.message : "";
        const hasLocalCredits = !bookingAsTrial && params.state.subscription.creditsRemaining > 0;
        const apiCreditStateMismatch =
          errorMessage === "Trial session already used. Purchase a package to continue."
          || errorMessage === "No available session credits. Purchase a package to continue.";

        if (hasLocalCredits && apiCreditStateMismatch) {
          if (!allowLocalDemoFallback) {
            return {
              ok: false,
              error: t(params.state.language, {
                es: "No pudimos confirmar la reserva. Recargá la página para sincronizar tus créditos e intentá de nuevo.",
                en: "We couldn't confirm the booking. Reload the page to sync your credits and try again.",
                pt: "Nao foi possivel confirmar a reserva. Recarregue a pagina para sincronizar seus creditos e tente novamente."
              })
            };
          }
          console.warn(
            "Booking API credits mismatch; creating reservation with local session balance (dev only)",
            errorMessage
          );
        } else if (errorMessage === "Trial session already used. Purchase a package to continue.") {
          return {
            ok: false,
            error: t(params.state.language, {
              es: "Ya tuviste tu sesión de prueba con nosotros. Cuando quieras podés sumar un paquete y seguir con tu proceso.",
              en: "You’ve already had your trial session with us. Whenever you’re ready, you can add a package and keep going.",
              pt: "Voce ja teve sua sessao de teste conosco. Quando quiser, pode adicionar um pacote e continuar."
            })
          };
        } else if (errorMessage === "No available session credits. Purchase a package to continue.") {
          return {
            ok: false,
            error: t(params.state.language, {
              es: "Por ahora no tenés sesiones disponibles para agendar. Sumá un paquete cuando te parezca y seguimos desde ahí.",
              en: "You don’t have sessions available to book right now. Add a package whenever it suits you and we’ll pick up from there.",
              pt: "Por enquanto voce nao tem sessoes para agendar. Adicione um pacote quando fizer sentido e seguimos a partir dai."
            })
          };
        } else {
          return {
            ok: false,
            error: friendlyBookingFailureMessage(errorMessage, params.state.language)
          };
        }
      }
    } else if (!bookingAsTrial && params.state.subscription.creditsRemaining <= 0) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "Por ahora no tenés sesiones disponibles para agendar. Sumá un paquete cuando te parezca y seguimos desde ahí.",
          en: "You don’t have sessions available to book right now. Add a package whenever it suits you and we’ll pick up from there.",
          pt: "Por enquanto voce nao tem sessoes para agendar. Adicione um pacote quando fizer sentido e seguimos a partir dai."
        })
      };
    }

    if (authToken && !remoteBooking && !allowLocalDemoFallback) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "No pudimos crear la reserva. Intentá de nuevo en unos segundos.",
          en: "We couldn't create the booking. Please try again in a few seconds.",
          pt: "Nao foi possivel criar a reserva. Tente novamente em alguns segundos."
        })
      };
    }

    if (bookingAsTrial || remoteBooking?.bookingMode === "trial") {
      await syncActiveProfessionalAssignment(professionalId);
    }

    const professionalName =
      findProfessionalById(professionalId, params.professionalDirectory)?.fullName ?? professionalId;

    params.onStateChange((current) => {
      const currentTrialAlreadyUsed = current.trialUsedProfessionalIds.includes(professionalId);
      const inferredBookingMode = remoteBooking?.bookingMode
        ?? (useTrialSession && !currentTrialAlreadyUsed ? "trial" : "credit");
      const currentBookingAsTrial = inferredBookingMode === "trial";
      const hasCredits = current.subscription.creditsRemaining > 0;

      if (!currentBookingAsTrial && !hasCredits) {
        return current;
      }

      const bookingId = remoteBooking?.id ?? `booking-${Date.now()}`;
      const newBooking: Booking = {
        id: bookingId,
        professionalId,
        startsAt: remoteBooking?.startsAt ?? slot.startsAt,
        endsAt: remoteBooking?.endsAt ?? slot.endsAt,
        status: "confirmed",
        joinUrl: remoteBooking?.joinUrlPatient?.trim() ?? "",
        createdAt: new Date().toISOString(),
        patientTimezoneAtBooking: remoteBooking?.patientTimezoneAtBooking,
        professionalTimezoneAtBooking: remoteBooking?.professionalTimezoneAtBooking,
        bookingMode: currentBookingAsTrial ? "trial" : "credit"
      };

      return {
        ...current,
        onboardingFinalCompleted: current.onboardingFinalCompleted || currentBookingAsTrial,
        therapistSelectionCompleted: true,
        selectedProfessionalId: professionalId,
        assignedProfessionalId: current.assignedProfessionalId ?? professionalId,
        assignedProfessionalName: professionalName,
        activeChatProfessionalId: professionalId,
        bookings: sortBookingsByStartsAtAsc([newBooking, ...current.bookings]),
        bookedSlotIds: [...current.bookedSlotIds, slot.id],
        trialUsedProfessionalIds:
          currentBookingAsTrial && !currentTrialAlreadyUsed
            ? [...current.trialUsedProfessionalIds, professionalId]
            : current.trialUsedProfessionalIds,
        subscription: {
          ...current.subscription,
          creditsRemaining: currentBookingAsTrial
            ? current.subscription.creditsRemaining
            : Math.max(current.subscription.creditsRemaining - 1, 0)
        }
      };
    });

    const completedAsTrial = remoteBooking?.bookingMode === "trial" || bookingAsTrial;
    if (completedAsTrial && params.state.session?.id) {
      try {
        window.sessionStorage.setItem(POST_TRIAL_CALENDAR_PENDING_SESSION_KEY, params.state.session.id);
      } catch {
        // ignore
      }
    }

    return { ok: true };
  };

  const rescheduleBooking = async (bookingId: string, professionalId: string, slot: TimeSlot) => {
    const booking = params.state.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== "confirmed") {
      return;
    }

    if (params.state.authToken) {
      try {
        const response = await apiRequest<{
          booking: {
            id: string;
            startsAt: string;
            endsAt: string;
            joinUrlPatient?: string;
            patientTimezoneAtBooking?: string;
            professionalTimezoneAtBooking?: string;
          };
        }>(
          `/api/bookings/${bookingId}/reschedule`,
          {
            method: "POST",
            body: JSON.stringify({
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              patientTimezone: params.sessionTimezone
            })
          },
          params.state.authToken
        );

        params.onStateChange((current) => {
          const previousSlotId = findSlotIdForBooking(
            booking.professionalId,
            booking.startsAt,
            booking.endsAt,
            params.professionalDirectory
          );
          const nextSlotId = slot.id;

          return {
            ...current,
            bookings: current.bookings.map((item) => (
              item.id === bookingId
                ? {
                    ...mergeRescheduledBooking(item, response.booking),
                    professionalId
                  }
                : item
            )),
            bookedSlotIds: [
              ...current.bookedSlotIds.filter((id) => id !== previousSlotId),
              nextSlotId
            ]
          };
        });
        return;
      } catch (error) {
        console.error("Could not reschedule booking", error);
        return;
      }
    }

    params.onStateChange((current) => {
      const previousSlotId = findSlotIdForBooking(
        booking.professionalId,
        booking.startsAt,
        booking.endsAt,
        params.professionalDirectory
      );
      const nextSlotId = slot.id;

      return {
        ...current,
        bookings: current.bookings.map((item) => (
          item.id === bookingId
            ? {
                ...item,
                professionalId,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt
              }
            : item
        )),
        bookedSlotIds: [
          ...current.bookedSlotIds.filter((id) => id !== previousSlotId),
          nextSlotId
        ]
      };
    });
  };

  const cancelBooking = async (
    bookingId: string,
    reason: string
  ): Promise<{ ok: boolean; error?: string; refundedCredits?: number; trialCreditReleased?: boolean }> => {
    const booking = params.state.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking cannot be cancelled" };
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "Indicá el motivo de la cancelación (mínimo 3 caracteres).",
          en: "Please enter a cancellation reason (at least 3 characters).",
          pt: "Informe o motivo do cancelamento (mínimo 3 caracteres)."
        })
      };
    }

    if (!params.state.authToken) {
      return { ok: false, error: "Missing session" };
    }

    try {
      const response = await apiRequest<{
        refundedCredits: number;
        trialCreditReleased?: boolean;
      }>(
        `/api/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ reason: trimmedReason })
        },
        params.state.authToken
      );

      const refundedCredits = response.refundedCredits ?? 0;
      const trialCreditReleased = Boolean(response.trialCreditReleased);

      params.onStateChange((current) => {
        const releasedSlotId = findSlotIdForBooking(
          booking.professionalId,
          booking.startsAt,
          booking.endsAt,
          params.professionalDirectory
        );
        const trialUsedProfessionalIds =
          booking.bookingMode === "trial"
            ? current.trialUsedProfessionalIds.filter((id) => id !== booking.professionalId)
            : current.trialUsedProfessionalIds;
        return {
          ...current,
          bookings: current.bookings.map((item) =>
            item.id === bookingId ? { ...item, status: "cancelled" as const } : item
          ),
          bookedSlotIds: current.bookedSlotIds.filter((id) => id !== releasedSlotId),
          trialUsedProfessionalIds,
          trialRebookAvailable:
            trialCreditReleased && booking.bookingMode === "trial"
              ? true
              : current.trialRebookAvailable,
          subscription:
            refundedCredits > 0
              ? {
                  ...current.subscription,
                  creditsRemaining: current.subscription.creditsRemaining + refundedCredits
                }
              : current.subscription
        };
      });

      // Sync inmediato para que Dashboard / calendario / banner de prueba queden al día con el API.
      await Promise.resolve(params.onRefreshPortalFromApi?.());

      return { ok: true, refundedCredits, trialCreditReleased: trialCreditReleased || booking.bookingMode === "trial" };
    } catch (error) {
      console.error("Could not cancel booking", error);
      const message = error instanceof Error ? error.message : "Could not cancel booking";
      return { ok: false, error: message };
    }
  };

  const planTrialFromDashboard = (professionalId: string, slot: TimeSlot) => {
    params.onStateChange((current) => {
      const now = Date.now();
      const activeTrial = current.bookings
        .filter(
          (booking) =>
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            new Date(booking.endsAt).getTime() >= now
        )
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

      if (!activeTrial) {
        return current;
      }

      const previousSlotId =
        findProfessionalById(activeTrial.professionalId, params.professionalDirectory)?.slots.find(
          (candidate) => candidate.startsAt === activeTrial.startsAt && candidate.endsAt === activeTrial.endsAt
        )?.id ?? null;

      if (activeTrial.professionalId === professionalId && activeTrial.startsAt === slot.startsAt) {
        return current;
      }

      return {
        ...current,
        onboardingFinalCompleted: true,
        therapistSelectionCompleted: true,
        selectedProfessionalId: professionalId,
        assignedProfessionalId: professionalId,
        bookings: current.bookings.map((booking) =>
          booking.id === activeTrial.id
            ? {
                ...booking,
                professionalId,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt
              }
            : booking
        ),
        bookedSlotIds: [
          ...current.bookedSlotIds.filter((id) => id !== previousSlotId),
          slot.id
        ],
        trialUsedProfessionalIds: current.trialUsedProfessionalIds.includes(professionalId)
          ? current.trialUsedProfessionalIds
          : [...current.trialUsedProfessionalIds, professionalId]
      };
    });
  };

  const sendMessage = (professionalId: string, text: string) => {
    const messageId = `msg-${Date.now()}`;

    params.onStateChange((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: messageId,
          professionalId,
          sender: "patient",
          text,
          read: true,
          createdAt: new Date().toISOString()
        }
      ]
    }));

    window.setTimeout(() => {
      params.onStateChange((current) => {
        const professional = findProfessionalById(professionalId, params.professionalDirectory);
        return {
          ...current,
          messages: [
            ...current.messages,
            {
              id: `msg-${Date.now() + 1}`,
              professionalId,
              sender: "professional",
              text: replaceTemplate(
                t(current.language, {
                  es: "{name}: Gracias por tu mensaje. Lo revise y lo vemos en la sesión.",
                  en: "{name}: Thanks for your message. I reviewed it and we will go over it in session.",
                  pt: "{name}: Obrigado pela mensagem. Revisei e veremos isso na sessao."
                }),
                { name: professional?.fullName ?? "" }
              ),
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        };
      });
    }, 900);
  };

  const markThreadAsRead = (professionalId: string) => {
    params.onStateChange((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.professionalId === professionalId && message.sender === "professional"
          ? { ...message, read: true }
          : message
      )
    }));
  };

  const toggleFavoriteProfessional = (professionalId: string) => {
    params.onStateChange((current) => {
      const alreadyFavorite = current.favoriteProfessionalIds.includes(professionalId);
      return {
        ...current,
        favoriteProfessionalIds: alreadyFavorite
          ? current.favoriteProfessionalIds.filter((id) => id !== professionalId)
          : [...current.favoriteProfessionalIds, professionalId]
      };
    });
  };

  return {
    syncActiveProfessionalAssignment,
    addPackage,
    purchaseIndividualSessions,
    startTrialCheckout,
    syncTrialPayment,
    syncDlocalPayment,
    confirmBooking,
    rescheduleBooking,
    cancelBooking,
    planTrialFromDashboard,
    sendMessage,
    markThreadAsRead,
    toggleFavoriteProfessional
  };
}
