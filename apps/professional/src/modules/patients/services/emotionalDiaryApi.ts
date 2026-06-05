import type { EmotionalDiaryEntry, EmotionalDiarySessionSummary } from "@therapy/types";
import { apiRequest } from "../../app/services/api";

interface EntriesEnvelope {
  entries: EmotionalDiaryEntry[];
}

export async function fetchPatientEmotionalDiaryEntries(
  patientId: string,
  token: string
): Promise<EmotionalDiaryEntry[]> {
  const result = await apiRequest<EntriesEnvelope>(
    `/api/professional/patients/${encodeURIComponent(patientId)}/emotional-diary`,
    token
  );
  return result.entries;
}

export async function fetchPatientEmotionalDiarySummary(
  patientId: string,
  token: string
): Promise<EmotionalDiarySessionSummary> {
  return apiRequest<EmotionalDiarySessionSummary>(
    `/api/professional/patients/${encodeURIComponent(patientId)}/emotional-diary/summary`,
    token
  );
}
