import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionDetailModal } from "../../booking/components/SessionDetailModal";
import { PortalNavigation } from "../components/PortalNavigation";
import { type LanguageChoice, PortalPreferencesModal } from "../components/PortalPreferencesModal";
import { usePortalNotifications } from "../hooks/usePortalNotifications";
import { usePortalActions } from "../hooks/usePortalActions";
import { usePortalUiState } from "../hooks/usePortalUiState";
import { usePortalNavigation } from "../hooks/usePortalNavigation";
import { PortalRoutes } from "./PortalRoutes";
import { findProfessionalById } from "../lib/professionals";
import type {
  Booking,
  Message,
  PatientAppState,
  Professional,
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function getUnreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter((message) => !message.read && (!professionalId || message.professionalId === professionalId)).length;
}

function hasConfirmedTrialBooking(bookings: Booking[]): boolean {
  return bookings.some((booking) => booking.status === "confirmed" && booking.bookingMode === "trial");
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
  professionalDirectory: Professional[];
  professionalPhotoMap: Record<string, string>;
  sessionTimezone: string;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const ui = usePortalUiState({
    navigate,
    onStateChange: props.onStateChange,
    onLogout: props.onLogout
  });
  const { remoteUnreadMessagesCount, notificationItems, notificationsUnreadCount } = usePortalNotifications({
    authToken: props.state.authToken,
    language: props.state.language,
    messages: props.state.messages
  });
  const localUnreadMessagesCount = getUnreadCount(props.state.messages);
  const unreadMessagesCount = props.state.authToken
    ? (remoteUnreadMessagesCount ?? localUnreadMessagesCount)
    : localUnreadMessagesCount;
  const favoriteCount = props.state.favoriteProfessionalIds.length;
  const hasAnyBookingHistory = props.state.bookings.length > 0;
  const hasAnyPurchasedCredits =
    Boolean(props.state.subscription.packageId)
    || props.state.subscription.creditsTotal > 0
    || props.state.subscription.creditsRemaining > 0;
  const hasCompletedOnboardingPreviously = hasAnyBookingHistory || hasAnyPurchasedCredits;
  const needsOnboardingFinalFlow =
    !props.state.intake?.riskBlocked
    && !hasCompletedOnboardingPreviously
    && !props.state.onboardingFinalCompleted;
  /** Solo forzar pantalla de matching hasta elegir terapeuta; después el resto del portal debe ser usable (comprar, chat, etc.). */
  const canLeaveMatchingOnboarding =
    props.state.therapistSelectionCompleted
    || Boolean(props.state.assignedProfessionalId)
    || props.state.bookings.length > 0;
  const lockToTherapistSelection = needsOnboardingFinalFlow && !canLeaveMatchingOnboarding;
  const isOnboardingMatchingView =
    lockToTherapistSelection && location.pathname.startsWith("/onboarding/final/matching");
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

  const {
    handleReserveFromAnywhere,
    handleGoToReservations,
    handleGoToProfessional,
    handleChatFromAnywhere
  } = usePortalNavigation({
    navigate,
    onStateChange: props.onStateChange
  });

  const {
    syncActiveProfessionalAssignment,
    addPackage,
    confirmBooking,
    rescheduleBooking,
    planTrialFromDashboard,
    sendMessage,
    markThreadAsRead,
    toggleFavoriteProfessional
  } = usePortalActions({
    state: props.state,
    sessionTimezone: props.sessionTimezone,
    professionalDirectory: props.professionalDirectory,
    onStateChange: props.onStateChange
  });

  useEffect(() => {
    if (!location.pathname.startsWith("/onboarding/final")) {
      return;
    }
    if (lockToTherapistSelection) {
      return;
    }
    navigate("/", { replace: true });
    const fallbackTimeout = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/onboarding/final")) {
        window.location.replace("/");
      }
    }, 200);
    return () => window.clearTimeout(fallbackTimeout);
  }, [location.pathname, navigate, lockToTherapistSelection]);

  return (
    <div className={`portal-shell ${hideSidebar ? "onboarding-match-focus" : ""}`}>
      <PortalNavigation
        language={props.state.language}
        sessionEmail={props.state.session?.email}
        sessionFullName={props.state.session?.fullName}
        unreadMessagesCount={unreadMessagesCount}
        notificationsUnreadCount={notificationsUnreadCount}
        notificationsOpen={ui.notificationsOpen}
        notifications={notificationItems}
        menuOpen={ui.menuOpen}
        languageSummary={languageChoices.find((item) => item.value === props.state.language)?.nativeLabel ?? "Espanol"}
        currencySummary={currencySymbolOnly(props.state.currency)}
        favoriteCount={favoriteCount}
        onToggleMenu={ui.toggleMenu}
        onToggleNotifications={ui.toggleNotifications}
        onOpenNotificationThread={ui.openNotificationThread}
        onOpenProfileTab={ui.openProfileTabFromMenu}
        onOpenPreferences={ui.openPreferences}
        onLogout={ui.logoutFromMenu}
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
          <PortalRoutes
            state={props.state}
            stateForDisplay={stateForDisplay}
            lockToTherapistSelection={lockToTherapistSelection}
            needsInitialTherapistSelection={needsInitialTherapistSelection}
            sessionTimezone={props.sessionTimezone}
            professionalDirectory={props.professionalDirectory}
            professionalPhotoMap={props.professionalPhotoMap}
            onStateChange={props.onStateChange}
            setSelectedBookingId={setSelectedBookingId}
            navigate={navigate}
            onImageFallback={handleImageFallback}
            onHeroFallback={handleHeroFallback}
            handleGoToReservations={handleGoToReservations}
            handleReserveFromAnywhere={handleReserveFromAnywhere}
            handleGoToProfessional={handleGoToProfessional}
            handleChatFromAnywhere={handleChatFromAnywhere}
            toggleFavoriteProfessional={toggleFavoriteProfessional}
            syncActiveProfessionalAssignment={syncActiveProfessionalAssignment}
            confirmBooking={confirmBooking}
            rescheduleBooking={rescheduleBooking}
            planTrialFromDashboard={planTrialFromDashboard}
            addPackage={addPackage}
            sendMessage={sendMessage}
            markThreadAsRead={markThreadAsRead}
          />
        </main>
      </PortalNavigation>
      {selectedBooking ? (
        <SessionDetailModal
          booking={selectedBooking}
          timezone={props.sessionTimezone}
          language={props.state.language}
          professional={{
            ...findProfessionalById(selectedBooking.professionalId, props.professionalDirectory),
            photoUrl: props.professionalPhotoMap[selectedBooking.professionalId]
          }}
          onClose={() => setSelectedBookingId("")}
          onImageFallback={handleImageFallback}
        />
      ) : null}
      <PortalPreferencesModal
        open={ui.preferencesOpen}
        language={props.state.language}
        currency={props.state.currency}
        languageChoices={languageChoices}
        onClose={ui.closePreferences}
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
