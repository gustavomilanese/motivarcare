import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const STORAGE_KEY = "therapy_admin_pagos_tutorial_dismissed";

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

function persistOpen(open: boolean) {
  try {
    if (open) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  } catch {
    /* ignore quota / private mode */
  }
}

const STEPS: Array<{
  kicker: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
}> = [
  {
    kicker: { es: "1", en: "1", pt: "1" },
    title: { es: "Pendiente de aprobación", en: "Pending approval", pt: "Pendente de aprovação" },
    body: {
      es: "Ahí están los paquetes de sesiones que los profesionales ya enviaron a cobro. Cada fila es un paquete, no una sesión suelta.",
      en: "These are session packages professionals already submitted for payout. Each row is a package, not a single session.",
      pt: "Ali estao os pacotes de sessoes que os profissionais ja enviaram para cobranca. Cada linha e um pacote, nao uma sessao avulsa."
    }
  },
  {
    kicker: { es: "2", en: "2", pt: "2" },
    title: { es: "Analizar", en: "Review", pt: "Analisar" },
    body: {
      es: "Abrí el paquete para ver cada sesión: fecha, paciente, origen y monto. Si algo no corresponde, podés quitarlo.",
      en: "Open the package to see each session: date, patient, source, and amount. Remove anything that should not be paid.",
      pt: "Abra o pacote para ver cada sessao: data, paciente, origem e valor. Se algo nao corresponde, pode tirar."
    }
  },
  {
    kicker: { es: "3", en: "3", pt: "3" },
    title: { es: "Aprobados →", en: "Approved →", pt: "Aprovados →" },
    body: {
      es: "Si el paquete está bien, pasalo a la derecha (Aprobados) con la flecha o arrastrando. Después armás el pago.",
      en: "If the package looks right, move it to the right (Approved) with the arrow or by dragging. Then assemble the payout.",
      pt: "Se o pacote estiver certo, passe para a direita (Aprovados) com a seta ou arrastando. Depois arme o pagamento."
    }
  }
];

export function AdminPagosTutorial(props: { language: AppLanguage }) {
  const [open, setOpen] = useState(readOpen);
  const language = props.language;

  const setDismissed = (nextOpen: boolean) => {
    persistOpen(nextOpen);
    setOpen(nextOpen);
  };

  if (!open) {
    return (
      <p className="admin-pagos-tutorial-reopen">
        <button type="button" onClick={() => setDismissed(true)}>
          {t(language, { es: "Cómo funciona esta pantalla", en: "How this screen works", pt: "Como funciona esta tela" })}
        </button>
      </p>
    );
  }

  return (
    <section className="admin-pagos-tutorial" aria-labelledby="admin-pagos-tutorial-title">
      <header className="admin-pagos-tutorial-head">
        <div>
          <h2 id="admin-pagos-tutorial-title">
            {t(language, { es: "Cómo pagar", en: "How to pay", pt: "Como pagar" })}
          </h2>
          <p>
            {t(language, {
              es: "Esta pantalla es para revisar los paquetes recibidos y aprobarlos moviéndolos a la derecha.",
              en: "Use this screen to review received packages and approve them by moving them to the right.",
              pt: "Esta tela e para revisar os pacotes recebidos e aprova-los passando-os para a direita."
            })}
          </p>
        </div>
        <button
          type="button"
          className="admin-pagos-tutorial-close"
          onClick={() => setDismissed(false)}
          aria-label={t(language, { es: "Cerrar tutorial", en: "Close tutorial", pt: "Fechar tutorial" })}
        >
          ×
        </button>
      </header>
      <ol className="admin-pagos-tutorial-steps">
        {STEPS.map((step) => (
          <li key={step.title.es}>
            <span className="admin-pagos-tutorial-num" aria-hidden>
              {t(language, step.kicker)}
            </span>
            <div>
              <strong>{t(language, step.title)}</strong>
              <p>{t(language, step.body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
