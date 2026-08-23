import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { getPatientDetail, getPatientDiaryEntries, getPatientDiarySummary } from "../api/client";
import type { PatientDetailResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { PersonAvatar } from "../components/PersonAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StackHeader } from "../components/StackHeader";
import type { ProRootStackParamList } from "../navigation/types";
import { colors, radii } from "../theme/colors";
import { formatAmount, formatDateOnly, formatDayShort } from "../utils/format";

function statusLabel(status: PatientDetailResponse["patient"]["status"]) {
  if (status === "trial") {
    return "Prueba";
  }
  if (status === "pause") {
    return "Pausa";
  }
  if (status === "cancelled") {
    return "Baja";
  }
  return "Activo";
}

function payoutLabel(movement: PatientDetailResponse["paymentMovements"][number]) {
  if (movement.payoutPaid) {
    return "Pagada";
  }
  if (movement.submittedForPayout) {
    return "En cobro";
  }
  return "Realizada";
}

export function PatientDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProRootStackParamList>>();
  const route = useRoute<RouteProp<ProRootStackParamList, "PatientDetail">>();
  const { token } = useAuth();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [entries, setEntries] = useState<Array<{ id: string; title: string; mood: string; publishedAt: string | null; whatHappened: string }>>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      setLoading(true);
      Promise.all([
        getPatientDetail(token, route.params.patientId),
        getPatientDiaryEntries(token, route.params.patientId).catch(() => ({ entries: [] }))
      ])
        .then(([detail, diary]) => {
          setData(detail);
          setEntries(diary.entries ?? []);
          setError("");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "No se pudo cargar el paciente.");
        })
        .finally(() => setLoading(false));
    }, [route.params.patientId, token])
  );

  const patient = data?.patient;

  return (
    <Screen>
      <StackHeader title={patient?.patientName ?? route.params.patientName} onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {patient ? (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.hero}>
            <PersonAvatar uri={patient.avatarUrl} name={patient.patientName} size={72} />
            <View style={styles.heroCopy}>
              <Text style={styles.name}>{patient.patientName}</Text>
              <Text style={styles.chip}>{statusLabel(patient.status)}</Text>
              <Text style={styles.meta}>{patient.patientEmail}</Text>
            </View>
          </View>

          <Card>
            <Text style={styles.kicker}>Actividad</Text>
            <Metric label="Sesiones realizadas" value={String(patient.completedSessions)} />
            <Metric label="Total de reservas" value={String(patient.totalSessions)} />
            <Metric label="Canceladas" value={String(patient.cancelledSessions)} />
            <Metric label="Primera sesión" value={formatDateOnly(patient.firstSessionAt)} />
            <Metric label="Última realizada" value={formatDateOnly(patient.lastCompletedSessionAt)} />
            <Metric label="Días desde última" value={String(patient.daysSinceLastSession)} />
            {(patient.lifetimeTotals ?? []).map((row) => (
              <Metric
                key={row.currency}
                label={`Neto ${row.currency.toUpperCase()}`}
                value={`${formatAmount(row.netCents)} · ${row.sessions} sesión(es)`}
              />
            ))}
          </Card>

          <Card>
            <Text style={styles.kicker}>Diario emocional</Text>
            {entries.length === 0 ? (
              <Text style={styles.body}>Todavía no hay entradas compartidas.</Text>
            ) : (
              entries.slice(0, 6).map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <Text style={styles.entryTitle}>{entry.title || "Entrada"}</Text>
                  <Text style={styles.meta}>
                    {entry.mood}
                    {entry.publishedAt ? ` · ${formatDayShort(entry.publishedAt)}` : ""}
                  </Text>
                  {entry.whatHappened ? (
                    <Text style={styles.body} numberOfLines={3}>
                      {entry.whatHappened}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
            <PrimaryButton
              label={summaryLoading ? "Generando…" : "Resumen para sesión"}
              loading={summaryLoading}
              onPress={() => {
                if (!token) {
                  return;
                }
                setSummaryLoading(true);
                void getPatientDiarySummary(token, patient.patientId)
                  .then((result) => setSummary(result.headline || result.summary))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo generar el resumen."))
                  .finally(() => setSummaryLoading(false));
              }}
              style={{ marginTop: 8 }}
            />
            {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          </Card>

          <Card>
            <Text style={styles.kicker}>Últimas sesiones realizadas</Text>
            {(data?.paymentMovements ?? []).slice(0, 8).map((movement) => (
              <View key={movement.bookingId} style={styles.payRow}>
                <Text style={styles.entryTitle}>{formatDayShort(movement.startsAt)}</Text>
                <Text style={styles.meta}>
                  Neto {formatAmount(movement.amountCents)} · {payoutLabel(movement)}
                </Text>
              </View>
            ))}
            {(data?.paymentMovements ?? []).length === 0 ? (
              <Text style={styles.body}>Todavía no hay sesiones realizadas con este paciente.</Text>
            ) : null}
          </Card>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.meta}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: 12 },
  hero: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 },
  heroCopy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  chip: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: radii.control,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#EEF2FF",
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "600"
  },
  kicker: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 8 },
  meta: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted },
  metric: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  metricValue: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  entry: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  entryTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  summary: { marginTop: 10, fontSize: 15, lineHeight: 22, color: colors.text },
  payRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  error: { color: colors.danger, marginBottom: 8 }
});
