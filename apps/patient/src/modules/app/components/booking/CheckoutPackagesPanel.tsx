import {
  formatCurrencyAmount,
  replaceTemplate,
  textByLanguage,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { packageBenefitLines, packageRhythmLabel } from "../../lib/packageCatalog";
import type { PackagePlan } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatMoney(amountInUsd: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyAmount({
    amountInUsd,
    currency,
    language,
    maximumFractionDigits: 0
  });
}

export function CheckoutPackagesPanel(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  packagesLoading: boolean;
  packagePlans: PackagePlan[];
  featuredPackageId: string | null;
  selectedCheckoutPlanId: string | null;
  onClose: () => void;
  onSelectCard: (planId: string) => void;
  onSelectPlan: (plan: PackagePlan) => void;
}) {
  const singleSessionPlan = props.packagePlans.find((plan) => plan.credits === 1) ?? null;
  const bundlePlans = props.packagePlans.filter((plan) => plan.credits > 1);

  return (
    <>
      <div className="session-booking-panel-head checkout-packages-head">
        <div className="checkout-packages-head-inner">
          <span className="checkout-demo-pill">
            {t(props.language, { es: "Checkout demo", en: "Demo checkout", pt: "Checkout demo" })}
          </span>
          <h3>{t(props.language, { es: "Comprar paquete de sesiones", en: "Buy session package", pt: "Comprar pacote de sessoes" })}</h3>
          <p>
            {t(props.language, {
              es: "Elige el plan que mejor acompañe tu proceso y confirma la compra.",
              en: "Choose the plan that best supports your process and confirm the purchase.",
              pt: "Escolha o plano que melhor acompanha seu processo e confirme a compra."
            })}
          </p>
          {singleSessionPlan ? (
            <div className="checkout-single-session-row">
              <button
                type="button"
                className="checkout-single-session-cta"
                onClick={() => props.onSelectPlan(singleSessionPlan)}
              >
                {replaceTemplate(
                  t(props.language, {
                    es: "Solo una sesión · {price}",
                    en: "Single session · {price}",
                    pt: "Uma sessão · {price}"
                  }),
                  { price: formatMoney(singleSessionPlan.priceCents / 100, props.language, props.currency) }
                )}
              </button>
              <p className="checkout-single-session-hint">
                {t(props.language, {
                  es: "Podés sumar crédito por sesión sin paquete. Ideal para probar antes de comprometerte.",
                  en: "Add one session credit without a bundle—ideal to try before committing.",
                  pt: "Voce pode adicionar credito por sessao sem pacote—ideal para testar antes."
                })}
              </p>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={props.onClose}>
          {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
        </button>
      </div>

      {props.packagesLoading ? (
        <p>
          {t(props.language, {
            es: "Cargando paquetes disponibles...",
            en: "Loading available packages...",
            pt: "Carregando pacotes disponiveis..."
          })}
        </p>
      ) : props.packagePlans.length === 0 ? (
        <div className="sessions-empty-state">
          <strong>{t(props.language, { es: "No hay paquetes publicados por ahora.", en: "No packages are published right now.", pt: "Nao ha pacotes publicados no momento." })}</strong>
          <p>
            {t(props.language, {
              es: "Prueba nuevamente en unos minutos o contacta al equipo de soporte.",
              en: "Try again in a few minutes or contact support.",
              pt: "Tente novamente em alguns minutos ou entre em contato com o suporte."
            })}
          </p>
        </div>
      ) : bundlePlans.length === 0 ? (
        singleSessionPlan ? (
          <p className="checkout-packages-bundles-note">
            {t(props.language, {
              es: "No hay paquetes multi-sesión publicados; podés usar la opción de una sesión arriba.",
              en: "No multi-session bundles are listed; you can use the single-session option above.",
              pt: "Nao ha pacotes multi-sessao publicados; use a opcao de uma sessao acima."
            })}
          </p>
        ) : (
          <div className="sessions-empty-state">
            <strong>{t(props.language, { es: "No hay paquetes publicados por ahora.", en: "No packages are published right now.", pt: "Nao ha pacotes publicados no momento." })}</strong>
            <p>
              {t(props.language, {
                es: "Prueba nuevamente en unos minutos o contacta al equipo de soporte.",
                en: "Try again in a few minutes or contact support.",
                pt: "Tente novamente em alguns minutos ou entre em contato com o suporte."
              })}
            </p>
          </div>
        )
      ) : (
        <div className="deal-grid sessions-package-options-grid">
          {bundlePlans.map((plan) => {
            const selectedPlan = props.selectedCheckoutPlanId
              ? props.selectedCheckoutPlanId === plan.id
              : (props.featuredPackageId ? props.featuredPackageId === plan.id : bundlePlans[0]?.id === plan.id);
            const listPriceAmount = Math.round(plan.priceCents / 100 / Math.max(0.01, 1 - plan.discountPercent / 100));
            const finalPriceAmount = plan.priceCents / 100;
            const savingAmount = Math.max(0, listPriceAmount - finalPriceAmount);
            const pricePerSession = finalPriceAmount / Math.max(1, plan.credits);
            const benefitLines = packageBenefitLines(plan.credits, (values) => t(props.language, values));

            return (
              <div className={`deal-card-shell ${props.featuredPackageId === plan.id ? "featured" : ""}`} key={plan.id}>
                <div className="deal-card-roof" aria-hidden={props.featuredPackageId !== plan.id}>
                  {props.featuredPackageId === plan.id ? (
                    <span className="deal-card-featured-kicker">{t(props.language, { es: "Más elegido", en: "Best seller", pt: "Mais escolhido" })}</span>
                  ) : null}
                </div>
                <article
                  className={`deal-card dashboard-deal-card sessions-package-card ${props.featuredPackageId === plan.id ? "featured" : ""} ${selectedPlan ? "selected" : ""}`}
                  onClick={() => props.onSelectCard(plan.id)}
                >
                  <div className="sessions-package-card-topline">
                    <span className="sessions-package-card-kicker">{packageRhythmLabel(plan.credits, (values) => t(props.language, values))}</span>
                    <span className="sessions-package-card-saving">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Ahorras {amount}",
                          en: "You save {amount}",
                          pt: "Voce economiza {amount}"
                        }),
                        { amount: formatMoney(savingAmount, props.language, props.currency) }
                      )}
                    </span>
                  </div>
                  <h3>{plan.name}</h3>
                  <p className="sessions-package-card-description">{plan.description}</p>
                  <div className="deal-pricing-top">
                    <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, props.currency)}</span>
                    <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                  </div>
                  <p className="deal-main-price">{formatMoney(finalPriceAmount, props.language, props.currency)}</p>
                  <p className="sessions-package-card-unit">
                    {replaceTemplate(
                      t(props.language, {
                        es: "Equivale a {amount} por sesión",
                        en: "Equivalent to {amount} per session",
                        pt: "Equivale a {amount} por sessao"
                      }),
                      { amount: formatMoney(pricePerSession, props.language, props.currency) }
                    )}
                  </p>
                  <ul className="sessions-package-benefits">
                    {benefitLines.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                  <p className="deal-caption-strong">
                    {replaceTemplate(
                      t(props.language, {
                        es: "Incluye {count} sesiones.",
                        en: "Includes {count} sessions.",
                        pt: "Inclui {count} sessoes."
                      }),
                      { count: String(plan.credits) }
                    )}
                  </p>
                  <button
                    className={`deal-select-button ${props.featuredPackageId === plan.id ? "featured" : ""}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onSelectPlan(plan);
                    }}
                  >
                    {selectedPlan
                      ? t(props.language, { es: "Comprar este paquete", en: "Buy this package", pt: "Comprar este pacote" })
                      : t(props.language, { es: "Elegir paquete", en: "Choose package", pt: "Escolher pacote" })}
                  </button>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
