import { publicApiBase } from "./fetchLandingSessionPackages";

export interface LandingWebReviewItem {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent?: string;
}

interface WebContentResponse {
  reviews: LandingWebReviewItem[];
}

function webContentUrl(): string {
  const base = publicApiBase();
  const path = "/api/public/web-content?audience=landing";
  return base ? `${base}${path}` : path;
}

export async function fetchLandingWebReviews(): Promise<LandingWebReviewItem[]> {
  const res = await fetch(webContentUrl());
  if (!res.ok) {
    throw new Error("web-content");
  }
  const data = (await res.json()) as WebContentResponse;
  return Array.isArray(data.reviews) ? data.reviews : [];
}
