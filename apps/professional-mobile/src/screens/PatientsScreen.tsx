import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { getPatients } from "../api/client";
import type { PatientListItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { PersonAvatar } from "../components/PersonAvatar";
import { Screen } from "../components/Screen";
import { useChrome } from "../navigation/ChromeContext";
import { colors } from "../theme/colors";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "trial", label: "Prueba" },
  { id: "pause", label: "Pausa" }
] as const;

export function PatientsScreen() {
  const { token } = useAuth();
  const { openDrawer } = useChrome();
  const navigation = useNavigation();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getPatients(token);
    setPatients(data.patients ?? []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const visible = useMemo(
    () => (filter === "all" ? patients : patients.filter((item) => item.status === filter)),
    [filter, patients]
  );

  return (
    <Screen>
      <AppHeader title="Pacientes" onMore={openDrawer} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setFilter(item.id)}
            style={[styles.chip, filter === item.id && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, filter === item.id && styles.chipLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
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
        {visible.map((patient) => (
          <Pressable
            key={patient.patientId}
            style={styles.row}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "PatientDetail",
                  params: { patientId: patient.patientId, patientName: patient.patientName }
                })
              )
            }
          >
            <PersonAvatar uri={patient.avatarUrl} name={patient.patientName} size={72} />
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={1}>
                {patient.patientName}
              </Text>
              <Text style={styles.meta}>
                {patient.completedSessions} realizadas · {statusLabel(patient.status)}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        {!loading && visible.length === 0 ? <Text style={styles.empty}>No hay pacientes en este filtro.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function statusLabel(status: PatientListItem["status"]) {
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

const styles = StyleSheet.create({
  chips: { gap: 8, paddingBottom: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  chipLabelActive: { color: "#fff" },
  list: { paddingBottom: 110 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  chevron: { fontSize: 22, color: colors.hint },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted }
});
