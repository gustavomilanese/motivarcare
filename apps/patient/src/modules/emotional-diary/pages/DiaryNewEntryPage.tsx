import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { PortalAccountToolsMount } from "../../app/components/PortalAccountToolsMount";
import { navigateToSectionTop, useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";
import { useDiaryLeaveConfirm, DiaryShell } from "../components/DiaryChrome";
import { DiaryEntryClimateCard } from "../components/DiaryEntryClimateCard";
import {
  DiaryEntryActions,
  DiaryEntryFeelings,
  DiaryEntryNeeds,
  DiaryEntryThought,
  DiaryEntryVisibility,
  DiaryEntryWhatHappened
} from "../components/DiaryEntryFields";
import { DiaryEntryHead } from "../components/DiaryEntryHead";
import { t } from "../lib/labels";
import { MOOD_OPTIONS } from "../lib/moods";
import { createDiaryEntry, fetchDiarySettings } from "../services/emotionalDiaryApi";
import type { MoodLevel } from "../types";

export interface DiaryNewEntryPageProps {
  language: AppLanguage;
  authToken: string;
}

function parseMood(value: string | null): MoodLevel {
  if (value && MOOD_OPTIONS.some((option) => option.id === value)) {
    return value as MoodLevel;
  }
  return "regular";
}

type DiaryEntryVisibility = "private" | "for_psychologist";

export function DiaryNewEntryPage(props: DiaryNewEntryPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useScrollSectionToTopOnMount();
  const [mood, setMood] = useState<MoodLevel>(() => parseMood(searchParams.get("mood")));
  const [whatHappened, setWhatHappened] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [recurringThought, setRecurringThought] = useState("");
  const [needsNow, setNeedsNow] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<DiaryEntryVisibility>("for_psychologist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDiarySettings(props.authToken)
      .then((settings) =>
        setVisibility(settings.shareWithPsychologistDefault ? "for_psychologist" : "private")
      )
      .catch(() => {
        /* default stays for_psychologist */
      });
  }, [props.authToken]);

  useEffect(() => {
    const fromQuery = searchParams.get("mood");
    if (fromQuery) setMood(parseMood(fromQuery));
  }, [searchParams]);

  const isDirty = useMemo(
    () =>
      whatHappened.trim().length > 0 ||
      recurringThought.trim().length > 0 ||
      feelings.length > 0 ||
      needsNow.length > 0,
    [whatHappened, recurringThought, feelings, needsNow]
  );

  const confirmLeave = useDiaryLeaveConfirm(props.language, isDirty);

  function handleCancel() {
    if (!confirmLeave()) return;
    navigate("/diario");
  }

  async function persist() {
    setSaving(true);
    setError("");
    try {
      await createDiaryEntry(
        {
          status: "published",
          mood,
          whatHappened,
          feelings,
          recurringThought,
          needsNow,
          isPrivate: visibility === "private",
          shareWithPsychologist: visibility === "for_psychologist"
        },
        props.authToken
      );
      navigateToSectionTop(navigate, "/diario/registros");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No pudimos guardar la entrada",
              en: "We couldn't save the entry",
              pt: "Nao foi possivel salvar a entrada"
            })
      );
      setSaving(false);
    }
  }

  return (
    <DiaryShell language={props.language} className="diary-page--entry diary-calm diary-entry-calm">
      <div data-section-top-anchor className="diary-page-top-anchor" aria-hidden="true" />
      <PortalAccountToolsMount id="diary-hero-toolbar-mount" className="diary-calm-tools diary-calm-tools--entry" />
      <div className="diary-entry-calm-wrap">
        <DiaryEntryHead language={props.language} isDirty={isDirty} onConfirmLeave={confirmLeave} />
        {error ? <p className="diary-error">{error}</p> : null}
        <DiaryEntryClimateCard language={props.language} mood={mood} onMood={setMood} />
        <DiaryEntryWhatHappened language={props.language} value={whatHappened} onChange={setWhatHappened} />
        <DiaryEntryFeelings
          language={props.language}
          feelings={feelings}
          onToggle={(chip) =>
            setFeelings((current) =>
              current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]
            )
          }
        />
        <DiaryEntryThought language={props.language} value={recurringThought} onChange={setRecurringThought} />
        <DiaryEntryNeeds
          language={props.language}
          needs={needsNow}
          onToggle={(id) =>
            setNeedsNow((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
            )
          }
        />
        <DiaryEntryVisibility language={props.language} value={visibility} onChange={setVisibility} />
        <DiaryEntryActions
          language={props.language}
          saving={saving}
          onCancel={handleCancel}
          onSave={() => void persist()}
        />
      </div>
    </DiaryShell>
  );
}
