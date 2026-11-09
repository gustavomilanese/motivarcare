import { type AppLanguage } from "@therapy/i18n-config";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { PortalAccountToolsMount } from "../../app/components/PortalAccountToolsMount";
import { useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";
import { DiaryEntriesTimeline } from "../components/DiaryEntriesTimeline";
import { DiaryEntryDetailModal } from "../components/DiaryEntryDetailModal";
import { DiaryRecordsChart } from "../components/DiaryRecordsChart";
import { DiaryRecordsHead } from "../components/DiaryRecordsHead";
import { DiaryRecordsInsights } from "../components/DiaryRecordsInsights";
import { DiaryRecordsSession } from "../components/DiaryRecordsSession";
import { DiaryRecordsStats } from "../components/DiaryRecordsStats";
import { DiaryShell } from "../components/DiaryChrome";
import { formatDiaryEntryDate, useDiaryRecords } from "../hooks/useDiaryRecords";
import { t } from "../lib/labels";

export interface DiaryRecordsPageProps {
  language: AppLanguage;
  authToken: string;
}

export function DiaryRecordsPage(props: DiaryRecordsPageProps) {
  const records = useDiaryRecords(props.language, props.authToken);
  useScrollSectionToTopOnMount(true, records.loading ? "loading" : "ready");

  return (
    <DiaryShell language={props.language} className="diary-page--records diary-calm diary-records-calm">
      <div data-section-top-anchor className="diary-page-top-anchor" aria-hidden="true" />
      <div className="diary-calm-columns">
        <div className="diary-calm-main">
          <DiaryRecordsHead language={props.language} />
          {records.loading ? <MotivarCarePageLoader language={props.language} layout="block" /> : null}
          {records.error ? <p className="diary-error">{records.error}</p> : null}
          {records.loading ? null : (
            <>
              <DiaryRecordsStats language={props.language} stats={records.stats} />
              <DiaryRecordsChart
                language={props.language}
                weeks={records.chartWeeks}
                onWeeks={records.setChartWeeks}
                weeklyMood={records.weeklyMood}
                segments={records.moodLineSegments}
              />
              <section className="diary-records-card" aria-labelledby="diary-records-timeline-title">
                <div className="diary-records-card-head">
                  <div>
                    <h2 id="diary-records-timeline-title">
                      {t(props.language, { es: "Timeline de entradas", en: "Entry timeline", pt: "Linha do tempo" })}
                    </h2>
                    <p>{t(props.language, { es: "Tus registros más recientes.", en: "Your most recent entries.", pt: "Seus registros mais recentes." })}</p>
                  </div>
                </div>
                <DiaryEntriesTimeline
                  language={props.language}
                  entries={records.entries}
                  variant="minimal"
                  moodMark="face"
                  onOpenDetail={records.setDetailEntryId}
                  ariaLabel={t(props.language, { es: "Timeline de entradas", en: "Entry timeline", pt: "Linha do tempo" })}
                  emptyMessage={t(props.language, {
                    es: "Todavía no tenés entradas.",
                    en: "No entries yet.",
                    pt: "Ainda não há entradas."
                  })}
                />
              </section>
            </>
          )}
        </div>
        <aside className="diary-calm-side">
          <PortalAccountToolsMount id="diary-hero-toolbar-mount" className="diary-calm-tools" />
          {records.loading ? null : (
            <>
              <DiaryRecordsInsights language={props.language} insights={records.stats?.insights ?? []} />
              <DiaryRecordsSession
                language={props.language}
                summary={records.summary}
                summaryLoading={records.summaryLoading}
                sendLoading={records.sendLoading}
                sentNotice={records.sentNotice}
                onPreview={() => void records.handleBuildSummary()}
                onSend={() => void records.handleSendSummary()}
              />
            </>
          )}
        </aside>
      </div>
      {records.detailEntry ? (
        <DiaryEntryDetailModal
          language={props.language}
          entry={records.detailEntry}
          formattedDate={formatDiaryEntryDate(records.detailEntry.createdAt, props.language)}
          onClose={() => records.setDetailEntryId(null)}
        />
      ) : null}
    </DiaryShell>
  );
}
