import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { fetchWebContent } from "../../api/client";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import type { ExerciseRoutine } from "../../wellbeing/types";

export function ExerciseRoutineScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const route = useRoute<RouteProp<PatientRootStackParamList, "ExerciseRoutine">>();
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const content = await fetchWebContent();
      setRoutine((content.exerciseRoutines ?? []).find((r) => r.slug === route.params.slug) ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, [route.params.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        pad: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
        backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        backText: { color: colors.primary, fontWeight: "700" },
        title: { fontSize: 24, fontWeight: "800", color: colors.text },
        meta: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
        body: { fontSize: 15, color: colors.text, lineHeight: 22 },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 4
        },
        cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
        error: { color: colors.danger, fontWeight: "700" },
        loader: { flex: 1, alignItems: "center", justifyContent: "center" }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.error}>{error || "No encontramos esa rutina."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Ejercicios</Text>
      </Pressable>
      <Text style={styles.title}>
        {routine.emoji} {routine.title}
      </Text>
      <Text style={styles.meta}>
        {routine.totalDurationMinutes} min · {routine.exercises.length} ejercicios
      </Text>
      <Text style={styles.body}>{routine.description || routine.summary}</Text>

      {routine.exercises.map((step) => (
        <Pressable
          key={step.id}
          style={styles.card}
          onPress={() => navigation.navigate("ExerciseDetail", { slug: step.slug })}
        >
          <Text style={styles.cardTitle}>
            {step.emoji} {step.title}
          </Text>
          <Text style={styles.meta}>{step.durationMinutes} min</Text>
          <Text style={styles.body} numberOfLines={2}>
            {step.summary}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
