import { useEffect, useRef, useState, type CSSProperties } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Bio / enfoque: truncado con “Ver más” cuando el texto es largo. */
export function ProfileExpandableText(props: {
  language: AppLanguage;
  text: string;
  className?: string;
  lines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const lines = props.lines ?? 4;

  useEffect(() => {
    setExpanded(false);
  }, [props.text]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      if (expanded) return;
      setNeedsToggle(node.scrollHeight > node.clientHeight + 1);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [props.text, expanded, lines]);

  return (
    <div className="dashboard-home-pro-profile-expand">
      <p
        ref={ref}
        className={`${props.className ?? "dashboard-home-pro-profile-bio"}${expanded ? " is-expanded" : " is-collapsed"}`}
        style={expanded ? undefined : ({ WebkitLineClamp: lines } as CSSProperties)}
      >
        {props.text}
      </p>
      {needsToggle || expanded ? (
        <button type="button" className="dashboard-home-pro-profile-more" onClick={() => setExpanded((value) => !value)}>
          {expanded
            ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
            : t(props.language, { es: "Ver más", en: "Show more", pt: "Ver mais" })}
        </button>
      ) : null}
    </div>
  );
}
