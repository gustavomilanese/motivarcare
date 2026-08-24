import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McCheckbox, McModal } from "@therapy/ui";
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
  return (
    <McModal
      open
      size="lg"
      title={t(props.language, { es: "Eliminar usuario", en: "Delete user", pt: "Excluir usuario" })}
      onClose={props.onClose}
      closeDisabled={props.deleteLoading}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" disabled={props.deleteLoading} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </McButton>
          <McButton variant="danger" disabled={props.deleteLoading} onClick={props.onConfirm}>
            {props.deleteLoading
              ? t(props.language, { es: "Eliminando...", en: "Deleting...", pt: "Excluindo..." })
              : t(props.language, { es: "Sí, eliminar", en: "Yes, delete", pt: "Sim, excluir" })}
          </McButton>
        </>
      }
    >
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
      <McCheckbox
        checked={props.purgeHistoricalOnDelete}
        disabled={props.deleteLoading}
        onChange={(event) => props.onPurgeHistoricalChange(event.target.checked)}
      >
        {t(props.language, {
          es: "Borrar también reservas, finanzas y compras vinculadas (irreversible).",
          en: "Also delete bookings, finance rows, and linked purchases (irreversible).",
          pt: "Excluir também reservas, financas e compras (irreversível)."
        })}
      </McCheckbox>
    </McModal>
  );
}
