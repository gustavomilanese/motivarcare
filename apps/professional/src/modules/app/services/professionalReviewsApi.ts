import type { ProfessionalReviewPublicItem, ProfessionalReviewStats } from "@therapy/types";
import { apiRequest } from "./api";

export type ProfessionalReviewsResponse = {
  reviews: ProfessionalReviewPublicItem[];
  stats: ProfessionalReviewStats;
};

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
