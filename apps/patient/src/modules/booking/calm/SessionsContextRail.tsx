import type { Ref } from "react";
import type { AppLanguage, DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { countAvailablePatientSessions } from "../../app/lib/countAvailablePatientSessions";
import type { Booking, PatientAppState, Professional } from "../../app/types";
import { sessionTiming } from "../../home/calm/calmHomeFormat";
import { SessionsCalmBalance } from "./SessionsCalmBalance";
import { SessionsSideHistory } from "./SessionsSideHistory";
import { SessionsSidePackages } from "./SessionsSidePackages";

/** Columna 3 de Sesiones: saldo, paquetes comprados e historial. */
export function SessionsContextRail(props: {
  language: AppLanguage;
  timeZone: string;
  now: number;
  state: PatientAppState;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  professionals: Professional[];
  upcoming: Booking[];
  history: Booking[];
  packageName: string;
  packageSize: number;
  bookingOpen: boolean;
  canBuy: boolean;
  packagesExpanded: boolean;
  historyExpanded: boolean;
  packagesRef: Ref<HTMLElement>;
  historyRef: Ref<HTMLElement>;
  onBook: () => void;
  onBuy: () => void;
  onTogglePackages: () => void;
  onToggleHistory: () => void;
  onOpenHistory: (bookingId: string) => void;
}) {
  const available = countAvailablePatientSessions({
    creditsRemaining: props.state.subscription.creditsRemaining,
    trialRebookAvailable: props.state.trialRebookAvailable
  });
  const next = props.upcoming[0] ?? null;
  const bookPrimary = next
    ? sessionTiming(next.startsAt, next.endsAt, new Date(props.now), props.timeZone).kind === "later"
    : true;

  return (
    <>
      <div className="sessions-calm sessions-calm-balance-host">
        <SessionsCalmBalance
          language={props.language}
          available={available}
          packageName={props.packageName}
          packageSize={props.packageSize}
          reserved={props.upcoming.filter((booking) => booking.bookingMode !== "trial").length}
          bookingOpen={props.bookingOpen}
          canBuy={props.canBuy}
          bookPrimary={bookPrimary}
          onBook={props.onBook}
          onBuy={props.onBuy}
        />
      </div>
      <SessionsSidePackages
        language={props.language}
        timeZone={props.timeZone}
        currency={props.currency}
        fxRates={props.fxRates}
        purchases={props.state.subscription.purchaseHistory}
        expanded={props.packagesExpanded}
        onToggle={props.onTogglePackages}
        sectionRef={props.packagesRef}
      />
      <SessionsSideHistory
        language={props.language}
        timeZone={props.timeZone}
        bookings={props.history}
        professionals={props.professionals}
        assignedName={props.state.assignedProfessionalName}
        expanded={props.historyExpanded}
        onToggle={props.onToggleHistory}
        onOpen={props.onOpenHistory}
        sectionRef={props.historyRef}
      />
    </>
  );
}
