import type {
  EmotionalDiaryEntry,
  EmotionalDiarySentReportItem,
  EmotionalDiarySessionSummary
} from "@therapy/types";
import { apiRequest } from "../../app/services/api";

interface EntriesEnvelope {
  entries: EmotionalDiaryEntry[];
}

interface ReportsEnvelope {
  items: EmotionalDiarySentReportItem[];
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

export async function fetchEmotionalDiarySentReports(token: string): Promise<EmotionalDiarySentReportItem[]> {
  const result = await apiRequest<ReportsEnvelope>("/api/professional/emotional-diary/reports", token);
  return result.items;
}
