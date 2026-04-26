import { apiRequest } from "../../app/services/api";

/**
 * Cliente HTTP de la pestaña "Reportes" del profesional. Pide al backend el
 * resumen IA del chat de acompañamiento de cada paciente bajo su cuidado, solo
 * cuando el paciente dio consent.
 */

export interface TreatmentReportListItem {
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  messageCount: number;
  lastUserMessageAt: string | null;
  safetyFlagged: boolean;
  lastSafetyEventAt: string | null;
  summaryAvailableAt: string | null;
}

export interface TreatmentReportSummarySection {
  moodSummary: string;
  topics: string[];
  signalsToWatch: string[];
  narrative: string;
}

export interface TreatmentReportSummary {
  generatedAt: string;
  model: string;
  messageCountAtGeneration: number;
  weekly: TreatmentReportSummarySection | null;
  overall: TreatmentReportSummarySection;
}

export interface TreatmentReportDetail {
  patientId: string;
  chatId: string;
  summary: TreatmentReportSummary;
  safetyFlagged: boolean;
  lastSafetyEventAt: string | null;
  lastUserMessageAt: string | null;
  messageCount: number;
}

interface ListEnvelope {
  items: TreatmentReportListItem[];
}

export async function fetchTreatmentReportsList(token: string): Promise<TreatmentReportListItem[]> {
  const result = await apiRequest<ListEnvelope>("/api/professional/treatment-reports", token);
  return result.items;
}

export async function fetchTreatmentReportDetail(
  patientId: string,
  token: string
): Promise<TreatmentReportDetail> {
  return apiRequest<TreatmentReportDetail>(
    `/api/professional/treatment-reports/${encodeURIComponent(patientId)}`,
    token
  );
}
