import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { ArticleBody } from "../components/ArticleBody";
import { findRelatedArticles } from "../lib/related";
import { fetchPublishedArticles, type ArticlePost } from "../services/articlesApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localeForFormat(language: AppLanguage): string {
  if (language === "en") return "en-US";
  if (language === "pt") return "pt-BR";
  return "es-AR";
}

function formatPublishedAt(language: AppLanguage, isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(localeForFormat(language), {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function readTimeLabel(language: AppLanguage, minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "";
  }
  return t(language, {
    es: `${minutes} min de lectura`,
    en: `${minutes} min read`,
    pt: `${minutes} min de leitura`
  });
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return (first + last).toUpperCase() || first.toUpperCase();
}

function countParagraphBlocks(body: string): number {
  if (!body) return 0;
  return body
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("## ") && !block.startsWith("### "))
    .length;
}

export interface ArticleReaderPageProps {
  language: AppLanguage;
}

export function ArticleReaderPage(props: ArticleReaderPageProps) {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => (params.slug ? decodeURIComponent(params.slug) : ""), [params.slug]);
  const articleSectionRef = useRef<HTMLElement | null>(null);

  const [articles, setArticles] = useState<ArticlePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublishedArticles()
      .then((data) => {
        if (!active) return;
        setArticles(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          t(props.language, {
            es: "No pudimos cargar la nota en este momento.",
            en: "We couldn’t load the article right now.",
            pt: "Não foi possível carregar a nota agora."
          })
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.language]);

  const article = useMemo(
    () => articles.find((item) => item.slug === slug) ?? null,
    [articles, slug]
  );

  /**
   * Reset del scroll al cambiar de nota: si el usuario venía leyendo otra y
   * navegó a esta vía link inline / footer, queremos que arranque desde el
   * hero, no a mitad del cuerpo anterior.
   */
  useEffect(() => {
    articleSectionRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [slug]);

  const related = useMemo(() => {
    if (!article) return [] as ArticlePost[];
    return findRelatedArticles(article, articles, 5);
  }, [article, articles]);

  const inlineRelated = useMemo(() => related.slice(0, Math.max(0, related.length - 3)), [related]);
  const footerRelated = useMemo(() => related.slice(-3), [related]);

  /**
   * Distribuimos las "related" inline a lo largo del cuerpo del artículo,
   * tipo diario digital, para romper la pared de texto. Una cada ~4 bloques,
   * empezando después del 3er bloque para no aparecer pegado al hero.
   */
  const inlineInserts = useMemo<Record<number, ReactNode>>(() => {
    if (!article || inlineRelated.length === 0) {
      return {};
    }
    const blockCount = countParagraphBlocks(article.body);
    if (blockCount === 0) {
      return {};
    }
    const result: Record<number, ReactNode> = {};
    const step = Math.max(3, Math.floor(blockCount / (inlineRelated.length + 1)));
    inlineRelated.forEach((linked, idx) => {
      const target = Math.min(blockCount - 2, 2 + step * (idx + 1));
      if (target >= 0) {
        result[target] = (
          <RelatedInlineCard
            key={`inline-${linked.id}`}
            article={linked}
            language={props.language}
            label={t(props.language, {
              es: "Seguí leyendo",
              en: "Keep reading",
              pt: "Continue lendo"
            })}
          />
        );
      }
    });
    return result;
  }, [article, inlineRelated, props.language]);

  return (
    <section className="article-reader-page" ref={articleSectionRef}>
      <Link className="article-reader-back" to="/notas">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
          <path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{t(props.language, { es: "Volver a notas", en: "Back to articles", pt: "Voltar para notas" })}</span>
      </Link>

      {loading ? (
        <p className="articles-page-loading">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : null}

      {error ? <p className="articles-page-error" role="alert">{error}</p> : null}

      {!loading && !error && !article ? (
        <p className="articles-page-empty">
          {t(props.language, {
            es: "No encontramos esta nota. Puede que la hayan despublicado.",
            en: "We couldn’t find this article. It may have been unpublished.",
            pt: "Não encontramos esta nota. Pode ter sido despublicada."
          })}
        </p>
      ) : null}

      {article ? (
        <article className="article-reader" aria-labelledby="article-reader-title">
          <header
            className={article.coverImage ? "article-hero article-hero-with-cover" : "article-hero"}
            style={article.coverImage ? { backgroundImage: `url(${article.coverImage})` } : undefined}
          >
            <div className="article-hero-overlay" aria-hidden />
            <div className="article-hero-inner">
              <span className="article-hero-category">{article.category}</span>
              <h1 id="article-reader-title">{article.title}</h1>
              {article.subtitle ? <p className="article-hero-subtitle">{article.subtitle}</p> : null}
              <div className="article-hero-meta">
                <div className="article-hero-author">
                  {article.authorAvatar ? (
                    <img className="article-hero-avatar" src={article.authorAvatar} alt="" loading="lazy" />
                  ) : (
                    <span className="article-hero-avatar article-hero-avatar-fallback" aria-hidden>
                      {authorInitials(article.authorName)}
                    </span>
                  )}
                  <span className="article-hero-author-text">
                    <strong>{article.authorName}</strong>
                    {article.authorRole ? <span>{article.authorRole}</span> : null}
                  </span>
                </div>
                <div className="article-hero-meta-right">
                  <span className="article-hero-meta-pill">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {formatPublishedAt(props.language, article.publishedAt)}
                  </span>
                  {article.readTime > 0 ? (
                    <span className="article-hero-meta-pill">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M12 8v4.4l2.6 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {readTimeLabel(props.language, article.readTime)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="article-reader-content">
            <ArticleBody body={article.body} inserts={inlineInserts} />

            {article.tags && article.tags.length > 0 ? (
              <footer
                className="article-reader-tags"
                aria-label={t(props.language, { es: "Etiquetas", en: "Tags", pt: "Tags" })}
              >
                {article.tags.map((tag) => (
                  <span key={tag} className="article-reader-tag">
                    #{tag}
                  </span>
                ))}
              </footer>
            ) : null}
          </div>

          {footerRelated.length > 0 ? (
            <section className="article-related-section" aria-labelledby="article-related-title">
              <header className="article-related-header">
                <h2 id="article-related-title">
                  {t(props.language, {
                    es: "Notas relacionadas",
                    en: "Related notes",
                    pt: "Notas relacionadas"
                  })}
                </h2>
                <p>
                  {t(props.language, {
                    es: "Otras lecturas para acompañar tu proceso esta semana.",
                    en: "More reads to support you this week.",
                    pt: "Outras leituras para acompanhar você esta semana."
                  })}
                </p>
              </header>
              <ul className="article-related-grid">
                {footerRelated.map((linked) => (
                  <li key={linked.id}>
                    <Link className="article-related-card" to={`/notas/${encodeURIComponent(linked.slug)}`}>
                      <div className="article-related-card-cover">
                        {linked.coverImage ? <img src={linked.coverImage} alt="" loading="lazy" /> : null}
                        <span className="article-related-card-category">{linked.category}</span>
                      </div>
                      <div className="article-related-card-body">
                        <h3>{linked.title}</h3>
                        {linked.excerpt ? <p>{linked.excerpt}</p> : null}
                        <span className="article-related-card-meta">
                          {linked.readTime > 0 ? readTimeLabel(props.language, linked.readTime) : null}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

interface RelatedInlineCardProps {
  article: ArticlePost;
  language: AppLanguage;
  label: string;
}

function RelatedInlineCard({ article, language, label }: RelatedInlineCardProps) {
  return (
    <Link className="article-inline-related" to={`/notas/${encodeURIComponent(article.slug)}`}>
      <div className="article-inline-related-text">
        <span className="article-inline-related-label">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
            <path d="M5 12h13m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {label}
        </span>
        <strong>{article.title}</strong>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
        <span className="article-inline-related-meta">
          <span className="article-inline-related-category">{article.category}</span>
          {article.readTime > 0 ? <span>{readTimeLabel(language, article.readTime)}</span> : null}
        </span>
      </div>
      {article.coverImage ? (
        <div className="article-inline-related-cover" aria-hidden>
          <img src={article.coverImage} alt="" loading="lazy" />
        </div>
      ) : null}
    </Link>
  );
}
