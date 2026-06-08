import {
  formatCurrencyMajor,
  replaceTemplate,
  textByLanguage,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { useMobilePortal } from "../../hooks/useMobilePortal";
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
  /** Precios calculados con tarifa del profesional asignado. */
  pricingReady: boolean;
  /** Precio unitario estimado en la moneda del catálogo (1 crédito o proporcional del primer bundle). */
  unitPriceMajor: number | null;
  onClose: () => void;
  onSelectCard: (planId: string) => void;
  onSelectPlan: (plan: PackagePlan) => void;
  onIndividualPurchase: () => void;
  onRequireProfessional: () => void;
}) {
  const isMobilePortal = useMobilePortal();
  const singleSessionPlan = props.packagePlans.find((plan) => plan.credits === 1) ?? null;
  const bundlePlans = props.packagePlans.filter((plan) => plan.credits > 1);
  const canIndividualCta =
    props.pricingReady && !props.packagesLoading && props.unitPriceMajor !== null && (singleSessionPlan !== null || bundlePlans.length > 0);

  const individualLinkLabel = t(props.language, {
    es: "Comprar sesiones individuales",
    en: "Buy individual sessions",
    pt: "Comprar sessoes individuais"
  });

  return (
    <div className={`checkout-packages-panel-root${isMobilePortal ? " checkout-packages-panel-root--mobile" : ""}`}>
      <div className="session-booking-panel-head checkout-packages-head">
        <div className="checkout-packages-head-inner">
          <h3>{t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}</h3>
          <p>
            {props.pricingReady
              ? isMobilePortal
                ? t(props.language, {
                    es: "Elegí el paquete que mejor se adapte a tu proceso.",
                    en: "Choose the package that fits your process best.",
                    pt: "Escolha o pacote que melhor se adapta ao seu processo."
                  })
                : t(props.language, {
                    es: "Elegí un paquete o comprá sesiones sueltas con el enlace debajo de cada plan.",
                    en: "Choose a package or buy individual sessions with the link under each plan.",
                    pt: "Escolha um pacote ou compre sessoes avulsas no link abaixo de cada plano."
                  })
              : t(props.language, {
                  es: "Estos son los formatos disponibles (4, 8 y 12 sesiones). Elegí un profesional para ver precios según su tarifa.",
                  en: "These are the available formats (4, 8, and 12 sessions). Choose a professional to see prices based on their rate.",
                  pt: "Estes sao os formatos disponiveis (4, 8 e 12 sessoes). Escolha um profissional para ver precos conforme a tarifa."
                })}
          </p>
        </div>
        <button type="button" className="checkout-packages-close" onClick={props.onClose}>
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
            const listPriceAmount = props.pricingReady
              ? Math.round(plan.priceCents / 100 / Math.max(0.01, 1 - plan.discountPercent / 100))
              : 0;
            const finalPriceAmount = props.pricingReady ? plan.priceCents / 100 : 0;
            const savingAmount = props.pricingReady ? Math.max(0, listPriceAmount - finalPriceAmount) : 0;
            const pricePerSession = props.pricingReady ? finalPriceAmount / Math.max(1, plan.credits) : 0;
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
                        {props.pricingReady
                          ? replaceTemplate(
                              t(props.language, {
                                es: "Ahorras {amount}",
                                en: "You save {amount}",
                                pt: "Voce economiza {amount}"
                              }),
                              { amount: formatMoney(savingAmount, props.language, plan.currency, props.currency) }
                            )
                          : t(props.language, {
                              es: "Precio según profesional",
                              en: "Price based on professional",
                              pt: "Preco conforme profissional"
                            })}
                      </span>
                    </div>
                    <h3>{plan.name}</h3>
                    <p className="sessions-package-card-description">{plan.description}</p>
                    <div className="deal-pricing-top">
                      {props.pricingReady ? (
                        <>
                          <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, plan.currency, props.currency)}</span>
                          <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                        </>
                      ) : (
                        <span className="deal-price-pending">
                          {t(props.language, {
                            es: "Precio al elegir profesional",
                            en: "Price shown after choosing a professional",
                            pt: "Preco ao escolher profissional"
                          })}
                        </span>
                      )}
                    </div>
                    <p className="deal-main-price">
                      {props.pricingReady
                        ? formatMoney(finalPriceAmount, props.language, plan.currency, props.currency)
                        : "—"}
                    </p>
                    <p className="sessions-package-card-unit">
                      {props.pricingReady
                        ? replaceTemplate(
                            t(props.language, {
                              es: "Equivale a {amount} por sesión",
                              en: "Equivalent to {amount} per session",
                              pt: "Equivale a {amount} por sessao"
                            }),
                            { amount: formatMoney(pricePerSession, props.language, plan.currency, props.currency) }
                          )
                        : t(props.language, {
                            es: "Tarifa del profesional × sesiones − descuento del paquete",
                            en: "Professional rate × sessions − package discount",
                            pt: "Tarifa do profissional × sessoes − desconto do pacote"
                          })}
                    </p>
                    <ul className="sessions-package-benefits">
                      {benefitLines.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                    {!isMobilePortal ? (
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
                    ) : null}
                    <button
                      className={`deal-select-button ${props.featuredPackageId === plan.id ? "featured" : ""}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!props.pricingReady) {
                          props.onRequireProfessional();
                          return;
                        }
                        props.onSelectPlan(plan);
                      }}
                    >
                      {props.pricingReady
                        ? t(props.language, { es: "Adquirir este paquete", en: "Get this package", pt: "Adquirir este pacote" })
                        : t(props.language, {
                            es: "Elegir profesional",
                            en: "Choose professional",
                            pt: "Escolher profissional"
                          })}
                    </button>
                    {!isMobilePortal ? (
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
                    ) : null}
                  </article>
                </div>
              </div>
            );
          })}
        </div>
        {isMobilePortal && canIndividualCta ? (
          <div className="checkout-packages-mobile-footer">
            <button
              type="button"
              className="checkout-packages-individual-footer-link"
              disabled={!canIndividualCta}
              onClick={() => props.onIndividualPurchase()}
            >
              {individualLinkLabel}
            </button>
          </div>
        ) : null}
        </>
      )}
    </div>
  );
}
