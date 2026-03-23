import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { AvailabilitySlot, ProfessionalBookingsResponse } from "../types";
import { AvailabilityMonthHeader } from "../components/availability/AvailabilityMonthHeader";
import { AvailabilityBulkSticky } from "../components/availability/AvailabilityBulkSticky";
import { AvailabilityRemoveModal } from "../components/availability/AvailabilityRemoveModal";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);
const SLOT_DURATION_MINUTES = 60;

function formatMonthLabel(value: Date, language: AppLanguage) {
  return formatDateWithLocale({
    value: value.toISOString(),
    language,
    options: {
      month: "long",
      year: "numeric"
    }
  });
}

function formatWeekday(value: Date, language: AppLanguage) {
  return formatDateWithLocale({
    value: value.toISOString(),
    language,
    options: {
      weekday: "long"
    }
  });
}

function formatDayWithMonth(value: Date, language: AppLanguage) {
  return formatDateWithLocale({
    value: value.toISOString(),
    language,
    options: {
      day: "numeric",
      month: "long"
    }
  });
}

function capitalizeFirst(value: string) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(value: string, language: AppLanguage) {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function normalizeDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

function timeLabelFromIso(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildMonthDays(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: Date[] = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    days.push(new Date(current));
  }

  return days;
}

type DaySlotRecord = AvailabilitySlot & {
  reservation: ProfessionalBookingsResponse["bookings"][number] | null;
};

function isSlotAvailable(slot: DaySlotRecord) {
  return !slot.reservation && !slot.isBlocked;
}

function isVacationSlot(slot: DaySlotRecord) {
  return !slot.reservation && slot.isBlocked && slot.source === "vacation";
}

function isVisibleSlot(slot: DaySlotRecord) {
  return isSlotAvailable(slot) || isVacationSlot(slot);
}

function isSlotRemovable(slot: DaySlotRecord) {
  return isSlotAvailable(slot);
}

export function AvailabilityMonthPage(props: { token: string; language: AppLanguage }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<ProfessionalBookingsResponse["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(() => new Set());
  const [removingSlotId, setRemovingSlotId] = useState<string | null>(null);
  const [removingBatch, setRemovingBatch] = useState(false);
  const [pendingRemovalSlots, setPendingRemovalSlots] = useState<DaySlotRecord[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(() => new Set());
  const [editingDayKey, setEditingDayKey] = useState<string | null>(null);
  const [editingSelection, setEditingSelection] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [slotsResponse, bookingsResponse] = await Promise.all([
        apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token),
        apiRequest<ProfessionalBookingsResponse>("/api/bookings/mine", props.token)
      ]);
      setSlots(slotsResponse.slots);
      setBookings(bookingsResponse.bookings ?? []);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudieron cargar los horarios.",
              en: "Could not load schedule slots.",
              pt: "Nao foi possivel carregar os horarios."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  useEffect(() => {
    if (!pendingRemovalSlots) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !removingSlotId && !removingBatch) {
        setPendingRemovalSlots(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingRemovalSlots, removingBatch, removingSlotId]);

  const daySlotsMap = useMemo(() => {
    const activeBookings = bookings.filter((booking) => booking.status === "confirmed" || booking.status === "requested");
    const map = new Map<string, DaySlotRecord[]>();

    for (const slot of slots) {
      const key = slot.startsAt.slice(0, 10);
      const reservation =
        activeBookings.find((booking) => rangesOverlap(slot.startsAt, slot.endsAt, booking.startsAt, booking.endsAt)) ?? null;
      const current = map.get(key) ?? [];
      current.push({ ...slot, reservation });
      current.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      map.set(key, current);
    }

    return map;
  }, [bookings, slots]);

  const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const vacationDayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, daySlots] of daySlotsMap.entries()) {
      if (daySlots.some((slot) => isVacationSlot(slot))) {
        keys.add(key);
      }
    }
    return keys;
  }, [daySlotsMap]);
  const configuredMonthDays = useMemo(
    () =>
      monthDays.filter((date) => {
        const daySlots = daySlotsMap.get(normalizeDateKey(date)) ?? [];
        return daySlots.some((slot) => isVisibleSlot(slot));
      }),
    [daySlotsMap, monthDays]
  );
  const configuredMonthSlotsCount = useMemo(
    () =>
      monthDays.reduce((total, date) => {
        const daySlots = daySlotsMap.get(normalizeDateKey(date)) ?? [];
        return total + daySlots.filter((slot) => isSlotAvailable(slot)).length;
      }, 0),
    [daySlotsMap, monthDays]
  );
  const monthHeaderLabel = useMemo(
    () => `${formatMonthLabel(monthDate, props.language)} (${configuredMonthSlotsCount})`,
    [monthDate, props.language, configuredMonthSlotsCount]
  );
  const visibleRemovableSlots = useMemo(() => {
    const result: DaySlotRecord[] = [];
    for (const date of configuredMonthDays) {
      const key = normalizeDateKey(date);
      if (vacationDayKeys.has(key)) {
        continue;
      }
      const daySlots = daySlotsMap.get(key) ?? [];
      for (const slot of daySlots) {
        if (isSlotRemovable(slot)) {
          result.push(slot);
        }
      }
    }
    return result;
  }, [configuredMonthDays, daySlotsMap, vacationDayKeys]);
  const visibleRemovableSlotIds = useMemo(() => new Set(visibleRemovableSlots.map((slot) => slot.id)), [visibleRemovableSlots]);
  const removableSlotById = useMemo(() => {
    const map = new Map<string, DaySlotRecord>();
    for (const daySlots of daySlotsMap.values()) {
      for (const slot of daySlots) {
        if (vacationDayKeys.has(slot.startsAt.slice(0, 10))) {
          continue;
        }
        if (isSlotRemovable(slot)) {
          map.set(slot.id, slot);
        }
      }
    }
    return map;
  }, [daySlotsMap, vacationDayKeys]);
  const selectedRemovableSlots = useMemo(() => {
    const selected: DaySlotRecord[] = [];
    for (const slotId of selectedSlotIds) {
      const slot = removableSlotById.get(slotId);
      if (slot) {
        selected.push(slot);
      }
    }
    return selected;
  }, [removableSlotById, selectedSlotIds]);
  const selectedVisibleSlots = useMemo(
    () => selectedRemovableSlots.filter((slot) => visibleRemovableSlotIds.has(slot.id)),
    [selectedRemovableSlots, visibleRemovableSlotIds]
  );
  const selectedVisibleCount = selectedVisibleSlots.length;
  const allVisibleSelected = visibleRemovableSlots.length > 0 && selectedVisibleCount === visibleRemovableSlots.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const isRemoving = Boolean(removingSlotId) || removingBatch;
  const pendingRemovalSingleLabel = useMemo(() => {
    if (!pendingRemovalSlots || pendingRemovalSlots.length !== 1) {
      return null;
    }

    return `${formatTime(pendingRemovalSlots[0].startsAt, props.language)} - ${formatTime(pendingRemovalSlots[0].endsAt, props.language)}`;
  }, [pendingRemovalSlots, props.language]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  useEffect(() => {
    setSelectedSlotIds((current) => {
      const next = new Set<string>();
      for (const slotId of current) {
        if (removableSlotById.has(slotId)) {
          next.add(slotId);
        }
      }
      return next;
    });
  }, [removableSlotById]);

  useEffect(() => {
    const visibleDayKeys = new Set(configuredMonthDays.map((date) => normalizeDateKey(date)));
    setExpandedDayKeys((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of current) {
        if (visibleDayKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [configuredMonthDays]);

  const startEditingDay = (key: string) => {
    const currentSlots = daySlotsMap.get(key) ?? [];
    const initial = new Set<string>();

    for (const slot of currentSlots) {
      const label = timeLabelFromIso(slot.startsAt);
      if (TIME_OPTIONS.includes(label)) {
        initial.add(label);
      }
    }

    setEditingDayKey(key);
    setEditingSelection(initial);
    setError("");
    setMessage("");
  };

  const toggleEditingTime = (label: string) => {
    setEditingSelection((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const saveDayEdition = async () => {
    if (!editingDayKey) {
      return;
    }

    const daySlots = daySlotsMap.get(editingDayKey) ?? [];
    const existingByLabel = new Map<string, DaySlotRecord>();

    for (const slot of daySlots) {
      existingByLabel.set(timeLabelFromIso(slot.startsAt), slot);
    }

    const selectedLabels = new Set(Array.from(editingSelection));
    const toCreate = Array.from(selectedLabels).filter((label) => !existingByLabel.has(label));
    const toDelete: DaySlotRecord[] = [];
    let protectedCount = 0;

    for (const slot of daySlots) {
      const label = timeLabelFromIso(slot.startsAt);
      if (selectedLabels.has(label)) {
        continue;
      }

      if (slot.reservation || slot.isBlocked) {
        protectedCount += 1;
        continue;
      }

      toDelete.push(slot);
    }

    if (toCreate.length === 0 && toDelete.length === 0) {
      setMessage(
        protectedCount > 0
          ? replaceTemplate(
              t(props.language, {
                es: "No hubo cambios guardables. {count} horarios reservados/bloqueados se conservaron.",
                en: "No savable changes. {count} booked/blocked slots were kept.",
                pt: "Nao houve alteracoes salvaveis. {count} horarios reservados/bloqueados foram mantidos."
              }),
              { count: String(protectedCount) }
            )
          : t(props.language, {
              es: "No hubo cambios para guardar.",
              en: "No changes to save.",
              pt: "Nao houve alteracoes para salvar."
            })
      );
      setError("");
      setEditingDayKey(null);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const [year, month, day] = editingDayKey.split("-").map(Number);
      const baseDate = new Date(year, month - 1, day, 0, 0, 0, 0);

      const createPayloads = toCreate.map((timeLabel) => {
        const [hours, minutes] = timeLabel.split(":").map(Number);
        const startsAt = new Date(baseDate);
        startsAt.setHours(hours, minutes, 0, 0);
        const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60000);

        return {
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          source: "manual-day-edit"
        };
      });

      const chunkSize = 10;
      for (let index = 0; index < createPayloads.length; index += chunkSize) {
        const chunk = createPayloads.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map((payload) =>
            apiRequest<{ slot: AvailabilitySlot }>("/api/availability/slots", props.token, {
              method: "POST",
              body: JSON.stringify(payload)
            })
          )
        );
      }

      for (let index = 0; index < toDelete.length; index += chunkSize) {
        const chunk = toDelete.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map((slot) =>
            apiRequest<{ message: string }>(`/api/availability/slots/${slot.id}`, props.token, {
              method: "DELETE"
            })
          )
        );
      }

      setMessage("");
      setEditingDayKey(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar la edicion del dia.",
              en: "Could not save day edition.",
              pt: "Nao foi possivel salvar a edicao do dia."
            })
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSlotSelection = (slot: DaySlotRecord) => {
    if (!isSlotRemovable(slot) || isRemoving) {
      return;
    }
    setSelectedSlotIds((current) => {
      const next = new Set(current);
      if (next.has(slot.id)) {
        next.delete(slot.id);
      } else {
        next.add(slot.id);
      }
      return next;
    });
  };

  const requestSlotRemoval = (slot: DaySlotRecord) => {
    if (!isSlotRemovable(slot) || isRemoving) {
      return;
    }
    setPendingRemovalSlots([slot]);
  };

  const requestBulkRemoval = () => {
    if (selectedVisibleSlots.length === 0 || isRemoving) {
      return;
    }
    setPendingRemovalSlots(selectedVisibleSlots);
  };

  const toggleAllVisibleSelection = () => {
    if (visibleRemovableSlots.length === 0 || isRemoving) {
      return;
    }

    setSelectedSlotIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const slot of visibleRemovableSlots) {
          next.delete(slot.id);
        }
      } else {
        for (const slot of visibleRemovableSlots) {
          next.add(slot.id);
        }
      }
      return next;
    });
  };

  const toggleDayCollapse = (dayKey: string) => {
    setExpandedDayKeys((current) => {
      const next = new Set(current);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const confirmSlotRemoval = async () => {
    if (!pendingRemovalSlots || pendingRemovalSlots.length === 0) {
      return;
    }

    const targets = pendingRemovalSlots;
    const isBatchRemoval = targets.length > 1;
    if (isBatchRemoval) {
      setRemovingBatch(true);
    } else {
      setRemovingSlotId(targets[0].id);
    }
    setError("");
    setMessage("");

    try {
      const chunkSize = 10;
      for (let index = 0; index < targets.length; index += chunkSize) {
        const chunk = targets.slice(index, index + chunkSize);
        await Promise.all(
          chunk.map((slot) =>
            apiRequest<{ message: string }>(`/api/availability/slots/${slot.id}`, props.token, {
              method: "DELETE"
            })
          )
        );
      }

      setPendingRemovalSlots(null);
      setSelectedSlotIds((current) => {
        const next = new Set(current);
        for (const slot of targets) {
          next.delete(slot.id);
        }
        return next;
      });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo quitar el horario.",
              en: "Could not remove slot.",
              pt: "Nao foi possivel remover o horario."
            })
      );
    } finally {
      setRemovingSlotId(null);
      setRemovingBatch(false);
    }
  };

  return (
    <div className="pro-grid-stack">
      <section className="pro-card availability-month-card">
        <AvailabilityMonthHeader
          language={props.language}
          monthLabel={monthHeaderLabel}
          showSelectAll={visibleRemovableSlots.length > 0}
          allVisibleSelected={allVisibleSelected}
          isRemoving={isRemoving}
          selectAllRef={selectAllRef}
          onToggleAllVisible={toggleAllVisibleSelection}
          onPreviousMonth={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          onNextMonth={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
        />

        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}

        {!loading ? (
          <div className="availability-month-list">
            {configuredMonthDays.map((date) => {
              const key = normalizeDateKey(date);
              const isToday = key === normalizeDateKey(new Date());
              const daySlots = (daySlotsMap.get(key) ?? []).filter((slot) => isVisibleSlot(slot));
              const vacationSlots = daySlots.filter((slot) => isVacationSlot(slot));
              const hasVacation = vacationSlots.length > 0;
              const availableSlots = hasVacation ? [] : daySlots.filter((slot) => isSlotAvailable(slot));
              const isVacationOnlyDay = hasVacation;
              const weekdayLabel = capitalizeFirst(formatWeekday(date, props.language));
              const dayWithMonthLabel = capitalizeFirst(formatDayWithMonth(date, props.language));
              const isCollapsed = !expandedDayKeys.has(key);

              return (
                <article key={key} className={`availability-month-day ${isToday ? "today" : ""}`}>
                  <div className="availability-month-content">
                    {isVacationOnlyDay ? (
                      <div className="availability-day-group-toggle static vacation">
                        <span className="availability-day-group-meta">
                          <span className="availability-day-group-label">{`${dayWithMonthLabel} - ${weekdayLabel}`}</span>
                        </span>
                        <span className="availability-day-group-right">
                          <span className="availability-day-group-badge unavailable">
                            {t(props.language, { es: "Vacaciones", en: "Vacation", pt: "Ferias" })}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="availability-day-group-toggle"
                        onClick={() => toggleDayCollapse(key)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="availability-day-group-meta">
                          <span className="availability-day-group-label">{`${dayWithMonthLabel} - ${weekdayLabel}`}</span>
                        </span>
                        <span className="availability-day-group-right">
                          <span className="availability-day-group-badge">{availableSlots.length}</span>
                          <span className="availability-day-group-caret" aria-hidden="true">
                            {isCollapsed ? "▸" : "▾"}
                          </span>
                        </span>
                      </button>
                    )}

                    {!isVacationOnlyDay && !isCollapsed ? (
                      <div className="availability-day-slot-list">
                        {availableSlots.map((slot) => {
                          const slotLabel = `${formatTime(slot.startsAt, props.language)} - ${formatTime(slot.endsAt, props.language)}`;
                          return (
                            <article key={slot.id} className={`availability-day-slot-row ${selectedSlotIds.has(slot.id) ? "selected" : ""}`}>
                              <div className="availability-day-slot-main">
                                <span className="availability-day-slot-time-inline">{slotLabel}</span>
                              </div>
                              <button
                                type="button"
                                className="availability-day-slot-remove"
                                disabled={isRemoving}
                                onClick={() => requestSlotRemoval(slot)}
                              >
                                {removingSlotId === slot.id
                                  ? t(props.language, { es: "Quitando...", en: "Removing...", pt: "Removendo..." })
                                  : t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                              </button>
                              <label className="availability-day-slot-check column">
                                <input
                                  type="checkbox"
                                  checked={selectedSlotIds.has(slot.id)}
                                  disabled={isRemoving}
                                  aria-label={t(props.language, {
                                    es: "Seleccionar horario",
                                    en: "Select slot",
                                    pt: "Selecionar horario"
                                  })}
                                  onChange={() => toggleSlotSelection(slot)}
                                />
                              </label>
                            </article>
                          );
                        })}
                      </div>
                    ) : null}

                    {editingDayKey === key ? (
                      <div className="availability-day-editor">
                        <div className="availability-day-editor-grid">
                          {TIME_OPTIONS.map((label) => {
                            const selected = editingSelection.has(label);
                            return (
                              <button
                                key={`${key}-${label}`}
                                type="button"
                                className={selected ? "active" : ""}
                                onClick={() => toggleEditingTime(label)}
                                aria-pressed={selected}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="availability-day-editor-actions">
                          <button type="button" onClick={() => setEditingDayKey(null)}>
                            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                          </button>
                          <button type="button" className="pro-primary" disabled={saving} onClick={() => void saveDayEdition()}>
                            {saving
                              ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                              : t(props.language, { es: "Guardar dia", en: "Save day", pt: "Salvar dia" })}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {!loading ? (
        <AvailabilityBulkSticky
          language={props.language}
          selectedCount={selectedVisibleSlots.length}
          isRemoving={isRemoving}
          onRemoveSelected={requestBulkRemoval}
        />
      ) : null}

      <AvailabilityRemoveModal
        language={props.language}
        open={Boolean(pendingRemovalSlots && pendingRemovalSlots.length > 0)}
        pendingCount={pendingRemovalSlots?.length ?? 0}
        singleSlotLabel={pendingRemovalSingleLabel}
        isRemoving={isRemoving}
        onCancel={() => setPendingRemovalSlots(null)}
        onConfirm={() => void confirmSlotRemoval()}
      />
    </div>
  );
}
