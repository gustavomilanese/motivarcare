import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { intakeOptionLabel } from "../../intake/lib/intakeOptionLabels";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function pieces(raw: string | undefined): string[] {
  return (raw ?? "")
    .split("\n")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => (piece.includes(": ") ? piece.slice(0, piece.indexOf(": ")) : piece))
    .slice(0, 8);
}

export function CalmPickFilters(props: {
  language: AppLanguage;
  answers: Record<string, string>;
}) {
  const reasons = [
    ...pieces(props.answers.mainReason),
    ...pieces(props.answers.therapyGoal),
    ...pieces(props.answers.emotionalState)
  ].filter((reason, index, all) => all.indexOf(reason) === index).slice(0, 3);

  return (
    <div className="calm-pick-filters">
      {reasons.map((reason) => (
        <span key={reason} className="calm-pick-filter">
          {intakeOptionLabel(props.language, reason)}
        </span>
      ))}
      <span className="calm-pick-filter calm-pick-filter--ghost">
        {t(props.language, { es: "Cambiar", en: "Change", pt: "Mudar" })}
      </span>
    </div>
  );
}

export function CalmIntakeSummary(props: {
  language: AppLanguage;
  answers: Record<string, string>;
}) {
  const reasons = pieces(props.answers.mainReason);
  const firstTime = (props.answers.previousTherapy ?? "").startsWith("No,");
  const goal = pieces(props.answers.therapyGoal).slice(0, 2);

  return (
    <aside className="calm-intake-summary">
      <p>{t(props.language, { es: "Lo que nos contaste", en: "What you told us", pt: "O que voce contou" })}</p>
      {reasons.length > 0 ? (
        <div>
          <span>{t(props.language, { es: "Querés trabajar", en: "You want to work on", pt: "Quer trabalhar" })}</span>
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{intakeOptionLabel(props.language, reason)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {firstTime ? (
        <div>
          <span>{t(props.language, { es: "Tu experiencia", en: "Your experience", pt: "Sua experiencia" })}</span>
          <ul>
            <li>{t(props.language, { es: "Primera vez en terapia", en: "First time in therapy", pt: "Primeira vez em terapia" })}</li>
          </ul>
        </div>
      ) : null}
      {goal.length > 0 ? (
        <div>
          <span>{t(props.language, { es: "Querés lograr", en: "You want to", pt: "Quer alcancar" })}</span>
          <ul>
            {goal.map((item) => (
              <li key={item}>{intakeOptionLabel(props.language, item)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <small>
        {t(props.language, {
          es: "Con esto ordenamos la lista. La compatibilidad mira tus respuestas y el enfoque de cada profesional.",
          en: "This is how we rank the list. Compatibility looks at your answers and each professional’s approach.",
          pt: "Com isso ordenamos a lista. A compatibilidade olha suas respostas e o enfoque de cada profissional."
        })}
      </small>
    </aside>
  );
}
