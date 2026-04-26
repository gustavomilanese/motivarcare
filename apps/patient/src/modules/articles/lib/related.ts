import type { ArticlePost } from "../services/articlesApi";

/**
 * Devuelve las notas más relacionadas a `current`, excluyéndola.
 *
 * Heurística simple pero efectiva (sin depender de embeddings):
 *   - Misma categoría: peso fijo.
 *   - Cada tag compartido: peso adicional.
 *   - Empate → más reciente primero.
 *
 * Garantiza que, si existen suficientes notas en el corpus, el resultado tenga
 * exactamente `limit` ítems incluso cuando ninguna comparta categoría/tags
 * (rellena con las más recientes).
 */
export function findRelatedArticles(
  current: ArticlePost,
  all: ArticlePost[],
  limit: number
): ArticlePost[] {
  const others = all.filter((article) => article.id !== current.id);
  if (others.length === 0 || limit <= 0) {
    return [];
  }

  const currentTags = new Set((current.tags ?? []).map((tag) => tag.toLowerCase()));

  const scored = others.map((article) => {
    let score = 0;
    if (article.category && current.category && article.category === current.category) {
      score += 4;
    }
    for (const tag of article.tags ?? []) {
      if (currentTags.has(tag.toLowerCase())) {
        score += 2;
      }
    }
    return { article, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateA = new Date(a.article.publishedAt).getTime();
    const dateB = new Date(b.article.publishedAt).getTime();
    if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) {
      return dateB - dateA;
    }
    return 0;
  });

  return scored.slice(0, limit).map((entry) => entry.article);
}
