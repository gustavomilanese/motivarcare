import { describe, expect, it } from "vitest";
import { monthCells, zonedYmd } from "./sessionsMonth";

describe("monthCells", () => {
  it("abre noviembre 2026 el lunes 26 de octubre", () => {
    const cells = monthCells(new Date("2026-11-09T12:00:00Z"), "UTC");
    expect(cells).toHaveLength(42);
    expect(zonedYmd(cells[0].date, "UTC")).toMatchObject({ month: 10, day: 26 });
    expect(cells[0].inMonth).toBe(false);
    const ninth = cells.find((cell) => cell.inMonth && zonedYmd(cell.date, "UTC").day === 9);
    expect(ninth).toBeTruthy();
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });
});
