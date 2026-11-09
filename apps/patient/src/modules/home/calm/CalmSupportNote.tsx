import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconAyuda, IconTel } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSupportNote(props: { language: AppLanguage; className?: string }) {
  return (
    <aside className={props.className ?? "calm-support"}>
      <a className="calm-side-link calm-support-help" href="/ayuda/preguntas-frecuentes">
        <IconAyuda />
        {t(props.language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}
      </a>
      <a className="calm-support-card" href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
        <IconTel size={18} />
        <span>
          <strong>{t(props.language, { es: "Líneas de apoyo", en: "Support lines", pt: "Linhas de apoio" })}</strong>
          {t(props.language, {
            es: "Si necesitás hablar con alguien ahora, hay líneas gratuitas en tu país.",
            en: "If you need to talk to someone now, there are free lines in your country.",
            pt: "Se você precisa falar com alguém agora, há linhas gratuitas no seu país."
          })}
        </span>
      </a>
    </aside>
  );
}
