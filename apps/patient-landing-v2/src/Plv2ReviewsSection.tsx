import { useEffect, useRef, useState } from "react";
import { fetchLandingWebReviews, type LandingWebReviewItem } from "./fetchLandingWebContent";

function formatReviewWhen(review: LandingWebReviewItem): string {
  if (review.reviewDate) {
    const from = new Date(`${review.reviewDate}T12:00:00`);
    if (!Number.isNaN(from.getTime())) {
      const days = Math.floor(Math.max(0, Date.now() - from.getTime()) / 86400000);
      return `hace ${days} día${days === 1 ? "" : "s"}`;
    }
  }
  return review.relativeDate;
}

function ReviewStars({ value }: { value: number }) {
  const n = Math.min(5, Math.max(1, Math.round(value)));
  return (
    <p className="plv2-review-stars" aria-label={`Calificación ${n} sobre cinco`}>
      {"★".repeat(n)}
    </p>
  );
}

export function Plv2ReviewsSection() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [reviews, setReviews] = useState<LandingWebReviewItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorHint, setLoadErrorHint] = useState<"html" | "other">("other");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await fetchLandingWebReviews();
        if (active) {
          setReviews(list);
          setLoadError(false);
        }
      } catch (e) {
        if (active) {
          setReviews([]);
          setLoadError(true);
          setLoadErrorHint(
            e instanceof Error && e.message === "web-content-html" ? "html" : "other"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function scrollByDirection(direction: "left" | "right") {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const card = el.querySelector<HTMLElement>(".plv2-review-card");
    const step = card?.offsetWidth ?? Math.min(260, Math.floor(el.clientWidth * 0.72));
    const gap = 12;
    el.scrollBy({
      left: direction === "left" ? -(step + gap) : step + gap,
      behavior: "smooth"
    });
  }

  return (
    <section className="plv2-reviews" id="reviews" aria-labelledby="plv2-reviews-title">
      <div className="plv2-container plv2-reviews-inner">
        <header className="plv2-reviews-head plv2-reviews-head--nav">
          <div className="plv2-reviews-head-text">
            <p className="plv2-reviews-eyebrow">Experiencias</p>
            <h2 id="plv2-reviews-title" className="plv2-reviews-title">
              Reviews
            </h2>
            <p className="plv2-reviews-lead">Lo que dicen quienes ya usaron MotivarCare.</p>
          </div>
          <div className="plv2-reviews-nav" role="group" aria-label="Navegar testimonios">
            <button
              type="button"
              className="plv2-reviews-nav-btn"
              onClick={() => scrollByDirection("left")}
              aria-label="Ver testimonios anteriores"
              disabled={loading}
            >
              ←
            </button>
            <button
              type="button"
              className="plv2-reviews-nav-btn"
              onClick={() => scrollByDirection("right")}
              aria-label="Ver testimonios siguientes"
              disabled={loading}
            >
              →
            </button>
          </div>
        </header>

        {loadError ? (
          <p className="plv2-reviews-error" role="status">
            {loadErrorHint === "html" ? (
              <>
                La web está llamando a <code>/api</code> en el mismo dominio y Vercel devuelve la página, no el servidor de datos.{" "}
                <strong>En Vercel → proyecto de esta landing → Environment Variables</strong> agregá{" "}
                <code>VITE_API_URL</code> con la URL pública del API (copiala de Railway, empieza con https://) y hacé{" "}
                <strong>Redeploy</strong>. Sin eso, las opiniones del admin no pueden cargarse.
              </>
            ) : (
              <>No pudimos cargar las opiniones. Actualizá la página o probá más tarde.</>
            )}
          </p>
        ) : null}

        {loading ? (
          <p className="plv2-reviews-loading" role="status">
            Cargando experiencias…
          </p>
        ) : null}

        <div className="plv2-reviews-viewport-wrap">
          <div className="plv2-reviews-viewport" ref={viewportRef} tabIndex={0} aria-busy={loading}>
            <ul className="plv2-reviews-track" role="list">
              {!loading
                ? reviews.map((review) => (
                    <li key={review.id} className="plv2-review-card-wrap">
                      <article
                        className="plv2-review-card"
                        style={{
                          borderColor: `${review.accent ?? "#6b5cb3"}2e`
                        }}
                      >
                        <div className="plv2-review-top">
                          <img
                            src={review.avatar}
                            alt=""
                            className="plv2-review-avatar"
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="plv2-review-identity">
                            <p className="plv2-review-name">{review.name}</p>
                            <p className="plv2-review-role">
                              {review.role} · {formatReviewWhen(review)}
                            </p>
                          </div>
                        </div>
                        <ReviewStars value={review.rating} />
                        <blockquote className="plv2-review-quote">“{review.text}”</blockquote>
                      </article>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
