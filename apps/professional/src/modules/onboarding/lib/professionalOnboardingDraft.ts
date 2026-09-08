import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

/**
 * Qué se guarda (y qué no) del wizard del profesional cuando lo deja a medias.
 *
 * Dos cosas quedan siempre afuera:
 * - Credenciales: la contraseña no viaja ni se guarda en un borrador.
 * - Archivos pesados: video y documentos van como data URL de decenas de MB, y el
 *   borrador se reescribe en cada autoguardado. Se avisa al profesional qué tiene
 *   que volver a subir en lugar de intentar guardarlos.
 */

/** Foto de perfil: entra al borrador sólo si el comprimido es chico. */
export const DRAFT_INLINE_MEDIA_MAX_BYTES = 500 * 1024;

/** Nunca se persisten: son credenciales o tokens de un solo uso. */
const CREDENTIAL_FIELDS = ["password", "passwordConfirm", "turnstileToken"] as const;

/** Marca interna del borrador (no es un campo del formulario). */
const MEDIA_PRESENCE_KEY = "__media";

/** Archivos que el profesional tendrá que volver a subir al retomar. */
export type DroppedDraftMedia = "photo" | "video" | "diploma" | "taxDocument";

export interface ProfessionalDraftDiploma {
  institution: string;
  degree: string;
  startYear: string;
  graduationYear: string;
  diplomaUploaded: boolean;
  diplomaPreview: string;
}

export interface ProfessionalDraftFormShape {
  profilePhotoReady: boolean;
  profilePhotoPreview: string;
  videoReady: boolean;
  videoPreview: string;
  videoFileUrl: string;
  stripeVerified: boolean;
  stripeDocPreview: string;
  diplomas: ProfessionalDraftDiploma[];
  password: string;
  passwordConfirm: string;
  turnstileToken: string;
}

/**
 * Un data URL es base64 ASCII, así que su largo ya es su tamaño en bytes. Se evita
 * codificarlo: esto corre en cada cambio del formulario y la foto pesa cientos de KB.
 */
function fitsInline(dataUrl: string): boolean {
  const trimmed = dataUrl.trim();
  return trimmed.length > 0 && trimmed.length <= DRAFT_INLINE_MEDIA_MAX_BYTES;
}

/** Toma el formulario en vivo y devuelve lo que sí se puede persistir. */
export function buildProfessionalOnboardingDraftData<T extends ProfessionalDraftFormShape>(
  form: T
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...(form as Record<string, unknown>) };

  for (const field of CREDENTIAL_FIELDS) {
    delete data[field];
  }

  const keepPhoto = fitsInline(form.profilePhotoPreview);
  data.profilePhotoPreview = keepPhoto ? form.profilePhotoPreview.trim() : "";
  data.profilePhotoReady = keepPhoto ? form.profilePhotoReady : false;

  data.videoPreview = "";
  data.videoFileUrl = "";
  data.videoReady = false;

  data.stripeDocPreview = "";
  data.stripeVerified = false;

  data.diplomas = form.diplomas.map((diploma) => ({
    institution: diploma.institution,
    degree: diploma.degree,
    startYear: diploma.startYear,
    graduationYear: diploma.graduationYear,
    diplomaUploaded: false,
    diplomaPreview: ""
  }));

  return data;
}

export interface RestoredProfessionalDraft<T> {
  values: Partial<T>;
  /** Archivos que el profesional había subido y tiene que volver a cargar. */
  droppedMedia: DroppedDraftMedia[];
}

/**
 * Prepara los valores restaurados para mezclarlos sobre el formulario vivo, y avisa
 * qué archivos había cargados que no sobrevivieron al borrador.
 */
export function restoreProfessionalOnboardingDraft<T extends ProfessionalDraftFormShape>(
  data: unknown
): RestoredProfessionalDraft<T> {
  if (!data || typeof data !== "object") {
    return { values: {}, droppedMedia: [] };
  }

  const values = { ...(data as Record<string, unknown>) };
  for (const field of CREDENTIAL_FIELDS) {
    delete values[field];
  }

  const flags = (values[MEDIA_PRESENCE_KEY] ?? {}) as Record<string, unknown>;
  delete values[MEDIA_PRESENCE_KEY];

  const restoredPhoto = typeof values.profilePhotoPreview === "string" ? values.profilePhotoPreview.trim() : "";
  const droppedMedia: DroppedDraftMedia[] = [];
  if (flags.photo === true && restoredPhoto.length === 0) {
    droppedMedia.push("photo");
  }
  if (flags.video === true) {
    droppedMedia.push("video");
  }
  if (flags.diploma === true) {
    droppedMedia.push("diploma");
  }
  if (flags.taxDocument === true) {
    droppedMedia.push("taxDocument");
  }

  return { values: values as Partial<T>, droppedMedia };
}

/**
 * Frase para pedirle al profesional que vuelva a subir lo que no entró en el borrador.
 * Devuelve "" si no falta nada, para que el llamador no tenga que chequear el array.
 */
export function droppedMediaMessage(
  dropped: readonly DroppedDraftMedia[],
  language: AppLanguage
): string {
  if (dropped.length === 0) {
    return "";
  }

  const names: Record<DroppedDraftMedia, LocalizedText> = {
    photo: { es: "la foto de perfil", en: "your profile photo", pt: "a foto de perfil" },
    video: { es: "el video", en: "your video", pt: "o video" },
    diploma: { es: "los diplomas", en: "your diplomas", pt: "os diplomas" },
    taxDocument: { es: "el documento fiscal", en: "your tax document", pt: "o documento fiscal" }
  };

  const list = dropped.map((item) => textByLanguage(language, names[item])).join(", ");
  return textByLanguage(language, {
    es: `Por el peso de los archivos, necesitamos que vuelvas a subir ${list}.`,
    en: `Because of file size, you need to upload ${list} again.`,
    pt: `Pelo tamanho dos arquivos, precisamos que envie novamente ${list}.`
  });
}

/** Marca en el borrador qué archivos existían, para poder pedirlos de nuevo al retomar. */
export function withMediaPresenceFlags<T extends ProfessionalDraftFormShape>(
  data: Record<string, unknown>,
  form: T
): Record<string, unknown> {
  return {
    ...data,
    [MEDIA_PRESENCE_KEY]: {
      photo: form.profilePhotoPreview.trim().length > 0,
      video: form.videoPreview.trim().length > 0 || form.videoFileUrl.trim().length > 0,
      diploma: form.diplomas.some((diploma) => diploma.diplomaPreview.trim().length > 0),
      taxDocument: form.stripeDocPreview.trim().length > 0
    }
  };
}
