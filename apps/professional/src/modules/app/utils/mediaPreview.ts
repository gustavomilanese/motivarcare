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
