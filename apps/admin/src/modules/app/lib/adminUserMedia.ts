import type { AppLanguage } from "@therapy/i18n-config";
import type { AdminUser } from "../types";

export type AdminUserMediaBaseline = {
  avatarUrl: string;
  photoUrl: string;
  videoUrl: string;
};

function t(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  return values[language] ?? values.es;
}

/** Friendly one-line label for stored photo/video URLs (never dumps base64 in the UI). */
export function adminStoredMediaDisplayLabel(
  value: string | null | undefined,
  language: AppLanguage,
  options?: { hasMedia?: boolean; kind?: "photo" | "video" | "media" }
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const hasMedia = options?.hasMedia ?? raw.length > 0;
  const kind = options?.kind ?? "media";

  if (!hasMedia && !raw) {
    return "—";
  }

  if (!raw) {
    if (kind === "photo") {
      return t(language, { es: "Foto cargada", en: "Photo uploaded", pt: "Foto carregada" });
    }
    if (kind === "video") {
      return t(language, { es: "Video cargado", en: "Video uploaded", pt: "Video carregado" });
    }
    return t(language, { es: "Archivo cargado", en: "File uploaded", pt: "Arquivo carregado" });
  }

  if (raw.startsWith("data:")) {
    const mime = raw.slice(5, raw.indexOf(";")) || "archivo";
    if (kind === "photo") {
      return t(language, { es: "Foto cargada", en: "Photo uploaded", pt: "Foto carregada" });
    }
    if (kind === "video") {
      return t(language, { es: "Video cargado", en: "Video uploaded", pt: "Video carregado" });
    }
    return t(language, {
      es: `Archivo cargado (${mime})`,
      en: `Uploaded file (${mime})`,
      pt: `Arquivo carregado (${mime})`
    });
  }

  if (raw.length > 80) {
    return `${raw.slice(0, 77)}…`;
  }

  return raw;
}

export function adminUserMediaBaseline(user: AdminUser): AdminUserMediaBaseline {
  return {
    avatarUrl: user.avatarUrl ?? "",
    photoUrl: user.professionalProfile?.photoUrl ?? "",
    videoUrl: user.professionalProfile?.videoUrl ?? ""
  };
}

/** List rows omit heavy data URLs; flags indicate whether media exists. */
export function stripAdminUserListMedia(user: AdminUser): AdminUser {
  const hasAvatar = user.hasAvatar ?? Boolean(user.avatarUrl?.trim());
  const professionalProfile = user.professionalProfile
    ? {
        ...user.professionalProfile,
        photoUrl: null,
        videoUrl: null,
        hasPhoto: user.professionalProfile.hasPhoto ?? Boolean(user.professionalProfile.photoUrl?.trim()),
        hasVideo: user.professionalProfile.hasVideo ?? Boolean(user.professionalProfile.videoUrl?.trim())
      }
    : null;

  return {
    ...user,
    avatarUrl: null,
    hasAvatar,
    professionalProfile
  };
}
