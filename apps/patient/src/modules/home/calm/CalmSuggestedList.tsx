import type { SyntheticEvent } from "react";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Professional } from "../../app/types";
import { formatSessionListMajorPrice } from "../../matching/lib/sessionListPrice";
import { rankSuggestedProfessionals } from "./calmHomeCase";
import { IconFlecha } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSuggestedList(props: {
  language: AppLanguage;
  professionals: Professional[];
  photoMap: Record<string, string>;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  residencyCountry: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenAll: () => void;
  onPick: (professionalId: string) => void;
}) {
  const suggested = rankSuggestedProfessionals(props.professionals);
  if (suggested.length === 0) return null;

  return (
    <article className="calm-card calm-suggested">
      <header>
        <h2>{t(props.language, { es: "Sugeridos para vos", en: "Suggested for you", pt: "Sugeridos para você" })}</h2>
        <span>{t(props.language, { es: "según tu cuestionario", en: "from your questionnaire", pt: "segundo seu questionário" })}</span>
      </header>
      <ul>
        {suggested.map((professional) => {
          const specialty = professional.specialties[0] || professional.title;
          const price =
            professional.sessionPriceUsd && professional.sessionPriceUsd > 0
              ? formatSessionListMajorPrice(
                  props.currency,
                  professional.sessionPriceUsd,
                  props.language,
                  props.fxRates,
                  props.residencyCountry
                )
              : "";
          return (
            <li key={professional.id}>
              <button type="button" onClick={() => props.onPick(professional.id)}>
                <img
                  src={professionalPhotoSrc(props.photoMap[professional.id] ?? null)}
                  alt=""
                  width={48}
                  height={48}
                  onError={props.onImageFallback}
                />
                <span className="calm-suggested-copy">
                  <b>{professionalAccessibleName(professional)}</b>
                  {specialty ? <small>{specialty}</small> : null}
                </span>
                {professional.compatibility > 0 ? (
                  <span className="calm-suggested-score">{Math.round(professional.compatibility)} %</span>
                ) : null}
                {price ? <span className="calm-suggested-price">{price}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="calm-text-link" onClick={props.onOpenAll}>
        {t(props.language, {
          es: "Ver todos los profesionales",
          en: "See all professionals",
          pt: "Ver todos os profissionais"
        })}
        <IconFlecha size={16} />
      </button>
    </article>
  );
}
