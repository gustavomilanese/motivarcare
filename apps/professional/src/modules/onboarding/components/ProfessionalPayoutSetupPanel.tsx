import { type RefObject } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  PROFESSIONAL_PAYOUT_FISCAL_NOTICE,
  PROFESSIONAL_PAYOUT_SETUP_LEAD
} from "../constants/professionalProfileGuidanceCopy";
import { ProfessionalGuidanceBanner } from "./ProfessionalGuidanceBanner";

export type PayoutProvider = "dlocal" | "stripe";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPayoutSetupPanel(props: {
  language: AppLanguage;
  provider: PayoutProvider;
  onProviderChange?: (provider: PayoutProvider) => void;
  /** Si es true, no se muestran solapas: el proveedor viene inferido por país/región. */
  providerLocked?: boolean;
  taxId: string;
  onTaxIdChange: (value: string) => void;
  docPreview: string;
  docInputRef: RefObject<HTMLInputElement | null>;
  onDocSelected: (file: File) => void | Promise<void>;
  verificationStarted: boolean;
  verified: boolean;
  onStartVerification: () => void;
  onMarkVerified: () => void;
}) {
  const isDlocal = props.provider === "dlocal";
  const providerLocked = props.providerLocked ?? false;

  return (
    <div className="pro-web-payout-setup">
      {providerLocked ? (
        <p className="pro-web-payout-provider-badge" aria-live="polite">
          {isDlocal
            ? t(props.language, {
                es: "Configuración para Argentina y Latam",
                en: "Setup for Argentina and Latin America",
                pt: "Configuracao para Argentina e Latam"
              })
            : t(props.language, {
                es: "Configuración internacional",
                en: "International setup",
                pt: "Configuracao internacional"
              })}
        </p>
      ) : (
        <nav
          className="pro-schedule-hub-tabs pro-web-payout-tabs"
          aria-label={t(props.language, {
            es: "Proveedor de pagos",
            en: "Payout provider",
            pt: "Provedor de pagamentos"
          })}
        >
          <div className="pro-schedule-hub-tabs-track" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isDlocal}
              className={`pro-schedule-hub-tab${isDlocal ? " active" : ""}`}
              onClick={() => props.onProviderChange?.("dlocal")}
            >
              {t(props.language, {
                es: "Argentina y Latam",
                en: "Argentina and Latam",
                pt: "Argentina e Latam"
              })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isDlocal}
              className={`pro-schedule-hub-tab${!isDlocal ? " active" : ""}`}
              onClick={() => props.onProviderChange?.("stripe")}
            >
              {t(props.language, {
                es: "Internacional",
                en: "International",
                pt: "Internacional"
              })}
            </button>
          </div>
        </nav>
      )}

      <p className="pro-web-payout-lead">{t(props.language, PROFESSIONAL_PAYOUT_SETUP_LEAD)}</p>
      <ProfessionalGuidanceBanner language={props.language} text={PROFESSIONAL_PAYOUT_FISCAL_NOTICE} />

      <input
        ref={props.docInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: "none" }}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            await props.onDocSelected(file);
          }
        }}
      />

      <label>
        <span>{t(props.language, { es: "DNI / CUIT", en: "National ID / tax ID", pt: "Documento / CUIT" })}</span>
        <input value={props.taxId} onChange={(event) => props.onTaxIdChange(event.target.value)} autoComplete="off" />
      </label>

      <div className="pro-web-media-field">
        <span>{t(props.language, { es: "Documento de identidad", en: "Identity document", pt: "Documento de identidade" })}</span>
        <div className="pro-web-media-upload">
          {props.docPreview ? (
            <span className="pro-web-media-preview" aria-hidden="true">
              <img src={props.docPreview} alt="" />
            </span>
          ) : null}
          <button type="button" className={props.docPreview ? "done" : ""} onClick={() => props.docInputRef.current?.click()}>
            {props.docPreview
              ? t(props.language, { es: "Cambiar", en: "Change", pt: "Alterar" })
              : t(props.language, { es: "Cargar", en: "Upload", pt: "Enviar" })}
          </button>
        </div>
      </div>

      <div className="pro-web-grid-2 pro-web-payout-actions">
        <button type="button" className="pro-web-payout-connect" onClick={props.onStartVerification}>
          {t(props.language, {
            es: "Continuar con la verificación",
            en: "Continue to verification",
            pt: "Continuar com a verificacao"
          })}
        </button>
        <button
          type="button"
          className={`pro-web-payout-verify${props.verified ? " done" : ""}`}
          disabled={!props.verificationStarted}
          onClick={props.onMarkVerified}
        >
          {props.verified
            ? t(props.language, { es: "Verificación lista", en: "Verification done", pt: "Verificacao concluida" })
            : t(props.language, {
                es: "Ya completé la verificación",
                en: "I completed verification",
                pt: "Ja conclui a verificacao"
              })}
        </button>
      </div>
    </div>
  );
}
