import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { AdminUnpaidProfessionalsPanel } from "../components/AdminUnpaidProfessionalsPanel";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PagosPage(props: { token: string; language: AppLanguage }) {
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-toolbar">
        <h1 className="dashboard-page-heading">
          {t(props.language, { es: "Pagos", en: "Payouts", pt: "Pagamentos" })}
        </h1>
      </header>
      <AdminUnpaidProfessionalsPanel token={props.token} language={props.language} />
    </div>
  );
}
