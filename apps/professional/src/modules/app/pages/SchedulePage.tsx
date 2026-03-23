import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { AvailabilitySlot, ProfessionalProfile } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_INDEX = {
  0: 6,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5
} as const;
const TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);
const SLOT_DURATION_MINUTES = 60;
const FORWARD_WEEKS = 8;
const MIN_BOOKING_NOTICE_HOURS = 24;
const MAX_VACATION_RANGE_DAYS = 120;
const VACATION_MARKER_HOUR = 6;
const VACATION_MARKER_DURATION_MINUTES = 30;

function formatWeekday(dayKey: number, language: AppLanguage) {
  const labels: Record<number, LocalizedText> = {
    1: { es: "LUN", en: "MON", pt: "SEG" },
    2: { es: "MAR", en: "TUE", pt: "TER" },
    3: { es: "MIE", en: "WED", pt: "QUA" },
    4: { es: "JUE", en: "THU", pt: "QUI" },
    5: { es: "VIE", en: "FRI", pt: "SEX" },
    6: { es: "SAB", en: "SAT", pt: "SAB" },
    0: { es: "DOM", en: "SUN", pt: "DOM" }
  };
  return t(language, labels[dayKey]);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getTemplateFromSlots(slots: AvailabilitySlot[]) {
  const initial = DAY_KEYS.map(() => new Set<string>());
  const now = Date.now();
  const maxFutureMs = now + 45 * 24 * 60 * 60 * 1000;

  for (const slot of slots) {
    if (slot.isBlocked) {
      continue;
    }

    const slotDate = new Date(slot.startsAt);
    const slotTime = slotDate.getTime();
    if (slotTime < now || slotTime > maxFutureMs) {
      continue;
    }

    const weekDay = slotDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const index = DAY_INDEX[weekDay];
    const hour = String(slotDate.getHours()).padStart(2, "0");
    const minute = String(slotDate.getMinutes()).padStart(2, "0");
    const label = `${hour}:${minute}`;

    if (TIME_OPTIONS.includes(label)) {
      initial[index].add(label);
    }
  }

  return initial;
}

function summarizeTemplate(template: Array<Set<string>>) {
  return template.reduce((total, daySet) => total + daySet.size, 0);
}

function buildForwardTemplateSlots(template: Array<Set<string>>) {
  const slotsPerWeek = summarizeTemplate(template);
  const weeks = slotsPerWeek > 0 ? FORWARD_WEEKS : 0;
  const result: Array<{ startsAt: string; endsAt: string; startMs: number }> = [];

  if (weeks === 0) {
    return { weeks, result };
  }

  const today = startOfDay(new Date());
  const endDate = addDays(today, weeks * 7);

  for (let cursor = new Date(today); cursor < endDate; cursor = addDays(cursor, 1)) {
    const weekDay = cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySlots = template[DAY_INDEX[weekDay]];

    if (!daySlots || daySlots.size === 0) {
      continue;
    }

    for (const timeLabel of Array.from(daySlots).sort()) {
      const [hours, minutes] = timeLabel.split(":").map(Number);
      const startsAt = new Date(cursor);
      startsAt.setHours(hours, minutes, 0, 0);

      if (startsAt.getTime() < Date.now()) {
        continue;
      }

      const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60000);
      result.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        startMs: startsAt.getTime()
      });
    }
  }

  return { weeks, result };
}

function cloneTemplate(template: Array<Set<string>>) {
  return template.map((daySet) => new Set(daySet));
}

function formatTimeWithAmPm(timeLabel: string) {
  const [rawHour, rawMinute] = timeLabel.split(":").map(Number);
  const hour = Number.isFinite(rawHour) ? rawHour : 0;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function toDayIndex(day: number) {
  return DAY_INDEX[day as 0 | 1 | 2 | 3 | 4 | 5 | 6];
}

function dateFromDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function dayKeyFromIso(value: string) {
  return value.slice(0, 10);
}

function isNextDay(previous: string, next: string) {
  const previousDate = dateFromDayKey(previous);
  const nextDate = dateFromDayKey(next);
  const expected = new Date(previousDate);
  expected.setDate(expected.getDate() + 1);
  return expected.getTime() === nextDate.getTime();
}

function formatVacationDayLabel(dayKeyValue: string, language: AppLanguage) {
  const date = dateFromDayKey(dayKeyValue);
  return formatDateWithLocale({
    value: date.toISOString(),
    language,
    options: {
      day: "numeric",
      month: "long"
    }
  });
}

type VacationRange = {
  id: string;
  startKey: string;
  endKey: string;
  dayCount: number;
  slotIds: string[];
};

function buildVacationRanges(slots: AvailabilitySlot[]): VacationRange[] {
  const dayToSlotIds = new Map<string, string[]>();
  for (const slot of slots) {
    const key = slot.startsAt.slice(0, 10);
    const current = dayToSlotIds.get(key) ?? [];
    current.push(slot.id);
    dayToSlotIds.set(key, current);
  }

  const orderedDayKeys = Array.from(dayToSlotIds.keys()).sort();
  const ranges: VacationRange[] = [];
  let index = 0;

  while (index < orderedDayKeys.length) {
    const startKey = orderedDayKeys[index];
    let endKey = startKey;
    const slotIds = [...(dayToSlotIds.get(startKey) ?? [])];
    let cursor = index;

    while (cursor + 1 < orderedDayKeys.length && isNextDay(orderedDayKeys[cursor], orderedDayKeys[cursor + 1])) {
      cursor += 1;
      endKey = orderedDayKeys[cursor];
      slotIds.push(...(dayToSlotIds.get(endKey) ?? []));
    }

    const startDate = dateFromDayKey(startKey);
    const endDate = dateFromDayKey(endKey);
    const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    ranges.push({
      id: `${startKey}_${endKey}`,
      startKey,
      endKey,
      dayCount,
      slotIds
    });

    index = cursor + 1;
  }

  return ranges;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function buildVacationMarkerSlots(startDate: Date, endDate: Date) {
  const ranges: Array<{ dayKey: string; startsAt: string; endsAt: string }> = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const startsAt = new Date(cursor);
    startsAt.setHours(VACATION_MARKER_HOUR, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + VACATION_MARKER_DURATION_MINUTES * 60000);
    ranges.push({
      dayKey: dayKey(cursor),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    });
  }
  return ranges;
}

function buildTemplateSlotsForDateRange(template: Array<Set<string>>, startDate: Date, endDate: Date) {
  const result: Array<{ startsAt: string; endsAt: string; startMs: number }> = [];
  const todayStart = startOfDay(new Date()).getTime();

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (startOfDay(cursor).getTime() < todayStart) {
      continue;
    }

    const weekDay = cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const daySlots = template[DAY_INDEX[weekDay]];
    if (!daySlots || daySlots.size === 0) {
      continue;
    }

    for (const timeLabel of Array.from(daySlots).sort()) {
      const [hours, minutes] = timeLabel.split(":").map(Number);
      const startsAt = new Date(cursor);
      startsAt.setHours(hours, minutes, 0, 0);
      if (startsAt.getTime() < Date.now()) {
        continue;
      }

      const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60000);
      result.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        startMs: startsAt.getTime()
      });
    }
  }

  return result;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return /too many requests|rate limit/i.test(error.message);
}

async function apiRequestWithRetry<T>(
  path: string,
  token: string,
  options?: Parameters<typeof apiRequest<T>>[2],
  retries = 4
) {
  let attempt = 0;
  while (true) {
    try {
      return await apiRequest<T>(path, token, options);
    } catch (requestError) {
      if (attempt >= retries || !isRateLimitError(requestError)) {
        throw requestError;
      }
      await wait(400 * 2 ** attempt);
      attempt += 1;
    }
  }
}

function ScheduleMenuIcon(props: { kind: "work" | "published" | "settings" | "vacation" | "notice" | "workload" }) {
  if (props.kind === "work") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 3.5V7.5M16.5 3.5V7.5M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 13H10M12 13H14M16 13H16.01M8 16.5H10M12 16.5H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (props.kind === "published") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 2.5V6.5M16.5 2.5V6.5M3.5 8.5H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 13.5H16M8 16.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (props.kind === "notice") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.5V12L15.3 13.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (props.kind === "vacation") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 17.5H19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 17.5V10.5C8 8.29086 9.79086 6.5 12 6.5C14.2091 6.5 16 8.29086 16 10.5V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 3.5V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 9.8C7 9.2 8.3 9 9.3 9.3M18 9.8C17 9.2 15.7 9 14.7 9.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (props.kind === "settings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 7.5H14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4.5 16.5H10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="13" cy="16.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16.5 20.5V18.8C16.5 17.1431 15.1569 15.8 13.5 15.8H7C5.34315 15.8 4 17.1431 4 18.8V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10.3" cy="9.1" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17.8 9.8C19.2334 10.2729 20.2 11.6131 20.2 13.1V14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.7 6.3C17.6027 6.3 18.3344 7.03177 18.3344 7.9345C18.3344 8.83724 17.6027 9.569 16.7 9.569" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SchedulePage(props: { token: string; language: AppLanguage }) {
  const [view, setView] = useState<"home" | "workHours" | "settings" | "vacations" | "bookingNotice">("home");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVacations, setSavingVacations] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [professionalId, setProfessionalId] = useState("");
  const [bookingNoticeHours, setBookingNoticeHours] = useState(MIN_BOOKING_NOTICE_HOURS);
  const [vacationStartDate, setVacationStartDate] = useState(() => formatDateInput(new Date()));
  const [vacationEndDate, setVacationEndDate] = useState(() => formatDateInput(new Date()));
  const [editingVacationRangeId, setEditingVacationRangeId] = useState<string | null>(null);
  const [removingVacationRangeId, setRemovingVacationRangeId] = useState<string | null>(null);
  const [weekTemplate, setWeekTemplate] = useState<Array<Set<string>>>(() => DAY_KEYS.map(() => new Set<string>()));

  const selectedDayIndex = useMemo(() => toDayIndex(selectedDay), [selectedDay]);
  const openSlotsPerWeek = useMemo(() => summarizeTemplate(weekTemplate), [weekTemplate]);
  const { weeks: forwardWeeks, result: plannedSlots } = useMemo(() => buildForwardTemplateSlots(weekTemplate), [weekTemplate]);
  const existingStarts = useMemo(() => new Set(slots.map((slot) => new Date(slot.startsAt).getTime())), [slots]);
  const vacationDayKeys = useMemo(
    () => new Set(slots.filter((slot) => slot.isBlocked && slot.source === "vacation").map((slot) => slot.startsAt.slice(0, 10))),
    [slots]
  );
  const slotsToCreate = useMemo(
    () =>
      plannedSlots.filter(
        (item) => !existingStarts.has(item.startMs) && !vacationDayKeys.has(item.startsAt.slice(0, 10))
      ),
    [plannedSlots, existingStarts, vacationDayKeys]
  );
  const vacationSlots = useMemo(
    () => slots.filter((slot) => slot.isBlocked && slot.source === "vacation" && new Date(slot.endsAt).getTime() >= Date.now()),
    [slots]
  );
  const vacationRanges = useMemo(() => buildVacationRanges(vacationSlots), [vacationSlots]);
  const vacationDaysCount = useMemo(() => new Set(vacationSlots.map((slot) => slot.startsAt.slice(0, 10))).size, [vacationSlots]);
  const editingVacationRange = useMemo(
    () => vacationRanges.find((range) => range.id === editingVacationRangeId) ?? null,
    [editingVacationRangeId, vacationRanges]
  );
  const shouldShowVacationEditor = Boolean(editingVacationRange) || vacationRanges.length === 0;

  const load = async (showError = true) => {
    setLoading(true);
    try {
      const [slotsResponse, profileResponse] = await Promise.all([
        apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token),
        apiRequest<{ role: string; profile: ProfessionalProfile | null }>("/api/profiles/me", props.token)
      ]);
      setSlots(slotsResponse.slots);
      setWeekTemplate((current) => {
        const next = getTemplateFromSlots(slotsResponse.slots);
        const hasAny = summarizeTemplate(next) > 0;
        if (!hasAny && summarizeTemplate(current) > 0) {
          return current;
        }
        return hasAny ? next : current;
      });
      if (profileResponse.profile?.id) {
        setProfessionalId(profileResponse.profile.id);
      }
      setBookingNoticeHours(Math.max(MIN_BOOKING_NOTICE_HOURS, Number(profileResponse.profile?.cancellationHours ?? MIN_BOOKING_NOTICE_HOURS)));
      setError("");
    } catch (requestError) {
      if (showError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudieron cargar los horarios.",
                en: "Could not load schedule slots.",
                pt: "Nao foi possivel carregar os horarios."
              })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  useEffect(() => {
    const resetToHome = () => {
      setView("home");
      setError("");
      setMessage("");
    };

    window.addEventListener("professional:schedule-reset", resetToHome);
    return () => window.removeEventListener("professional:schedule-reset", resetToHome);
  }, []);

  const toggleHour = (timeLabel: string) => {
    setWeekTemplate((current) => {
      const next = cloneTemplate(current);
      if (next[selectedDayIndex].has(timeLabel)) {
        next[selectedDayIndex].delete(timeLabel);
      } else {
        next[selectedDayIndex].add(timeLabel);
      }
      return next;
    });
  };

  const toggleDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleSaveBookingNotice = async () => {
    if (!professionalId) {
      setError(
        t(props.language, {
          es: "No se encontró el perfil profesional.",
          en: "Professional profile was not found.",
          pt: "Perfil profissional nao encontrado."
        })
      );
      return;
    }

    const normalizedValue = Math.max(MIN_BOOKING_NOTICE_HOURS, Math.min(168, Math.round(Number(bookingNoticeHours || MIN_BOOKING_NOTICE_HOURS))));

    setSavingNotice(true);
    setError("");
    setMessage("");

    try {
      await apiRequest<{ message: string }>(`/api/profiles/professional/${professionalId}/public-profile`, props.token, {
        method: "PATCH",
        body: JSON.stringify({
          cancellationHours: normalizedValue
        })
      });

      setBookingNoticeHours(normalizedValue);
      setMessage(
        replaceTemplate(
          t(props.language, {
            es: "Tiempo mínimo para agendar actualizado: {hours} horas.",
            en: "Minimum booking notice updated: {hours} hours.",
            pt: "Tempo minimo para agendar atualizado: {hours} horas."
          }),
          { hours: String(normalizedValue) }
        )
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar el tiempo mínimo.",
              en: "Could not save minimum notice.",
              pt: "Nao foi possivel salvar o tempo minimo."
            })
      );
    } finally {
      setSavingNotice(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (openSlotsPerWeek === 0) {
      setError(
        t(props.language, {
          es: "Selecciona al menos un horario semanal.",
          en: "Select at least one weekly time.",
          pt: "Selecione ao menos um horario semanal."
        })
      );
      return;
    }

    if (slotsToCreate.length === 0) {
      setMessage(
        t(props.language, {
          es: "Tu horario semanal ya estaba aplicado para las proximas semanas.",
          en: "Your weekly schedule was already applied for upcoming weeks.",
          pt: "Seu horario semanal ja estava aplicado para as proximas semanas."
        })
      );
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const chunkSize = 10;
      for (let index = 0; index < slotsToCreate.length; index += chunkSize) {
        const chunk = slotsToCreate.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map((slot) =>
            apiRequest<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
              method: "POST",
              body: JSON.stringify({
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                source: "weekly-template"
              })
            })
          )
        );
      }

      setMessage(
        replaceTemplate(
          t(props.language, {
            es: "Horario semanal guardado: {count} horarios nuevos para las proximas {weeks} semanas.",
            en: "Weekly schedule saved: {count} new slots for the next {weeks} weeks.",
            pt: "Horario semanal salvo: {count} novos horarios para as proximas {weeks} semanas."
          }),
          { count: String(slotsToCreate.length), weeks: String(forwardWeeks) }
        )
      );
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar el horario semanal.",
              en: "Could not save weekly schedule.",
              pt: "Nao foi possivel salvar o horario semanal."
            })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVacations = async () => {
    const start = parseDateInput(vacationStartDate);
    const end = parseDateInput(vacationEndDate);

    if (!start || !end) {
      setError(
        t(props.language, {
          es: "Selecciona un rango de fechas valido.",
          en: "Select a valid date range.",
          pt: "Selecione um intervalo de datas valido."
        })
      );
      return;
    }

    if (start > end) {
      setError(
        t(props.language, {
          es: "La fecha de inicio no puede ser mayor que la fecha de fin.",
          en: "Start date cannot be after end date.",
          pt: "A data de inicio nao pode ser maior que a data final."
        })
      );
      return;
    }

    const selectedDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (selectedDays > MAX_VACATION_RANGE_DAYS) {
      setError(
        replaceTemplate(
          t(props.language, {
            es: "El rango maximo por guardado es de {days} dias.",
            en: "Maximum range per save is {days} days.",
            pt: "O intervalo maximo por salvamento e de {days} dias."
          }),
          { days: String(MAX_VACATION_RANGE_DAYS) }
        )
      );
      return;
    }

    const todayStartMs = startOfDay(new Date()).getTime();
    const requestedRanges = buildVacationMarkerSlots(start, end).filter((range) => dateFromDayKey(range.dayKey).getTime() >= todayStartMs);
    if (requestedRanges.length === 0) {
      setError(
        t(props.language, {
          es: "No hay horarios futuros para bloquear en ese rango.",
          en: "There are no future slots to block in that range.",
          pt: "Nao ha horarios futuros para bloquear nesse intervalo."
        })
      );
      return;
    }

    setSavingVacations(true);
    setError("");
    setMessage("");

    const editSlotIds = new Set((editingVacationRange?.slotIds ?? []));
    const scopedSlots = slots.filter((slot) => !editSlotIds.has(slot.id));
    const existingByDay = new Map<string, AvailabilitySlot[]>();
    for (const slot of scopedSlots) {
      const key = dayKeyFromIso(slot.startsAt);
      const current = existingByDay.get(key) ?? [];
      current.push(slot);
      existingByDay.set(key, current);
    }
    let blockedCount = 0;
    let alreadyVacationCount = 0;
    let failedCount = 0;

    try {
      if (editingVacationRange && editingVacationRange.slotIds.length > 0) {
        for (const slotId of editingVacationRange.slotIds) {
          try {
            await apiRequestWithRetry<{ message: string }>(`/api/availability/slots/${slotId}`, props.token, {
              method: "DELETE"
            });
          } catch {
            failedCount += 1;
          }
          await wait(40);
        }
      }

      for (const range of requestedRanges) {
        const daySlots = [...(existingByDay.get(range.dayKey) ?? [])];

        if (daySlots.some((slot) => slot.isBlocked && slot.source === "vacation")) {
          alreadyVacationCount += 1;
          continue;
        }

        try {
          await apiRequestWithRetry<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
            method: "POST",
            body: JSON.stringify({
              startsAt: range.startsAt,
              endsAt: range.endsAt,
              isBlocked: true,
              source: "vacation"
            })
          });
          blockedCount += 1;
          daySlots.push({
            id: `local-vacation-${range.dayKey}`,
            startsAt: range.startsAt,
            endsAt: range.endsAt,
            isBlocked: true,
            source: "vacation"
          });
        } catch {
          failedCount += 1;
        }

        existingByDay.set(range.dayKey, daySlots);
        await wait(40);
      }

      if (blockedCount > 0) {
        setMessage(
          replaceTemplate(
            t(props.language, {
              es: "Vacaciones guardadas: {count} dias bloqueados.",
              en: "Vacation saved: {count} days blocked.",
              pt: "Ferias salvas: {count} dias bloqueados."
            }),
            { count: String(blockedCount) }
          )
        );
      } else {
        setMessage(
          t(props.language, {
            es: "No hubo cambios nuevos para guardar en vacaciones.",
            en: "No new vacation changes to save.",
            pt: "Nao houve novas alteracoes para salvar em ferias."
          })
        );
      }

      if (failedCount > 0 || alreadyVacationCount > 0) {
        const notes: string[] = [];
        if (alreadyVacationCount > 0) {
          notes.push(
            replaceTemplate(
              t(props.language, {
                es: "{count} dias ya estaban en vacaciones",
                en: "{count} days were already on vacation",
                pt: "{count} dias ja estavam em ferias"
              }),
              { count: String(alreadyVacationCount) }
            )
          );
        }
        if (failedCount > 0) {
          notes.push(
            replaceTemplate(
              t(props.language, {
                es: "{count} operaciones no se pudieron completar (reservados, conflicto o limite)",
                en: "{count} operations could not be completed (booked, conflict or rate limit)",
                pt: "{count} operacoes nao puderam ser concluidas (reservados, conflito ou limite)"
              }),
              { count: String(failedCount) }
            )
          );
        }
        setMessage((current) => [current, notes.join(" · ")].filter(Boolean).join(" "));
      }

      setEditingVacationRangeId(null);
      await load(false);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudieron guardar las vacaciones.",
              en: "Could not save vacation settings.",
              pt: "Nao foi possivel salvar as ferias."
            })
      );
    } finally {
      setSavingVacations(false);
    }
  };

  const handleEditVacationRange = (range: VacationRange) => {
    setEditingVacationRangeId(range.id);
    setVacationStartDate(range.startKey);
    setVacationEndDate(range.endKey);
    setError("");
    setMessage("");
  };

  const handleCancelVacationEdit = () => {
    setEditingVacationRangeId(null);
    const today = formatDateInput(new Date());
    setVacationStartDate(today);
    setVacationEndDate(today);
  };

  const handleRemoveVacationRange = async (range: VacationRange) => {
    if (range.slotIds.length === 0) {
      return;
    }

    setRemovingVacationRangeId(range.id);
    setSavingVacations(true);
    setError("");
    setMessage("");

    let removedCount = 0;
    let failedCount = 0;
    let restoredCount = 0;
    let failedRestoreCount = 0;

    try {
      const chunkSize = 10;
      for (let index = 0; index < range.slotIds.length; index += chunkSize) {
        const chunk = range.slotIds.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map(async (slotId) => {
            try {
              await apiRequestWithRetry<{ message: string }>(`/api/availability/slots/${slotId}`, props.token, {
                method: "DELETE"
              });
              removedCount += 1;
            } catch {
              failedCount += 1;
            }
          })
        );
      }

      const restoreCandidates = buildTemplateSlotsForDateRange(
        weekTemplate,
        dateFromDayKey(range.startKey),
        dateFromDayKey(range.endKey)
      );
      const existingStartMs = new Set(
        slots
          .filter((slot) => !range.slotIds.includes(slot.id))
          .map((slot) => new Date(slot.startsAt).getTime())
      );
      const slotsToRestore = restoreCandidates.filter((candidate) => !existingStartMs.has(candidate.startMs));

      for (const slot of slotsToRestore) {
        try {
          await apiRequestWithRetry<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
            method: "POST",
            body: JSON.stringify({
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              source: "weekly-template"
            })
          });
          restoredCount += 1;
          existingStartMs.add(slot.startMs);
        } catch {
          failedRestoreCount += 1;
        }
        await wait(20);
      }

      if (editingVacationRangeId === range.id) {
        handleCancelVacationEdit();
      }

      if (removedCount > 0) {
        setMessage(
          replaceTemplate(
            t(props.language, {
              es: "Vacaciones anuladas: {count} horarios desbloqueados.",
              en: "Vacation canceled: {count} slots unblocked.",
              pt: "Ferias anuladas: {count} horarios desbloqueados."
            }),
            { count: String(removedCount) }
          )
        );
      }

      if (restoredCount > 0) {
        setMessage((current) =>
          [
            current,
            replaceTemplate(
              t(props.language, {
                es: "Se restauraron {count} horarios segun tu semana de trabajo.",
                en: "{count} slots were restored based on your weekly schedule.",
                pt: "{count} horarios foram restaurados com base na sua semana de trabalho."
              }),
              { count: String(restoredCount) }
            )
          ].filter(Boolean).join(" ")
        );
      }

      if (failedCount > 0 || failedRestoreCount > 0) {
        setMessage((current) =>
          [
            current,
            failedCount > 0
              ? replaceTemplate(
                  t(props.language, {
                    es: "{count} horarios no se pudieron desbloquear.",
                    en: "{count} slots could not be unblocked.",
                    pt: "{count} horarios nao puderam ser desbloqueados."
                  }),
                  { count: String(failedCount) }
                )
              : "",
            failedRestoreCount > 0
              ? replaceTemplate(
                  t(props.language, {
                    es: "{count} horarios no se pudieron restaurar (conflicto o reserva).",
                    en: "{count} slots could not be restored (conflict or booking).",
                    pt: "{count} horarios nao puderam ser restaurados (conflito ou reserva)."
                  }),
                  { count: String(failedRestoreCount) }
                )
              : ""
          ]
            .filter(Boolean)
            .join(" ")
        );
      }

      await load(false);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudieron anular las vacaciones.",
              en: "Could not cancel vacation.",
              pt: "Nao foi possivel anular as ferias."
            })
      );
    } finally {
      setRemovingVacationRangeId(null);
      setSavingVacations(false);
    }
  };

  if (view === "home") {
    return (
      <div className="pro-grid-stack">
        <section className="pro-card schedule-home-card">
          <h2>{t(props.language, { es: "Configuracion de horario", en: "Schedule settings", pt: "Configuracao de horario" })}</h2>

          {error ? <p className="pro-error">{error}</p> : null}
          {message ? <p className="pro-success">{message}</p> : null}

          <div className="schedule-home-list">
            <button type="button" className="schedule-home-item" onClick={() => setView("workHours")}>
              <span className="schedule-home-icon work">
                <ScheduleMenuIcon kind="work" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Configurar horarios de trabajo", en: "Configure work schedule", pt: "Configurar horario de trabalho" })}</strong>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "{hours} horarios por semana",
                      en: "{hours} weekly slots",
                      pt: "{hours} horarios por semana"
                    }),
                    { hours: String(openSlotsPerWeek) }
                  )}
                </span>
              </div>
              <em aria-hidden="true">›</em>
            </button>

            <NavLink className="schedule-home-item" to="/disponibilidad">
              <span className="schedule-home-icon published">
                <ScheduleMenuIcon kind="published" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Disponibilidad publicada", en: "Published availability", pt: "Disponibilidade publicada" })}</strong>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "{count} horarios activos",
                      en: "{count} active slots",
                      pt: "{count} horarios ativos"
                    }),
                    { count: String(slots.length) }
                  )}
                </span>
              </div>
              <em aria-hidden="true">›</em>
            </NavLink>

            <button type="button" className="schedule-home-item" onClick={() => setView("settings")}>
              <span className="schedule-home-icon settings">
                <ScheduleMenuIcon kind="settings" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Ajustes", en: "Settings", pt: "Ajustes" })}</strong>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "Tiempo minimo: {hours}h, vacaciones y carga de trabajo",
                      en: "Minimum notice: {hours}h, vacation and workload",
                      pt: "Tempo minimo: {hours}h, ferias e carga de trabalho"
                    }),
                    { hours: String(bookingNoticeHours) }
                  )}
                </span>
              </div>
              <em aria-hidden="true">›</em>
            </button>
          </div>

          {loading ? <p className="pro-muted">{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
        </section>
      </div>
    );
  }

  if (view === "bookingNotice") {
    return (
      <div className="pro-grid-stack">
        <section className="pro-card schedule-work-card">
          <header className="schedule-work-head">
            <button type="button" className="schedule-back" onClick={() => setView("settings")} aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}>
              ‹
            </button>
            <div>
              <h2>{t(props.language, { es: "Tiempo mínimo para agendar", en: "Minimum booking notice", pt: "Tempo minimo para agendar" })}</h2>
            </div>
          </header>

          <div className="schedule-notice-copy">
            <p className="pro-muted">
              {t(props.language, {
                es: "Define con cuántas horas de anticipación se puede reservar una sesión. El mínimo permitido es 24 horas.",
                en: "Set how many hours in advance a session can be booked. Minimum allowed is 24 hours.",
                pt: "Defina com quantas horas de antecedencia uma sessao pode ser agendada. O minimo permitido e 24 horas."
              })}
            </p>
          </div>

          <label className="schedule-notice-field">
            {t(props.language, { es: "Horas mínimas", en: "Minimum hours", pt: "Horas minimas" })}
            <input
              type="number"
              min={MIN_BOOKING_NOTICE_HOURS}
              max={168}
              step={1}
              value={bookingNoticeHours}
              onChange={(event) => setBookingNoticeHours(Number(event.target.value || MIN_BOOKING_NOTICE_HOURS))}
            />
          </label>

          <button
            type="button"
            className="pro-primary schedule-save schedule-notice-save"
            disabled={loading || savingNotice}
            onClick={() => void handleSaveBookingNotice()}
          >
            {savingNotice
              ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
              : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
          </button>

          {error ? <p className="pro-error">{error}</p> : null}
          {message ? <p className="pro-success">{message}</p> : null}
        </section>
      </div>
    );
  }

  if (view === "vacations") {
    return (
      <div className="pro-grid-stack">
        <section className="pro-card schedule-work-card">
          <header className="schedule-work-head">
            <button type="button" className="schedule-back" onClick={() => setView("settings")} aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}>
              ‹
            </button>
            <div>
              <h2>{t(props.language, { es: "Vacaciones", en: "Vacation", pt: "Ferias" })}</h2>
            </div>
          </header>

          {vacationRanges.length > 0 ? (
            <section className="schedule-vacation-list">
              <ul className="schedule-vacation-ranges">
                {vacationRanges.map((range) => {
                  const label =
                    range.startKey === range.endKey
                      ? formatVacationDayLabel(range.startKey, props.language)
                      : `${formatVacationDayLabel(range.startKey, props.language)} - ${formatVacationDayLabel(range.endKey, props.language)}`;
                  const isEditing = editingVacationRangeId === range.id;
                  const isRemoving = removingVacationRangeId === range.id;

                  return (
                    <li key={range.id} className={isEditing ? "editing" : ""}>
                      <div className="schedule-vacation-range-copy">
                        <strong>{label}</strong>
                        <span>
                          {replaceTemplate(
                            t(props.language, {
                              es: "{days} dias bloqueados",
                              en: "{days} blocked days",
                              pt: "{days} dias bloqueados"
                            }),
                            { days: String(range.dayCount) }
                          )}
                        </span>
                      </div>
                      <div className="schedule-vacation-range-actions">
                        <button type="button" disabled={savingVacations} onClick={() => handleEditVacationRange(range)}>
                          {t(props.language, { es: "Editar", en: "Edit", pt: "Editar" })}
                        </button>
                        <button type="button" disabled={savingVacations} onClick={() => void handleRemoveVacationRange(range)}>
                          {isRemoving
                            ? t(props.language, { es: "Anulando...", en: "Canceling...", pt: "Anulando..." })
                            : t(props.language, { es: "Anular", en: "Cancel", pt: "Anular" })}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {shouldShowVacationEditor ? (
            <>
              <div className="schedule-vacation-grid">
                <label className="schedule-notice-field">
                  {t(props.language, { es: "Desde", en: "From", pt: "De" })}
                  <input type="date" value={vacationStartDate} onChange={(event) => setVacationStartDate(event.target.value)} />
                </label>
                <label className="schedule-notice-field">
                  {t(props.language, { es: "Hasta", en: "To", pt: "Ate" })}
                  <input type="date" value={vacationEndDate} onChange={(event) => setVacationEndDate(event.target.value)} />
                </label>
              </div>

              {editingVacationRange ? (
                <div className="schedule-vacation-edit-actions">
                  <button type="button" className="pro-secondary schedule-save" disabled={savingVacations} onClick={handleCancelVacationEdit}>
                    {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                  </button>
                  <button type="button" className="pro-primary schedule-save" disabled={loading || savingVacations} onClick={() => void handleSaveVacations()}>
                    {savingVacations
                      ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                      : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
                  </button>
                </div>
              ) : (
                <button type="button" className="pro-primary schedule-save" disabled={loading || savingVacations} onClick={() => void handleSaveVacations()}>
                  {savingVacations
                    ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                    : t(props.language, { es: "Guardar vacaciones", en: "Save vacation", pt: "Salvar ferias" })}
                </button>
              )}
            </>
          ) : null}

          {error ? <p className="pro-error">{error}</p> : null}
          {message ? <p className="pro-success">{message}</p> : null}
        </section>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="pro-grid-stack">
        <section className="pro-card schedule-home-card">
          <header className="schedule-work-head">
            <button type="button" className="schedule-back" onClick={() => setView("home")} aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}>
              ‹
            </button>
            <div>
              <h2>{t(props.language, { es: "Ajustes", en: "Settings", pt: "Ajustes" })}</h2>
            </div>
          </header>

          <div className="schedule-home-list">
            <button type="button" className="schedule-home-item" onClick={() => setView("bookingNotice")}>
              <span className="schedule-home-icon notice">
                <ScheduleMenuIcon kind="notice" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Tiempo minimo", en: "Minimum notice", pt: "Tempo minimo" })}</strong>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "{hours} horas antes de la sesión",
                      en: "{hours} hours before session",
                      pt: "{hours} horas antes da sessao"
                    }),
                    { hours: String(bookingNoticeHours) }
                  )}
                </span>
              </div>
              <em aria-hidden="true">›</em>
            </button>

            <button type="button" className="schedule-home-item" onClick={() => setView("vacations")}>
              <span className="schedule-home-icon vacation">
                <ScheduleMenuIcon kind="vacation" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Vacaciones", en: "Vacation", pt: "Ferias" })}</strong>
                <span>
                  {replaceTemplate(
                    t(props.language, {
                      es: "{days} dias con bloqueo por vacaciones",
                      en: "{days} days blocked for vacation",
                      pt: "{days} dias bloqueados por ferias"
                    }),
                    { days: String(vacationDaysCount) }
                  )}
                </span>
              </div>
              <em aria-hidden="true">›</em>
            </button>

            <article className="schedule-home-item muted" aria-disabled="true">
              <span className="schedule-home-icon workload">
                <ScheduleMenuIcon kind="workload" />
              </span>
              <div className="schedule-home-copy">
                <strong>{t(props.language, { es: "Carga de trabajo", en: "Workload", pt: "Carga de trabalho" })}</strong>
                <span>{t(props.language, { es: "Max. clientes simultaneos", en: "Max concurrent clients", pt: "Max. clientes simultaneos" })}</span>
              </div>
            </article>
          </div>

          {error ? <p className="pro-error">{error}</p> : null}
          {message ? <p className="pro-success">{message}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="pro-grid-stack">
      <section className="pro-card schedule-work-card">
        <header className="schedule-work-head">
          <button type="button" className="schedule-back" onClick={() => setView("home")} aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}>
            ‹
          </button>
          <div>
            <h2>{t(props.language, { es: "Horario de trabajo", en: "Work schedule", pt: "Horario de trabalho" })}</h2>
          </div>
        </header>

        <div className="schedule-work-days" aria-label={t(props.language, { es: "Dias de la semana", en: "Week days", pt: "Dias da semana" })}>
          {DAY_KEYS.map((day) => {
            const isActive = selectedDay === day;
            return (
              <button
                type="button"
                key={day}
                aria-pressed={isActive}
                className={isActive ? "active" : ""}
                onClick={() => toggleDay(day)}
              >
                {formatWeekday(day, props.language)}
              </button>
            );
          })}
        </div>

        <div className="schedule-work-grid">
          {TIME_OPTIONS.map((timeLabel) => {
            const selected = weekTemplate[selectedDayIndex].has(timeLabel);
            return (
              <button
                type="button"
                key={timeLabel}
                className={selected ? "active" : ""}
                onClick={() => toggleHour(timeLabel)}
                aria-pressed={selected}
              >
                {formatTimeWithAmPm(timeLabel)}
              </button>
            );
          })}
        </div>

        <footer className="schedule-work-footer">
          <p className="pro-muted">
            {replaceTemplate(
              t(props.language, {
                es: "Se aplicara recurrente hacia adelante durante {weeks} semanas y sin duplicar horarios ya publicados.",
                en: "It will be applied forward for {weeks} weeks without duplicating already published slots.",
                pt: "Sera aplicado para frente por {weeks} semanas sem duplicar horarios ja publicados."
              }),
              { weeks: String(forwardWeeks) }
            )}
          </p>
          <button type="button" className="pro-primary schedule-save" disabled={saving || loading} onClick={() => void handleSaveTemplate()}>
            {saving
              ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
              : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
          </button>
        </footer>

        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}
      </section>
    </div>
  );
}

export function getDayKey(value: Date) {
  return dayKey(value);
}

export function getTimeOptions() {
  return TIME_OPTIONS;
}
