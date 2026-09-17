import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal } from "@therapy/ui";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Popup cuando intentan registrarse con un email que ya tiene cuenta. */
export function ExistingAccountLoginModal(props: {
  language: AppLanguage;
  email: string;
  open: boolean;
  onClose: () => void;
  onGoToLogin: () => void;
}) {
  return (
    <McModal
      open={props.open}
      title={t(props.language, {
        es: "Ya tenés una cuenta",
        en: "You already have an account",
        pt: "Voce ja tem uma conta"
      })}
      onClose={props.onClose}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" onClick={props.onClose}>
            {t(props.language, { es: "Usar otro email", en: "Use another email", pt: "Usar outro e-mail" })}
          </McButton>
          <McButton onClick={props.onGoToLogin}>
            {t(props.language, {
              es: "Iniciar sesión",
              en: "Sign in",
              pt: "Entrar"
            })}
          </McButton>
        </>
      }
    >
      <p>
        {t(props.language, {
          es: `El correo ${props.email} ya está registrado. Iniciá sesión para continuar tu registro o retomar donde lo dejaste.`,
          en: `${props.email} is already registered. Sign in to continue your registration or pick up where you left off.`,
          pt: `O e-mail ${props.email} ja esta cadastrado. Entre para continuar o cadastro de onde parou.`
        })}
      </p>
    </McModal>
  );
}
