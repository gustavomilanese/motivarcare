import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getEarnings } from "../api/client";
import type { EarningsMovement } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Screen } from "../components/Screen";
import { useChrome } from "../navigation/ChromeContext";
import { colors, radii } from "../theme/colors";
import { formatAmount, formatDayShort, formatTimeRange } from "../utils/format";

function payoutLabel(movement: EarningsMovement) {
  if (movement.payoutPaid) {
    return "Pagada";
  }
  if (movement.submittedForPayout) {
    return "Pendiente de cobro";
  }
  return "Realizada";
}

function payoutTone(movement: EarningsMovement) {
  if (movement.payoutPaid) {
    return styles.chipPaid;
  }
  if (movement.submittedForPayout) {
    return styles.chipSubmitted;
  }
  return styles.chipDone;
}

export function IncomeScreen() {
  const { token } = useAuth();
  const { openDrawer } = useChrome();
  const [movements, setMovements] = useState<EarningsMovement[]>([]);
  const [net, setNet] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getEarnings(token);
    setMovements(data.movements ?? []);
    setNet(data.display?.summary.professionalNetCents ?? 0);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return movements;
    }
    return movements.filter((movement) => movement.patientName.toLowerCase().includes(needle));
  }, [movements, query]);

  return (
    <Screen>
      <AppHeader title="Ingresos" onMore={openDrawer} />
      <View style={styles.kpi}>
        <Text style={styles.kpiLabel}>Neto</Text>
        <Text style={styles.kpiValue}>{formatAmount(net)}</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar paciente"
        style={styles.search}
      />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
        contentContainerStyle={styles.list}
      >
        {visible.map((movement) => (
          <View key={movement.bookingId} style={styles.row}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {movement.patientName}
              </Text>
              <Text style={styles.net}>{formatAmount(movement.amountCents)}</Text>
            </View>
            <View style={styles.bottom}>
              <Text style={styles.when} numberOfLines={1}>
                {formatDayShort(movement.startsAt)} · {formatTimeRange(movement.startsAt, movement.endsAt)}
              </Text>
              <View style={styles.chips}>
                {movement.isTrial ? <Text style={[styles.chip, styles.chipTrial]}>Prueba</Text> : null}
                <Text style={[styles.chip, payoutTone(movement)]}>{payoutLabel(movement)}</Text>
              </View>
            </View>
          </View>
        ))}
        {!loading && visible.length === 0 ? <Text style={styles.empty}>No hay sesiones realizadas.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpi: {
    minHeight: 76,
    borderRadius: radii.card,
    backgroundColor: colors.indigoFill,
    padding: 12,
    justifyContent: "center",
    marginBottom: 8
  },
  kpiLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  kpiValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  search: {
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 4,
    color: colors.text
  },
  list: { paddingBottom: 110 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
    gap: 4
  },
  top: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  name: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "600", color: colors.text },
  net: { fontSize: 16, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  when: { flex: 1, minWidth: 0, fontSize: 13, color: colors.muted },
  chips: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  chip: {
    overflow: "hidden",
    borderRadius: radii.control,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "600"
  },
  chipDone: { backgroundColor: "#F5F3FF", color: "#5B21B6" },
  chipSubmitted: { backgroundColor: colors.warningSoft, color: colors.warning },
  chipPaid: { backgroundColor: colors.successSoft, color: colors.success },
  chipTrial: { backgroundColor: colors.trialSoft, color: colors.trialText },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted }
});
