import { syncUserTimezone } from "@therapy/auth";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { Navigate, Route, Routes, type NavigateFunction } from "react-router-dom";
import type { SyntheticEvent } from "react";
import { DashboardPage } from "./DashboardPage";
import { BookingPage } from "./BookingPage";
import { ChatPage } from "./ChatPage";
import { MatchingPage } from "./MatchingPage";
import { ProfilePage } from "./ProfilePage";
import { API_BASE } from "../services/api";
import { findProfessionalById } from "../lib/professionals";
import type { PackagePlan, PatientAppState, Professional, TimeSlot } from "../types";

function t(language: PatientAppState["language"], values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Mismo flujo que el matching final del onboarding; `favoritesReturnPath` al salir de favoritos. */
function OnboardingFinalMatching(p: {
  favoritesReturnPath: string;
  state: PatientAppState;
  needsInitialTherapistSelection: boolean;
  navigate: NavigateFunction;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  toggleFavoriteProfessional: (professionalId: string) => void;
  syncActiveProfessionalAssignment: (professionalId: string | null) => Promise<void>;
  confirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => Promise<{ ok: boolean; error?: string }>;
  handleReserveFromAnywhere: (professionalId: string) => void;
  handleChatFromAnywhere: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  return (
    <MatchingPage
      language={p.state.language}
      authToken={p.state.authToken}
      mode="onboarding-final"
      intakeAnswers={p.state.intake?.answers ?? {}}
      isFirstSelectionRequired={p.needsInitialTherapistSelection}
      showOnlyFavorites={false}
      favoriteProfessionalIds={p.state.favoriteProfessionalIds}
      selectedProfessionalId={p.state.selectedProfessionalId}
      onToggleFavorite={p.toggleFavoriteProfessional}
      onToggleFavoritesView={(showOnlyFavorites) => {
        p.navigate(showOnlyFavorites ? "/favorites" : p.favoritesReturnPath);
      }}
      onSelectProfessional={(professionalId) => {
        p.onStateChange((current) => ({
          ...current,
          selectedProfessionalId: professionalId,
          activeChatProfessionalId: professionalId
        }));
      }}
      onCompleteFirstSelection={({ professionalId, professionalName }) => {
        p.onStateChange((current) => ({
          ...current,
          therapistSelectionCompleted: true,
          selectedProfessionalId: professionalId,
          assignedProfessionalId: professionalId,
          assignedProfessionalName: professionalName,
          activeChatProfessionalId: professionalId
        }));
        void p.syncActiveProfessionalAssignment(professionalId);
      }}
      onDeferTherapistSelection={async () => {
        await p.syncActiveProfessionalAssignment(null);
        p.onStateChange((current) => ({
          ...current,
          therapistSelectionCompleted: true,
          onboardingFinalCompleted: true,
          assignedProfessionalId: null,
          assignedProfessionalName: null,
          selectedProfessionalId: "",
          activeChatProfessionalId: ""
        }));
        p.navigate("/", { replace: true });
      }}
      onCreateBooking={async (professionalId, slot) => {
        const result = await p.confirmBooking(professionalId, slot, true);
        if (!result.ok) {
          throw new Error(
            result.error ??
              t(p.state.language, {
                es: "En este momento no pudimos cerrar la reserva. Probá de nuevo con otro horario o en unos minutos.",
                en: "We couldn’t complete the booking right now. Try another time or again in a few minutes.",
                pt: "Nao foi possivel concluir a reserva agora. Tente outro horario ou daqui a pouco."
              })
          );
        }
        p.onStateChange((current) => ({
          ...current,
          onboardingFinalCompleted: true
        }));
        p.navigate("/", { replace: true });
      }}
      onReserve={p.handleReserveFromAnywhere}
      onChat={p.handleChatFromAnywhere}
      onImageFallback={p.onImageFallback}
    />
  );
}

export function PortalRoutes(props: {
  state: PatientAppState;
  stateForDisplay: PatientAppState;
  /** True solo antes de elegir terapeuta: el resto de rutas redirigen a matching. */
  lockToTherapistSelection: boolean;
  needsInitialTherapistSelection: boolean;
  sessionTimezone: string;
  professionalDirectory: Professional[];
  professionalPhotoMap: Record<string, string>;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  setSelectedBookingId: (bookingId: string) => void;
  navigate: NavigateFunction;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  handleGoToReservations: () => void;
  handleReserveFromAnywhere: (professionalId: string) => void;
  handleGoToProfessional: (professionalId: string) => void;
  handleChatFromAnywhere: (professionalId: string) => void;
  toggleFavoriteProfessional: (professionalId: string) => void;
  syncActiveProfessionalAssignment: (professionalId: string | null) => Promise<void>;
  confirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => Promise<{ ok: boolean; error?: string }>;
  rescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => Promise<void>;
  planTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  addPackage: (plan: PackagePlan, source: "checkout_button") => Promise<boolean>;
  purchaseIndividualSessions: (sessionCount: number) => Promise<boolean>;
  sendMessage: (professionalId: string, text: string) => void;
  markThreadAsRead: (professionalId: string) => void;
}) {
  const startPackagePurchase = (plan: PackagePlan) => {
    props.navigate(`/sessions?flow=checkout&plan=${plan.id}&source=dashboard`);
  };

  const startIndividualSessionsFromDashboard = () => {
    props.navigate("/sessions?flow=checkout&purchase=individual&source=dashboard");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                <DashboardPage
                  state={props.stateForDisplay}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  language={props.state.language}
                  currency={props.state.currency}
                  onImageFallback={props.onImageFallback}
                  onHeroFallback={props.onHeroFallback}
                  onGoToReservations={props.handleGoToReservations}
                  onGoToBooking={props.handleReserveFromAnywhere}
                  onGoToProfessional={props.handleGoToProfessional}
                  onGoToChat={props.handleChatFromAnywhere}
                  onOpenBookingDetail={(bookingId) => props.setSelectedBookingId(bookingId)}
                  onPlanTrialFromDashboard={props.planTrialFromDashboard}
                  onStartPackagePurchase={startPackagePurchase}
                  onNavigateToIndividualSessions={startIndividualSessionsFromDashboard}
                  onNavigateToBookTrial={() => props.navigate("/book/trial")}
                />
              )
        }
      />
      <Route
        path="/matching"
        element={
          props.lockToTherapistSelection
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
                  onToggleFavorite={props.toggleFavoriteProfessional}
                  onToggleFavoritesView={(showOnlyFavorites) => {
                    props.navigate(showOnlyFavorites ? "/favorites" : "/matching");
                  }}
                  onSelectProfessional={(professionalId) =>
                    props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                  }
                  onCompleteFirstSelection={() => {}}
                  onCreateBooking={async () => {}}
                  onReserve={props.handleReserveFromAnywhere}
                  onChat={props.handleChatFromAnywhere}
                  onImageFallback={props.onImageFallback}
                />
              )
        }
      />
      <Route path="/onboarding/final" element={<Navigate replace to="/onboarding/final/matching" />} />
      <Route
        path="/onboarding/final/matching"
        element={
          props.lockToTherapistSelection
            ? (
                <OnboardingFinalMatching
                  favoritesReturnPath="/onboarding/final/matching"
                  state={props.state}
                  needsInitialTherapistSelection={props.needsInitialTherapistSelection}
                  navigate={props.navigate}
                  onStateChange={props.onStateChange}
                  toggleFavoriteProfessional={props.toggleFavoriteProfessional}
                  syncActiveProfessionalAssignment={props.syncActiveProfessionalAssignment}
                  confirmBooking={props.confirmBooking}
                  handleReserveFromAnywhere={props.handleReserveFromAnywhere}
                  handleChatFromAnywhere={props.handleChatFromAnywhere}
                  onImageFallback={props.onImageFallback}
                />
              )
            : (
                <DashboardPage
                  state={props.stateForDisplay}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  language={props.state.language}
                  currency={props.state.currency}
                  onImageFallback={props.onImageFallback}
                  onHeroFallback={props.onHeroFallback}
                  onGoToReservations={props.handleGoToReservations}
                  onGoToBooking={props.handleReserveFromAnywhere}
                  onGoToProfessional={props.handleGoToProfessional}
                  onGoToChat={props.handleChatFromAnywhere}
                  onOpenBookingDetail={(bookingId) => props.setSelectedBookingId(bookingId)}
                  onPlanTrialFromDashboard={props.planTrialFromDashboard}
                  onStartPackagePurchase={startPackagePurchase}
                  onNavigateToIndividualSessions={startIndividualSessionsFromDashboard}
                  onNavigateToBookTrial={() => props.navigate("/book/trial")}
                />
              )
        }
      />
      <Route
        path="/book/trial"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : props.state.intake?.riskBlocked
              ? <Navigate replace to="/" />
              : (
                  <OnboardingFinalMatching
                    favoritesReturnPath="/book/trial"
                    state={props.state}
                    needsInitialTherapistSelection={props.needsInitialTherapistSelection}
                    navigate={props.navigate}
                    onStateChange={props.onStateChange}
                    toggleFavoriteProfessional={props.toggleFavoriteProfessional}
                    syncActiveProfessionalAssignment={props.syncActiveProfessionalAssignment}
                    confirmBooking={props.confirmBooking}
                    handleReserveFromAnywhere={props.handleReserveFromAnywhere}
                    handleChatFromAnywhere={props.handleChatFromAnywhere}
                    onImageFallback={props.onImageFallback}
                  />
                )
        }
      />
      <Route
        path="/favorites"
        element={
          props.lockToTherapistSelection
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
                  onToggleFavorite={props.toggleFavoriteProfessional}
                  onToggleFavoritesView={(showOnlyFavorites) => {
                    props.navigate(showOnlyFavorites ? "/favorites" : "/matching");
                  }}
                  onSelectProfessional={(professionalId) =>
                    props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                  }
                  onCompleteFirstSelection={() => {}}
                  onCreateBooking={async () => {}}
                  onReserve={props.handleReserveFromAnywhere}
                  onChat={props.handleChatFromAnywhere}
                  onImageFallback={props.onImageFallback}
                />
              )
        }
      />
      <Route
        path="/sessions"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                <BookingPage
                  state={props.stateForDisplay}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  sessionTimezone={props.sessionTimezone}
                  language={props.state.language}
                  currency={props.state.currency}
                  onImageFallback={props.onImageFallback}
                  onSelectProfessional={(professionalId) =>
                    props.onStateChange((current) => ({ ...current, selectedProfessionalId: professionalId }))
                  }
                  onConfirmBooking={props.confirmBooking}
                  onRescheduleBooking={props.rescheduleBooking}
                  onOpenBookingDetail={(bookingId) => props.setSelectedBookingId(bookingId)}
                  onPurchasePackage={async (plan) => props.addPackage(plan, "checkout_button")}
                  onPurchaseIndividualSessions={props.purchaseIndividualSessions}
                />
              )
        }
      />
      <Route
        path="/booking"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <Navigate replace to="/sessions" />
        }
      />
      <Route
        path="/chat"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                <ChatPage
                  state={props.stateForDisplay}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  language={props.state.language}
                  authToken={props.state.authToken}
                  sessionUserId={props.state.session?.id ?? ""}
                  onImageFallback={props.onImageFallback}
                  onSetActiveProfessional={(professionalId) =>
                    props.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }))
                  }
                  onSendMessage={props.sendMessage}
                  onMarkRead={props.markThreadAsRead}
                />
              )
        }
      />
      <Route
        path="/profile"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                props.state.session ? (
                  <ProfilePage
                    user={props.state.session}
                    language={props.state.language}
                    authToken={props.state.authToken}
                    profile={props.state.profile}
                    subscription={props.state.subscription}
                    onSessionAvatarUpdate={(avatarUrl) => {
                      props.onStateChange((current) => ({
                        ...current,
                        session: current.session ? { ...current.session, avatarUrl } : null
                      }));
                    }}
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
                    onNavigateHome={() => props.navigate("/")}
                  />
                ) : null
              )
        }
      />
      <Route
        path="*"
        element={
          <Navigate
            replace
            to={props.lockToTherapistSelection ? "/onboarding/final/matching" : "/"}
          />
        }
      />
    </Routes>
  );
}
