/**
 * Fuerza parámetros anti-autoplay donde el proveedor lo documenta en la URL.
 * YouTube / YouTube nocookie respetan `autoplay=0`.
 * Spotify no documenta bien un equivalente estable en query: el comportamiento suele depender
 * del embed y del navegador; además quitamos `autoplay` del atributo `allow` del iframe en la página.
 */
export function normalizeRelaxationEmbedSrc(embedSrc: string): string {
  try {
    const u = new URL(embedSrc);
    const host = u.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      u.searchParams.set("autoplay", "0");
      return u.toString();
    }
  } catch {
    return embedSrc;
  }
  return embedSrc;
}
