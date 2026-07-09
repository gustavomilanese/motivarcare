export type FiscalIdHint = {
  /** Etiqueta del campo (nombres de documentos locales; suelen ser iguales en cualquier idioma). */
  label: string;
  placeholder: string;
};

/**
 * Etiqueta y ejemplo del identificador fiscal según país de residencia del profesional.
 * No validamos el formato exacto acá: mostramos una pista amigable y dejamos que el
 * proveedor de pagos (dLocal/Stripe) valide el formato real al momento del payout.
 * Así soportamos muchos países sin mantener un registro de reglas por cada uno.
 */
const FISCAL_ID_BY_COUNTRY: Record<string, FiscalIdHint> = {
  AR: { label: "CUIT / CUIL / DNI", placeholder: "20-12345678-9" },
  MX: { label: "RFC / CURP", placeholder: "XAXX010101000" },
  CO: { label: "NIT / Cédula", placeholder: "900123456-7" },
  BR: { label: "CPF / CNPJ", placeholder: "123.456.789-09" },
  CL: { label: "RUT", placeholder: "12.345.678-9" },
  PE: { label: "RUC / DNI", placeholder: "10123456789" },
  UY: { label: "RUT / CI", placeholder: "123456789012" },
  BO: { label: "NIT / CI", placeholder: "1234567" },
  CR: { label: "Cédula física o jurídica", placeholder: "1-1234-5678" },
  GT: { label: "NIT", placeholder: "1234567-8" },
  PY: { label: "RUC / CI", placeholder: "1234567-8" },
  EC: { label: "RUC / Cédula", placeholder: "1712345678001" }
};

export function fiscalIdHintForCountry(
  residencyCountry: string | null | undefined,
  language: "es" | "en" | "pt"
): FiscalIdHint {
  const code = (residencyCountry ?? "").trim().toUpperCase();
  const known = FISCAL_ID_BY_COUNTRY[code];
  if (known) {
    return known;
  }
  const label =
    language === "es"
      ? "Documento o identificación fiscal"
      : language === "pt"
        ? "Documento ou identificação fiscal"
        : "Tax ID or national document";
  const placeholder =
    language === "es"
      ? "Número de tu documento"
      : language === "pt"
        ? "Número do seu documento"
        : "Your document number";
  return { label, placeholder };
}
