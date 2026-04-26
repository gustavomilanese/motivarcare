import type { ReactNode } from "react";

/**
 * Renderer ligero del `body` de un blog post (mismo formato que usa la landing):
 * - Bloques separados por línea en blanco.
 * - "## " heading nivel 5; "### " heading nivel 6.
 * - Líneas que empiezan con "> " son blockquote.
 * - Líneas que empiezan con "- " forman una lista.
 * - El resto se renderiza como párrafo.
 *
 * No depende de un parser de markdown completo a propósito: la fuente de verdad es lo que admite la landing.
 */
export function ArticleBody({ body }: { body: string }) {
  if (!body) {
    return null;
  }
  const blocks = body.split("\n\n");
  const nodes: ReactNode[] = blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return <h3 key={`h-${index}`}>{block.replace("## ", "")}</h3>;
    }
    if (block.startsWith("### ")) {
      return <h4 key={`h6-${index}`}>{block.replace("### ", "")}</h4>;
    }
    if (block.trimStart().startsWith(">")) {
      const lines = block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, "").trimEnd())
        .filter((line) => line.length > 0);
      return (
        <blockquote key={`q-${index}`}>
          {lines.map((line, lineIndex) => (
            <p key={`q-${index}-l-${lineIndex}`}>{line}</p>
          ))}
        </blockquote>
      );
    }
    if (block.startsWith("- ")) {
      return (
        <ul key={`ul-${index}`}>
          {block
            .split("\n")
            .filter((line) => line.startsWith("- "))
            .map((line, lineIndex) => (
              <li key={`ul-${index}-l-${lineIndex}`}>{line.replace("- ", "")}</li>
            ))}
        </ul>
      );
    }
    return <p key={`p-${index}`}>{block}</p>;
  });
  return <div className="article-body">{nodes}</div>;
}
