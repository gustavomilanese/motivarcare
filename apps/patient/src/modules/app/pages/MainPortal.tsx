import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { syncUserTimezone } from "@therapy/auth";
import { SessionDetailModal } from "../../booking/components/SessionDetailModal";
import { PortalNavigation } from "../components/PortalNavigation";
import { type LanguageChoice, PortalPreferencesModal } from "../components/PortalPreferencesModal";
import {
  mergeRescheduledBooking,
  type BookingMutationApiItem
} from "../../booking/bookingMappers";
import { DashboardPage } from "./DashboardPage";
import { BookingPage } from "./BookingPage";
import { ChatPage } from "./ChatPage";
import { MatchingPage } from "./MatchingPage";
import { ProfilePage } from "./ProfilePage";
import { professionalsCatalog } from "../data/professionalsCatalog";
import { API_BASE, apiRequest } from "../services/api";
import type {
  Booking,
  Message,
  PackagePlan,
  PackagePurchaseSource,
  PatientAppState,
  ProfileTab,
  Professional,
  TimeSlot
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

function getUnreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter((message) => !message.read && (!professionalId || message.professionalId === professionalId)).length;
}

function currencySymbolOnly(currency: SupportedCurrency): string {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "EUR";
    case "GBP":
      return "GBP";
    case "BRL":
      return "R$";
    case "ARS":
      return "$";
    default:
      return currency;
  }
}

function findSlotIdForBooking(professionalId: string, startsAt: string, endsAt: string): string | null {
  return (
    findProfessionalById(professionalId).slots.find((slot) => slot.startsAt === startsAt && slot.endsAt === endsAt)?.id
    ?? null
  );
}

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/prof-emma.svg";
}

function handleHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/hero-therapy.svg";
}

export function MainPortal(props: {
  state: PatientAppState;
  sessionTimezone: string;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const unreadMessagesCount = getUnreadCount(props.state.messages);
  const favoriteCount = props.state.favoriteProfessionalIds.length;
  const needsOnboardingFinalFlow = !props.state.intake?.riskBlocked && !props.state.onboardingFinalCompleted;
  const isOnboardingMatchingView = location.pathname.startsWith("/onboarding/final/matching");
  const hideSidebar = isOnboardingMatchingView;
  const needsInitialTherapistSelection =
    !props.state.therapistSelectionCompleted
    && !props.state.assignedProfessionalId
    && props.state.bookings.length === 0;
  const stateForDisplay = useMemo(
    () => ({
      ...props.state,
      profile: {
        ...props.state.profile,
        timezone: props.sessionTimezone
      }
    }),
    [props.state, props.sessionTimezone]
  );
  const selectedBooking = selectedBookingId
    ? props.state.bookings.find((booking) => booking.id === selectedBookingId) ?? null
    : null;
  const languageChoices: LanguageChoice[] = [
    { value: "es", nativeLabel: "Espanol", englishLabel: "Spanish" },
    { value: "en", nativeLabel: "English", englishLabel: "English" },
    { value: "pt", nativeLabel: "Portugues", englishLabel: "Portuguese" }
  ];

  useEffect(() => {
    if (!menuOpen && !preferencesOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setMenuOpen(false);
      setPreferencesOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, preferencesOpen]);

  const handleReserveFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      selectedProfessionalId: professionalId
    }));
    navigate("/sessions");
  };

  const handleGoToReservations = () => {
    navigate("/sessions?focus=reservations");
  };

  const handleGoToProfessional = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      selectedProfessionalId: professionalId
    }));
    navigate("/sessions");
  };

  const handleChatFromAnywhere = (professionalId: string) => {
    props.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      activeChatProfessionalId: professionalId
    }));
    navigate("/chat");
  };

  const openProfileTabFromMenu = (tab: ProfileTab) => {
    setMenuOpen(false);
    navigate(`/profile?tab=${tab}`);
  };

  const addPackage = (plan: PackagePlan, source: PackagePurchaseSource) => {
    if (source !== "checkout_button") {
      return;
    }

    props.onStateChange((current) => ({
      ...current,
      therapistSelectionCompleted: true,
      assignedProfessionalId: current.selectedProfessionalId,
      subscription: {
        packageId: plan.id,
        packageName: plan.name,
        creditsTotal: plan.credits,
        creditsRemaining: current.subscription.creditsRemaining + plan.credits,
        purchasedAt: new Date().toISOString()
      }
    }));
  };

  const startPackagePurchase = (plan: PackagePlan) => {
    navigate(`/sessions?flow=checkout&plan=${plan.id}`);
  };

  const confirmBooking = async (professionalId: string, slot: TimeSlot, useTrialSession: boolean): Promise<boolean> => {
    const trialAlreadyUsed = props.state.trialUsedProfessionalIds.includes(professionalId);
    const bookingAsTrial = useTrialSession && !trialAlreadyUsed;
    if (!bookingAsTrial && props.state.subscription.creditsRemaining <= 0) {
      return false;
    }

    const authToken = props.state.authToken;
    let remoteBooking:
      | {
          id: string;
          startsAt: string;
          endsAt: string;
          joinUrlPatient?: string;
          patientTimezoneAtBooking?: string;
          professionalTimezoneAtBooking?: string;
        }
      | null = null;

    if (!bookingAsTrial && authToken) {
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
              patientTimezone: props.sessionTimezone,
              idempotencyKey
            })
          },
          authToken
        );
        remoteBooking = response.booking;
      } catch (error) {
        console.error("Could not create booking", error);
        return false;
      }
    }

    if (bookingAsTrial && authToken) {
      try {
        await apiRequest(
          "/api/profiles/me/active-professional",
          {
            method: "PATCH",
            body: JSON.stringify({ professionalId })
          },
          authToken
        );
      } catch (error) {
        console.error("Could not sync active professional assignment", error);
      }
    }

    const professionalName = findProfessionalById(professionalId).fullName;

    props.onStateChange((current) => {
      const currentTrialAlreadyUsed = current.trialUsedProfessionalIds.includes(professionalId);
      const currentBookingAsTrial = useTrialSession && !currentTrialAlreadyUsed;
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
          creditsRemaining: currentBookingAsTrial ? current.subscription.creditsRemaining : current.subscription.creditsRemaining - 1
        }
      };
    });

    return true;
  };

  const cancelBooking = async (bookingId: string) => {
    const booking = props.state.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== "confirmed" || booking.bookingMode === "trial") {
      return;
    }

    if (props.state.authToken) {
      try {
        await apiRequest(
          `/api/bookings/${bookingId}/cancel`,
          {
            method: "POST",
            body: JSON.stringify({ reason: "patient_cancelled" })
          },
          props.state.authToken
        );
      } catch (error) {
        console.error("Could not cancel booking", error);
        return;
      }
    }

    props.onStateChange((current) => {
      const slotId = findSlotIdForBooking(booking.professionalId, booking.startsAt, booking.endsAt);

      return {
        ...current,
        bookings: current.bookings.map((item) => (
          item.id === bookingId ? { ...item, status: "cancelled" as const } : item
        )),
        bookedSlotIds: slotId ? current.bookedSlotIds.filter((id) => id !== slotId) : current.bookedSlotIds,
        subscription: {
          ...current.subscription,
          creditsRemaining: current.subscription.creditsRemaining + 1
        }
      };
    });
  };

  const rescheduleBooking = async (bookingId: string, professionalId: string, slot: TimeSlot) => {
    const booking = props.state.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status !== "confirmed" || booking.bookingMode === "trial") {
      return;
    }

    if (props.state.authToken) {
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
              patientTimezone: props.sessionTimezone
            })
          },
          props.state.authToken
        );

        props.onStateChange((current) => {
          const previousSlotId = findSlotIdForBooking(booking.professionalId, booking.startsAt, booking.endsAt);
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

    props.onStateChange((current) => {
      const previousSlotId = findSlotIdForBooking(booking.professionalId, booking.startsAt, booking.endsAt);
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
    props.onStateChange((current) => {
      const now = Date.now();
      const activeTrial = current.bookings
        .filter(
          (booking) =>
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            new Date(booking.endsAt).getTime() >= now
        )
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

      const previousSlotId = activeTrial
        ? findProfessionalById(activeTrial.professionalId).slots.find(
            (candidate) => candidate.startsAt === activeTrial.startsAt && candidate.endsAt === activeTrial.endsAt
          )?.id ?? null
        : null;

      if (activeTrial && activeTrial.professionalId === professionalId && activeTrial.startsAt === slot.startsAt) {
        return current;
      }

      const updatedBookings = activeTrial
        ? current.bookings.map((booking) => (booking.id === activeTrial.id ? { ...booking, status: "cancelled" as const } : booking))
        : current.bookings;

      let nextTrialUsed = [...current.trialUsedProfessionalIds];
      if (activeTrial) {
        const previousProfessionalId = activeTrial.professionalId;
        const hasCompletedTrialForPrevious = current.bookings.some(
          (booking) =>
            booking.id !== activeTrial.id &&
            booking.bookingMode === "trial" &&
            booking.status === "confirmed" &&
            booking.professionalId === previousProfessionalId &&
            new Date(booking.endsAt).getTime() < now
        );
        if (!hasCompletedTrialForPrevious) {
          nextTrialUsed = nextTrialUsed.filter((id) => id !== previousProfessionalId);
        }
      }
      if (!nextTrialUsed.includes(professionalId)) {
        nextTrialUsed.push(professionalId);
      }

      const bookingId = `booking-${Date.now()}`;
      const newTrialBooking: Booking = {
        id: bookingId,
        professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        joinUrl: `https://video.therapy.local/session/${bookingId}`,
        createdAt: new Date().toISOString(),
        bookingMode: "trial"
      };

      return {
        ...current,
        onboardingFinalCompleted: true,
        therapistSelectionCompleted: true,
        selectedProfessionalId: professionalId,
        assignedProfessionalId: professionalId,
        bookings: [newTrialBooking, ...updatedBookings],
        bookedSlotIds: [
          ...current.bookedSlotIds.filter((id) => id !== previousSlotId),
          slot.id
        ],
        trialUsedProfessionalIds: nextTrialUsed
      };
    });
  };

  const cancelTrialFromDashboard = () => {
    props.onStateChange((current) => {
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
        findProfessionalById(activeTrial.professionalId).slots.find(
          (candidate) => candidate.startsAt === activeTrial.startsAt && candidate.endsAt === activeTrial.endsAt
        )?.id ?? null;

      const hasCompletedTrialForProfessional = current.bookings.some(
        (booking) =>
          booking.id !== activeTrial.id &&
          booking.bookingMode === "trial" &&
          booking.status === "confirmed" &&
          booking.professionalId === activeTrial.professionalId &&
          new Date(booking.endsAt).getTime() < now
      );

      return {
        ...current,
        assignedProfessionalId: current.subscription.creditsRemaining > 0 ? current.assignedProfessionalId : null,
        bookings: current.bookings.map((booking) =>
          booking.id === activeTrial.id ? { ...booking, status: "cancelled" as const } : booking
        ),
        bookedSlotIds: current.bookedSlotIds.filter((id) => id !== previousSlotId),
        trialUsedProfessionalIds: hasCompletedTrialForProfessional
          ? current.trialUsedProfessionalIds
          : current.trialUsedProfessionalIds.filter((id) => id !== activeTrial.professionalId)
      };
    });
  };

  const sendMessage = (professionalId: string, text: string) => {
    const messageId = `msg-${Date.now()}`;

    props.onStateChange((current) => ({
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
      props.onStateChange((current) => {
        const professional = findProfessionalById(professionalId);
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
    props.onStateChange((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.professionalId === professionalId && message.sender === "professional"
          ? { ...message, read: true }
          : message
      )
    }));
  };

  const toggleFavoriteProfessional = (professionalId: string) => {
    props.onStateChange((current) => {
      const alreadyFavorite = current.favoriteProfessionalIds.includes(professionalId);
      return {
        ...current,
        favoriteProfessionalIds: alreadyFavorite
          ? current.favoriteProfessionalIds.filter((id) => id !== professionalId)
          : [...current.favoriteProfessionalIds, professionalId]
      };
    });
  };

  return (
    <div className={`portal-shell ${hideSidebar ? "onboarding-match-focus" : ""}`}>
      <PortalNavigation
        language={props.state.language}
        sessionEmail={props.state.session?.email}
        sessionFullName={props.state.session?.fullName}
        unreadMessagesCount={unreadMessagesCount}
        menuOpen={menuOpen}
        languageSummary={languageChoices.find((item) => item.value === props.state.language)?.nativeLabel ?? "Espanol"}
        currencySummary={currencySymbolOnly(props.state.currency)}
        favoriteCount={favoriteCount}
        onToggleMenu={() => setMenuOpen((current) => !current)}
        onOpenProfileTab={openProfileTabFromMenu}
        onOpenPreferences={() => {
          setMenuOpen(false);
          setPreferencesOpen(true);
        }}
        onLogout={() => {
          setMenuOpen(false);
          props.onLogout();
          navigate("/");
        }}
        hideSidebar={hideSidebar}
      >
        {props.state.intake?.riskBlocked ? (
          <section className="content-card danger">
            <strong>
              {t(props.state.language, {
                es: "Triage de seguridad activo:",
                en: "Safety triage active:",
                pt: "Triagem de seguranca ativa:"
              })}
            </strong>{" "}
            {t(props.state.language, {
              es: "la reserva queda deshabilitada hasta revision manual.",
              en: "booking is disabled until manual review.",
              pt: "a reserva fica desabilitada ate revisao manual."
            })}
          </section>
        ) : null}

        <main className="portal-main-content">
          <Routes>
          <Route
            path="/"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
                  <DashboardPage
                    state={stateForDisplay}
                    language={props.state.language}
                    currency={props.state.currency}
                    onImageFallback={handleImageFallback}
                    onHeroFallback={handleHeroFallback}
                    onGoToReservations={handleGoToReservations}
                    onGoToBooking={handleReserveFromAnywhere}
                    onGoToProfessional={handleGoToProfessional}
                    onGoToChat={handleChatFromAnywhere}
                    onOpenBookingDetail={(bookingId) => setSelectedBookingId(bookingId)}
                    onPlanTrialFromDashboard={planTrialFromDashboard}
                    onCancelTrialFromDashboard={cancelTrialFromDashboard}
                    onStartPackagePurchase={startPackagePurchase}
                  />
                )
            }
          />
          <Route
            path="/matching"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
                    <MatchingPage
                      language={props.state.language}
                      authToken={props.state.authToken}
                      mode="portal"
                      intakeAnswers={props.state.intake?.answers ?? {}}
                      isFirstSelectionRequired={false}
                      showOnlyFavorites={false}
                      favoriteProfessionalIds={props.state.favoriteProfessionalIds}
                      selectedProfessionalId={props.state.selectedProfessionalId}
                      onToggleFavorite={toggleFavoriteProfessional}
                      onToggleFavoritesView={(showOnlyFavorites) => {
                        navigate(showOnlyFavorites ? "/favorites" : "/matching");
                      }}
                      onSelectProfessional={(professionalId) =>
                        props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                      }
                      onCompleteFirstSelection={() => {}}
                      onCreateBooking={async () => {}}
                      onReserve={handleReserveFromAnywhere}
                      onChat={handleChatFromAnywhere}
                      onImageFallback={handleImageFallback}
                    />
                  )
            }
          />
          <Route path="/onboarding/final" element={<Navigate replace to="/onboarding/final/matching" />} />
          <Route
            path="/onboarding/final/matching"
            element={
              needsOnboardingFinalFlow
                ? (
                    <MatchingPage
                      language={props.state.language}
                      authToken={props.state.authToken}
                      mode="onboarding-final"
                      intakeAnswers={props.state.intake?.answers ?? {}}
                      isFirstSelectionRequired={needsInitialTherapistSelection}
                      showOnlyFavorites={false}
                      favoriteProfessionalIds={props.state.favoriteProfessionalIds}
                      selectedProfessionalId={props.state.selectedProfessionalId}
                      onToggleFavorite={toggleFavoriteProfessional}
                      onToggleFavoritesView={(showOnlyFavorites) => {
                        navigate(showOnlyFavorites ? "/favorites" : "/onboarding/final/matching");
                      }}
                      onSelectProfessional={(professionalId) =>
                        props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                      }
                      onCompleteFirstSelection={({ professionalId, professionalName }) => {
                        props.onStateChange((current) => ({
                          ...current,
                          therapistSelectionCompleted: true,
                          selectedProfessionalId: professionalId,
                          assignedProfessionalId: professionalId,
                          assignedProfessionalName: professionalName,
                          activeChatProfessionalId: professionalId
                        }));
                      }}
                      onCreateBooking={async (professionalId, slot) => {
                        const ok = await confirmBooking(professionalId, slot, true);
                        if (!ok) {
                          throw new Error(
                            t(props.state.language, {
                              es: "No hay sesiones disponibles para confirmar esta reserva.",
                              en: "No available sessions to confirm this booking.",
                              pt: "Nao ha sessoes disponiveis para confirmar esta reserva."
                            })
                          );
                        }
                        props.onStateChange((current) => ({
                          ...current,
                          onboardingFinalCompleted: true
                        }));
                        navigate("/sessions?focus=reservations");
                      }}
                      onReserve={handleReserveFromAnywhere}
                      onChat={handleChatFromAnywhere}
                      onImageFallback={handleImageFallback}
                    />
                  )
                : <Navigate replace to="/" />
            }
          />
          <Route
            path="/favorites"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
                    <MatchingPage
                      language={props.state.language}
                      authToken={props.state.authToken}
                      mode="portal"
                      intakeAnswers={props.state.intake?.answers ?? {}}
                      isFirstSelectionRequired={false}
                      showOnlyFavorites
                      favoriteProfessionalIds={props.state.favoriteProfessionalIds}
                      selectedProfessionalId={props.state.selectedProfessionalId}
                      onToggleFavorite={toggleFavoriteProfessional}
                      onToggleFavoritesView={(showOnlyFavorites) => {
                        navigate(showOnlyFavorites ? "/favorites" : "/matching");
                      }}
                      onSelectProfessional={(professionalId) =>
                        props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                      }
                      onCompleteFirstSelection={() => {}}
                      onCreateBooking={async () => {}}
                      onReserve={handleReserveFromAnywhere}
                      onChat={handleChatFromAnywhere}
                      onImageFallback={handleImageFallback}
                    />
                  )
            }
          />
          <Route
            path="/sessions"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
              <BookingPage
                state={stateForDisplay}
                sessionTimezone={props.sessionTimezone}
                language={props.state.language}
                currency={props.state.currency}
                onImageFallback={handleImageFallback}
                onGoToChat={handleChatFromAnywhere}
                onSelectProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                }
                onConfirmBooking={confirmBooking}
                onCancelBooking={cancelBooking}
                onRescheduleBooking={rescheduleBooking}
                onOpenBookingDetail={(bookingId) => setSelectedBookingId(bookingId)}
              />
                )
            }
          />
          <Route
            path="/booking"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : <Navigate replace to="/sessions" />
            }
          />
          <Route
            path="/chat"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
              <ChatPage
                state={stateForDisplay}
                language={props.state.language}
                authToken={props.state.authToken}
                sessionUserId={props.state.session?.id ?? ""}
                onImageFallback={handleImageFallback}
                onSetActiveProfessional={(professionalId) =>
                  props.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }))
                }
                onSendMessage={sendMessage}
                onMarkRead={markThreadAsRead}
              />
                )
            }
          />
          <Route
            path="/profile"
            element={
              needsOnboardingFinalFlow
                ? <Navigate replace to="/onboarding/final/matching" />
                : (
              props.state.session ? (
                <ProfilePage
                  user={props.state.session}
                  language={props.state.language}
                  profile={props.state.profile}
                  subscription={props.state.subscription}
                  onUpdateProfile={(profile) => {
                    props.onStateChange((current) => ({
                      ...current,
                      profile
                    }));
                    if (!props.state.authToken) {
                      return;
                    }
                    void syncUserTimezone({
                      baseUrl: API_BASE,
                      token: props.state.authToken,
                      timezone: profile.timezone,
                      persistPreference: true
                    }).catch((error) => {
                      console.error("Could not persist patient timezone preference", error);
                    });
                  }}
                />
              ) : null
                )
            }
          />
          </Routes>
        </main>
      </PortalNavigation>
      {selectedBooking ? (
        <SessionDetailModal
          booking={selectedBooking}
          timezone={props.sessionTimezone}
          language={props.state.language}
          professional={findProfessionalById(selectedBooking.professionalId)}
          onClose={() => setSelectedBookingId("")}
        />
      ) : null}
      <PortalPreferencesModal
        open={preferencesOpen}
        language={props.state.language}
        currency={props.state.currency}
        languageChoices={languageChoices}
        onClose={() => setPreferencesOpen(false)}
        onLanguageChange={(language) => {
          props.onStateChange((current) => ({
            ...current,
            language
          }));
        }}
        onCurrencyChange={(currency) => {
          props.onStateChange((current) => ({
            ...current,
            currency
          }));
        }}
      />
    </div>
  );
}
