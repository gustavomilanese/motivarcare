import { useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { avatarInitialsFromNameParts } from "@therapy/types";
import { countryToFlag } from "../lib/countryFlag";
import {
  buildProfessionalReviewsSummaryLabel,
  resolveProfessionalDisplayRating
} from "../lib/professionalReviewsDisplay";
import { useProfessionalReviews } from "../hooks/useProfessionalReviews";
import { resolveApiAssetUrl } from "../services/api";
import { ProfessionalReviewStarsRow } from "./ProfessionalReviewStarsRow";
import { ProfessionalReviewsModal } from "./ProfessionalReviewsModal";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const SESSION_DURATION_MINUTES = 50;

export function ProfessionalPublicProfilePreviewCard(props: {
  language: AppLanguage;
  professionalId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  professionalTitle?: string | null;
  specialization?: string | null;
  focusAreas?: readonly string[];
  bio?: string | null;
  shortDescription?: string | null;
  therapeuticApproach?: string | null;
  languages?: readonly string[];
  yearsExperience?: number | null;
  birthCountry?: string | null;
  stripeVerified?: boolean;
  photoUrl?: string | null;
  sessionPriceUsd?: number | null;
}) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const { stats } = useProfessionalReviews(props.professionalId, { limit: 1 });

  const displayName = [props.firstName, props.lastName].filter(Boolean).join(" ").trim() || props.fullName.trim();
  const initials = avatarInitialsFromNameParts(props.firstName ?? "", props.lastName ?? "", displayName);
  const photoSrc = resolveApiAssetUrl(props.photoUrl ?? null);
  const focusAreas = (props.focusAreas ?? []).filter(Boolean);
  const priceUsd = Math.round(Number(props.sessionPriceUsd ?? 0));
  const flag = countryToFlag(props.birthCountry ?? null);
  const bioText = props.bio?.trim() || props.shortDescription?.trim() || "";
  const languages = (props.languages ?? []).filter(Boolean);
  const yearsExperience = Math.max(0, Math.round(Number(props.yearsExperience ?? 0)));
  const displayedSpecialties = [props.specialization, props.therapeuticApproach].filter(Boolean) as string[];

  const averageRating = stats?.averageRating ?? null;
  const reviewCount = stats?.reviewCount ?? 0;
  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);
  const reviewsSummary = useMemo(
    () => buildProfessionalReviewsSummaryLabel(props.language, averageRating, reviewCount),
    [averageRating, props.language, reviewCount]
  );

  return (
    <>
      <article className="pro-public-profile-preview-card" aria-label={t(props.language, { es: "Vista previa del perfil público", en: "Public profile preview", pt: "Previa do perfil publico" })}>
        <header className="pro-public-profile-preview-head">
          <div className="pro-public-profile-preview-avatar" aria-hidden={Boolean(photoSrc)}>
            {photoSrc ? <img src={photoSrc} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="pro-public-profile-preview-meta">
            <h3 className="pro-public-profile-preview-name">
              <span>{displayName || "—"}</span>
              {flag ? <span className="pro-public-profile-preview-flag"> {flag}</span> : null}
            </h3>
            <p className="pro-public-profile-preview-title">{props.professionalTitle?.trim() || "—"}</p>
            {props.stripeVerified ? (
              <span className="pro-public-profile-preview-verified">
                {t(props.language, { es: "Verificado", en: "Verified", pt: "Verificado" })}
              </span>
            ) : null}
          </div>
        </header>

        <div className="pro-public-profile-preview-price-row">
          {priceUsd > 0 ? (
            <div className="pro-public-profile-preview-price-block">
              <strong>
                {t(props.language, {
                  es: `Desde USD ${priceUsd}`,
                  en: `From USD ${priceUsd}`,
                  pt: `A partir de USD ${priceUsd}`
                })}
              </strong>
              <small>
                {t(props.language, {
                  es: `${SESSION_DURATION_MINUTES} minutos`,
                  en: `${SESSION_DURATION_MINUTES} minutes`,
                  pt: `${SESSION_DURATION_MINUTES} minutos`
                })}
              </small>
            </div>
          ) : (
            <div className="pro-public-profile-preview-price-block">
              <strong>—</strong>
            </div>
          )}
          <button
            type="button"
            className="pro-public-profile-preview-rating-block"
            onClick={() => setReviewsOpen(true)}
            aria-label={t(props.language, {
              es: `Ver opiniones: ${reviewsSummary}`,
              en: `View reviews: ${reviewsSummary}`,
              pt: `Ver avaliações: ${reviewsSummary}`
            })}
          >
            <span className="pro-public-profile-preview-rating-top">
              <ProfessionalReviewStarsRow averageRating={averageRating} reviewCount={reviewCount} size="md" />
              <span className="pro-public-profile-preview-rating-value">{displayRating.toFixed(1)}</span>
            </span>
            <small>{reviewsSummary}</small>
          </button>
        </div>

        <p className="pro-public-profile-preview-bio">
          {bioText ||
            t(props.language, {
              es: "Sin descripción publicada todavía.",
              en: "No description published yet.",
              pt: "Sem descricao publicada ainda."
            })}
        </p>

        <div className="pro-public-profile-preview-stats">
          {yearsExperience > 0 ? (
            <span className="pro-public-profile-preview-stat">
              {t(props.language, {
                es: `${yearsExperience} años experiencia`,
                en: `${yearsExperience} years experience`,
                pt: `${yearsExperience} anos experiencia`
              })}
            </span>
          ) : null}
          {languages.length > 0 ? (
            <span className="pro-public-profile-preview-stat">{languages.join(" · ")}</span>
          ) : null}
        </div>

        {displayedSpecialties.length > 0 ? (
          <ul className="pro-public-profile-preview-chip-list pro-public-profile-preview-chip-list--tags">
            {displayedSpecialties.map((specialty) => (
              <li key={specialty}>{specialty}</li>
            ))}
          </ul>
        ) : null}

        <div className="pro-public-profile-preview-areas">
          <span className="pro-public-profile-preview-areas-label">
            {t(props.language, { es: "Ámbitos de atención", en: "Focus areas", pt: "Areas de atuacao" })}
          </span>
          {focusAreas.length > 0 ? (
            <ul className="pro-public-profile-preview-chip-list">
              {focusAreas.slice(0, 8).map((area) => (
                <li key={area}>{area}</li>
              ))}
              {focusAreas.length > 8 ? <li className="pro-public-profile-preview-chip-more">+{focusAreas.length - 8}</li> : null}
            </ul>
          ) : (
            <p className="pro-public-profile-preview-empty">—</p>
          )}
        </div>
      </article>

      <ProfessionalReviewsModal
        open={reviewsOpen}
        language={props.language}
        professional={{
          id: props.professionalId,
          fullName: props.fullName,
          firstName: props.firstName,
          lastName: props.lastName
        }}
        onClose={() => setReviewsOpen(false)}
      />
    </>
  );
}
