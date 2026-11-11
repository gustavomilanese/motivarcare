import { type SyntheticEvent, useMemo, useState } from "react";
import { type AppLanguage, type DisplayFxRates, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import type { Booking, PatientAppState, Professional } from "../../app/types";
import { CalmBetweenSessions } from "./CalmBetweenSessions";
import { CalmFirstSessionCard } from "./CalmFirstSessionCard";
import { CalmMessageCard } from "./CalmMessageCard";
import { CalmSideProfessional } from "./CalmSideProfessional";
import { CalmSessionsBalance } from "./CalmSessionsBalance";
import { CalmSessionCard } from "./CalmSessionCard";
import { CalmSuggestedList } from "./CalmSuggestedList";
import { CalmUpcomingList } from "./CalmUpcomingList";
import { CalmWeekAgenda } from "./CalmWeekAgenda";
import { CalmWelcomeCard } from "./CalmWelcomeCard";
import { resolveCalmHomeCase } from "./calmHomeCase";
import { CalmPortalToolbarRow } from "../../app/components/CalmPortalToolbarRow";
import {
  formatDayHeading,
  isSameZonedDay,
  patientFirstName
} from "./calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmHome(props: {
  language: AppLanguage;
  timeZone: string;
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  nextBooking: Booking | null;
  activeProfessional: Professional | null;
  availableSessions: number;
  firstMeetBookingId: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToBooking: (professionalId: string) => void;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  residencyCountry: string | null;
  onChooseProfessional: (professionalId?: string) => void;
  onBookTrial: () => void;
  onOpenChat: (professionalId: string) => void;
  onOpenProfile: () => void;
  onSendChatMessage: (professionalId: string, text: string) => void | Promise<void>;
  onReserveAnother: () => void;
  onBuyAnother: () => void;
}) {
  const [now] = useState(() => new Date());
  const session = props.state.session;
  const firstName = patientFirstName(session?.fullName, session?.firstName);
  // Detalle de la próxima sesión: el pro de esa reserva. Reservar/comprar: solo el vínculo (active).
  const bookingProfessional = props.nextBooking
    ? findProfessionalById(props.nextBooking.professionalId, props.professionals) ?? props.activeProfessional
    : props.activeProfessional;
  const reserveProfessional = props.activeProfessional;
  const photoFor = (professional: Professional | null) =>
    professional ? props.professionalPhotoMap[professional.id] ?? null : null;
  const includesToday = Boolean(
    props.nextBooking && isSameZonedDay(new Date(props.nextBooking.startsAt), now, props.timeZone)
  );
  const homeCase = resolveCalmHomeCase({
    hasProfessional: Boolean(bookingProfessional),
    hasUpcomingBooking: Boolean(props.nextBooking)
  });
  const lead = useMemo(() => {
    if (homeCase === "new") {
      return t(props.language, {
        es: "Empecemos por encontrar a la persona que te va a acompañar.",
        en: "Let's start by finding the person who will be with you.",
        pt: "Vamos começar encontrando a pessoa que vai te acompanhar."
      });
    }
    if (homeCase === "assigned") {
      return t(props.language, {
        es: "Ya elegiste a tu profesional. Solo falta reservar tu primera sesión.",
        en: "You've chosen your professional. The only step left is booking your first session.",
        pt: "Você já escolheu seu profissional. Só falta reservar a primeira sessão."
      });
    }
    return "";
  }, [homeCase, props.language]);

  return (
    <div className="calm-home" data-calm-case={homeCase}>
      <CalmPortalToolbarRow mountId="dashboard-hero-toolbar-mount" />
      <header className="calm-head">
        <div>
          {homeCase === "assigned" ? null : (
            <p className="calm-kicker">
              {homeCase === "new"
                ? t(props.language, { es: "Te damos la bienvenida", en: "Welcome", pt: "Boas-vindas" })
                : formatDayHeading(now, props.timeZone, props.language)}
            </p>
          )}
          <h1>
            {firstName
              ? t(props.language, { es: "Hola, ", en: "Hi, ", pt: "Olá, " })
              : t(props.language, { es: "Hola.", en: "Hi.", pt: "Olá." })}
            {firstName ? <em>{firstName}.</em> : null}
          </h1>
          {homeCase === "upcoming" ? null : homeCase === "assigned" ? (
            <p className="calm-lead calm-lead--desktop-only">{lead}</p>
          ) : (
            <p className="calm-lead">{lead}</p>
          )}
        </div>
      </header>

      <div className="calm-top">
        {homeCase === "new" ? (
          <CalmWelcomeCard language={props.language} onFindProfessional={() => props.onChooseProfessional()} />
        ) : homeCase === "assigned" && bookingProfessional ? (
          <CalmFirstSessionCard
            language={props.language}
            timeZone={props.timeZone}
            now={now}
            professional={bookingProfessional}
            availableSessions={props.availableSessions}
            onBook={() => {
              if (!reserveProfessional) return;
              props.onGoToBooking(reserveProfessional.id);
            }}
            onBuyPackage={props.onBuyAnother}
          />
        ) : (
          <CalmSessionCard
            language={props.language}
            timeZone={props.timeZone}
            now={now}
            booking={props.nextBooking}
            professional={bookingProfessional}
            photoUrl={photoFor(bookingProfessional)}
            availableSessions={props.availableSessions}
            showJoinTour={Boolean(props.firstMeetBookingId && props.nextBooking && props.firstMeetBookingId === props.nextBooking.id)}
            onImageFallback={props.onImageFallback}
            onRescheduleBooking={props.onRescheduleBooking}
            onGoToBooking={() => {
              if (!reserveProfessional) return;
              props.onGoToBooking(reserveProfessional.id);
            }}
            onBuySessions={props.onBuyAnother}
            onChooseProfessional={() => props.onChooseProfessional()}
            onBookTrial={props.onBookTrial}
            onOpenProfile={props.onOpenProfile}
          />
        )}
        {homeCase === "new" ? (
          <CalmSuggestedList
            language={props.language}
            professionals={props.professionals}
            photoMap={props.professionalPhotoMap}
            currency={props.currency}
            fxRates={props.fxRates}
            residencyCountry={props.residencyCountry}
            onImageFallback={props.onImageFallback}
            onOpenAll={() => props.onChooseProfessional()}
            onPick={(professionalId) => props.onChooseProfessional(professionalId)}
          />
        ) : (
        <div className="calm-side">
          {homeCase === "upcoming" && props.activeProfessional ? (
            <CalmSideProfessional
              language={props.language}
              timeZone={props.timeZone}
              now={now}
              professional={props.activeProfessional}
              photoUrl={photoFor(props.activeProfessional)}
              messages={props.state.messages}
              authToken={props.state.authToken}
              onImageFallback={props.onImageFallback}
              onChat={() => props.onOpenChat(props.activeProfessional!.id)}
              onProfile={props.onOpenProfile}
            />
          ) : (
            <CalmMessageCard
              language={props.language}
              timeZone={props.timeZone}
              now={now}
              professional={props.activeProfessional}
              photoUrl={photoFor(props.activeProfessional)}
              messages={props.state.messages}
              authToken={props.state.authToken}
              onImageFallback={props.onImageFallback}
              onOpenChat={props.onOpenChat}
              onSend={props.onSendChatMessage}
            />
          )}
          <CalmSessionsBalance
            language={props.language}
            available={props.availableSessions}
            packageName={props.state.subscription.packageName}
            packageSize={props.state.subscription.creditsTotal}
            includesToday={includesToday}
            professional={props.activeProfessional}
            onReserveAnother={props.onReserveAnother}
            onBuyAnother={props.onBuyAnother}
          />
          {homeCase === "upcoming" ? (
            <CalmWeekAgenda
              language={props.language}
              timeZone={props.timeZone}
              now={now}
              bookings={props.state.bookings}
              professionals={props.professionals}
              photoMap={props.professionalPhotoMap}
              onImageFallback={props.onImageFallback}
              onOpenBooking={props.onOpenBookingDetail}
              onRescheduleBooking={props.onRescheduleBooking}
            />
          ) : null}
        </div>
        )}
      </div>

      {homeCase !== "new" ? (
        <div className="calm-mobile-follow">
          {homeCase === "upcoming" ? (
            <CalmUpcomingList
              language={props.language}
              timeZone={props.timeZone}
              now={now}
              bookings={props.state.bookings}
              professionals={props.professionals}
              photoMap={props.professionalPhotoMap}
              excludeBookingId={props.nextBooking?.id}
              limit={3}
              onImageFallback={props.onImageFallback}
              onOpenBooking={props.onOpenBookingDetail}
              onRescheduleBooking={props.onRescheduleBooking}
            />
          ) : null}
          <CalmSessionsBalance
            language={props.language}
            available={props.availableSessions}
            packageName={props.state.subscription.packageName}
            packageSize={props.state.subscription.creditsTotal}
            includesToday={includesToday}
            professional={props.activeProfessional}
            onReserveAnother={props.onReserveAnother}
            onBuyAnother={props.onBuyAnother}
            compact
          />
        </div>
      ) : null}

      <CalmBetweenSessions
        language={props.language}
        timeZone={props.timeZone}
        now={now}
        authToken={props.state.authToken}
        mode={homeCase === "new" ? "welcome" : homeCase === "assigned" ? "assigned" : "between"}
      />
    </div>
  );
}
