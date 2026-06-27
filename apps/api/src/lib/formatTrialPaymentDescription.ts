import type { Market } from "@prisma/client";

export function formatTrialPaymentDescription(params: {
  professionalName: string;
  startsAt: string;
  patientTimezone?: string | null;
  patientMarket?: Market | null;
}): string {
  const timezone = params.patientTimezone?.trim() || "America/Argentina/Buenos_Aires";
  const when = new Date(params.startsAt);
  const market = params.patientMarket ?? "AR";
  const use24HourClock = market === "AR";

  const dateParts = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: timezone
  }).formatToParts(when);

  const weekday = (dateParts.find((part) => part.type === "weekday")?.value ?? "")
    .replace(/\./g, "")
    .trim()
    .toLowerCase();
  const day = dateParts.find((part) => part.type === "day")?.value ?? "";
  const month = dateParts.find((part) => part.type === "month")?.value ?? "";
  const datePart = `${weekday} - ${day}-${month}`;

  const timeLocale = use24HourClock ? "es-AR" : "en-US";
  const timePart = when
    .toLocaleTimeString(timeLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24HourClock,
      timeZone: timezone
    })
    .replace(/\s/g, " ")
    .trim();

  const shortPro =
    params.professionalName.length > 28
      ? `${params.professionalName.slice(0, 26).trim()}…`
      : params.professionalName;

  return `Sesión de prueba · ${datePart} ${timePart} · ${shortPro}`.slice(0, 100);
}
