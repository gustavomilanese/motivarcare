import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { avatarInitialsFromNameParts } from "@therapy/types";
import { resolveApiAssetUrl } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPublicProfilePreviewCard(props: {
  language: AppLanguage;
  fullName: string;
  firstName?: string;
  lastName?: string;
  professionalTitle?: string | null;
  focusAreas?: readonly string[];
  shortDescription?: string | null;
  photoUrl?: string | null;
  sessionPriceUsd?: number | null;
}) {
  const displayName = [props.firstName, props.lastName].filter(Boolean).join(" ").trim() || props.fullName.trim();
  const initials = avatarInitialsFromNameParts(props.firstName ?? "", props.lastName ?? "", displayName);
  const photoSrc = resolveApiAssetUrl(props.photoUrl ?? null);
  const focusAreas = (props.focusAreas ?? []).filter(Boolean);
  const priceUsd = Math.round(Number(props.sessionPriceUsd ?? 0));

  return (
    <article className="pro-public-profile-preview-card" aria-label={t(props.language, { es: "Vista previa del perfil público", en: "Public profile preview", pt: "Previa do perfil publico" })}>
      <header className="pro-public-profile-preview-head">
        <div className="pro-public-profile-preview-avatar" aria-hidden={Boolean(photoSrc)}>
          {photoSrc ? <img src={photoSrc} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="pro-public-profile-preview-meta">
          <h3 className="pro-public-profile-preview-name">{displayName || "—"}</h3>
          <p className="pro-public-profile-preview-title">{props.professionalTitle?.trim() || "—"}</p>
          {priceUsd > 0 ? (
            <p className="pro-public-profile-preview-price">
              {t(props.language, {
                es: `Desde USD ${priceUsd} / sesión`,
                en: `From USD ${priceUsd} / session`,
                pt: `A partir de USD ${priceUsd} / sessao`
              })}
            </p>
          ) : null}
        </div>
      </header>
      {props.shortDescription?.trim() ? (
        <p className="pro-public-profile-preview-bio">{props.shortDescription.trim()}</p>
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
  );
}
