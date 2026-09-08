import { AdminUnpaidProfessionalsPanel } from "../components/AdminUnpaidProfessionalsPanel";
import { type AppLanguage } from "@therapy/i18n-config";

export function PagosPage(props: { token: string; language: AppLanguage }) {
  return (
    <div className="dashboard-page dashboard-page--pagos">
      <AdminUnpaidProfessionalsPanel token={props.token} language={props.language} />
    </div>
  );
}
