import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
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

export interface ArticlesListPageProps {
  language: AppLanguage;
}

export function ArticlesListPage(props: ArticlesListPageProps) {
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
            es: "No pudimos cargar las notas en este momento. Probá de nuevo en unos minutos.",
            en: "We couldn’t load the articles right now. Please try again in a few minutes.",
            pt: "Não foi possível carregar as notas agora. Tente novamente em alguns minutos."
          })
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.language]);

  const featured = useMemo(() => articles.find((article) => article.featured) ?? null, [articles]);
  const rest = useMemo(() => {
    if (!featured) return articles;
    return articles.filter((article) => article.id !== featured.id);
  }, [articles, featured]);

  return (
    <section className="articles-page">
      <header className="articles-page-header">
        <h2>{t(props.language, { es: "Notas y artículos", en: "Notes and articles", pt: "Notas e artigos" })}</h2>
        <p>
          {t(props.language, {
            es: "Contenidos del equipo MotivarCare para acompañar tu proceso entre sesiones.",
            en: "Content from the MotivarCare team to support you between sessions.",
            pt: "Conteúdos do time MotivarCare para te acompanhar entre sessões."
          })}
        </p>
      </header>

      {loading ? (
        <p className="articles-page-loading">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : null}

      {error ? <p className="articles-page-error" role="alert">{error}</p> : null}

      {!loading && !error && articles.length === 0 ? (
        <p className="articles-page-empty">
          {t(props.language, {
            es: "Todavía no hay notas publicadas. ¡Volvé pronto!",
            en: "No articles published yet. Check back soon!",
            pt: "Ainda não há notas publicadas. Volte em breve!"
          })}
        </p>
      ) : null}

      {featured ? (
        <Link className="articles-card articles-card-featured" to={`/notas/${encodeURIComponent(featured.slug)}`}>
          <div className="articles-card-cover">
            <img src={featured.coverImage} alt="" loading="lazy" />
            <span className="articles-card-category">{featured.category}</span>
          </div>
          <div className="articles-card-body">
            <h3>{featured.title}</h3>
            {featured.subtitle ? <p className="articles-card-subtitle">{featured.subtitle}</p> : null}
            <p className="articles-card-excerpt">{featured.excerpt}</p>
            <p className="articles-card-meta">
              <span>{featured.authorName}</span>
              <span aria-hidden> · </span>
              <span>{formatPublishedAt(props.language, featured.publishedAt)}</span>
              {featured.readTime > 0 ? (
                <>
                  <span aria-hidden> · </span>
                  <span>{readTimeLabel(props.language, featured.readTime)}</span>
                </>
              ) : null}
            </p>
          </div>
        </Link>
      ) : null}

      {rest.length > 0 ? (
        <ul className="articles-grid">
          {rest.map((article) => (
            <li key={article.id} className="articles-grid-item">
              <Link className="articles-card" to={`/notas/${encodeURIComponent(article.slug)}`}>
                <div className="articles-card-cover">
                  <img src={article.coverImage} alt="" loading="lazy" />
                  <span className="articles-card-category">{article.category}</span>
                </div>
                <div className="articles-card-body">
                  <h3>{article.title}</h3>
                  <p className="articles-card-excerpt">{article.excerpt}</p>
                  <p className="articles-card-meta">
                    <span>{article.authorName}</span>
                    <span aria-hidden> · </span>
                    <span>{formatPublishedAt(props.language, article.publishedAt)}</span>
                    {article.readTime > 0 ? (
                      <>
                        <span aria-hidden> · </span>
                        <span>{readTimeLabel(props.language, article.readTime)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
