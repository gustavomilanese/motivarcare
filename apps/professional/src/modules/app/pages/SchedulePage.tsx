import { useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { AvailabilitySlot, ProfessionalBookingsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateHeading(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      weekday: "long",
      month: "short",
      day: "numeric"
    }
  });
}

function formatTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

export function SchedulePage(props: { token: string; language: AppLanguage }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [agendaStartDate, setAgendaStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedWeekDays, setSelectedWeekDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [duration, setDuration] = useState(50);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [repeatWeeks, setRepeatWeeks] = useState(2);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1);
  const [quickDayPreset, setQuickDayPreset] = useState("");
  const [quickShiftPreset, setQuickShiftPreset] = useState("");
  const [removedPreviewSlots, setRemovedPreviewSlots] = useState<number[]>([]);
  const [previewMonthDate, setPreviewMonthDate] = useState(() => new Date());

  const weekDays = [
    { index: 1, label: t(props.language, { es: "Lun", en: "Mon", pt: "Seg" }) },
    { index: 2, label: t(props.language, { es: "Mar", en: "Tue", pt: "Ter" }) },
    { index: 3, label: t(props.language, { es: "Mie", en: "Wed", pt: "Qua" }) },
    { index: 4, label: t(props.language, { es: "Jue", en: "Thu", pt: "Qui" }) },
    { index: 5, label: t(props.language, { es: "Vie", en: "Fri", pt: "Sex" }) },
    { index: 6, label: t(props.language, { es: "Sab", en: "Sat", pt: "Sab" }) },
    { index: 0, label: t(props.language, { es: "Dom", en: "Sun", pt: "Dom" }) }
  ] as const;

  const parseTimeToMinutes = (value: string): number => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const loadSlots = async (showLoading = false) => {
    try {
      const slotsResponse = await apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token);
      setSlots(slotsResponse.slots);
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
    }
  };

  useEffect(() => {
    void loadSlots();
  }, [props.token]);

  const plannedSlots = useMemo(() => {
    const result: Array<{ startsAt: string; endsAt: string; startMs: number }> = [];
    const baseDate = new Date(`${agendaStartDate}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return result;
    }

    const startMinutes = parseTimeToMinutes(rangeStart);
    const endMinutes = parseTimeToMinutes(rangeEnd);
    const cleanDuration = Math.max(30, Math.min(120, duration));
    const cleanBreak = Math.max(0, Math.min(30, breakMinutes));
    const cleanWeeks = Math.max(1, Math.min(8, repeatWeeks));

    if (startMinutes >= endMinutes) {
      return result;
    }

    for (let dayOffset = 0; dayOffset < cleanWeeks * 7; dayOffset += 1) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + dayOffset);

      if (!selectedWeekDays[currentDate.getDay()]) {
        continue;
      }

      let currentMinute = startMinutes;
      while (currentMinute + cleanDuration <= endMinutes) {
        const startsAt = new Date(currentDate);
        startsAt.setHours(Math.floor(currentMinute / 60), currentMinute % 60, 0, 0);
        const endsAt = new Date(startsAt.getTime() + cleanDuration * 60000);

        result.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          startMs: startsAt.getTime()
        });

        currentMinute += cleanDuration + cleanBreak;
        if (result.length > 400) {
          return result;
        }
      }
    }

    return result;
  }, [agendaStartDate, breakMinutes, duration, rangeEnd, rangeStart, repeatWeeks, selectedWeekDays]);

  const existingStartTimes = useMemo(() => {
    return new Set(slots.map((slot) => new Date(slot.startsAt).getTime()));
  }, [slots]);

  const visiblePlannedSlots = useMemo(() => {
    if (removedPreviewSlots.length === 0) {
      return plannedSlots;
    }
    const removedSet = new Set(removedPreviewSlots);
    return plannedSlots.filter((slot) => !removedSet.has(slot.startMs));
  }, [plannedSlots, removedPreviewSlots]);

  const slotsToCreate = useMemo(() => {
    return visiblePlannedSlots.filter((slot) => !existingStartTimes.has(slot.startMs));
  }, [visiblePlannedSlots, existingStartTimes]);

  const duplicateCount = visiblePlannedSlots.length - slotsToCreate.length;
  const previewMonthKey = `${previewMonthDate.getFullYear()}-${String(previewMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const previewMonths = useMemo(() => {
    return Array.from(new Set(slotsToCreate.map((slot) => slot.startsAt.slice(0, 7)))).sort();
  }, [slotsToCreate]);
  const previewSlots = useMemo(
    () => slotsToCreate.filter((slot) => slot.startsAt.slice(0, 7) === previewMonthKey),
    [previewMonthKey, slotsToCreate]
  );
  const previewMonthIndex = previewMonths.indexOf(previewMonthKey);

  useEffect(() => {
    if (plannedSlots.length === 0) {
      setRemovedPreviewSlots([]);
      return;
    }

    const validStartTimes = new Set(plannedSlots.map((slot) => slot.startMs));
    setRemovedPreviewSlots((current) => current.filter((startMs) => validStartTimes.has(startMs)));
  }, [plannedSlots]);

  useEffect(() => {
    const baseDate = new Date(`${agendaStartDate}T00:00:00`);
    if (!Number.isNaN(baseDate.getTime())) {
      setPreviewMonthDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    }
  }, [agendaStartDate]);

  const configuredDaysLabel = useMemo(() => {
    const activeDays = weekDays.filter((day) => selectedWeekDays[day.index]).map((day) => day.label);
    return activeDays.length > 0 ? activeDays.join(" · ") : t(props.language, { es: "Sin dias", en: "No days", pt: "Sem dias" });
  }, [props.language, selectedWeekDays, weekDays]);
  const removedCount = Math.max(0, plannedSlots.length - visiblePlannedSlots.length);
  const sessionTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((current) => current.map((enabled, index) => (index === dayIndex ? !enabled : enabled)));
  };

  const applyWeekPreset = (preset: "workdays" | "weekend" | "all") => {
    if (preset === "workdays") {
      setSelectedWeekDays([false, true, true, true, true, true, false]);
      return;
    }

    if (preset === "weekend") {
      setSelectedWeekDays([true, false, false, false, false, false, true]);
      return;
    }

    setSelectedWeekDays([true, true, true, true, true, true, true]);
  };

  const applyTimePreset = (preset: "morning" | "afternoon" | "full") => {
    if (preset === "morning") {
      setRangeStart("09:00");
      setRangeEnd("13:00");
      setDuration(50);
      setBreakMinutes(10);
      return;
    }

    if (preset === "afternoon") {
      setRangeStart("14:00");
      setRangeEnd("18:00");
      setDuration(50);
      setBreakMinutes(10);
      return;
    }

    setRangeStart("09:00");
    setRangeEnd("17:00");
    setDuration(50);
    setBreakMinutes(10);
  };

  const resetBuilder = () => {
    setSelectedWeekDays([false, true, true, true, true, true, false]);
    setRangeStart("09:00");
    setRangeEnd("17:00");
    setDuration(50);
    setBreakMinutes(10);
    setRepeatWeeks(2);
    setBuilderStep(1);
    setQuickDayPreset("");
    setQuickShiftPreset("");
    setRemovedPreviewSlots([]);
    setPreviewMonthDate(new Date());
    setMessage("");
    setError("");
  };

  const handlePublishSlots = async () => {
    if (slotsToCreate.length === 0) {
      setError(
        t(props.language, {
          es: "No hay nuevos horarios para publicar con esta configuracion.",
          en: "There are no new slots to publish with this setup.",
          pt: "Nao ha novos horarios para publicar com esta configuracao."
        })
      );
      return;
    }

    if (slotsToCreate.length > 180) {
      setError(
        t(props.language, {
          es: "La carga es muy grande. Reduce semanas o dias para publicar hasta 180 horarios por vez.",
          en: "The batch is too large. Reduce weeks or days to publish up to 180 slots per run.",
          pt: "A carga e muito grande. Reduza semanas ou dias para publicar ate 180 horarios por vez."
        })
      );
      return;
    }

    setIsSubmitting(true);
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
                source: "professional-web"
              })
            })
          )
        );
      }

      setMessage(
        replaceTemplate(
          t(props.language, {
            es: "Disponibilidad publicada: {count} horarios nuevos.",
            en: "Availability published: {count} new slots.",
            pt: "Disponibilidade publicada: {count} novos horarios."
          }),
          { count: String(slotsToCreate.length) }
        )
      );
      await loadSlots();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo publicar disponibilidad.",
              en: "Could not publish availability.",
              pt: "Nao foi possivel publicar a disponibilidade."
            })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pro-grid-stack">
      <section className="pro-card schedule-builder">
        <h2>{t(props.language, { es: "Configura tu Disponibilidad", en: "Set your availability", pt: "Configure sua disponibilidade" })}</h2>
        <p>
          {t(props.language, {
            es: "Arma tu agenda en ",
            en: "Build your schedule in ",
            pt: "Monte sua agenda em "
          })}
          <span className="schedule-builder-highlight">
            {t(props.language, {
              es: "tres pasos",
              en: "three steps",
              pt: "tres passos"
            })}
          </span>
          {t(props.language, {
            es: ": elige dias, horarios, revisas y publicas.",
            en: ": choose days, hours, review and publish.",
            pt: ": escolha dias, horarios, revise e publique."
          })}
        </p>

        <div className="schedule-stepper">
          <button type="button" className={`schedule-step-chip ${builderStep === 1 ? "active" : builderStep > 1 ? "done" : ""}`} onClick={() => setBuilderStep(1)}>
            <strong>{t(props.language, { es: "1. Dias", en: "1. Days", pt: "1. Dias" })}</strong>
            <span>{t(props.language, { es: "Inicio, semanas y dias", en: "Start, weeks and days", pt: "Inicio, semanas e dias" })}</span>
          </button>
          <button type="button" className={`schedule-step-chip ${builderStep === 2 ? "active" : builderStep > 2 ? "done" : ""}`} onClick={() => setBuilderStep(2)}>
            <strong>{t(props.language, { es: "2. Horario", en: "2. Hours", pt: "2. Horario" })}</strong>
            <span>{t(props.language, { es: "Franja, duracion y pausa", en: "Range, duration and break", pt: "Faixa, duracao e pausa" })}</span>
          </button>
          <button type="button" className={`schedule-step-chip ${builderStep === 3 ? "active" : ""}`} onClick={() => setBuilderStep(3)}>
            <strong>{t(props.language, { es: "3. Publicar", en: "3. Publish", pt: "3. Publicar" })}</strong>
            <span>{t(props.language, { es: "Revision final", en: "Final review", pt: "Revisao final" })}</span>
          </button>
        </div>

        {builderStep === 1 ? (
          <div className="schedule-step-panel">
            <div className="schedule-step-head">
              <div className="schedule-step-copy">
                <span>{t(props.language, { es: "Paso 1", en: "Step 1", pt: "Passo 1" })}</span>
                <h3>{t(props.language, { es: "Elige desde cuando y que dias quieres abrir agenda", en: "Choose when your schedule starts and which days are open", pt: "Escolha quando sua agenda comeca e quais dias ficam abertos" })}</h3>
              </div>
              <label className="schedule-inline-select">
                <span>{t(props.language, { es: "Dias rapidos", en: "Quick days", pt: "Dias rapidos" })}</span>
                <select
                  value={quickDayPreset}
                  onChange={(event) => {
                    const preset = event.target.value as "" | "workdays" | "weekend" | "all";
                    setQuickDayPreset(preset);
                    if (preset) {
                      applyWeekPreset(preset);
                    }
                  }}
                >
                  <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                  <option value="workdays">{t(props.language, { es: "Lun a Vie", en: "Mon to Fri", pt: "Seg a Sex" })}</option>
                  <option value="weekend">{t(props.language, { es: "Fin de semana", en: "Weekend", pt: "Fim de semana" })}</option>
                  <option value="all">{t(props.language, { es: "Todos", en: "All", pt: "Todos" })}</option>
                </select>
              </label>
            </div>

            <div className="schedule-controls">
              <label>
                {t(props.language, { es: "Inicio de agenda", en: "Schedule start", pt: "Inicio da agenda" })}
                <input type="date" value={agendaStartDate} onChange={(event) => setAgendaStartDate(event.target.value)} />
              </label>

              <label>
                {t(props.language, { es: "Repetir semanas", en: "Repeat weeks", pt: "Repetir semanas" })}
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={repeatWeeks}
                  onChange={(event) => setRepeatWeeks(Number(event.target.value || 2))}
                />
              </label>
            </div>

            <div className="schedule-day-picker">
              {weekDays.map((day) => (
                <button
                  key={day.index}
                  className={selectedWeekDays[day.index] ? "day-chip active" : "day-chip"}
                  type="button"
                  onClick={() => toggleWeekDay(day.index)}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="schedule-step-footer">
              <span className="pro-muted">
                {replaceTemplate(
                  t(props.language, {
                    es: "{count} dias activos por semana",
                    en: "{count} active days per week",
                    pt: "{count} dias ativos por semana"
                  }),
                  { count: String(selectedWeekDays.filter(Boolean).length) }
                )}
              </span>
              <button className="pro-primary" type="button" onClick={() => setBuilderStep(2)}>
                {t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
              </button>
            </div>
          </div>
        ) : null}

        {builderStep === 2 ? (
          <div className="schedule-step-panel">
            <div className="schedule-step-head">
              <div className="schedule-step-copy">
                <span>{t(props.language, { es: "Paso 2", en: "Step 2", pt: "Passo 2" })}</span>
                <h3>{t(props.language, { es: "Define en que franja atiendes y cada cuanto se abre un turno", en: "Define your working range and how often a slot opens", pt: "Defina sua faixa de atendimento e a cadencia dos horarios" })}</h3>
              </div>
              <label className="schedule-inline-select">
                <span>{t(props.language, { es: "Turnos", en: "Shifts", pt: "Turnos" })}</span>
                <select
                  value={quickShiftPreset}
                  onChange={(event) => {
                    const preset = event.target.value as "" | "morning" | "afternoon" | "full";
                    setQuickShiftPreset(preset);
                    if (preset) {
                      applyTimePreset(preset);
                    }
                  }}
                >
                  <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                  <option value="morning">{t(props.language, { es: "Manana", en: "Morning", pt: "Manha" })}</option>
                  <option value="afternoon">{t(props.language, { es: "Tarde", en: "Afternoon", pt: "Tarde" })}</option>
                  <option value="full">{t(props.language, { es: "Jornada completa", en: "Full day", pt: "Dia completo" })}</option>
                </select>
              </label>
            </div>
            <div className="schedule-controls">
              <label>
                {t(props.language, { es: "Desde", en: "From", pt: "Desde" })}
                <input type="time" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              </label>

              <label>
                {t(props.language, { es: "Hasta", en: "To", pt: "Ate" })}
                <input type="time" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
              </label>

              <label>
                {t(props.language, { es: "Duracion por sesion (min)", en: "Session duration (min)", pt: "Duracao por sessao (min)" })}
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value || 50))}
                />
              </label>

              <label>
                {t(props.language, { es: "Pausa entre sesiones (min)", en: "Break between sessions (min)", pt: "Pausa entre sessoes (min)" })}
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={breakMinutes}
                  onChange={(event) => setBreakMinutes(Number(event.target.value || 0))}
                />
              </label>
            </div>

            <div className="schedule-step-footer">
              <button
                type="button"
                aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
                onClick={() => setBuilderStep(1)}
              >
                ←
              </button>
              <button className="pro-primary" type="button" onClick={() => setBuilderStep(3)}>
                {t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
              </button>
            </div>
          </div>
        ) : null}

        {builderStep === 3 ? (
          <div className="schedule-step-panel">
            <div className="schedule-step-copy">
              <span>{t(props.language, { es: "Paso 3", en: "Step 3", pt: "Passo 3" })}</span>
              <h3>{t(props.language, { es: "Revisa el resultado final y publica solo los horarios nuevos", en: "Review the final result and publish only new slots", pt: "Revise o resultado final e publique apenas os novos horarios" })}</h3>
              <p className="pro-muted">
                {t(props.language, {
                  es: "Verifica la configuración y confirma exactamente qué se va a publicar.",
                  en: "Check your setup and confirm exactly what will be published.",
                  pt: "Verifique a configuracao e confirme exatamente o que sera publicado."
                })}
              </p>
            </div>

            <div className="schedule-summary-grid">
              <article className="schedule-summary-card">
                <span>{t(props.language, { es: "Inicio", en: "Start", pt: "Inicio" })}</span>
                <strong>{agendaStartDate}</strong>
              </article>
              <article className="schedule-summary-card">
                <span>{t(props.language, { es: "Dias", en: "Days", pt: "Dias" })}</span>
                <strong>{configuredDaysLabel}</strong>
              </article>
              <article className="schedule-summary-card">
                <span>{t(props.language, { es: "Horario", en: "Hours", pt: "Horario" })}</span>
                <strong>{rangeStart} - {rangeEnd}</strong>
              </article>
              <article className="schedule-summary-card">
                <span>{t(props.language, { es: "Sesion / pausa", en: "Session / break", pt: "Sessao / pausa" })}</span>
                <strong>{duration} / {breakMinutes} min</strong>
              </article>
            </div>

            <div className="schedule-confirm-result-grid">
              <article className="schedule-confirm-result-card accent">
                <span>{t(props.language, { es: "Horarios generados", en: "Generated slots", pt: "Horarios gerados" })}</span>
                <strong>{visiblePlannedSlots.length}</strong>
              </article>
              <article className="schedule-confirm-result-card success">
                <span>{t(props.language, { es: "Nuevos a publicar", en: "New to publish", pt: "Novos para publicar" })}</span>
                <strong>{slotsToCreate.length}</strong>
              </article>
              <article className="schedule-confirm-result-card muted">
                <span>{t(props.language, { es: "Ya publicados", en: "Already published", pt: "Ja publicados" })}</span>
                <strong>{duplicateCount}</strong>
              </article>
              <article className="schedule-confirm-result-card warning">
                <span>{t(props.language, { es: "Descartados por ti", en: "Removed by you", pt: "Removidos por voce" })}</span>
                <strong>{removedCount}</strong>
              </article>
            </div>

            <div className={`schedule-confirm-banner ${slotsToCreate.length > 0 ? "ready" : "warning"}`}>
              <div>
                <strong>
                  {slotsToCreate.length > 0
                    ? t(props.language, {
                        es: "Listo para publicar",
                        en: "Ready to publish",
                        pt: "Pronto para publicar"
                      })
                    : t(props.language, {
                        es: "Sin horarios nuevos para publicar",
                        en: "No new slots to publish",
                        pt: "Sem novos horarios para publicar"
                      })}
                </strong>
                <p>
                  {slotsToCreate.length > 0
                    ? replaceTemplate(
                        t(props.language, {
                          es: "Se publicarán {count} horarios nuevos en la zona horaria {timezone}.",
                          en: "{count} new slots will be published in {timezone} time zone.",
                          pt: "{count} novos horarios serao publicados no fuso {timezone}."
                        }),
                        { count: String(slotsToCreate.length), timezone: sessionTimezone }
                      )
                    : t(props.language, {
                        es: "Todos los horarios ya existen o fueron descartados. Ajusta configuración o vuelve al paso anterior.",
                        en: "All slots already exist or were removed. Adjust setup or go back.",
                        pt: "Todos os horarios ja existem ou foram removidos. Ajuste a configuracao ou volte."
                      })}
                </p>
              </div>
            </div>

            <div className="schedule-actions">
              <button
                type="button"
                aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
                onClick={() => setBuilderStep(2)}
              >
                ←
              </button>
              <button type="button" onClick={resetBuilder}>
                {t(props.language, { es: "Reiniciar", en: "Reset", pt: "Reiniciar" })}
              </button>
              <button className="pro-primary" disabled={isSubmitting || slotsToCreate.length === 0} type="button" onClick={handlePublishSlots}>
                {isSubmitting
                  ? t(props.language, { es: "Publicando...", en: "Publishing...", pt: "Publicando..." })
                  : replaceTemplate(
                      t(props.language, {
                        es: "Publicar {count} horarios",
                        en: "Publish {count} slots",
                        pt: "Publicar {count} horarios"
                      }),
                      { count: String(slotsToCreate.length) }
                    )}
              </button>
              <span className="pro-muted">
                {replaceTemplate(
                  t(props.language, {
                    es: "{planned} nuevos · {duplicates} previamente publicados",
                    en: "{planned} new · {duplicates} previously published",
                    pt: "{planned} novos · {duplicates} publicados anteriormente"
                  }),
                  { planned: String(slotsToCreate.length), duplicates: String(duplicateCount) }
                )}
              </span>
            </div>

            {visiblePlannedSlots.length > 0 ? (
              <div className="schedule-preview">
                <div className="schedule-preview-head">
                  <div>
                    <h3>{t(props.language, { es: "Vista previa de horarios", en: "Slot preview", pt: "Previa de horarios" })}</h3>
                    <p className="pro-muted">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Mes visible: {month} · {count} horarios nuevos",
                          en: "Visible month: {month} · {count} new slots",
                          pt: "Mes visivel: {month} · {count} novos horarios"
                        }),
                        {
                          month: formatDateWithLocale({
                            value: new Date(previewMonthDate.getFullYear(), previewMonthDate.getMonth(), 1).toISOString(),
                            language: props.language,
                            options: { month: "long", year: "numeric" }
                          }),
                          count: String(previewSlots.length)
                        }
                      )}
                    </p>
                  </div>
                  <div className="schedule-preview-nav">
                    <button
                      type="button"
                      disabled={previewMonthIndex <= 0}
                      onClick={() => {
                        const previousKey = previewMonths[previewMonthIndex - 1];
                        if (!previousKey) {
                          return;
                        }
                        const [year, month] = previousKey.split("-").map(Number);
                        setPreviewMonthDate(new Date(year, month - 1, 1));
                      }}
                    >
                      {t(props.language, { es: "Anterior", en: "Prev", pt: "Anterior" })}
                    </button>
                    <button
                      type="button"
                      disabled={previewMonthIndex === -1 || previewMonthIndex >= previewMonths.length - 1}
                      onClick={() => {
                        const nextKey = previewMonths[previewMonthIndex + 1];
                        if (!nextKey) {
                          return;
                        }
                        const [year, month] = nextKey.split("-").map(Number);
                        setPreviewMonthDate(new Date(year, month - 1, 1));
                      }}
                    >
                      {t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
                    </button>
                  </div>
                </div>
                {previewSlots.length > 0 ? (
                  <ul>
                    {previewSlots.map((slot) => {
                      return (
                        <li key={slot.startMs}>
                          <span>
                            {formatDateHeading(slot.startsAt, props.language)} · {formatTime(slot.startsAt, props.language)} - {formatTime(slot.endsAt, props.language)}
                          </span>
                          <div className="schedule-preview-row-actions">
                            <em>{t(props.language, { es: "Nuevo", en: "New", pt: "Novo" })}</em>
                            <button
                              type="button"
                              className="schedule-preview-remove"
                              aria-label={t(props.language, { es: "Quitar horario", en: "Remove slot", pt: "Remover horario" })}
                              onClick={() => {
                                setRemovedPreviewSlots((current) => current.includes(slot.startMs) ? current : [...current, slot.startMs]);
                              }}
                            >
                              <span aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="pro-muted">
                    {t(props.language, {
                      es: "Este mes no tiene horarios nuevos para publicar. Puedes navegar a otro mes o ajustar la configuracion.",
                      en: "This month has no new slots to publish. You can move to another month or adjust the setup.",
                      pt: "Este mes nao tem novos horarios para publicar. Voce pode ir para outro mes ou ajustar a configuracao."
                    })}
                  </p>
                )}
                <div className="schedule-preview-footer">
                  <button
                    type="button"
                    className="schedule-preview-clear"
                    onClick={() => setRemovedPreviewSlots(plannedSlots.map((slot) => slot.startMs))}
                  >
                    {t(props.language, { es: "Borrar todos", en: "Clear all", pt: "Apagar todos" })}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}
      </section>

    </div>
  );
}

