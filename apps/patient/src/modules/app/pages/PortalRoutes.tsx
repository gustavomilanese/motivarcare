import { syncUserTimezone } from "@therapy/auth";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { Navigate, Route, Routes } from "react-router-dom";
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
  navigate: (path: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  handleGoToReservations: () => void;
  handleReserveFromAnywhere: (professionalId: string) => void;
  handleGoToProfessional: (professionalId: string) => void;
  handleChatFromAnywhere: (professionalId: string) => void;
  toggleFavoriteProfessional: (professionalId: string) => void;
  syncActiveProfessionalAssignment: (professionalId: string) => Promise<void>;
  confirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => Promise<{ ok: boolean; error?: string }>;
  rescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => Promise<void>;
  planTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  addPackage: (plan: PackagePlan, source: "checkout_button") => Promise<boolean>;
  sendMessage: (professionalId: string, text: string) => void;
  markThreadAsRead: (professionalId: string) => void;
}) {
  const startPackagePurchase = (plan: PackagePlan) => {
    props.navigate(`/sessions?flow=checkout&plan=${plan.id}&source=dashboard`);
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
                <MatchingPage
                  language={props.state.language}
                  authToken={props.state.authToken}
                  mode="onboarding-final"
                  intakeAnswers={props.state.intake?.answers ?? {}}
                  isFirstSelectionRequired={props.needsInitialTherapistSelection}
                  showOnlyFavorites={false}
                  favoriteProfessionalIds={props.state.favoriteProfessionalIds}
                  selectedProfessionalId={props.state.selectedProfessionalId}
                  onToggleFavorite={props.toggleFavoriteProfessional}
                  onToggleFavoritesView={(showOnlyFavorites) => {
                    props.navigate(showOnlyFavorites ? "/favorites" : "/onboarding/final/matching");
                  }}
                  onSelectProfessional={(professionalId) => {
                    props.onStateChange((current) => ({
                      ...current,
                      therapistSelectionCompleted: true,
                      selectedProfessionalId: professionalId,
                      assignedProfessionalId: professionalId,
                      assignedProfessionalName: findProfessionalById(professionalId, props.professionalDirectory).fullName,
                      activeChatProfessionalId: professionalId
                    }));
                    void props.syncActiveProfessionalAssignment(professionalId);
                  }}
                  onCompleteFirstSelection={({ professionalId, professionalName }) => {
                    props.onStateChange((current) => ({
                      ...current,
                      therapistSelectionCompleted: true,
                      selectedProfessionalId: professionalId,
                      assignedProfessionalId: professionalId,
                      assignedProfessionalName: professionalName,
                      activeChatProfessionalId: professionalId
                    }));
                    void props.syncActiveProfessionalAssignment(professionalId);
                  }}
                  onCreateBooking={async (professionalId, slot) => {
                    const result = await props.confirmBooking(professionalId, slot, true);
                    if (!result.ok) {
                      throw new Error(
                        result.error ??
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
                    props.navigate("/");
                  }}
                  onReserve={props.handleReserveFromAnywhere}
                  onChat={props.handleChatFromAnywhere}
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
