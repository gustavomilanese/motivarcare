import { createPortal } from "react-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { AdminUser } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function UserDeleteConfirmModal(props: {
  language: AppLanguage;
  user: AdminUser;
  purgeHistoricalOnDelete: boolean;
  deleteLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPurgeHistoricalChange: (checked: boolean) => void;
}) {
  return createPortal(
    <div className="patient-modal-backdrop patient-modal-backdrop--portal" onClick={props.onClose}>
      <section className="patient-modal patient-create-modal" onClick={(event) => event.stopPropagation()}>
        <header className="patient-modal-head">
          <h2>{t(props.language, { es: "Eliminar usuario", en: "Delete user", pt: "Excluir usuario" })}</h2>
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>
        <p>
          {props.user.isTestUser
            ? t(props.language, {
                es: "Este usuario está marcado como prueba. Se eliminará de forma definitiva aunque tenga actividad.",
                en: "This user is marked as test. It will be permanently deleted even with activity.",
                pt: "Este usuario esta marcado como teste. Sera excluido permanentemente mesmo com atividade."
              })
            : t(props.language, {
                es: "Si el usuario tiene pagos o reservas, por defecto solo se desactiva y se conserva el historial. Podés forzar borrado total con la opción de abajo (sesiones, compras, ledger).",
                en: "If the user has bookings or payments, by default we only disable the account and keep history. You can force a full wipe with the option below (sessions, purchases, ledger).",
                pt: "Se o usuario tiver historico, por padrao apenas desativamos. Voce pode forcar exclusao total com a opcao abaixo."
              })}
        </p>
        <p>
          <strong>{props.user.fullName}</strong> · {props.user.email}
        </p>
        <label className="inline-toggle user-purge-toggle">
          <input
            type="checkbox"
            checked={props.purgeHistoricalOnDelete}
            disabled={props.deleteLoading}
            onChange={(event) => props.onPurgeHistoricalChange(event.target.checked)}
          />
          {t(props.language, {
            es: "Borrar también reservas, finanzas y compras vinculadas (irreversible).",
            en: "Also delete bookings, finance rows, and linked purchases (irreversible).",
            pt: "Excluir também reservas, financas e compras (irreversível)."
          })}
        </label>
        <div className="button-row">
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button type="button" className="danger" onClick={props.onConfirm} disabled={props.deleteLoading}>
            {props.deleteLoading
              ? t(props.language, { es: "Eliminando...", en: "Deleting...", pt: "Excluindo..." })
              : t(props.language, { es: "Sí, eliminar", en: "Yes, delete", pt: "Sim, excluir" })}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
