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
import { CalmWeekAgenda } from "./CalmWeekAgenda";
import { CalmWelcomeCard } from "./CalmWelcomeCard";
import { resolveCalmHomeCase } from "./calmHomeCase";
import { AuthBrand } from "../../auth/AuthBrand";
import {
  formatDayHeading,
  isSameZonedDay,
  calmGivenName,
  patientFirstName,
  sessionTiming
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
  onGoToBooking: (professionalId: string) => void;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  residencyCountry: string | null;
  onChooseProfessional: (professionalId?: string) => void;
  canSelfChangeProfessional: boolean;
  onRequestProfessionalChange: () => void;
  onBookTrial: () => void;
  onOpenChat: (professionalId: string) => void;
  onOpenProfile: () => void;
  onSendChatMessage: (professionalId: string, text: string) => void | Promise<void>;
  onReserveAnother: () => void;
}) {
  const [now] = useState(() => new Date());
  const session = props.state.session;
  const firstName = patientFirstName(session?.fullName, session?.firstName);
  const bookingProfessional = props.nextBooking
    ? findProfessionalById(props.nextBooking.professionalId, props.professionals) ?? props.activeProfessional
    : props.activeProfessional;
  const photoFor = (professional: Professional | null) =>
    professional ? props.professionalPhotoMap[professional.id] ?? null : null;
  const timing = props.nextBooking
    ? sessionTiming(props.nextBooking.startsAt, props.nextBooking.endsAt, now, props.timeZone)
    : null;
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
    const given = bookingProfessional ? calmGivenName(bookingProfessional) : "";
    if (given && (timing?.kind === "live" || timing?.kind === "soon")) {
      return t(props.language, {
        es: `Tu sesión con ${given} empieza en unos minutos.`,
        en: `Your session with ${given} starts in a few minutes.`,
        pt: `Sua sessão com ${given} começa em alguns minutos.`
      });
    }
    if (given && includesToday) {
      return t(props.language, {
        es: `Hoy tenés sesión con ${given}.`,
        en: `You have a session with ${given} today.`,
        pt: `Hoje você tem sessão com ${given}.`
      });
    }
    if (given && props.nextBooking) {
      return t(props.language, {
        es: `Tu próxima sesión es con ${given}.`,
        en: `Your next session is with ${given}.`,
        pt: `Sua próxima sessão é com ${given}.`
      });
    }
    return t(props.language, {
      es: "Tu espacio entre una sesión y la siguiente.",
      en: "Your space between one session and the next.",
      pt: "Seu espaço entre uma sessão e a seguinte."
    });
  }, [bookingProfessional, homeCase, includesToday, props.language, props.nextBooking, timing?.kind]);

  return (
    <div className="calm-home">
      <div className="calm-toolbar-row">
        <AuthBrand />
        <div id="dashboard-hero-toolbar-mount" className="calm-toolbar" />
      </div>
      <header className="calm-head">
        <div>
          <p className="calm-kicker">
            {homeCase === "new"
              ? t(props.language, { es: "Te damos la bienvenida", en: "Welcome", pt: "Boas-vindas" })
              : formatDayHeading(now, props.timeZone, props.language)}
          </p>
          <h1>
            {firstName
              ? t(props.language, { es: "Hola, ", en: "Hi, ", pt: "Olá, " })
              : t(props.language, { es: "Hola.", en: "Hi.", pt: "Olá." })}
            {firstName ? <em>{firstName}.</em> : null}
          </h1>
          <p className="calm-lead">{lead}</p>
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
            photoUrl={photoFor(bookingProfessional)}
            onImageFallback={props.onImageFallback}
            onBook={() => props.onGoToBooking(bookingProfessional.id)}
            canRequestChange={props.canSelfChangeProfessional}
            onRequestChange={props.onRequestProfessionalChange}
          />
        ) : (
          <CalmSessionCard
            language={props.language}
            timeZone={props.timeZone}
            now={now}
            booking={props.nextBooking}
            professional={bookingProfessional}
            photoUrl={photoFor(bookingProfessional)}
            showJoinTour={Boolean(props.firstMeetBookingId && props.nextBooking && props.firstMeetBookingId === props.nextBooking.id)}
            onImageFallback={props.onImageFallback}
            onOpenBookingDetail={props.onOpenBookingDetail}
            onGoToBooking={props.onGoToBooking}
            onChooseProfessional={() => props.onChooseProfessional()}
            onBookTrial={props.onBookTrial}
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
          />
        </div>
        )}
      </div>

      {homeCase === "upcoming" ? (
        <CalmWeekAgenda
          language={props.language}
          timeZone={props.timeZone}
          now={now}
          bookings={props.state.bookings}
          professionals={props.professionals}
          onOpenBooking={props.onOpenBookingDetail}
        />
      ) : null}

      <CalmBetweenSessions
        language={props.language}
        timeZone={props.timeZone}
        now={now}
        authToken={props.state.authToken}
        mode={homeCase === "new" ? "welcome" : "between"}
      />
    </div>
  );
}
