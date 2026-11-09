import { useState } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { McButton, McSelect } from "@therapy/ui";
import {
  filterResidencyOptionsForPatientPortal,
  PATIENT_PORTAL_RESIDENCY_CODES,
  RESIDENCY_COUNTRY_OPTIONS
} from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function initialDraft(current?: string | null): string {
  const iso = (current ?? "").trim().toUpperCase();
  return (PATIENT_PORTAL_RESIDENCY_CODES as readonly string[]).includes(iso) ? iso : "AR";
}

export function PatientResidencyConfirm(props: {
  language: AppLanguage;
  currentIso?: string | null;
  saving?: boolean;
  onConfirm: (iso: string) => Promise<void> | void;
}) {
  const residencyOptions = filterResidencyOptionsForPatientPortal(RESIDENCY_COUNTRY_OPTIONS);
  const [draft, setDraft] = useState(initialDraft(props.currentIso));

  return (
    <div
      className="checkout-residency-confirm"
      role="group"
      aria-label={t(props.language, {
        es: "País de residencia",
        en: "Country of residence",
        pt: "Pais de residencia"
      })}
    >
      <McSelect
        label={t(props.language, { es: "País de residencia", en: "Country of residence", pt: "Pais de residencia" })}
        value={draft}
        disabled={props.saving}
        onChange={(event) => setDraft(event.target.value)}
      >
        {residencyOptions.map((row) => (
          <option key={row.code} value={row.code}>
            {row.names[props.language]}
          </option>
        ))}
      </McSelect>
      <McButton disabled={props.saving || !draft} onClick={() => void props.onConfirm(draft)}>
        {props.saving
          ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
          : t(props.language, {
              es: "Confirmar país y continuar",
              en: "Confirm country and continue",
              pt: "Confirmar pais e continuar"
            })}
      </McButton>
    </div>
  );
}
