import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getTreatmentReportDetail, getTreatmentReports } from "../api/client";
import type { TreatmentReportDetail, TreatmentReportListItem, TreatmentReportSummarySection } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { PersonAvatar } from "../components/PersonAvatar";
import { Screen } from "../components/Screen";
import { StackHeader } from "../components/StackHeader";
import type { ProRootStackParamList } from "../navigation/types";
import { colors, radii } from "../theme/colors";
import { formatRelative } from "../utils/format";

export function ReportsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProRootStackParamList>>();
  const { token } = useAuth();
  const [items, setItems] = useState<TreatmentReportListItem[]>([]);
  const [selected, setSelected] = useState<TreatmentReportListItem | null>(null);
  const [detail, setDetail] = useState<TreatmentReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      setLoading(true);
      void getTreatmentReports(token)
        .then((response) => {
          setItems(response.items ?? []);
          setError("");
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar los reportes."))
        .finally(() => setLoading(false));
    }, [token])
  );

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.safetyFlagged !== b.safetyFlagged) {
          return a.safetyFlagged ? -1 : 1;
        }
        return (b.lastUserMessageAt ?? "").localeCompare(a.lastUserMessageAt ?? "");
      }),
    [items]
  );

  if (selected) {
    return (
      <Screen>
        <StackHeader title={selected.patientName} onBack={() => { setSelected(null); setDetail(null); }} />
        {detailLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {detail ? (
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.meta}>
              Generado {formatRelative(detail.summary.generatedAt)} · {detail.summary.model}
            </Text>
            {detail.summary.weekly ? (
              <Card>
                <Text style={styles.kicker}>Última semana — prioritario</Text>
                <SummaryBlock section={detail.summary.weekly} />
              </Card>
            ) : (
              <Card>
                <Text style={styles.kicker}>Última semana</Text>
                <Text style={styles.body}>Sin actividad reciente del paciente con Maca en los últimos 7 días.</Text>
              </Card>
            )}
            <Card>
              <Text style={styles.kicker}>General</Text>
              <SummaryBlock section={detail.summary.overall} />
            </Card>
            <Text style={styles.disclaimer}>
              Este resumen es generado por IA a partir del chat de acompañamiento. No constituye diagnóstico clínico.
            </Text>
          </ScrollView>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <StackHeader title="Reportes" onBack={() => navigation.goBack()} />
      <Text style={styles.lead}>
        Resumen del acompañamiento entre sesiones con Maca. Solo aparecen pacientes que dieron su consentimiento.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {sorted.map((item) => (
          <Pressable
            key={item.patientId}
            style={styles.row}
            onPress={() => {
              if (!token) {
                return;
              }
              setSelected(item);
              setDetailLoading(true);
              setError("");
              void getTreatmentReportDetail(token, item.patientId)
                .then(setDetail)
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."))
                .finally(() => setDetailLoading(false));
            }}
          >
            <PersonAvatar uri={item.patientAvatarUrl} name={item.patientName} size={56} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.patientName}</Text>
              <Text style={styles.meta}>
                Mensajes: {item.messageCount}
                {item.lastUserMessageAt ? ` · Última actividad: ${formatRelative(item.lastUserMessageAt)}` : ""}
              </Text>
              {item.safetyFlagged ? (
                <Text style={styles.flag}>Atención: se detectaron señales que pueden requerir seguimiento.</Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        {!loading && sorted.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay pacientes que hayan habilitado compartir su chat.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SummaryBlock(props: { section: TreatmentReportSummarySection }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.body}>
        <Text style={styles.strong}>Estado emocional: </Text>
        {props.section.moodSummary}
      </Text>
      {props.section.topics.length > 0 ? (
        <Text style={styles.body}>
          <Text style={styles.strong}>Temas: </Text>
          {props.section.topics.join(" · ")}
        </Text>
      ) : null}
      {props.section.signalsToWatch.length > 0 ? (
        <Text style={styles.body}>
          <Text style={styles.strong}>A monitorear: </Text>
          {props.section.signalsToWatch.join(" · ")}
        </Text>
      ) : null}
      <Text style={styles.body}>{props.section.narrative}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 8 },
  list: { paddingBottom: 32, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginBottom: 8 },
  flag: {
    overflow: "hidden",
    borderRadius: radii.control,
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
    padding: 6
  },
  chevron: { fontSize: 22, color: colors.hint },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted },
  error: { color: colors.danger, marginBottom: 8 },
  kicker: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  strong: { fontWeight: "700" },
  disclaimer: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 8 }
});
