import { describe, expect, it } from "vitest";
import { createProfessionalReviewSchema, listProfessionalReviewsQuerySchema } from "./professionalReviews.schemas.js";

describe("professionalReviews.schemas", () => {
  it("accepts valid create payload", () => {
    const parsed = createProfessionalReviewSchema.safeParse({
      professionalId: "pro_1",
      rating: 5,
      comment: "Excelente acompañamiento"
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid rating", () => {
    const parsed = createProfessionalReviewSchema.safeParse({
      professionalId: "pro_1",
      rating: 6
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults list query params", () => {
    const parsed = listProfessionalReviewsQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(20);
      expect(parsed.data.offset).toBe(0);
    }
  });
});
