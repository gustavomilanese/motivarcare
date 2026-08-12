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
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeMode } from "../../theme/ThemeContext";
import { categoryAccent, categoryLabel, difficultyLabel } from "../../wellbeing/labels";
import type { ExercisePost } from "../../wellbeing/types";

export function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const route = useRoute<RouteProp<PatientRootStackParamList, "ExerciseDetail">>();
  const slug = route.params.slug;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exercise, setExercise] = useState<ExercisePost | null>(null);
  const [stepDone, setStepDone] = useState<boolean[]>([]);
  const [pauseSec, setPauseSec] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const content = await fetchWebContent();
      const found = (content.exercises ?? []).find((item) => item.slug === slug) ?? null;
      setExercise(found);
      setStepDone(found ? found.steps.map(() => false) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pauseSec === null || pauseSec <= 0) return;
    const id = setTimeout(() => setPauseSec((s) => (s !== null && s > 0 ? s - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [pauseSec]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        pad: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
        backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
        backText: { color: colors.primary, fontWeight: "700" },
        title: { fontSize: 24, fontWeight: "800", color: colors.text },
        meta: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
        body: { fontSize: 15, color: colors.text, lineHeight: 22 },
        sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 8 },
        stepRow: {
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-start",
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface
        },
        stepDone: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
        stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
        timerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
        tip: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
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

  if (!exercise) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.error}>{error || "No encontramos ese ejercicio."}</Text>
      </View>
    );
  }

  const accent = categoryAccent(exercise.category);
  const doneCount = stepDone.filter(Boolean).length;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}
    >
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Ejercicios</Text>
      </Pressable>

      <Text style={[styles.meta, { color: accent.accent }]}>{categoryLabel(exercise.category)}</Text>
      <Text style={styles.title}>
        {exercise.emoji} {exercise.title}
      </Text>
      <Text style={styles.meta}>
        {exercise.durationMinutes} min · {difficultyLabel(exercise.difficulty)}
      </Text>
      <Text style={styles.body}>{exercise.description || exercise.summary}</Text>

      <Text style={styles.sectionTitle}>Cómo hacerlo ({doneCount}/{exercise.steps.length})</Text>
      <View style={styles.timerRow}>
        <PrimaryButton label="30 s" variant="ghost" onPress={() => setPauseSec(30)} />
        <PrimaryButton label="60 s" variant="ghost" onPress={() => setPauseSec(60)} />
        <PrimaryButton label="2 min" variant="ghost" onPress={() => setPauseSec(120)} />
        {pauseSec != null && pauseSec > 0 ? <Text style={styles.meta}>{pauseSec}s</Text> : null}
        {pauseSec === 0 ? <Text style={styles.meta}>Listo</Text> : null}
        {pauseSec != null ? (
          <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setPauseSec(null)} />
        ) : null}
      </View>

      {exercise.steps.map((step, index) => (
        <Pressable
          key={`${index}-${step.slice(0, 12)}`}
          style={[styles.stepRow, stepDone[index] && styles.stepDone]}
          onPress={() =>
            setStepDone((prev) => {
              const next = [...prev];
              next[index] = !next[index];
              return next;
            })
          }
        >
          <Ionicons
            name={stepDone[index] ? "checkbox" : "square-outline"}
            size={22}
            color={stepDone[index] ? colors.primary : colors.textMuted}
          />
          <Text style={styles.stepText}>{step}</Text>
        </Pressable>
      ))}

      {exercise.tips.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Tips</Text>
          {exercise.tips.map((tip) => (
            <Text key={tip} style={styles.tip}>
              · {tip}
            </Text>
          ))}
        </>
      ) : null}

      {exercise.contraindications ? (
        <>
          <Text style={styles.sectionTitle}>Precauciones</Text>
          <Text style={styles.tip}>{exercise.contraindications}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}
