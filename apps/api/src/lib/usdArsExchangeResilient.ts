/**
 * Wrapper resiliente sobre `usdArsExchange.ts`.
 *
 * En producción los proveedores externos (Bluelytics / DolarApi) pueden fallar
 * por timeouts de salida, problemas de DNS, IPv6-only, rate-limit, etc. Si eso
 * pasa, `getUsdArsQuote()` lanza y los endpoints AR pierden la cotización.
 *
 * Ese fallo cascadea feo: como los `sessionPackage.priceCents` históricos están
 * seedeados en USD-cents, sin FX el endpoint público termina devolviendo
 * `currency: "ars"` con valores en USD. El paciente argentino ve "$ 380" en
 * vez de "$ 380.000".
 *
 * Para evitarlo, este módulo implementa una cascada de fallbacks que **siempre**
 * devuelve un quote operativo:
 *
 *   1. Live provider (Bluelytics / DolarApi / override env).
 *   2. Caché en memoria del último éxito de este proceso.
 *   3. Snapshot persistido en `SystemConfig` (sobrevive a restarts).
 *   4. `USD_ARS_RATE_FALLBACK` env (configurable por ops).
 *   5. Hardcoded final (~ valor oficial reciente, sólo último recurso).
 *
 * Cada éxito persiste el quote en DB para que cualquier réplica del API tenga
 * un valor reciente al cuál caer aunque la API externa se caiga.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getUsdArsQuote, type UsdArsQuote } from "./usdArsExchange.js";

const SNAPSHOT_KEY = "usd-ars-rate-snapshot";
/**
 * Snapshots más viejos que esto se ignoran al fallback: preferimos el env / hardcoded
 * antes de servir un FX de hace meses.
 */
const MAX_DB_SNAPSHOT_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Último recurso si nada más está disponible. Se actualiza cada tanto a un valor
 * conservador-aproximado del oficial (sub-óptimo pero infinitamente mejor que
 * mostrar USD como ARS).
 */
const HARDCODED_FALLBACK_RATE = 1100;

export type ResilientQuoteSource =
  | "live"
  | "memory-stale"
  | "db-snapshot"
  | "env-fallback"
  | "hardcoded-fallback";

export interface ResilientUsdArsQuote {
  /** ARS por 1 USD. Siempre > 0. */
  rate: number;
  /** Origen del valor servido. Útil para auditoría / decisiones de UI. */
  source: ResilientQuoteSource;
  /** Provider original (cuando aplica) o "fallback". */
  provider: string;
  /** Cuándo se obtuvo el rate originalmente (no la última lectura). */
  fetchedAt: Date;
  /**
   * `true` cuando no se obtuvo del provider en este request (incluye stale-memory,
   * DB snapshot, env y hardcoded). Útil para banners de "precio aproximado" si se
   * quisiera más adelante.
   */
  stale: boolean;
}

let lastSuccessful: UsdArsQuote | null = null;

function parseEnvFallback(): number | null {
  const raw = process.env.USD_ARS_RATE_FALLBACK?.trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface PersistedSnapshot {
  rate: number;
  provider: string;
  fetchedAt: string;
}

function isPersistedSnapshot(value: unknown): value is PersistedSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.rate === "number"
    && Number.isFinite(candidate.rate)
    && candidate.rate > 0
    && typeof candidate.provider === "string"
    && typeof candidate.fetchedAt === "string"
  );
}

async function persistSnapshot(quote: UsdArsQuote): Promise<void> {
  const value: PersistedSnapshot = {
    rate: quote.rate,
    provider: quote.provider,
    fetchedAt: quote.fetchedAt.toISOString()
  };
  await prisma.systemConfig.upsert({
    where: { key: SNAPSHOT_KEY },
    update: { value: value as unknown as Prisma.InputJsonValue },
    create: { key: SNAPSHOT_KEY, value: value as unknown as Prisma.InputJsonValue }
  });
}

async function loadPersistedSnapshot(): Promise<UsdArsQuote | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: SNAPSHOT_KEY } });
  if (!row || !isPersistedSnapshot(row.value)) {
    return null;
  }
  const fetchedAt = new Date(row.value.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) {
    return null;
  }
  if (Date.now() - fetchedAt.getTime() > MAX_DB_SNAPSHOT_AGE_MS) {
    return null;
  }
  return {
    rate: row.value.rate,
    provider: row.value.provider as UsdArsQuote["provider"],
    fetchedAt
  };
}

/**
 * Quote USD/ARS con cascada de fallbacks. NUNCA lanza.
 *
 * Para usos críticos de auditoría (snapshot de FX al momento de un cobro), seguir
 * usando `getUsdArsQuote` directamente para que el provider real quede registrado
 * y un fallo se vea explícitamente en los logs.
 */
export async function getResilientUsdArsQuote(): Promise<ResilientUsdArsQuote> {
  try {
    const live = await getUsdArsQuote();
    lastSuccessful = live;
    void persistSnapshot(live).catch((error) => {
      console.warn("[usdArsExchangeResilient] persist snapshot failed", error);
    });
    return {
      rate: live.rate,
      provider: live.provider,
      fetchedAt: live.fetchedAt,
      source: "live",
      stale: false
    };
  } catch (error) {
    console.warn("[usdArsExchangeResilient] live quote unavailable, using fallback", error);
  }

  if (lastSuccessful) {
    return {
      rate: lastSuccessful.rate,
      provider: lastSuccessful.provider,
      fetchedAt: lastSuccessful.fetchedAt,
      source: "memory-stale",
      stale: true
    };
  }

  try {
    const persisted = await loadPersistedSnapshot();
    if (persisted) {
      lastSuccessful = persisted;
      return {
        rate: persisted.rate,
        provider: persisted.provider,
        fetchedAt: persisted.fetchedAt,
        source: "db-snapshot",
        stale: true
      };
    }
  } catch (error) {
    console.warn("[usdArsExchangeResilient] DB snapshot lookup failed", error);
  }

  const envFallback = parseEnvFallback();
  if (envFallback !== null) {
    return {
      rate: envFallback,
      provider: "fallback",
      fetchedAt: new Date(),
      source: "env-fallback",
      stale: true
    };
  }

  return {
    rate: HARDCODED_FALLBACK_RATE,
    provider: "fallback",
    fetchedAt: new Date(),
    source: "hardcoded-fallback",
    stale: true
  };
}

/** Versión sólo-rate para call-sites que no necesitan metadata. */
export async function getResilientUsdArsRate(): Promise<number> {
  const quote = await getResilientUsdArsQuote();
  return quote.rate;
}

/** Sólo para tests: limpia el caché de memoria del módulo. */
export function __resetResilientCacheForTests(): void {
  lastSuccessful = null;
}
