import { useEffect, useRef, useState, type CSSProperties } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Texto truncado a N líneas con Ver más / Ver menos. */
export function CalmExpandableText(props: {
  language: AppLanguage;
  text: string;
  lines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const lines = props.lines ?? 2;

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
    <div className={`calm-expandable${props.className ? ` ${props.className}` : ""}`}>
      <p
        ref={ref}
        className={`calm-expandable__text${expanded ? " is-expanded" : " is-collapsed"}`}
        style={expanded ? undefined : ({ WebkitLineClamp: lines } as CSSProperties)}
      >
        {props.text}
      </p>
      {needsToggle || expanded ? (
        <button type="button" className="calm-expandable__more" onClick={() => setExpanded((value) => !value)}>
          {expanded
            ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
            : t(props.language, { es: "Ver más", en: "Show more", pt: "Ver mais" })}
        </button>
      ) : null}
    </div>
  );
}
