import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const systemConfigFindUnique = vi.fn();
const systemConfigUpsert = vi.fn();

vi.mock("./prisma.js", () => ({
  prisma: {
    systemConfig: {
      findUnique: (...args: unknown[]) => systemConfigFindUnique(...args),
      upsert: (...args: unknown[]) => systemConfigUpsert(...args)
    }
  }
}));

const { __resetUsdArsCacheForTests } = await import("./usdArsExchange.js");
const { __resetResilientCacheForTests, getResilientUsdArsQuote } = await import("./usdArsExchangeResilient.js");

type FetchSpy = MockInstance<typeof globalThis.fetch>;

describe("getResilientUsdArsQuote", () => {
  const originalOverride = process.env.USD_ARS_RATE_OVERRIDE;
  const originalFallback = process.env.USD_ARS_RATE_FALLBACK;
  let fetchSpy: FetchSpy;
  let warnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    __resetUsdArsCacheForTests();
    __resetResilientCacheForTests();
    systemConfigFindUnique.mockReset();
    systemConfigUpsert.mockReset();
    systemConfigUpsert.mockResolvedValue({});
    delete process.env.USD_ARS_RATE_OVERRIDE;
    delete process.env.USD_ARS_RATE_FALLBACK;
    fetchSpy = vi.spyOn(globalThis, "fetch");
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    warnSpy.mockRestore();
    if (originalOverride === undefined) {
      delete process.env.USD_ARS_RATE_OVERRIDE;
    } else {
      process.env.USD_ARS_RATE_OVERRIDE = originalOverride;
    }
    if (originalFallback === undefined) {
      delete process.env.USD_ARS_RATE_FALLBACK;
    } else {
      process.env.USD_ARS_RATE_FALLBACK = originalFallback;
    }
  });

  it("source='live' cuando bluelytics responde y persiste el snapshot en DB", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ oficial: { value_avg: 1400 } }), { status: 200 })
    );
    const quote = await getResilientUsdArsQuote();
    expect(quote.rate).toBe(1400);
    expect(quote.source).toBe("live");
    expect(quote.provider).toBe("bluelytics");
    expect(quote.stale).toBe(false);

    await new Promise((resolve) => setImmediate(resolve));
    expect(systemConfigUpsert).toHaveBeenCalledOnce();
    const upsertCall = systemConfigUpsert.mock.calls[0]?.[0] as {
      where: { key: string };
      create: { value: { rate: number; provider: string } };
    };
    expect(upsertCall.where.key).toBe("usd-ars-rate-snapshot");
    expect(upsertCall.create.value.rate).toBe(1400);
    expect(upsertCall.create.value.provider).toBe("bluelytics");
  });

  it("source='memory-stale' cuando los providers fallan pero hubo un éxito previo", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ oficial: { value_avg: 1410 } }), { status: 200 })
    );
    const first = await getResilientUsdArsQuote();
    expect(first.source).toBe("live");

    __resetUsdArsCacheForTests();
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const second = await getResilientUsdArsQuote();
    expect(second.rate).toBe(1410);
    expect(second.source).toBe("memory-stale");
    expect(second.stale).toBe(true);
  });

  it("source='db-snapshot' cuando providers fallan y no hay memoria, pero hay snapshot fresco en DB", async () => {
    systemConfigFindUnique.mockResolvedValueOnce({
      key: "usd-ars-rate-snapshot",
      value: {
        rate: 1320,
        provider: "bluelytics",
        fetchedAt: new Date().toISOString()
      }
    });
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const quote = await getResilientUsdArsQuote();
    expect(quote.rate).toBe(1320);
    expect(quote.source).toBe("db-snapshot");
    expect(quote.stale).toBe(true);
  });

  it("ignora snapshots de DB demasiado viejos (> 30 días)", async () => {
    const ancient = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    systemConfigFindUnique.mockResolvedValueOnce({
      key: "usd-ars-rate-snapshot",
      value: { rate: 99, provider: "bluelytics", fetchedAt: ancient.toISOString() }
    });
    process.env.USD_ARS_RATE_FALLBACK = "1080";
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const quote = await getResilientUsdArsQuote();
    expect(quote.rate).toBe(1080);
    expect(quote.source).toBe("env-fallback");
  });

  it("source='env-fallback' usa USD_ARS_RATE_FALLBACK cuando no hay nada más", async () => {
    process.env.USD_ARS_RATE_FALLBACK = "1234.5";
    systemConfigFindUnique.mockResolvedValueOnce(null);
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const quote = await getResilientUsdArsQuote();
    expect(quote.rate).toBe(1234.5);
    expect(quote.source).toBe("env-fallback");
    expect(quote.provider).toBe("fallback");
    expect(quote.stale).toBe(true);
  });

  it("source='hardcoded-fallback' como último recurso (sin live, sin memoria, sin DB, sin env)", async () => {
    systemConfigFindUnique.mockResolvedValueOnce(null);
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const quote = await getResilientUsdArsQuote();
    expect(quote.rate).toBeGreaterThan(0);
    expect(quote.source).toBe("hardcoded-fallback");
    expect(quote.provider).toBe("fallback");
    expect(quote.stale).toBe(true);
  });
});
