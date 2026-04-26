import { useMemo, type SyntheticEvent } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/**
 * Sin acción: el paciente solo conoce el equipo y se entera de que pronto podrá elegir.
 * El “profesional asignado” real lo gestiona el matching (ver MatchingPage); esta vista es de showcase.
 */
function shortenBio(bio: string | undefined | null, maxChars = 220): string {
  const value = (bio ?? "").trim();
  if (value.length <= maxChars) {
    return value;
  }
  const sliced = value.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trimEnd()}…`;
}

function formatYears(language: AppLanguage, years: number): string {
  if (!Number.isFinite(years) || years <= 0) {
    return t(language, {
      es: "Sin información de experiencia",
      en: "Experience not available",
      pt: "Sem informação de experiência"
    });
  }
  if (years === 1) {
    return t(language, { es: "1 año de experiencia", en: "1 year of experience", pt: "1 ano de experiência" });
  }
  return t(
    language,
    {
      es: `${years} años de experiencia`,
      en: `${years} years of experience`,
      pt: `${years} anos de experiência`
    }
  );
}

export interface ProfessionalsShowcasePageProps {
  language: AppLanguage;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}

export function ProfessionalsShowcasePage(props: ProfessionalsShowcasePageProps) {
  const sorted = useMemo(() => {
    return [...props.professionals].sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) {
        return rb - ra;
      }
      return (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0);
    });
  }, [props.professionals]);

  return (
    <section className="professionals-showcase">
      <header className="professionals-showcase-header">
        <h2>{t(props.language, { es: "Profesionales disponibles", en: "Available professionals", pt: "Profissionais disponíveis" })}</h2>
        <p>
          {t(props.language, {
            es: "Conocé al equipo que forma parte de MotivarCare. Próximamente vas a poder reservar con el profesional que prefieras.",
            en: "Meet the MotivarCare team. Soon you’ll be able to book with the professional you prefer.",
            pt: "Conheça a equipe da MotivarCare. Em breve você poderá reservar com o profissional que preferir."
          })}
        </p>
      </header>

      <div className="professionals-showcase-banner" role="note">
        <strong>
          {t(props.language, { es: "Próximamente", en: "Coming soon", pt: "Em breve" })}
        </strong>
        <span>
          {t(props.language, {
            es: "Vas a poder elegir o cambiar de profesional desde acá.",
            en: "You’ll be able to pick or switch professionals from here.",
            pt: "Você vai poder escolher ou trocar de profissional por aqui."
          })}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="professionals-showcase-empty">
          {t(props.language, {
            es: "Estamos preparando la lista de profesionales. Volvé en unos minutos.",
            en: "We’re preparing the list of professionals. Check back in a moment.",
            pt: "Estamos preparando a lista de profissionais. Volte em alguns instantes."
          })}
        </p>
      ) : (
        <ul className="professionals-showcase-grid">
          {sorted.map((pro) => {
            const photo = professionalPhotoSrc(props.professionalPhotoMap[pro.id]);
            const bio = shortenBio(pro.bio);
            return (
              <li key={pro.id} className="professionals-showcase-card" aria-label={pro.fullName}>
                <div className="professionals-showcase-card-photo">
                  <img src={photo} alt="" loading="lazy" onError={props.onImageFallback} />
                </div>
                <div className="professionals-showcase-card-body">
                  <h3>{pro.fullName}</h3>
                  <p className="professionals-showcase-card-title">{pro.title}</p>
                  <p className="professionals-showcase-card-years">{formatYears(props.language, pro.yearsExperience)}</p>
                  {bio ? <p className="professionals-showcase-card-bio">{bio}</p> : null}
                  {pro.languages && pro.languages.length > 0 ? (
                    <p className="professionals-showcase-card-languages">
                      <span className="professionals-showcase-card-label">
                        {t(props.language, { es: "Idiomas", en: "Languages", pt: "Idiomas" })}:
                      </span>{" "}
                      {pro.languages.join(" · ")}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
