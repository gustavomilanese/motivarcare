import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { completeBooking, getDashboard, submitBookingsForPayout, uncompleteBooking } from "../api/client";
import type { DashboardSession } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { PersonAvatar } from "../components/PersonAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useChrome } from "../navigation/ChromeContext";
import { colors, radii } from "../theme/colors";
import { formatAmount, formatDayShort, formatTimeRange } from "../utils/format";

export function DashboardScreen() {
  const { token } = useAuth();
  const { openDrawer } = useChrome();
  const [tab, setTab] = useState<"upcoming" | "settle">("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [upcoming, setUpcoming] = useState<DashboardSession[]>([]);
  const [settle, setSettle] = useState<DashboardSession[]>([]);
  const [currency, setCurrency] = useState("ARS");
  const [gross, setGross] = useState(0);
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getDashboard(token);
    setUpcoming(data.upcomingSessions ?? []);
    setSettle(data.pendingExecutionSessions ?? []);
    setCurrency(data.display?.currency ?? "ARS");
    setGross(data.display?.executedGrossCents ?? 0);
    setPending(data.display?.pendingToCollectCents ?? 0);
    setError("");
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      }).finally(() => setLoading(false));
    }, [load])
  );

  const sessions = tab === "upcoming" ? upcoming : settle;

  return (
    <Screen>
      <AppHeader title="Dashboard" onMore={openDrawer} />
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("upcoming")} style={[styles.tab, tab === "upcoming" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "upcoming" && styles.tabLabelActive]}>Próximas</Text>
        </Pressable>
        <Pressable onPress={() => setTab("settle")} style={[styles.tab, tab === "settle" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "settle" && styles.tabLabelActive]}>Marcar</Text>
        </Pressable>
      </View>

      <View style={styles.kpis}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Realizado</Text>
          <Text style={styles.kpiValue}>{formatAmount(gross)}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Pendiente</Text>
          <Text style={styles.kpiValue}>{formatAmount(pending)}</Text>
        </View>
      </View>
      <Text style={styles.currency}>{currency}</Text>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {sessions.map((session) => (
          <View key={session.id} style={styles.row}>
            <PersonAvatar uri={session.patientAvatarUrl} name={session.patientName} size={56} />
            <View style={styles.rowCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {session.patientName}
              </Text>
              <Text style={styles.meta}>
                {formatDayShort(session.startsAt)} · {formatTimeRange(session.startsAt, session.endsAt)}
              </Text>
              {tab === "upcoming" && session.joinUrl ? (
                <PrimaryButton
                  label="Abrir sesión"
                  onPress={() => void Linking.openURL(session.joinUrl!)}
                  style={styles.openBtn}
                />
              ) : null}
              {tab === "settle" ? (
                <View style={styles.settleActions}>
                  {session.status !== "completed" ? (
                    <PrimaryButton
                      label="Marcar realizada"
                      onPress={() => {
                        if (!token) {
                          return;
                        }
                        Alert.alert(
                          "Marcar y enviar a cobro",
                          "La sesión pasa a Pendiente de cobro. No se puede deshacer.",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Confirmar y enviar",
                              onPress: () => {
                                void completeBooking(token, session.id)
                                  .then(() => submitBookingsForPayout(token, [session.id]))
                                  .then(() => load())
                                  .catch((err: unknown) => {
                                    setError(err instanceof Error ? err.message : "No se pudo enviar a cobro.");
                                  });
                              }
                            }
                          ]
                        );
                      }}
                    />
                  ) : session.canUncomplete !== false ? (
                    <PrimaryButton
                      variant="ghost"
                      label="Deshacer"
                      onPress={() => {
                        if (!token) {
                          return;
                        }
                        void uncompleteBooking(token, session.id).then(() => load());
                      }}
                    />
                  ) : (
                    <Text style={styles.meta}>Pendiente de cobro</Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        ))}
        {!loading && sessions.length === 0 ? (
          <Text style={styles.empty}>
            {tab === "upcoming" ? "No hay próximas sesiones." : "No hay sesiones para marcar."}
          </Text>
        ) : null}
      </ScrollView>
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
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#fff"
  },
  tabLabel: { fontSize: 14, fontWeight: "600", color: colors.muted },
  tabLabelActive: { color: colors.primaryDark },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: {
    flex: 1,
    minHeight: 76,
    borderRadius: radii.card,
    backgroundColor: colors.indigoFill,
    padding: 12,
    justifyContent: "center"
  },
  kpiLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  kpiValue: { color: "#fff", fontSize: 20, fontWeight: "700" },
  currency: { marginTop: 4, marginBottom: 8, color: colors.muted, fontSize: 12 },
  list: { paddingBottom: 110, gap: 0 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center"
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  openBtn: { alignSelf: "flex-start", minHeight: 40, marginTop: 4 },
  settleActions: { marginTop: 4 },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted },
  error: { color: colors.danger, marginBottom: 8 }
});
