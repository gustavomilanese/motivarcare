import { type SyntheticEvent } from "react";
import { type AppLanguage, type DisplayFxRates, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { MatchingPage } from "../../app/pages/MatchingPage";
import { IconAtras } from "./calmIcons";

export function HomeProfessionalPick(props: {
  language: AppLanguage;
  patientMarket: Market;
  residencyCountry?: string | null;
  displayCurrency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  authToken: string | null;
  intakeAnswers: Record<string, string>;
  favoriteProfessionalIds: string[];
  selectedProfessionalId: string;
  onSelectProfessional: (professionalId: string) => void;
  onToggleFavorite: (professionalId: string) => void;
  onAssign: (payload: { professionalId: string; professionalName: string }) => void | Promise<void>;
  onBack?: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onChat: (professionalId: string) => void;
  onReserve: (professionalId: string) => void;
}) {
  return (
    <div className="calm-pick-shell">
      {props.onBack ? (
        <button type="button" className="calm-text-link calm-pick-back" onClick={props.onBack}>
          <IconAtras size={16} />
          {textByLanguage(props.language, {
            es: "Volver al inicio",
            en: "Back to home",
            pt: "Voltar ao início"
          } satisfies LocalizedText)}
        </button>
      ) : null}
    <MatchingPage
      presentation="home"
      mode="portal"
      language={props.language}
      patientMarket={props.patientMarket}
      residencyCountry={props.residencyCountry}
      displayCurrency={props.displayCurrency}
      fxRates={props.fxRates}
      authToken={props.authToken}
      intakeAnswers={props.intakeAnswers}
      isFirstSelectionRequired
      showOnlyFavorites={false}
      favoriteProfessionalIds={props.favoriteProfessionalIds}
      selectedProfessionalId={props.selectedProfessionalId}
      onSelectProfessional={props.onSelectProfessional}
      onToggleFavorite={props.onToggleFavorite}
      onCompleteFirstSelection={props.onAssign}
      onCreateBooking={async () => {}}
      onChat={props.onChat}
      onReserve={props.onReserve}
      onImageFallback={props.onImageFallback}
    />
    </div>
  );
}
