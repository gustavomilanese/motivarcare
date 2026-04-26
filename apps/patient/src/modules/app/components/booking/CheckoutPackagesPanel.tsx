import {
  formatCurrencyMajor,
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

/**
 * Formatea un monto que YA está expresado en la moneda del paquete (no convierte).
 * El backend devuelve `priceCents` en la moneda nativa del market del paciente.
 */
function formatMoney(amountMajor: number, language: AppLanguage, planCurrency: string, fallbackCurrency: SupportedCurrency): string {
  return formatCurrencyMajor({
    amountMajor,
    currency: planCurrency,
    language,
    maximumFractionDigits: 0,
    fallbackCurrency
  });
}

export function CheckoutPackagesPanel(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  packagesLoading: boolean;
  packagePlans: PackagePlan[];
  featuredPackageId: string | null;
  selectedCheckoutPlanId: string | null;
  /** Precio unitario estimado en la moneda del catálogo (1 crédito o proporcional del primer bundle). */
  unitPriceMajor: number | null;
  onClose: () => void;
  onSelectCard: (planId: string) => void;
  onSelectPlan: (plan: PackagePlan) => void;
  onIndividualPurchase: () => void;
}) {
  const singleSessionPlan = props.packagePlans.find((plan) => plan.credits === 1) ?? null;
  const bundlePlans = props.packagePlans.filter((plan) => plan.credits > 1);
  const canIndividualCta = !props.packagesLoading && props.unitPriceMajor !== null && (singleSessionPlan !== null || bundlePlans.length > 0);

  const individualLinkLabel = t(props.language, {
    es: "Comprar sesiones individuales",
    en: "Buy individual sessions",
    pt: "Comprar sessoes individuais"
  });

  return (
    <>
      <div className="session-booking-panel-head checkout-packages-head">
        <div className="checkout-packages-head-inner">
          <h3>{t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}</h3>
          <p>
            {t(props.language, {
              es: "Elegí un paquete o comprá sesiones sueltas con el enlace debajo de cada plan.",
              en: "Choose a package or buy individual sessions with the link under each plan.",
              pt: "Escolha um pacote ou compre sessoes avulsas no link abaixo de cada plano."
            })}
          </p>
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
          <div className="checkout-individual-only-wrap">
            <p className="checkout-packages-bundles-note">
              {t(props.language, {
                es: "No hay paquetes multi-sesión. Podés comprar solo sesiones sueltas con el botón de abajo.",
                en: "No multi-session bundles. Buy individual sessions with the button below.",
                pt: "Sem pacotes multi-sessao. Compre sessoes avulsas no botao abaixo."
              })}
            </p>
            <div className="checkout-package-column checkout-package-column--solo">
              <button
                type="button"
                className="sessions-package-individual-link sessions-package-individual-link--solo"
                disabled={!canIndividualCta}
                onClick={() => props.onIndividualPurchase()}
              >
                {individualLinkLabel}
              </button>
            </div>
          </div>
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
        <>
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
              <div className="checkout-package-column" key={plan.id}>
                <div className={`deal-card-shell ${props.featuredPackageId === plan.id ? "featured" : ""}`}>
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
                          { amount: formatMoney(savingAmount, props.language, plan.currency, props.currency) }
                        )}
                      </span>
                    </div>
                    <h3>{plan.name}</h3>
                    <p className="sessions-package-card-description">{plan.description}</p>
                    <div className="deal-pricing-top">
                      <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, plan.currency, props.currency)}</span>
                      <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                    </div>
                    <p className="deal-main-price">{formatMoney(finalPriceAmount, props.language, plan.currency, props.currency)}</p>
                    <p className="sessions-package-card-unit">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Equivale a {amount} por sesión",
                          en: "Equivalent to {amount} per session",
                          pt: "Equivale a {amount} por sessao"
                        }),
                        { amount: formatMoney(pricePerSession, props.language, plan.currency, props.currency) }
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
                      {t(props.language, { es: "Adquirir este paquete", en: "Get this package", pt: "Adquirir este pacote" })}
                    </button>
                    <button
                      type="button"
                      className="sessions-package-individual-link"
                      disabled={!canIndividualCta}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onIndividualPurchase();
                      }}
                    >
                      {individualLinkLabel}
                    </button>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </>
  );
}
