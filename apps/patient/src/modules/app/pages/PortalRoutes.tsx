import { syncUserTimezone } from "@therapy/auth";
import { syncPatientNotificationPreferences } from "../services/syncNotificationPreferences";
import { textByLanguage, type DisplayFxRates, type LocalizedText } from "@therapy/i18n-config";
import { Navigate, Route, Routes, type NavigateFunction } from "react-router-dom";
import type { SyntheticEvent } from "react";
import { DashboardPage } from "./DashboardPage";
import { BookingPage } from "./BookingPage";
import { ChatPage } from "./ChatPage";
import { MatchingPage } from "./MatchingPage";
import { ProfilePage } from "./ProfilePage";
import { ProfessionalsShowcasePage } from "../../professionals-showcase/pages/ProfessionalsShowcasePage";
import { ArticlesListPage } from "../../articles/pages/ArticlesListPage";
import { ArticleReaderPage } from "../../articles/pages/ArticleReaderPage";
import { ExercisesListPage } from "../../exercises/pages/ExercisesListPage";
import { ExerciseDetailPage } from "../../exercises/pages/ExerciseDetailPage";
import { ExerciseRoutinePage } from "../../exercises/pages/ExerciseRoutinePage";
import { RelaxationMusicPage } from "../../wellbeing/pages/RelaxationMusicPage";
import { PatientFaqPage } from "../../help/pages/PatientFaqPage";
import { PatientManualPage } from "../../help/pages/PatientManualPage";
import { DiaryHomePage } from "../../emotional-diary/pages/DiaryHomePage";
import { DiaryNewEntryPage } from "../../emotional-diary/pages/DiaryNewEntryPage";
import { DiaryRecordsPage } from "../../emotional-diary/pages/DiaryRecordsPage";
import { API_BASE } from "../services/api";
import { PATIENT_FAVORITES_ENABLED } from "../constants";
import type { PackagePlan, PatientAppState, Professional, TimeSlot } from "../types";
import type { PortalPurchaseResult } from "../hooks/usePortalActions";

function t(language: PatientAppState["language"], values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Mismo flujo que el matching final del onboarding; `favoritesReturnPath` al salir de favoritos. */
function OnboardingFinalMatching(p: {
  favoritesReturnPath: string;
  state: PatientAppState;
  fxRates?: DisplayFxRates;
  needsInitialTherapistSelection: boolean;
  navigate: NavigateFunction;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  toggleFavoriteProfessional: (professionalId: string) => void;
  syncActiveProfessionalAssignment: (professionalId: string | null) => Promise<void>;
  confirmBooking: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  startTrialCheckout: (professionalId: string, slot: TimeSlot, holdId: string) => Promise<PortalPurchaseResult>;
  syncTrialPayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  handleReserveFromAnywhere: (professionalId: string, options?: { returnTo?: string }) => void;
  handleChatFromAnywhere: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onRefreshPortalFromApi?: () => void | Promise<void>;
}) {
  return (
    <MatchingPage
      language={p.state.language}
      patientMarket={p.state.patientMarket}
      residencyCountry={p.state.profileResidencyCountry}
      displayCurrency={p.state.currency}
      fxRates={p.fxRates}
      authToken={p.state.authToken}
      mode="onboarding-final"
      trialRebookAvailable={p.state.trialRebookAvailable}
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
      onCreateBooking={async (professionalId, slot, options) => {
        const result = await p.confirmBooking(professionalId, slot, true, options?.holdId);
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
          onboardingFinalCompleted: true,
          trialRebookAvailable: false
        }));
        await Promise.resolve(p.onRefreshPortalFromApi?.());
        p.navigate("/", { replace: true });
      }}
      onStartTrialCheckout={p.startTrialCheckout}
      onSyncTrialPayment={p.syncTrialPayment}
      onReserve={p.handleReserveFromAnywhere}
      onChat={p.handleChatFromAnywhere}
      onImageFallback={p.onImageFallback}
    />
  );
}

export function PortalRoutes(props: {
  state: PatientAppState;
  stateForDisplay: PatientAppState;
  fxRates?: DisplayFxRates;
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
  handleRescheduleBookingFromAnywhere: (bookingId: string, options?: { returnTo?: string }) => void;
  handleReserveFromAnywhere: (professionalId: string, options?: { returnTo?: string }) => void;
  handleGoToProfessional: (professionalId: string) => void;
  handleChatFromAnywhere: (professionalId: string) => void;
  toggleFavoriteProfessional: (professionalId: string) => void;
  syncActiveProfessionalAssignment: (professionalId: string | null) => Promise<void>;
  confirmBooking: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  startTrialCheckout: (professionalId: string, slot: TimeSlot, holdId: string) => Promise<PortalPurchaseResult>;
  syncTrialPayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  rescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  planTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  addPackage: (plan: PackagePlan, source: "checkout_button") => Promise<PortalPurchaseResult>;
  purchaseIndividualSessions: (sessionCount: number) => Promise<PortalPurchaseResult>;
  syncDlocalPayment: (params: {
    paymentId?: string | null;
    orderId?: string | null;
  }) => Promise<{ ok: boolean; fulfilled?: boolean; error?: string }>;
  onRefreshPortalFromApi?: () => void;
  sendMessage: (professionalId: string, text: string) => void;
  markThreadAsRead: (professionalId: string) => void;
  onBookingSelectProfessional: (professionalId: string) => void;
  showPatientGoogleCalendarReconnectCta?: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
}) {
  const startPackagePurchase = (plan: PackagePlan) => {
    props.navigate(`/sessions?flow=checkout&plan=${plan.id}&source=dashboard`);
  };

  const startSessionsCheckoutFromDashboard = () => {
    props.navigate("/sessions?flow=checkout&source=dashboard");
  };

  const startIndividualSessionsFromDashboard = () => {
    props.navigate("/sessions?flow=checkout&purchase=individual&source=dashboard");
  };

  const navigateToAssignProfessional = () => {
    props.navigate("/onboarding/final/matching");
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
                  authToken={props.state.authToken}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  language={props.state.language}
                  currency={props.state.currency}
                  fxRates={props.fxRates}
                  onImageFallback={props.onImageFallback}
                  onHeroFallback={props.onHeroFallback}
                  onGoToReservations={props.handleGoToReservations}
                  onRescheduleBooking={(bookingId) =>
                    props.handleRescheduleBookingFromAnywhere(bookingId, { returnTo: "/" })
                  }
                  onGoToBooking={(professionalId) =>
                    props.handleReserveFromAnywhere(professionalId, { returnTo: "/" })
                  }
                  onGoToProfessional={props.handleGoToProfessional}
                  onGoToChat={props.handleChatFromAnywhere}
                  onOpenBookingDetail={(bookingId) => props.setSelectedBookingId(bookingId)}
                  onPlanTrialFromDashboard={props.planTrialFromDashboard}
                  onStartPackagePurchase={startPackagePurchase}
                  onPurchasePackage={async (plan) => props.addPackage(plan, "checkout_button")}
                  onNavigateToSessionsCheckout={startSessionsCheckoutFromDashboard}
                  onNavigateToIndividualSessions={startIndividualSessionsFromDashboard}
                  onNavigateToBookTrial={() => props.navigate("/book/trial")}
                  onNavigateToAssignProfessional={navigateToAssignProfessional}
                  showPatientGoogleCalendarReconnectCta={props.showPatientGoogleCalendarReconnectCta}
                  onOpenPatientGoogleCalendarConnect={props.onOpenPatientGoogleCalendarConnect}
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
                  patientMarket={props.state.patientMarket}
                 
                  residencyCountry={props.state.profileResidencyCountry}
                  displayCurrency={props.state.currency}
                  fxRates={props.fxRates}
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
          props.lockToTherapistSelection || !props.state.assignedProfessionalId?.trim()
            ? (
                <OnboardingFinalMatching
                  favoritesReturnPath="/onboarding/final/matching"
                  state={props.state}
                  fxRates={props.fxRates}
                  needsInitialTherapistSelection={
                    props.lockToTherapistSelection ? props.needsInitialTherapistSelection : false
                  }
                  navigate={props.navigate}
                  onStateChange={props.onStateChange}
                  toggleFavoriteProfessional={props.toggleFavoriteProfessional}
                  syncActiveProfessionalAssignment={props.syncActiveProfessionalAssignment}
                  confirmBooking={props.confirmBooking}
                  startTrialCheckout={props.startTrialCheckout}
                  syncTrialPayment={props.syncTrialPayment}
                  handleReserveFromAnywhere={props.handleReserveFromAnywhere}
                  handleChatFromAnywhere={props.handleChatFromAnywhere}
                  onImageFallback={props.onImageFallback}
                  onRefreshPortalFromApi={props.onRefreshPortalFromApi}
                />
              )
            : <Navigate replace to="/" />
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
                    fxRates={props.fxRates}
                    needsInitialTherapistSelection={props.needsInitialTherapistSelection}
                    navigate={props.navigate}
                    onStateChange={props.onStateChange}
                    toggleFavoriteProfessional={props.toggleFavoriteProfessional}
                    syncActiveProfessionalAssignment={props.syncActiveProfessionalAssignment}
                    confirmBooking={props.confirmBooking}
                    startTrialCheckout={props.startTrialCheckout}
                    syncTrialPayment={props.syncTrialPayment}
                    handleReserveFromAnywhere={props.handleReserveFromAnywhere}
                    handleChatFromAnywhere={props.handleChatFromAnywhere}
                    onImageFallback={props.onImageFallback}
                    onRefreshPortalFromApi={props.onRefreshPortalFromApi}
                  />
                )
        }
      />
      <Route
        path="/favorites"
        element={
          !PATIENT_FAVORITES_ENABLED
            ? <Navigate replace to="/" />
            : props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                <MatchingPage
                  language={props.state.language}
                  patientMarket={props.state.patientMarket}
                 
                  residencyCountry={props.state.profileResidencyCountry}
                  displayCurrency={props.state.currency}
                  fxRates={props.fxRates}
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
                  fxRates={props.fxRates}
                  onImageFallback={props.onImageFallback}
                  onSelectProfessional={props.onBookingSelectProfessional}
                  onConfirmBooking={props.confirmBooking}
                  onRescheduleBooking={props.rescheduleBooking}
                  onCancelBooking={props.cancelBooking}
                  onOpenBookingDetail={(bookingId) => props.setSelectedBookingId(bookingId)}
                  onPurchasePackage={async (plan) => props.addPackage(plan, "checkout_button")}
                  onPurchaseIndividualSessions={props.purchaseIndividualSessions}
                  onSyncDlocalPayment={props.syncDlocalPayment}
                  onRefreshPortalFromApi={props.onRefreshPortalFromApi}
                  onNavigateToAssignProfessional={navigateToAssignProfessional}
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
        path="/profesionales"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : (
                <ProfessionalsShowcasePage
                  language={props.state.language}
                  professionals={props.professionalDirectory}
                  professionalPhotoMap={props.professionalPhotoMap}
                  onImageFallback={props.onImageFallback}
                />
              )
        }
      />
      <Route
        path="/diario"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : props.state.authToken
              ? <DiaryHomePage language={props.state.language} authToken={props.state.authToken} />
              : <Navigate replace to="/login" />
        }
      />
      <Route
        path="/diario/nueva"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : props.state.authToken
              ? <DiaryNewEntryPage language={props.state.language} authToken={props.state.authToken} />
              : <Navigate replace to="/login" />
        }
      />
      <Route
        path="/diario/registros"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : props.state.authToken
              ? <DiaryRecordsPage language={props.state.language} authToken={props.state.authToken} />
              : <Navigate replace to="/login" />
        }
      />
      <Route
        path="/notas"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <ArticlesListPage language={props.state.language} />
        }
      />
      <Route
        path="/notas/:slug"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <ArticleReaderPage language={props.state.language} />
        }
      />
      <Route
        path="/ejercicios"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <ExercisesListPage language={props.state.language} />
        }
      />
      <Route
        path="/ejercicios/rutinas/:slug"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <ExerciseRoutinePage language={props.state.language} />
        }
      />
      <Route
        path="/ejercicios/:slug"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <ExerciseDetailPage language={props.state.language} />
        }
      />
      <Route
        path="/bienestar/musica"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <RelaxationMusicPage language={props.state.language} />
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
                    assignedProfessionalName={props.state.assignedProfessionalName}
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
                      void syncPatientNotificationPreferences({
                        token: props.state.authToken,
                        notificationsEmail: profile.notificationsEmail,
                        notificationsReminder: profile.notificationsReminder
                      }).catch((error) => {
                        console.error("Could not persist patient notification preferences", error);
                      });
                    }}
                    onNavigateHome={() => props.navigate("/")}
                  />
                ) : null
              )
        }
      />
      <Route
        path="/ayuda/preguntas-frecuentes"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <PatientFaqPage language={props.state.language} />
        }
      />
      <Route
        path="/ayuda/manual"
        element={
          props.lockToTherapistSelection
            ? <Navigate replace to="/onboarding/final/matching" />
            : <PatientManualPage language={props.state.language} />
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
