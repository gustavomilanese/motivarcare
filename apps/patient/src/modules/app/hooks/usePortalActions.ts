import { replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { mergeRescheduledBooking, type BookingMutationApiItem } from "../../booking/bookingMappers";
import { apiRequest } from "../services/api";
import { findProfessionalById, findSlotIdForBooking } from "../lib/professionals";
import type {
  Booking,
  PackagePlan,
  PackagePurchaseSource,
  PatientAppState,
  PurchasePackageApiResponse,
  Professional,
  TimeSlot
} from "../types";

function t(language: PatientAppState["language"], values: { es: string; en: string; pt: string }): string {
  return textByLanguage(language, values);
}

export function usePortalActions(params: {
  state: PatientAppState;
  sessionTimezone: string;
  professionalDirectory: Professional[];
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
}) {
  const syncActiveProfessionalAssignment = async (professionalId: string) => {
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

  const addPackage = async (plan: PackagePlan, source: PackagePurchaseSource): Promise<boolean> => {
    if (source !== "checkout_button") {
      return false;
    }

    const selectedProfessionalId = params.state.selectedProfessionalId;
    const authToken = params.state.authToken;
    let purchasedPackage: PurchasePackageApiResponse["purchase"] | null = null;

    if (authToken) {
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
        console.error("Could not purchase package", error);
        return false;
      }
    }

    params.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      onboardingFinalCompleted: true,
      assignedProfessionalId: current.selectedProfessionalId,
      subscription: {
        packageId: purchasedPackage?.packageId ?? plan.id,
        packageName: purchasedPackage?.packageName ?? plan.name,
        creditsTotal: purchasedPackage?.totalCredits ?? plan.credits,
        creditsRemaining: purchasedPackage?.remainingCredits ?? plan.credits,
        purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString(),
        purchaseHistory: [
          {
            id: purchasedPackage?.id ?? `local-${Date.now().toString(36)}`,
            name: purchasedPackage?.packageName ?? plan.name,
            credits: plan.credits,
            purchasedAt: purchasedPackage?.purchasedAt ?? new Date().toISOString()
          },
          ...current.subscription.purchaseHistory
        ].slice(0, 20)
      }
    }));

    if (selectedProfessionalId) {
      void syncActiveProfessionalAssignment(selectedProfessionalId);
    }

    return true;
  };

  const confirmBooking = async (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean
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
              idempotencyKey
            })
          },
          authToken
        );
        remoteBooking = response.booking;
      } catch (error) {
        console.error("Could not create booking", error);
        const errorMessage = error instanceof Error ? error.message : "";
        if (errorMessage === "Trial session already used. Purchase a package to continue.") {
          return {
            ok: false,
            error: t(params.state.language, {
              es: "Ya usaste tu sesión de prueba. Compra un paquete para continuar.",
              en: "You already used your trial session. Buy a package to continue.",
              pt: "Voce ja usou sua sessao de teste. Compre um pacote para continuar."
            })
          };
        }
        if (errorMessage === "No available session credits. Purchase a package to continue.") {
          return {
            ok: false,
            error: t(params.state.language, {
              es: "No tienes sesiones disponibles para reservar.",
              en: "You have no available sessions to book.",
              pt: "Voce nao tem sessoes disponiveis para reservar."
            })
          };
        }
        return {
          ok: false,
          error:
            errorMessage
              ? errorMessage
              : t(params.state.language, {
                  es: "No se pudo confirmar la reserva.",
                  en: "Could not confirm booking.",
                  pt: "Nao foi possivel confirmar a reserva."
                })
        };
      }
    } else if (!bookingAsTrial && params.state.subscription.creditsRemaining <= 0) {
      return {
        ok: false,
        error: t(params.state.language, {
          es: "No tienes sesiones disponibles para reservar.",
          en: "You have no available sessions to book.",
          pt: "Voce nao tem sessoes disponiveis para reservar."
        })
      };
    }

    if (bookingAsTrial || remoteBooking?.bookingMode === "trial") {
      await syncActiveProfessionalAssignment(professionalId);
    }

    const professionalName = findProfessionalById(professionalId, params.professionalDirectory).fullName;

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
        joinUrl: remoteBooking?.joinUrlPatient ?? `https://video.therapy.local/session/${bookingId}`,
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
        bookings: [newBooking, ...current.bookings],
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
    return { ok: true };
  };

  const rescheduleBooking = async (bookingId: string, professionalId: string, slot: TimeSlot) => {
    const booking = params.state.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== "confirmed" || booking.bookingMode === "trial") {
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

      const previousSlotId = findProfessionalById(activeTrial.professionalId, params.professionalDirectory).slots.find(
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
                  es: "{name}: Gracias por tu mensaje. Lo revise y lo vemos en la sesion.",
                  en: "{name}: Thanks for your message. I reviewed it and we will go over it in session.",
                  pt: "{name}: Obrigado pela mensagem. Revisei e veremos isso na sessao."
                }),
                { name: professional.fullName }
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
    confirmBooking,
    rescheduleBooking,
    planTrialFromDashboard,
    sendMessage,
    markThreadAsRead,
    toggleFavoriteProfessional
  };
}
