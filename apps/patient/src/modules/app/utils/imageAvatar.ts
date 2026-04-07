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

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image"));
    image.src = dataUrl;
  });
}

/** Avatar clínico vía JSON: limitar ancho y peso para proxies strict y PATCH razonable. */
const PATIENT_AVATAR_MAX_WIDTH = 768;
const PATIENT_AVATAR_JPEG_QUALITY = 0.72;

export async function compressPatientAvatarDataUrl(dataUrl: string): Promise<string> {
  return compressImageDataUrl(dataUrl, PATIENT_AVATAR_MAX_WIDTH, PATIENT_AVATAR_JPEG_QUALITY);
}

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
