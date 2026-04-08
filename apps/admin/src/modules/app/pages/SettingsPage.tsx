import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  textByLanguage
} from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../components/CollapsiblePageSection";
import { PortalHeroSettingsSection } from "../components/PortalHeroSettingsSection";
import { openStickyCollapsibleSection } from "../hooks/useStickySectionNavigation";
import { SessionPackagesAdminPage } from "./SessionPackagesAdminPage";
import { UsersPage } from "./UsersPage";
import { WebAdminPage } from "./WebAdminPage";
import { fetchFinanceSettings, patchFinanceSettings } from "../../finance/services/financeApi";
import type { FinanceRules } from "../../finance/types/finance.types";
function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function devModuleLabel(language: AppLanguage, path: "/calendar" | "/library" | "/imports"): string {
  if (path === "/calendar") {
    return t(language, { es: "Calendario", en: "Calendar", pt: "Calendario" });
  }
  if (path === "/library") {
    return t(language, { es: "Biblioteca", en: "Library", pt: "Biblioteca" });
  }
  return t(language, { es: "Importaciones", en: "Imports", pt: "Importacoes" });
}

export function SettingsPage(props: {
  token: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  const [financeRules, setFinanceRules] = useState<FinanceRules | null>(null);
  const [financeRulesLoading, setFinanceRulesLoading] = useState(false);
  const [financeRulesSaving, setFinanceRulesSaving] = useState(false);
  const [financeRulesFeedback, setFinanceRulesFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    setFinanceRulesLoading(true);

    fetchFinanceSettings(props.token)
      .then((rules) => {
        if (!active) {
          return;
        }
        setFinanceRules(rules);
        setFinanceRulesFeedback(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setFinanceRulesFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar la configuracion financiera."
        });
      })
      .finally(() => {
        if (active) {
          setFinanceRulesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [props.token]);

  const updateFinanceRule = (key: keyof FinanceRules, value: number) => {
    setFinanceRules((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [key]: Number.isFinite(value) ? value : current[key]
      };
    });
  };

  const saveFinanceRulesInSettings = async () => {
    if (!financeRules) {
      return;
    }

    setFinanceRulesSaving(true);
    setFinanceRulesFeedback(null);

    try {
      const saved = await patchFinanceSettings(props.token, financeRules);
      setFinanceRules(saved);
      setFinanceRulesFeedback({ type: "ok", message: "Reglas financieras actualizadas." });
    } catch (error) {
      setFinanceRulesFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudieron guardar las reglas financieras."
      });
    } finally {
      setFinanceRulesSaving(false);
    }
  };

  return (
    <div className="ops-page finance-page settings-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Configuración", en: "Settings", pt: "Configuração" })}</h2>
        </header>
        {financeRulesFeedback ? (
          <div
            className={`admin-alert ${financeRulesFeedback.type === "ok" ? "admin-alert--ok" : "admin-alert--error"}`}
            role="status"
          >
            {financeRulesFeedback.message}
          </div>
        ) : null}
      </section>

      <CollapsiblePageSection
        sectionId="cfg-users-admin"
        summary={t(props.language, {
          es: "Administración de usuarios",
          en: "User administration",
          pt: "Administracao de usuarios"
        })}
        summaryEnd={
          <button
            type="button"
            className="users-admin-add-button"
            title={t(props.language, { es: "Alta de usuario", en: "Create user", pt: "Cadastro de usuario" })}
            aria-label={t(props.language, { es: "Alta de usuario", en: "Create user", pt: "Cadastro de usuario" })}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.history.replaceState(null, "", "#cfg-users-admin");
              requestAnimationFrame(() => {
                openStickyCollapsibleSection("cfg-users-admin");
                requestAnimationFrame(() => {
                  openStickyCollapsibleSection("users-create");
                  document.getElementById("users-create")?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              });
            }}
          >
            +
          </button>
        }
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <UsersPage token={props.token} language={props.language} embedded />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-regional"
        summary={t(props.language, { es: "Configuración regional", en: "Regional settings", pt: "Configurações regionais" })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <div className="grid-form">
          <label>
            {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
            <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
            <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyOptionLabel(currency, props.language)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-plans-packages"
        summary={t(props.language, {
          es: "Planes y paquetes",
          en: "Plans and packages",
          pt: "Planos e pacotes"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <SessionPackagesAdminPage
          token={props.token}
          language={props.language}
          currency={props.currency}
          embedded
        />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-sesion"
        summary={t(props.language, { es: "Valor de sesión", en: "Session price range", pt: "Faixa de valor da sessão" })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Define el mínimo y máximo permitido para el valor por sesión que configuran los profesionales.",
            en: "Define the allowed minimum and maximum session value professionals can configure.",
            pt: "Defina o valor mínimo e máximo permitido para a sessão configurada pelos profissionais."
          })}
        </p>
        {financeRulesLoading && !financeRules ? (
          <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p>
        ) : null}
        {financeRules ? (
          <>
            <div className="grid-form">
              <label>
                {t(props.language, {
                  es: "Valor mínimo por sesión (USD)",
                  en: "Minimum session value (USD)",
                  pt: "Valor mínimo por sessão (USD)"
                })}
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={financeRules.sessionPriceMinUsd}
                  onChange={(event) => updateFinanceRule("sessionPriceMinUsd", Number(event.target.value || 1))}
                />
              </label>
              <label>
                {t(props.language, {
                  es: "Valor máximo por sesión (USD)",
                  en: "Maximum session value (USD)",
                  pt: "Valor máximo por sessão (USD)"
                })}
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={financeRules.sessionPriceMaxUsd}
                  onChange={(event) => updateFinanceRule("sessionPriceMaxUsd", Number(event.target.value || 1))}
                />
              </label>
            </div>
            <div className="toolbar-actions">
              <button className="primary" type="button" onClick={() => void saveFinanceRulesInSettings()} disabled={financeRulesSaving}>
                {financeRulesSaving
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, { es: "Guardar límites", en: "Save limits", pt: "Salvar limites" })}
              </button>
            </div>
          </>
        ) : null}
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-comisiones"
        summary={t(props.language, { es: "Comisiones y reparto", en: "Commissions and split", pt: "Comissoes e divisao" })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Define cuanto retiene la plataforma y cuanto recibe el profesional por sesión completada.",
            en: "Define how much the platform retains and how much the professional receives per completed session.",
            pt: "Defina quanto a plataforma retem e quanto o profissional recebe por sessao concluida."
          })}
        </p>
        {financeRulesLoading && !financeRules ? (
          <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p>
        ) : null}
        {financeRules ? (
          <>
            <div className="grid-form">
              <label>
                {t(props.language, {
                  es: "Comision plataforma (%)",
                  en: "Platform commission (%)",
                  pt: "Comissao da plataforma (%)"
                })}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={financeRules.platformCommissionPercent}
                  onChange={(event) => updateFinanceRule("platformCommissionPercent", Number(event.target.value || 0))}
                />
              </label>
              <label>
                {t(props.language, {
                  es: "Comision sesión de prueba (%)",
                  en: "Trial session commission (%)",
                  pt: "Comissao sessao de teste (%)"
                })}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={financeRules.trialPlatformPercent}
                  onChange={(event) => updateFinanceRule("trialPlatformPercent", Number(event.target.value || 0))}
                />
              </label>
              <label>
                {t(props.language, {
                  es: "Profesional recibe (%)",
                  en: "Professional receives (%)",
                  pt: "Profissional recebe (%)"
                })}
                <input type="number" value={Math.max(0, 100 - financeRules.platformCommissionPercent)} readOnly />
              </label>
              <label>
                {t(props.language, {
                  es: "Precio fallback por sesión (centavos USD)",
                  en: "Fallback session price (USD cents)",
                  pt: "Preco fallback por sessao (centavos USD)"
                })}
                <input
                  type="number"
                  min={100}
                  max={200000}
                  value={financeRules.defaultSessionPriceCents}
                  onChange={(event) => updateFinanceRule("defaultSessionPriceCents", Number(event.target.value || 9000))}
                />
              </label>
            </div>
            <div className="toolbar-actions">
              <button className="primary" type="button" onClick={() => void saveFinanceRulesInSettings()} disabled={financeRulesSaving}>
                {financeRulesSaving
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, { es: "Guardar comisiones", en: "Save commissions", pt: "Salvar comissoes" })}
              </button>
            </div>
          </>
        ) : null}
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-hero"
        summary={t(props.language, {
          es: "Hero del portal paciente",
          en: "Patient portal hero",
          pt: "Hero do portal paciente"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Imágenes de cabecera del portal paciente (laptop y teléfono).",
            en: "Patient portal header images (laptop and phone).",
            pt: "Imagens de cabeçalho do portal paciente (laptop e telefone)."
          })}
        </p>
        <PortalHeroSettingsSection token={props.token} language={props.language} target="patient" layout="embedded" />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-landing"
        summary={t(props.language, {
          es: "Landing page",
          en: "Landing page",
          pt: "Landing page"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <WebAdminPage token={props.token} language={props.language} embedded />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="cfg-modulos"
        summary={t(props.language, { es: "Módulos en desarrollo", en: "Modules in development", pt: "Modulos em desenvolvimento" })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Vistas planificadas: accedé para ver el estado y usar atajos a areas ya disponibles.",
            en: "Planned views: open them to see status and shortcuts to areas that already exist.",
            pt: "Visoes planejadas: abra para ver o status e atalhos para areas ja disponiveis."
          })}
        </p>
        <div className="admin-dev-modules-grid">
          <NavLink to="/calendar" className="admin-dev-module-pill">
            {devModuleLabel(props.language, "/calendar")}
          </NavLink>
          <NavLink to="/library" className="admin-dev-module-pill">
            {devModuleLabel(props.language, "/library")}
          </NavLink>
          <NavLink to="/imports" className="admin-dev-module-pill">
            {devModuleLabel(props.language, "/imports")}
          </NavLink>
        </div>
      </CollapsiblePageSection>
    </div>
  );
}
