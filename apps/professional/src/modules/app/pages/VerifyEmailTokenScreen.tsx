import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

type VerificationState = "loading" | "success" | "error";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailTokenScreen(props: { language: AppLanguage }) {
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token")?.trim() ?? "";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(
        t(props.language, {
          es: "Falta el token de verificación.",
          en: "Verification token is missing.",
          pt: "Token de verificacao ausente."
        })
      );
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        const response = await apiRequest<{ message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (cancelled) {
          return;
        }
        setState("success");
        setMessage(response.message);
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setState("error");
        setMessage(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo verificar tu email.",
                en: "Your email could not be verified.",
                pt: "Nao foi possivel verificar seu e-mail."
              })
        );
      }
    };

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [props.language, token]);

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <span className="pro-chip">Email</span>
        {state === "loading" ? (
          <>
            <h1>{t(props.language, { es: "Verificando email...", en: "Verifying email...", pt: "Verificando e-mail..." })}</h1>
            <p>{t(props.language, { es: "Estamos validando tu enlace.", en: "We are validating your link.", pt: "Estamos validando seu link." })}</p>
          </>
        ) : null}
        {state === "success" ? (
          <>
            <h1>{t(props.language, { es: "Email verificado", en: "Email verified", pt: "E-mail verificado" })}</h1>
            <p>{message}</p>
          </>
        ) : null}
        {state === "error" ? (
          <>
            <h1>{t(props.language, { es: "No pudimos verificar tu email", en: "We could not verify your email", pt: "Nao conseguimos verificar seu e-mail" })}</h1>
            <p className="pro-error">{message}</p>
          </>
        ) : null}
        <button className="pro-primary" type="button" onClick={() => window.location.assign("/")}>
          {t(props.language, { es: "Ir al inicio", en: "Go to home", pt: "Ir ao inicio" })}
        </button>
      </section>
    </div>
  );
}
