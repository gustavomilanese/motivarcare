/**
 * El backend suele repetir en `content` el mismo texto que en `quickReplies` (lista con guiones).
 * Normalizamos Unicode y prefijos de lista para poder filtrar esas líneas sin depender de una igualdad byte-a-byte.
 */

function normalizeComparable(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D‑]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function peelMarkdownListPrefix(line: string): string {
  let t = line.replace(/^\uFEFF+/, "");
  for (let i = 0; i < 6; i++) {
    const before = t;
    t = t.replace(/^\s+/, "");
    t = t.replace(/^(?:\d{1,2})[\.)]\s+/, "");
    t = t.replace(
      /^[-*+•\u2022\u2023\u2043\u2219\u25E6\u25AA\u25CF\u25CB\u25E8\u25AA\u25AB▪▫]\s+/u,
      ""
    );
    t = t.replace(/^[-–—−]\s+/, "");
    if (t === before) {
      break;
    }
  }
  return t.trim();
}

export function stripDuplicateQuickReplyLines(content: string, quickReplies: string[]): string {
  if (!quickReplies.length) {
    return content;
  }

  const replyKeys = new Set(
    quickReplies
      .map((q) => normalizeComparable(q))
      .filter((k) => k.length > 0)
  );

  const lineMatchesSomeReply = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    const direct = normalizeComparable(trimmed);
    if (replyKeys.has(direct)) {
      return true;
    }
    const peeled = normalizeComparable(peelMarkdownListPrefix(trimmed));
    return peeled.length > 0 && replyKeys.has(peeled);
  };

  const lines = content.split(/\r?\n/);
  const kept = lines.filter((line) => !lineMatchesSomeReply(line));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
