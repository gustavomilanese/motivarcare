import type {
  PendingProfessionalReviewPrompt,
  ProfessionalReviewPublicItem,
  ProfessionalReviewStats
} from "@therapy/types";
import { apiRequest } from "../../app/services/api";

export type PendingProfessionalReviewResponse = {
  pending: PendingProfessionalReviewPrompt | null;
};

export type ProfessionalReviewsResponse = {
  reviews: ProfessionalReviewPublicItem[];
  stats: ProfessionalReviewStats;
};

export type CreateProfessionalReviewResponse = {
  review: {
    id: string;
    createdAt: string;
  };
};

export async function fetchPendingProfessionalReview(token: string): Promise<PendingProfessionalReviewPrompt | null> {
  const response = await apiRequest<PendingProfessionalReviewResponse>(
    "/api/profiles/me/pending-professional-review",
    {},
    token
  );
  return response.pending ?? null;
}

export async function fetchProfessionalReviews(
  professionalId: string,
  params?: { limit?: number; offset?: number }
): Promise<ProfessionalReviewsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset != null) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return apiRequest<ProfessionalReviewsResponse>(
    `/api/profiles/professionals/${encodeURIComponent(professionalId)}/reviews${query ? `?${query}` : ""}`
  );
}

export async function submitProfessionalReview(
  token: string,
  payload: {
    professionalId: string;
    rating: number;
    comment?: string | null;
    bookingId?: string | null;
  }
): Promise<CreateProfessionalReviewResponse> {
  return apiRequest<CreateProfessionalReviewResponse>(
    "/api/profiles/me/professional-reviews",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}
