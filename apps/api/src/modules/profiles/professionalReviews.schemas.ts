import { z } from "zod";

export const createProfessionalReviewSchema = z.object({
  professionalId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  bookingId: z.string().min(1).optional().nullable()
});

export const listProfessionalReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0)
});
