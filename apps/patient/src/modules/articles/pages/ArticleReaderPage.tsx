import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { ArticleBody } from "../components/ArticleBody";
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

export interface ArticleReaderPageProps {
  language: AppLanguage;
}

export function ArticleReaderPage(props: ArticleReaderPageProps) {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => (params.slug ? decodeURIComponent(params.slug) : ""), [params.slug]);

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

  return (
    <section className="article-reader-page">
      <Link className="article-reader-back" to="/notas">
        ← {t(props.language, { es: "Volver a notas", en: "Back to articles", pt: "Voltar para notas" })}
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
        <article className="article-reader">
          <header className="article-reader-header">
            <span className="article-reader-category">{article.category}</span>
            <h1>{article.title}</h1>
            {article.subtitle ? <p className="article-reader-subtitle">{article.subtitle}</p> : null}
            <p className="article-reader-meta">
              <span>{article.authorName}</span>
              {article.authorRole ? (
                <>
                  <span aria-hidden> · </span>
                  <span>{article.authorRole}</span>
                </>
              ) : null}
              <span aria-hidden> · </span>
              <span>{formatPublishedAt(props.language, article.publishedAt)}</span>
              {article.readTime > 0 ? (
                <>
                  <span aria-hidden> · </span>
                  <span>
                    {t(props.language, {
                      es: `${article.readTime} min de lectura`,
                      en: `${article.readTime} min read`,
                      pt: `${article.readTime} min de leitura`
                    })}
                  </span>
                </>
              ) : null}
            </p>
          </header>

          {article.coverImage ? (
            <div className="article-reader-cover">
              <img src={article.coverImage} alt="" loading="lazy" />
            </div>
          ) : null}

          <ArticleBody body={article.body} />

          {article.tags && article.tags.length > 0 ? (
            <footer className="article-reader-tags" aria-label={t(props.language, { es: "Etiquetas", en: "Tags", pt: "Tags" })}>
              {article.tags.map((tag) => (
                <span key={tag} className="article-reader-tag">
                  #{tag}
                </span>
              ))}
            </footer>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
