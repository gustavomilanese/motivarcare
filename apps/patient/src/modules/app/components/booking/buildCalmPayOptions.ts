import {
  convertUsdMajorToDisplayMajor,
  replaceTemplate,
  textByLanguage,
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { formatPackageCardMoney, resolvePackageCardDisplayPricing } from "../../lib/packageCardDisplayPricing";
import { defaultPayChoice, samePayChoice, type PayChoice } from "./payChoice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type CalmPayOption = {
  key: string;
  choice: PayChoice;
  credits: number;
  title: string;
  detail: string;
  price: string;
  note: string;
  saving: string | null;
  summaryLabel: string;
  total: string;
  list: string | null;
  preferred: boolean;
};

type Plan = {
  id: string;
  credits: number;
  priceCents: number;
  discountPercent: number;
};

export function buildCalmPayOptions(input: {
  language: AppLanguage;
  plans: Plan[];
  featuredId: string | null;
  unitPriceMajor: number | null;
  givenName: string;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  residencyCountry?: string | null;
}): CalmPayOption[] {
  const money = (amountMajor: number) =>
    formatPackageCardMoney({
      amountMajor,
      displayCurrency: input.currency,
      language: input.language,
      residencyCountry: input.residencyCountry
    });
  const withName = (count: number) =>
    input.givenName
      ? replaceTemplate(
          count === 1
            ? t(input.language, {
                es: "1 sesión con {name}",
                en: "1 session with {name}",
                pt: "1 sessão com {name}"
              })
            : t(input.language, {
                es: "{count} sesiones con {name}",
                en: "{count} sessions with {name}",
                pt: "{count} sessões com {name}"
              }),
          { count: String(count), name: input.givenName }
        )
      : count === 1
        ? t(input.language, { es: "1 sesión", en: "1 session", pt: "1 sessão" })
        : replaceTemplate(
            t(input.language, {
              es: "{count} sesiones",
              en: "{count} sessions",
              pt: "{count} sessões"
            }),
            { count: String(count) }
          );

  const bundles = input.plans.filter((plan) => plan.credits > 1);
  const options: CalmPayOption[] = [];
  const preferred = defaultPayChoice(
    input.plans,
    input.featuredId,
    input.unitPriceMajor !== null && input.unitPriceMajor > 0 && (bundles.length > 0 || input.plans.some((plan) => plan.credits === 1))
  );
  const mark = (choice: PayChoice) => samePayChoice(choice, preferred);
  if (input.unitPriceMajor !== null && input.unitPriceMajor > 0 && (bundles.length > 0 || input.plans.some((plan) => plan.credits === 1))) {
    // unitPriceMajor está en USD; convertir a moneda display (misma FX que los paquetes).
    const individualLocalMajor = convertUsdMajorToDisplayMajor(
      input.unitPriceMajor,
      input.currency,
      input.fxRates
    );
    const price = money(individualLocalMajor);
    options.push({
      key: "individual",
      choice: { kind: "individual" },
      credits: 1,
      title: withName(1),
      detail: t(input.language, { es: "Solo esta sesión.", en: "Just this session.", pt: "Só esta sessão." }),
      price,
      note: t(input.language, { es: "1 sesión", en: "1 session", pt: "1 sessão" }),
      saving: null,
      summaryLabel: withName(1),
      total: price,
      list: null,
      preferred: mark({ kind: "individual" })
    });
  }

  for (const plan of bundles) {
    const pricing = resolvePackageCardDisplayPricing({
      priceCents: plan.priceCents,
      discountPercent: plan.discountPercent,
      credits: plan.credits,
      displayCurrency: input.currency,
      fxRates: input.fxRates
    });
    const total = money(pricing.totalLocalMajor);
    const perSession = money(pricing.perSessionLocalMajor);
    options.push({
      key: plan.id,
      choice: { kind: "plan", planId: plan.id },
      credits: plan.credits,
      title: withName(plan.credits),
      detail: replaceTemplate(
        t(input.language, {
          es: "{price} por sesión.",
          en: "{price} per session.",
          pt: "{price} por sessão."
        }),
        { price: perSession }
      ),
      price: total,
      note: replaceTemplate(
        t(input.language, {
          es: "{count} sesiones",
          en: "{count} sessions",
          pt: "{count} sessões"
        }),
        { count: String(plan.credits) }
      ),
      saving:
        pricing.savingLocalMajor > 0
          ? replaceTemplate(
              t(input.language, { es: "Ahorrás {amount}", en: "You save {amount}", pt: "Você economiza {amount}" }),
              { amount: money(pricing.savingLocalMajor) }
            )
          : null,
      summaryLabel: withName(plan.credits),
      total,
      list: pricing.savingLocalMajor > 0 ? money(pricing.listLocalMajor) : null,
      preferred: mark({ kind: "plan", planId: plan.id })
    });
  }

  return options;
}
