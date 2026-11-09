import type { SyntheticEvent } from "react";
import { type AppLanguage, type DisplayFxRates, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import type { RankedProfessional } from "../matchingEngine";
import { effectiveSessionListMajorUnits, formatSessionListMajorPrice } from "../lib/sessionListPrice";
import { countryToFlag } from "../utils/countryFlag";
import { professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  ARG: "Argentina",
  CO: "Colombia",
  COL: "Colombia",
  MX: "México",
  MEX: "México",
  CL: "Chile",
  CHL: "Chile",
  UY: "Uruguay",
  URY: "Uruguay",
  PE: "Perú",
  PER: "Perú",
  BR: "Brasil",
  BRA: "Brasil",
  ES: "España",
  ESP: "España",
  US: "Estados Unidos",
  USA: "Estados Unidos"
};

function countryName(raw: string | null): string {
  const value = raw?.trim() ?? "";
  if (!value) {
    return "";
  }
  return COUNTRY_NAMES[value.toUpperCase()] ?? value;
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((token) => !/^(dr|dra|lic|licda|psic|mr|mrs|ms|sr|sra)\.?$/i.test(token));
  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}

export function CalmProfessionalCard(props: {
  item: RankedProfessional;
  bestMatch?: boolean;
  language: AppLanguage;
  patientMarket: Market;
  displayCurrency: SupportedCurrency;
  residencyCountry?: string | null;
  fxRates?: DisplayFxRates;
  onChoose?: () => void;
  onSelect: (professionalId: string) => void;
  onOpenProfile?: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const professional = props.item.professional;
  const name = professionalAccessibleName(professional);
  const photoUrl = professional.photoUrl ? professionalPhotoSrc(professional.photoUrl) : "";
  const flag = countryToFlag(professional.birthCountry);
  const country = countryName(professional.birthCountry);
  const rating = professional.ratingAverage ?? 5;
  const filledStars = Math.round(rating);
  const ratingText = rating.toFixed(1).replace(".", props.language === "en" ? "." : ",");
  const priceLabel = formatSessionListMajorPrice(
    props.displayCurrency,
    effectiveSessionListMajorUnits(professional, props.patientMarket),
    props.language,
    props.fxRates,
    props.residencyCountry
  );
  const role = /^(dr|dra|lic|licda)\.?$/i.test((professional.title ?? "").trim()) ? "" : professional.title;
  const focus = [professional.specialization || role, professional.focusPrimary]
    .map((part) => part?.trim())
    .filter((part, index, all) => Boolean(part) && all.indexOf(part) === index)
    .join(" · ");

  return (
    <article className={`patient-therapist-card patient-therapist-card--calm${props.bestMatch ? " is-best" : ""}`}>
      {props.bestMatch ? (
        <span className="patient-therapist-best">
          {t(props.language, { es: "La que más encaja", en: "Best match", pt: "A que mais encaixa" })}
        </span>
      ) : null}
      <div className="calm-pro-top">
        <div className="calm-pro-who">
          {photoUrl ? (
            <img
              className="patient-therapist-avatar"
              src={photoUrl}
              alt={professionalPhotoAlt(professional)}
              onError={props.onImageFallback}
            />
          ) : (
            <span className="calm-pro-initials" aria-hidden="true">{initials(name)}</span>
          )}
          <div className="calm-pro-id">
            <h3 className="patient-therapist-name-single">{name}</h3>
            <p className="calm-pro-rating">
              <span className="calm-pro-stars" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((index) => (
                  <i key={index} className={index < filledStars ? "is-on" : ""}>★</i>
                ))}
              </span>
              <span className="rating-value">{ratingText}</span>
              {flag || country ? <span className="calm-pro-country">{flag} {country}</span> : null}
            </p>
            <p className="calm-pro-years">
              {t(props.language, {
                es: `${professional.yearsExperience} años de experiencia`,
                en: `${professional.yearsExperience} years of experience`,
                pt: `${professional.yearsExperience} anos de experiencia`
              })}
            </p>
            {focus ? <p className="calm-pro-focus">{focus}</p> : null}
          </div>
        </div>
        <span className="calm-pro-score">{props.item.score} %</span>
      </div>
      <p className="calm-pro-price">
        <strong>
          {t(props.language, {
            es: `Desde ${priceLabel}`,
            en: `From ${priceLabel}`,
            pt: `Desde ${priceLabel}`
          })}
        </strong>
        <span>
          {t(props.language, {
            es: `${professional.sessionsCount} sesiones`,
            en: `${professional.sessionsCount} sessions`,
            pt: `${professional.sessionsCount} sessoes`
          })}
        </span>
      </p>
      {props.item.matchedTopics.length > 0 ? (
        <ul className="calm-pro-checks">
          {props.item.matchedTopics.map((topic) => (
            <li key={topic}>
              <span aria-hidden="true">✓</span>
              {topic}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="patient-therapist-calm-actions">
        <button
          type="button"
          className="patient-therapist-profile-link"
          onClick={() => {
            props.onSelect(professional.id);
            props.onOpenProfile?.(professional.id);
          }}
        >
          {t(props.language, {
            es: "Ver perfil y horarios",
            en: "View profile and times",
            pt: "Ver perfil e horarios"
          })}
        </button>
        <button
          type="button"
          className="patient-therapist-choose"
          onClick={() => {
            props.onSelect(professional.id);
            props.onChoose?.();
          }}
        >
          {t(props.language, { es: "Elegir", en: "Choose", pt: "Escolher" })}
        </button>
      </div>
    </article>
  );
}
