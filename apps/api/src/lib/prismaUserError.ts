import { env } from "../config/env.js";

/** Mensaje legible + pista en desarrollo cuando la DB no coincide con `schema.prisma`. */
export function prismaErrorUserMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Error inesperado del servidor.";
  }
  const rec = error as { code?: string; meta?: { column?: string; modelName?: string } };
  const code = rec.code;

  if (code === "P2002") {
    return "Este registro ya existe (violación de unicidad).";
  }

  if (code === "P2022" && env.NODE_ENV !== "production") {
    const col = rec.meta?.column ?? "columna";
    return `La base de datos está desactualizada (${col}). Desde la raíz del repo ejecutá: npm run db:sync (levanta Docker y aplica prisma db push).`;
  }

  if (code === "P2022") {
    return "Error al consultar la base de datos. Contactá soporte si persiste.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Error inesperado del servidor.";
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "P2002");
}
