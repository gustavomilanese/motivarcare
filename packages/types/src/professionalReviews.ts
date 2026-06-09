export const MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW = 2;

export type ProfessionalReviewPublicItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Etiqueta anonimizada del paciente (p. ej. "María L."). */
  patientLabel: string;
};

export type ProfessionalReviewStats = {
  averageRating: number | null;
  reviewCount: number;
};

export type PendingProfessionalReviewPrompt = {
  professionalId: string;
  professionalName: string;
  completedSessionsCount: number;
  triggerBookingId: string | null;
};

export type CreateProfessionalReviewPayload = {
  professionalId: string;
  rating: number;
  comment?: string | null;
  bookingId?: string | null;
};
