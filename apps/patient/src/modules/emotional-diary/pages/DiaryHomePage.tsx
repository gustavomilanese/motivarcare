import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { PortalAccountToolsMount } from "../../app/components/PortalAccountToolsMount";
import { navigateToSectionTop, useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";
import { DiaryEntriesTimeline } from "../components/DiaryEntriesTimeline";
import { DiaryEntryDetailModal } from "../components/DiaryEntryDetailModal";
import { DiaryCalmHead } from "../components/DiaryCalmHead";
import { DiaryMoodCheckin } from "../components/DiaryMoodCheckin";
import { DiaryShell } from "../components/DiaryChrome";
import { DiarySideResources } from "../components/DiarySideResources";
import { t } from "../lib/labels";
import { fetchDiaryEntries, migrateLocalDiaryIfNeeded } from "../services/emotionalDiaryApi";
import type { DiaryEntry } from "../types";

export interface DiaryHomePageProps {
  language: AppLanguage;
  authToken: string;
}

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function DiaryHomePage(props: DiaryHomePageProps) {
  const navigate = useNavigate();
  useScrollSectionToTopOnMount();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await migrateLocalDiaryIfNeeded(props.authToken);
        const published = await fetchDiaryEntries(props.authToken, "published");
        if (cancelled) return;
        setEntries(published);
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "Error al cargar el diario",
                en: "Could not load the diary",
                pt: "Erro ao carregar o diario"
              })
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.authToken]);

  const recent = useMemo(() => entries.slice(0, 3), [entries]);
  const detailEntry = useMemo(
    () => (detailEntryId ? entries.find((entry) => entry.id === detailEntryId) ?? null : null),
    [detailEntryId, entries]
  );

  return (
    <DiaryShell language={props.language} className="diary-page--home diary-home-page diary-home-page--ml diary-calm">
      <div className="diary-calm-columns">
        <div className="diary-calm-main">
          <DiaryCalmHead language={props.language} />
          <DiaryMoodCheckin language={props.language} />
          <section aria-labelledby="diary-recent-title">
            <div className="diary-calm-recent-head">
              <h2 id="diary-recent-title">
                {t(props.language, { es: "Últimas entradas", en: "Recent entries", pt: "Últimas entradas" })}
              </h2>
              <button
                type="button"
                className="diary-calm-new"
                onClick={() => navigateToSectionTop(navigate, "/diario/nueva")}
              >
                {t(props.language, { es: "Nueva entrada", en: "New entry", pt: "Nova entrada" })}
              </button>
            </div>
            {error ? <p className="diary-error">{error}</p> : null}
            {loading ? (
              <MotivarCarePageLoader language={props.language} layout="block" />
            ) : (
              <>
                <DiaryEntriesTimeline
                  language={props.language}
                  entries={recent}
                  variant="minimal"
                  moodMark="face"
                  onOpenDetail={setDetailEntryId}
                  ariaLabel={t(props.language, { es: "Últimas entradas", en: "Recent entries", pt: "Últimas entradas" })}
                  emptyMessage={t(props.language, {
                    es: "Todavía no tenés entradas. Tu primera puede tomar unos minutos.",
                    en: "No entries yet. Your first one only takes a few minutes.",
                    pt: "Ainda não há entradas. A primeira leva só alguns minutos."
                  })}
                />
                {recent.length > 0 ? (
                  <button
                    type="button"
                    className="diary-side-link diary-calm-all"
                    onClick={() => navigateToSectionTop(navigate, "/diario/registros")}
                  >
                    {t(props.language, { es: "Ver todas", en: "See all", pt: "Ver todas" })}
                  </button>
                ) : null}
              </>
            )}
          </section>
        </div>
        <aside className="diary-calm-side">
          <PortalAccountToolsMount id="diary-hero-toolbar-mount" className="diary-calm-tools" />
          <DiarySideResources language={props.language} />
        </aside>
      </div>
      {detailEntry ? (
        <DiaryEntryDetailModal
          language={props.language}
          entry={detailEntry}
          formattedDate={formatEntryDate(detailEntry.createdAt, props.language)}
          onClose={() => setDetailEntryId(null)}
        />
      ) : null}
    </DiaryShell>
  );
}
