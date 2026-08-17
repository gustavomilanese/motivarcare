import { describe, expect, it } from "vitest";
import { buildMovementsWhere, parseMovementsListQuery } from "./financeMovementsQuery.js";

const from = new Date("2026-06-01T00:00:00.000Z");
const to = new Date("2026-06-30T23:59:59.999Z");
const baseCompleted = { professionalId: "pro_1", bookingStatus: "COMPLETED" };

describe("buildMovementsWhere", () => {
  it("keeps the period OR when searching by patient name", () => {
    const movements = parseMovementsListQuery({ movementsSearch: "Camila" });
    const where = buildMovementsWhere({
      baseCompleted,
      statsFrom: from,
      statsTo: to,
      movements
    });
    const and = where.AND as Record<string, unknown>[];
    expect(and).toHaveLength(3);
    expect(and[0]).toEqual(baseCompleted);
    expect(and[1]).toEqual({
      OR: [
        { bookingCompletedAt: { gte: from, lte: to } },
        { AND: [{ bookingCompletedAt: null }, { bookingStartsAt: { gte: from, lte: to } }] }
      ]
    });
    expect(and[2]).toMatchObject({
      OR: expect.arrayContaining([
        expect.objectContaining({
          patient: { user: { fullName: { contains: "Camila", mode: "insensitive" } } }
        })
      ])
    });
  });

  it("does not add a search clause when the query is empty", () => {
    const movements = parseMovementsListQuery({});
    const where = buildMovementsWhere({
      baseCompleted,
      statsFrom: from,
      statsTo: to,
      movements
    });
    expect((where.AND as unknown[]).length).toBe(2);
  });
});
