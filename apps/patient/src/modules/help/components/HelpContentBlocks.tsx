import type { SyntheticEvent } from "react";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import type { HelpFaqSection, HelpManualSection } from "../content/helpTypes";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

function handleFaqItemToggle(event: SyntheticEvent<HTMLDetailsElement>) {
  const details = event.currentTarget;
  if (!details.open) {
    return;
  }
  const summary = details.querySelector("summary");
  if (summary instanceof HTMLElement) {
    summary.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

export function HelpFaqSections(props: { language: AppLanguage; sections: HelpFaqSection[] }) {
  return (
    <>
      {props.sections.map((section) => (
        <section key={t(props.language, section.title)} className="patient-help-section">
          <h2>{t(props.language, section.title)}</h2>
          <div className="patient-help-faq">
            {section.items.map((item) => (
              <details
                key={t(props.language, item.question)}
                className="patient-help-faq-item"
                onToggle={handleFaqItemToggle}
              >
                <summary className="patient-help-faq-question">{t(props.language, item.question)}</summary>
                <div className="patient-help-faq-answer">{t(props.language, item.answer)}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function HelpManualFigures(props: {
  language: AppLanguage;
  figures: NonNullable<HelpManualSection["figures"]>;
}) {
  return (
    <div className="patient-help-figures">
      {props.figures.map((figure) => (
        <figure key={figure.src} className="patient-help-figure">
          <img src={figure.src} alt={t(props.language, figure.alt)} loading="lazy" decoding="async" />
          {figure.caption ? (
            <figcaption className="patient-help-figure-caption">{t(props.language, figure.caption)}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

export function HelpManualSections(props: { language: AppLanguage; sections: HelpManualSection[] }) {
  return (
    <>
      {props.sections.map((section) => (
        <section key={t(props.language, section.title)} className="patient-help-section">
          <h2>{t(props.language, section.title)}</h2>
          {section.figures && section.figures.length > 0 ? (
            <HelpManualFigures language={props.language} figures={section.figures} />
          ) : null}
          {section.paragraphs?.map((paragraph) => (
            <p key={t(props.language, paragraph)} className="patient-help-paragraph">
              {t(props.language, paragraph)}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="patient-help-list">
              {section.bullets.map((bullet) => (
                <li key={bullet.label ? t(props.language, bullet.label) : t(props.language, bullet.body)}>
                  {bullet.label ? (
                    <>
                      <strong>{t(props.language, bullet.label)}</strong> — {t(props.language, bullet.body)}
                    </>
                  ) : (
                    t(props.language, bullet.body)
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {section.steps && section.steps.length > 0 ? (
            <ol className="patient-help-list patient-help-list--ordered">
              {section.steps.map((step) => (
                <li key={t(props.language, step)}>{t(props.language, step)}</li>
              ))}
            </ol>
          ) : null}
        </section>
      ))}
    </>
  );
}
