/** Max raw file size before client-side compression (photos are re-encoded to JPEG). */
export const PROFESSIONAL_PROFILE_PHOTO_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const PROFESSIONAL_PROFILE_PHOTO_MAX_WIDTH = 1200;
export const PROFESSIONAL_PROFILE_PHOTO_JPEG_QUALITY = 0.82;

function isHeicLikeFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

export function assertProfessionalProfilePhotoFile(file: File): void {
  if (isHeicLikeFile(file)) {
    throw new Error("HEIC_UNSUPPORTED");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }
  if (file.size > PROFESSIONAL_PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }
}

export async function prepareProfessionalProfilePhotoDataUrl(file: File): Promise<string> {
  assertProfessionalProfilePhotoFile(file);
  const raw = await fileToDataUrl(file);
  return compressImageDataUrl(raw, PROFESSIONAL_PROFILE_PHOTO_MAX_WIDTH, PROFESSIONAL_PROFILE_PHOTO_JPEG_QUALITY);
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image"));
    image.src = dataUrl;
  });
}

/** Reduces payload size for profile photos stored as data URLs. */
export async function compressImageDataUrl(dataUrl: string, maxWidth = 1600, quality = 0.82): Promise<string> {
  const image = await loadImageElement(dataUrl);
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", quality);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Invalid image file"));
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function videoToPreviewDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadeddata = () => {
      try {
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 180;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          cleanup();
          reject(new Error("Could not create video preview context"));
          return;
        }
        context.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        cleanup();
        resolve(dataUrl);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("Could not capture video frame"));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load video for preview"));
    };
  });
}

export async function mediaPreviewFromFile(file: File): Promise<string | null> {
  if (file.type.startsWith("image/")) {
    return fileToDataUrl(file);
  }
  if (file.type.startsWith("video/")) {
    return videoToPreviewDataUrl(file);
  }
  return null;
}

/**
 * Límite para diplomas / docs de verificación (imagen o PDF).
 * 5 MB en base64 hincha ~6.7 MB en memoria: arriba de eso el wizard se traba.
 * Escaneos en PDF suelen pasar de 5 MB; 10 MB sigue siendo manejable con File en memoria.
 */
export const PROFESSIONAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Marcador liviano en el form mientras el PDF real vive en un `File` ref.
 * Evita meter multi-MB en React state / `<a href="data:...">` (congela el UI).
 */
export const PROFESSIONAL_PDF_DOC_MARKER = "data:application/pdf;marker=1";

const PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "application/vnd.adobe.pdf"
]);

export function isPdfFile(file: File): boolean {
  const type = file.type.toLowerCase().trim();
  // `application/pdf;charset=...` y variantes raras del MIME.
  if (PDF_MIME_TYPES.has(type) || type.startsWith("application/pdf")) {
    return true;
  }
  // Algunos navegadores mandan octet-stream / vacío; confiar en la extensión.
  const name = file.name.toLowerCase().trim();
  if (name.endsWith(".pdf")) {
    return true;
  }
  return false;
}

/** %PDF al inicio del archivo (por si el MIME/nombre vienen mal). */
export async function fileLooksLikePdf(file: File): Promise<boolean> {
  if (isPdfFile(file)) {
    return true;
  }
  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    return (
      header.length >= 4
      && header[0] === 0x25
      && header[1] === 0x50
      && header[2] === 0x44
      && header[3] === 0x46
    );
  } catch {
    return false;
  }
}

function isDiplomaImageFile(file: File): boolean {
  const type = file.type.toLowerCase().trim();
  if (type === "image/jpeg" || type === "image/png" || type === "image/jpg") {
    return true;
  }
  const name = file.name.toLowerCase().trim();
  return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
}

/** JPG, PNG o PDF: documentos de identidad / diploma. */
export function isDiplomaDocumentFile(file: File): boolean {
  return isDiplomaImageFile(file) || isPdfFile(file);
}

export function isPdfDocumentSrc(src: string): boolean {
  const value = src.trim().toLowerCase();
  return value === PROFESSIONAL_PDF_DOC_MARKER || value.startsWith("data:application/pdf");
}

export function isImageDocumentSrc(src: string): boolean {
  const value = src.trim().toLowerCase();
  if (!value) {
    return false;
  }
  if (value.startsWith("data:image/")) {
    return true;
  }
  if (value.startsWith("data:")) {
    return false;
  }
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?|#|$)/i.test(value);
}

/** Abre un data URL sin meterlo en un `<a href>` (los PDF grandes cuelgan el navegador). */
export function openDocumentDataUrl(dataUrl: string): void {
  const trimmed = dataUrl.trim();
  if (!trimmed || trimmed === PROFESSIONAL_PDF_DOC_MARKER) {
    return;
  }
  const comma = trimmed.indexOf(",");
  if (comma < 0 || !trimmed.startsWith("data:")) {
    window.open(trimmed, "_blank", "noopener,noreferrer");
    return;
  }
  const header = trimmed.slice(0, comma);
  const payload = trimmed.slice(comma + 1);
  const mime = header.match(/^data:([^;,]+)/i)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function openDocumentFile(file: File): void {
  const blobUrl = URL.createObjectURL(file);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/**
 * Prepara el doc para el form: imagen comprimida en data URL, PDF solo como marcador.
 * El `File` del PDF debe guardarse aparte (ref) y convertirse al enviar el perfil.
 */
export async function documentFileForFormState(file: File): Promise<{
  preview: string;
  keepFileInMemory: boolean;
}> {
  if (file.size <= 0) {
    throw new Error("EMPTY_DOCUMENT");
  }
  if (file.size > PROFESSIONAL_DOCUMENT_MAX_BYTES) {
    throw new Error("DOCUMENT_TOO_LARGE");
  }
  // Detectar PDF antes que imagen: MIME vacío/raro + intentar decodificar como imagen falla.
  if (await fileLooksLikePdf(file)) {
    return { preview: PROFESSIONAL_PDF_DOC_MARKER, keepFileInMemory: true };
  }
  if (!isDiplomaImageFile(file)) {
    throw new Error("INVALID_DOCUMENT_TYPE");
  }
  try {
    const raw = await fileToDataUrl(file);
    return {
      preview: await compressImageDataUrl(raw, 1800, 0.85),
      keepFileInMemory: false
    };
  } catch {
    throw new Error("IMAGE_READ_FAILED");
  }
}

/**
 * Lee un diploma (foto o PDF) a data URL para persistirlo en el perfil.
 * Los PDF no pasan por canvas: se guardan tal cual.
 */
export async function documentFileToDataUrl(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new Error("EMPTY_DOCUMENT");
  }
  if (file.size > PROFESSIONAL_DOCUMENT_MAX_BYTES) {
    throw new Error("DOCUMENT_TOO_LARGE");
  }
  if (await fileLooksLikePdf(file)) {
    return fileToDataUrl(file);
  }
  if (!isDiplomaImageFile(file)) {
    throw new Error("INVALID_DOCUMENT_TYPE");
  }
  try {
    const raw = await fileToDataUrl(file);
    return compressImageDataUrl(raw, 1800, 0.85);
  } catch {
    throw new Error("IMAGE_READ_FAILED");
  }
}

export function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata"));
    };
  });
}

export async function readVideoFileForUpload(
  file: File,
  options?: { maxBytes?: number; maxDurationSec?: number }
): Promise<{ dataUrl: string; previewDataUrl: string; durationSec: number }> {
  const maxBytes = options?.maxBytes ?? 30 * 1024 * 1024;
  const maxDurationSec = options?.maxDurationSec ?? 120;

  if (!file.type.startsWith("video/")) {
    throw new Error("Invalid video file");
  }
  if (file.size > maxBytes) {
    throw new Error("Video file is too large");
  }

  const durationSec = await readVideoDurationSeconds(file);
  if (durationSec > maxDurationSec) {
    throw new Error("Video is too long");
  }

  const [dataUrl, previewDataUrl] = await Promise.all([fileToDataUrl(file), videoToPreviewDataUrl(file)]);
  return { dataUrl, previewDataUrl, durationSec };
}
