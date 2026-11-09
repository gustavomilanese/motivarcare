import type { Ref } from "react";
import type { AppLanguage, DisplayFxRates, LocalizedText, SupportedCurrency } from "@therapy/i18n-config";
import { replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { formatDateWithLocale } from "@therapy/i18n-config";
import { formatSubscriptionPurchasePrice } from "../../app/lib/formatSubscriptionPurchasePrice";
import { IconSesiones } from "../../home/calm/calmIcons";

type Purchase = {
  id: string;
  name: string;
  credits: number;
  purchasedAt: string;
  priceCents?: number | null;
  currency?: string | null;
};

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Paquetes comprados, en la columna lateral de Sesiones. */
export function SessionsSidePackages(props: {
  language: AppLanguage;
  timeZone: string;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  purchases: Purchase[];
  expanded: boolean;
  onToggle: () => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const items = [...props.purchases].sort(
    (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  ).slice(0, 20);
  const visible = props.expanded ? items : items.slice(0, 1);

  return (
    <section ref={props.sectionRef} className="sessions-side-card" tabIndex={-1}>
      <header>
        <h2>
          <span className="sessions-side-mancha" aria-hidden="true">
            <svg className="sessions-side-mancha-blob" viewBox="0 0 100 100">
              <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity=".85" />
            </svg>
            <IconSesiones size={18} />
          </span>
          {t(props.language, { es: "Paquetes comprados", en: "Purchased packages", pt: "Pacotes comprados" })}
        </h2>
        {items.length > 1 ? (
          <button type="button" aria-expanded={props.expanded} onClick={props.onToggle}>
            {props.expanded
              ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
              : t(props.language, { es: "Ver todos", en: "See all", pt: "Ver todos" })}
          </button>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p>{t(props.language, { es: "Todavía no tenés paquetes comprados.", en: "You do not have purchased packages yet.", pt: "Voce ainda nao tem pacotes comprados." })}</p>
      ) : (
        <ul>
          {visible.map((item) => {
            const amount = formatSubscriptionPurchasePrice({
              priceCents: item.priceCents,
              language: props.language,
              displayCurrency: props.currency,
              purchaseCurrency: item.currency ?? null,
              fxRates: props.fxRates
            });
            const when = formatDateWithLocale({
              value: item.purchasedAt,
              language: props.language,
              timeZone: props.timeZone,
              options: { day: "numeric", month: "short", year: "numeric" }
            });
            return (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <span>
                  {replaceTemplate(t(props.language, { es: "{count} sesiones", en: "{count} sessions", pt: "{count} sessoes" }), { count: String(item.credits) })}
                  {" · "}
                  {when}
                  {amount ? ` · ${amount}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
