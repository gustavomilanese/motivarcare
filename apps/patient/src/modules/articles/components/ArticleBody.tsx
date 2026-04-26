import type { ReactNode } from "react";

/**
 * Renderer ligero del `body` de un blog post (mismo formato que la landing,
 * extendido con un par de marcadores opcionales para hacer la lectura más
 * "magazine" y menos pared-de-texto):
 *
 *   - "## "  → heading nivel 2 (con barra de acento).
 *   - "### " → heading nivel 3.
 *   - "> "   → blockquote (con comilla decorativa).
 *   - "- "   → lista con bullets coloreados (✓).
 *   - "💡 "  → callout "tip / key takeaway".
 *   - "⚡ "  → callout "atención / práctica recomendada".
 *   - "❤️ "  → callout "mensaje de cuidado / recordatorio cálido".
 *   - resto  → párrafo. El primer párrafo lleva drop cap.
 *
 * Acepta un mapa `inserts` opcional que permite intercalar nodos entre
 * bloques (p. ej. mini-cards de notas relacionadas). La key es el índice del
 * bloque después del cual se inserta.
 *
 * No depende de un parser de markdown completo a propósito: la fuente de
 * verdad es lo que admite la landing.
 */
export interface ArticleBodyProps {
  body: string;
  inserts?: Record<number, ReactNode>;
}

const CALLOUT_PREFIXES: Array<{ prefix: string; tone: "tip" | "warn" | "warm"; iconLabel: string }> = [
  { prefix: "💡 ", tone: "tip", iconLabel: "Idea clave" },
  { prefix: "⚡ ", tone: "warn", iconLabel: "Atención" },
  { prefix: "❤️ ", tone: "warm", iconLabel: "Recordatorio" }
];

function detectCallout(block: string): { tone: "tip" | "warn" | "warm"; iconLabel: string; text: string } | null {
  for (const config of CALLOUT_PREFIXES) {
    if (block.startsWith(config.prefix)) {
      return { tone: config.tone, iconLabel: config.iconLabel, text: block.slice(config.prefix.length) };
    }
  }
  return null;
}

function CalloutIcon({ tone }: { tone: "tip" | "warn" | "warm" }) {
  if (tone === "tip") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" className="article-callout-icon">
        <path
          d="M9 18h6m-5 3h4M12 3a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "warn") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" className="article-callout-icon">
        <path d="m13 3-9 12h7l-1 6 9-12h-7l1-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" className="article-callout-icon">
      <path
        d="M12 21s-7-4.5-9.3-9.2A5.4 5.4 0 0 1 12 5a5.4 5.4 0 0 1 9.3 6.8C19 16.5 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeadingBullet() {
  return (
    <svg viewBox="0 0 8 8" aria-hidden focusable="false" className="article-heading-bullet">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable="false" className="article-quote-icon">
      <path
        d="M11 8C7 9 4.5 12.5 4.5 17v6h7v-7h-3c0-3 1.5-5 3.5-6L11 8Zm14 0c-4 1-6.5 4.5-6.5 9v6h7v-7h-3c0-3 1.5-5 3.5-6L25 8Z"
        fill="currentColor"
        opacity="0.18"
      />
    </svg>
  );
}

export function ArticleBody({ body, inserts }: ArticleBodyProps) {
  if (!body) {
    return null;
  }
  const blocks = body.split("\n\n").map((block) => block.trim()).filter((block) => block.length > 0);

  const nodes: ReactNode[] = [];
  let firstParagraphRendered = false;

  blocks.forEach((block, index) => {
    if (block.startsWith("## ")) {
      nodes.push(
        <h3 key={`h-${index}`} className="article-heading article-heading-2">
          <HeadingBullet />
          <span>{block.replace("## ", "")}</span>
        </h3>
      );
    } else if (block.startsWith("### ")) {
      nodes.push(
        <h4 key={`h6-${index}`} className="article-heading article-heading-3">
          {block.replace("### ", "")}
        </h4>
      );
    } else if (block.trimStart().startsWith(">")) {
      const lines = block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, "").trimEnd())
        .filter((line) => line.length > 0);
      nodes.push(
        <blockquote key={`q-${index}`} className="article-blockquote">
          <QuoteIcon />
          <div className="article-blockquote-text">
            {lines.map((line, lineIndex) => (
              <p key={`q-${index}-l-${lineIndex}`}>{line}</p>
            ))}
          </div>
        </blockquote>
      );
    } else if (block.startsWith("- ")) {
      nodes.push(
        <ul key={`ul-${index}`} className="article-list">
          {block
            .split("\n")
            .filter((line) => line.startsWith("- "))
            .map((line, lineIndex) => (
              <li key={`ul-${index}-l-${lineIndex}`}>{line.replace("- ", "")}</li>
            ))}
        </ul>
      );
    } else {
      const callout = detectCallout(block);
      if (callout) {
        nodes.push(
          <aside key={`c-${index}`} className={`article-callout article-callout-${callout.tone}`}>
            <span className="article-callout-icon-wrap" aria-label={callout.iconLabel} role="img">
              <CalloutIcon tone={callout.tone} />
            </span>
            <p>{callout.text}</p>
          </aside>
        );
      } else {
        const isFirstParagraph = !firstParagraphRendered;
        firstParagraphRendered = true;
        nodes.push(
          <p key={`p-${index}`} className={isFirstParagraph ? "article-paragraph article-paragraph-lead" : "article-paragraph"}>
            {block}
          </p>
        );
      }
    }

    const insert = inserts?.[index];
    if (insert) {
      nodes.push(
        <div key={`insert-${index}`} className="article-inline-insert">
          {insert}
        </div>
      );
    }
  });

  return <div className="article-body">{nodes}</div>;
}
