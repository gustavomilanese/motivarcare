import type { Prisma } from "@prisma/client";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Borradores de onboarding: el usuario puede cortar a la mitad y volver días después
 * sin perder lo cargado, sin importar el dispositivo (por eso vive en servidor y no
 * en `localStorage`).
 *
 * El chat de intake queda fuera a propósito: ya persiste turno a turno en
 * `PatientIntakeChatSession`. Acá viven los flujos por formulario.
 */
export const ONBOARDING_DRAFT_KINDS = ["patient_intake", "professional_onboarding"] as const;

export type OnboardingDraftKind = (typeof ONBOARDING_DRAFT_KINDS)[number];

export interface OnboardingDraftDto {
  kind: OnboardingDraftKind;
  step: number;
  data: Record<string, unknown>;
  updatedAt: string;
  /** Momento en que el borrador se descarta si el usuario no vuelve. */
  expiresAt: string;
}

export type OnboardingDraftErrorCode = "DRAFT_TOO_LARGE";

export class OnboardingDraftError extends Error {
  constructor(
    public readonly code: OnboardingDraftErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OnboardingDraftError";
  }
}

export function isOnboardingDraftKind(value: string): value is OnboardingDraftKind {
  return (ONBOARDING_DRAFT_KINDS as readonly string[]).includes(value);
}

function ttlMs(): number {
  return env.ONBOARDING_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function isExpired(updatedAt: Date, now: number = Date.now()): boolean {
  return now - updatedAt.getTime() > ttlMs();
}

function expiresAtFrom(updatedAt: Date): string {
  return new Date(updatedAt.getTime() + ttlMs()).toISOString();
}

/**
 * Un borrador no debe crecer sin límite: los data URLs de video/PDF de los profesionales
 * pesan decenas de MB y el borrador se reescribe en cada autoguardado.
 */
export function assertWithinSizeLimit(data: Record<string, unknown>): void {
  const bytes = Buffer.byteLength(JSON.stringify(data), "utf8");
  if (bytes > env.ONBOARDING_DRAFT_MAX_BYTES) {
    throw new OnboardingDraftError("DRAFT_TOO_LARGE", "El borrador supera el tamaño máximo", {
      bytes,
      maxBytes: env.ONBOARDING_DRAFT_MAX_BYTES
    });
  }
}

/**
 * Los vencidos se borran al leerlos, pero el que nunca vuelve no dispara ninguna lectura.
 * Sin esto la tabla acumularía para siempre los abandonos. Se hace acá, con throttle, para
 * no depender de un cron aparte.
 */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurgeAt = 0;

function maybePurgeExpired(): void {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) {
    return;
  }
  lastPurgeAt = now;

  // Sin await: es mantenimiento, no debe agregar latencia al autoguardado.
  void prisma.onboardingDraft
    .deleteMany({ where: { updatedAt: { lt: new Date(now - ttlMs()) } } })
    .then((result) => {
      if (result.count > 0) {
        console.info(`[onboarding-drafts] purgados ${result.count} borradores vencidos`);
      }
    })
    .catch((error) => {
      console.error("[onboarding-drafts] purga de vencidos falló", error);
    });
}

export async function saveDraft(input: {
  userId: string;
  kind: OnboardingDraftKind;
  step: number;
  data: Record<string, unknown>;
}): Promise<OnboardingDraftDto> {
  assertWithinSizeLimit(input.data);
  maybePurgeExpired();

  const data = input.data as unknown as Prisma.InputJsonValue;
  const saved = await prisma.onboardingDraft.upsert({
    where: { userId_kind: { userId: input.userId, kind: input.kind } },
    create: { userId: input.userId, kind: input.kind, step: input.step, data },
    update: { step: input.step, data }
  });

  return toDto(saved);
}

/**
 * Devuelve el borrador vigente, o `null` si no hay o si venció.
 * El vencido se borra acá mismo: no hace falta un cron para limpiar la tabla.
 */
export async function getDraft(userId: string, kind: OnboardingDraftKind): Promise<OnboardingDraftDto | null> {
  const existing = await prisma.onboardingDraft.findUnique({
    where: { userId_kind: { userId, kind } }
  });

  if (!existing) {
    return null;
  }

  if (isExpired(existing.updatedAt)) {
    await discardDraft(userId, kind);
    return null;
  }

  return toDto(existing);
}

/** Se llama al completar el onboarding o cuando el usuario decide empezar de cero. */
export async function discardDraft(userId: string, kind: OnboardingDraftKind): Promise<void> {
  await prisma.onboardingDraft.deleteMany({ where: { userId, kind } });
}

function toDto(row: {
  kind: string;
  step: number;
  data: Prisma.JsonValue;
  updatedAt: Date;
}): OnboardingDraftDto {
  return {
    kind: row.kind as OnboardingDraftKind,
    step: row.step,
    data: (row.data ?? {}) as Record<string, unknown>,
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: expiresAtFrom(row.updatedAt)
  };
}
