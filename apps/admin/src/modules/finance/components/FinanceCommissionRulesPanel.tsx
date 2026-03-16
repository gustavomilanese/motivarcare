import type { FinanceRules } from "../types/finance.types";

interface FinanceCommissionRulesPanelProps {
  rules: FinanceRules | null;
  savingRules: boolean;
  onRuleChange: (key: keyof FinanceRules, value: number) => void;
  onSave: () => void;
}

export function FinanceCommissionRulesPanel(props: FinanceCommissionRulesPanelProps) {
  return (
    <section className="card stack ops-panel">
      <h3>Reglas de comisión</h3>
      {props.rules ? (
        <div className="grid-form">
          <label>
            Comisión de la plataforma (%)
            <input type="number" min={0} max={100} value={props.rules.platformCommissionPercent} onChange={(event) => props.onRuleChange("platformCommissionPercent", Number(event.target.value || 0))} />
          </label>
          <label>
            Comisión sobre sesión de prueba (%)
            <input type="number" min={0} max={100} value={props.rules.trialPlatformPercent} onChange={(event) => props.onRuleChange("trialPlatformPercent", Number(event.target.value || 0))} />
          </label>
          <label>
            Precio por defecto por sesión (centavos USD)
            <input type="number" min={100} max={200000} value={props.rules.defaultSessionPriceCents} onChange={(event) => props.onRuleChange("defaultSessionPriceCents", Number(event.target.value || 9000))} />
          </label>
        </div>
      ) : null}
      <div className="toolbar-actions">
        <button className="primary" type="button" onClick={props.onSave} disabled={props.savingRules || !props.rules}>
          {props.savingRules ? "Guardando..." : "Guardar reglas"}
        </button>
      </div>
    </section>
  );
}

