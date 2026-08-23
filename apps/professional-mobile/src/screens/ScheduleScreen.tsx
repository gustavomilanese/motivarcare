import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  getAvailabilitySlots
} from "../api/client";
import type { AvailabilitySlot } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useChrome } from "../navigation/ChromeContext";
import { colors, radii } from "../theme/colors";
import { capitalize, formatDayShort, formatMonthLabel, formatTime, formatWeekday } from "../utils/format";

const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_INDEX: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const DAY_LABELS = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];
const TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);
const FORWARD_WEEKS = 8;

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

function templateFromSlots(slots: AvailabilitySlot[]) {
  const initial = DAY_KEYS.map(() => new Set<string>());
  const now = Date.now();
  const maxFutureMs = now + 45 * 24 * 60 * 60 * 1000;
  for (const slot of slots) {
    if (slot.isBlocked) {
      continue;
    }
    const slotDate = new Date(slot.startsAt);
    if (slotDate.getTime() < now || slotDate.getTime() > maxFutureMs) {
      continue;
    }
    const label = `${String(slotDate.getHours()).padStart(2, "0")}:00`;
    if (TIME_OPTIONS.includes(label)) {
      initial[DAY_INDEX[slotDate.getDay()]].add(label);
    }
  }
  return initial;
}

function buildForwardSlots(template: Array<Set<string>>) {
  const result: Array<{ startsAt: string; endsAt: string; startMs: number }> = [];
  const today = startOfDay(new Date());
  const endDate = addDays(today, FORWARD_WEEKS * 7);
  for (let cursor = new Date(today); cursor < endDate; cursor = addDays(cursor, 1)) {
    const daySlots = template[DAY_INDEX[cursor.getDay()]];
    if (!daySlots?.size) {
      continue;
    }
    for (const timeLabel of Array.from(daySlots).sort()) {
      const [hours] = timeLabel.split(":").map(Number);
      const startsAt = new Date(cursor);
      startsAt.setHours(hours, 0, 0, 0);
      if (startsAt.getTime() < Date.now()) {
        continue;
      }
      const endsAt = new Date(startsAt.getTime() + 60 * 60000);
      result.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), startMs: startsAt.getTime() });
    }
  }
  return result;
}

function monthDays(monthDate: Date) {
  const days: Date[] = [];
  const cursor = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  while (cursor.getMonth() === monthDate.getMonth()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ScheduleScreen() {
  const { token } = useAuth();
  const { openDrawer } = useChrome();
  const [tab, setTab] = useState<"plantilla" | "publicados">("plantilla");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [template, setTemplate] = useState(() => DAY_KEYS.map(() => new Set<string>()));
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [sheetKey, setSheetKey] = useState<string | null>(null);

  const selectedIndex = DAY_INDEX[selectedDay];

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getAvailabilitySlots(token);
    setSlots(data.slots ?? []);
    setTemplate(templateFromSlots(data.slots ?? []));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load()
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar los horarios."))
        .finally(() => setLoading(false));
    }, [load])
  );

  const existingStarts = useMemo(() => new Set(slots.filter((slot) => !slot.isBlocked).map((slot) => new Date(slot.startsAt).getTime())), [slots]);
  const toCreate = useMemo(
    () => buildForwardSlots(template).filter((item) => !existingStarts.has(item.startMs)),
    [existingStarts, template]
  );

  const daysMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      if (slot.isBlocked && slot.source !== "vacation") {
        continue;
      }
      const key = slot.startsAt.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(slot);
      map.set(key, current);
    }
    return map;
  }, [slots]);

  const publishedDays = useMemo(
    () => monthDays(monthDate).filter((date) => (daysMap.get(dayKey(date)) ?? []).some((slot) => !slot.isBlocked || slot.source === "vacation")),
    [daysMap, monthDate]
  );

  const sheetSlots = sheetKey
    ? (daysMap.get(sheetKey) ?? []).filter((slot) => !slot.isBlocked).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : [];

  const saveTemplate = async () => {
    if (!token) {
      return;
    }
    if (template.every((day) => day.size === 0)) {
      setError("Elegí al menos un bloque en la semana.");
      return;
    }
    if (toCreate.length === 0) {
      setMessage("Tu horario semanal ya estaba aplicado.");
      setError("");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      for (let index = 0; index < toCreate.length; index += 10) {
        const chunk = toCreate.slice(index, index + 10);
        await Promise.all(
          chunk.map((slot) =>
            createAvailabilitySlot(token, { startsAt: slot.startsAt, endsAt: slot.endsAt, source: "weekly-template" })
          )
        );
      }
      setMessage(`Guardado: ${toCreate.length} horarios nuevos.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Horarios" onMore={openDrawer} />
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("plantilla")} style={[styles.tab, tab === "plantilla" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "plantilla" && styles.tabLabelActive]}>Plantilla</Text>
        </Pressable>
        <Pressable onPress={() => setTab("publicados")} style={[styles.tab, tab === "publicados" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "publicados" && styles.tabLabelActive]}>Publicados</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      {tab === "plantilla" ? (
        <>
          <View style={styles.days}>
            {DAY_KEYS.map((day, index) => (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.day, selectedDay === day && styles.dayActive]}
              >
                <Text style={[styles.dayLabel, selectedDay === day && styles.dayLabelActive]}>{DAY_LABELS[index]}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.hours}>
            {TIME_OPTIONS.map((time) => {
              const on = template[selectedIndex]?.has(time);
              return (
                <Pressable
                  key={time}
                  onPress={() => {
                    setTemplate((current) => {
                      const next = current.map((set) => new Set(set));
                      if (next[selectedIndex].has(time)) {
                        next[selectedIndex].delete(time);
                      } else {
                        next[selectedIndex].add(time);
                      }
                      return next;
                    });
                  }}
                  style={[styles.hour, on && styles.hourOn]}
                >
                  <Text style={[styles.hourLabel, on && styles.hourLabelOn]}>{time}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              variant="danger"
              label="Limpiar día"
              disabled={!template[selectedIndex]?.size}
              onPress={() => {
                setTemplate((current) => {
                  const next = current.map((set) => new Set(set));
                  next[selectedIndex] = new Set();
                  return next;
                });
              }}
              style={styles.footerBtn}
            />
            <PrimaryButton label="Guardar" loading={saving} onPress={() => void saveTemplate()} style={styles.footerBtn} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.monthNav}>
            <Pressable onPress={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
              <Text style={styles.monthBtn}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{capitalize(formatMonthLabel(monthDate))}</Text>
            <Pressable onPress={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
              <Text style={styles.monthBtn}>›</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.pubList}>
            {publishedDays.map((date) => {
              const key = dayKey(date);
              const daySlots = (daysMap.get(key) ?? []).filter((slot) => !slot.isBlocked);
              const vacation = (daysMap.get(key) ?? []).some((slot) => slot.source === "vacation");
              return (
                <Pressable
                  key={key}
                  style={styles.pubRow}
                  onPress={() => {
                    if (!vacation) {
                      setSheetKey(key);
                    }
                  }}
                >
                  <View>
                    <Text style={styles.pubTitle}>{capitalize(formatWeekday(date.toISOString()))}</Text>
                    <Text style={styles.pubSub}>{capitalize(formatDayShort(date.toISOString()))}</Text>
                  </View>
                  {vacation ? (
                    <Text style={styles.vacBadge}>Vacaciones</Text>
                  ) : (
                    <View style={styles.pubRight}>
                      <Text style={styles.count}>{daySlots.length}</Text>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            {publishedDays.length === 0 ? <Text style={styles.empty}>No hay horarios publicados este mes.</Text> : null}
          </ScrollView>
        </>
      )}

      <Modal visible={Boolean(sheetKey)} transparent animationType="slide" onRequestClose={() => setSheetKey(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetKey(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{sheetKey}</Text>
            <ScrollView style={styles.sheetList}>
              {sheetSlots.map((slot) => (
                <View key={slot.id} style={styles.sheetRow}>
                  <Text style={styles.sheetTime}>
                    {formatTime(slot.startsAt)} - {formatTime(slot.endsAt)}
                  </Text>
                  <PrimaryButton
                    variant="danger"
                    label="Quitar"
                    onPress={() => {
                      if (!token) {
                        return;
                      }
                      void deleteAvailabilitySlot(token, slot.id).then(() => load());
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            <PrimaryButton variant="ghost" label="Cerrar" onPress={() => setSheetKey(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 4,
    padding: 3,
    borderRadius: radii.control,
    backgroundColor: "#EEF1F7",
    marginBottom: 12
  },
  tab: { flex: 1, minHeight: 40, borderRadius: radii.control, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: colors.muted },
  tabLabelActive: { color: colors.primaryDark },
  days: { flexDirection: "row", gap: 6, marginBottom: 10 },
  day: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  dayActive: { backgroundColor: colors.text, borderColor: colors.text },
  dayLabel: { fontSize: 11, fontWeight: "600", color: colors.text },
  dayLabelActive: { color: "#fff" },
  hours: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 100 },
  hour: {
    width: "31%",
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  hourOn: { backgroundColor: colors.text, borderColor: colors.text },
  hourLabel: { fontSize: 15, fontWeight: "500", color: colors.text },
  hourLabelOn: { color: "#fff" },
  footer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 88,
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surface,
    paddingTop: 10
  },
  footerBtn: { flex: 1 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthBtn: { fontSize: 28, color: colors.text, paddingHorizontal: 8 },
  monthLabel: { fontSize: 18, fontWeight: "600", color: colors.textSecondary },
  pubList: { paddingBottom: 110 },
  pubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  pubTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  pubSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  pubRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: {
    minWidth: 22,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: radii.control,
    backgroundColor: "#F7F4FF",
    color: colors.primary,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  chevron: { fontSize: 22, color: colors.hint },
  vacBadge: { fontSize: 11, fontWeight: "600", color: colors.muted },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.success, marginBottom: 8 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: "#F2F2F7",
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: 10,
    paddingBottom: 24,
    maxHeight: "72%"
  },
  sheetTitle: { textAlign: "center", color: colors.muted, fontWeight: "600", marginVertical: 8 },
  sheetList: { backgroundColor: "#fff", borderRadius: radii.sheet, marginBottom: 8 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    gap: 12
  },
  sheetTime: { fontSize: 16, color: colors.text }
});
