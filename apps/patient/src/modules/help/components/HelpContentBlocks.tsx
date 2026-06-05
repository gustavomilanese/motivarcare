import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import type { HelpFaqSection, HelpManualSection } from "../content/helpTypes";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export function HelpFaqSections(props: { language: AppLanguage; sections: HelpFaqSection[] }) {
  return (
    <>
      {props.sections.map((section) => (
        <section key={t(props.language, section.title)} className="patient-help-section">
          <h2>{t(props.language, section.title)}</h2>
          <dl className="patient-help-faq">
            {section.items.map((item) => (
              <div key={t(props.language, item.question)}>
                <dt>{t(props.language, item.question)}</dt>
                <dd>{t(props.language, item.answer)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}

export function HelpManualSections(props: { language: AppLanguage; sections: HelpManualSection[] }) {
  return (
    <>
      {props.sections.map((section) => (
        <section key={t(props.language, section.title)} className="patient-help-section">
          <h2>{t(props.language, section.title)}</h2>
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
