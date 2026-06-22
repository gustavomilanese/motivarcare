/** Suma días hábiles (lun–vie) a partir de una fecha UTC/local del servidor o ISO. */
export function addBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from.getTime());
  let remaining = Math.max(0, Math.floor(businessDays));
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

export function formatBusinessDayDeadline(fromIso: string, businessDays: number): Date {
  const parsed = new Date(fromIso);
  if (Number.isNaN(parsed.getTime())) {
    return addBusinessDays(new Date(), businessDays);
  }
  return addBusinessDays(parsed, businessDays);
}
