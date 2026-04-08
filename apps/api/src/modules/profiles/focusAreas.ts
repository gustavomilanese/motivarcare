/** Normaliza áreas de atención desde JSON guardado o texto legado en `focusPrimary`. */
export function normalizeFocusAreas(focusAreasJson: unknown, focusPrimary: string | null): string[] {
  if (Array.isArray(focusAreasJson)) {
    const out = focusAreasJson
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    if (out.length > 0) {
      return out.slice(0, 12);
    }
  }
  const legacy = (focusPrimary ?? "").trim();
  if (legacy.length > 0) {
    return legacy
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

export function focusAreasDisplayLabel(areas: string[]): string | null {
  if (areas.length === 0) {
    return null;
  }
  const joined = areas.join(", ");
  return joined.length > 500 ? `${joined.slice(0, 497)}...` : joined;
}
