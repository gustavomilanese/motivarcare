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

/** Misma categoría primero; si faltan, completa con otros publicados. */
function pickRelatedByCategory(all: ExercisePost[], current: ExercisePost, limit = 3): ExercisePost[] {
  const isPublished = (item: ExercisePost) => item.status === undefined || item.status === "published";
  const others = all.filter((item) => item.id !== current.id && isPublished(item));
  const sameCategory = others.filter((item) => item.category === current.category);
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  const sameIds = new Set(sameCategory.map((item) => item.id));
  const fillers = others.filter((item) => !sameIds.has(item.id));
  return [...sameCategory, ...fillers].slice(0, limit);
}

export function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const route = useRoute<RouteProp<PatientRootStackParamList, "ExerciseDetail">>();
  const slug = route.params.slug;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exercise, setExercise] = useState<ExercisePost | null>(null);
  const [allExercises, setAllExercises] = useState<ExercisePost[]>([]);
  const [stepDone, setStepDone] = useState<boolean[]>([]);
  const [pauseSec, setPauseSec] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const content = await fetchWebContent();
      const published = (content.exercises ?? []).filter(
        (item) => item.status === undefined || item.status === "published"
      );
      const found = published.find((item) => item.slug === slug) ?? null;
      setAllExercises(published);
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

  const related = useMemo(() => {
    if (!exercise) return [];
    return pickRelatedByCategory(allExercises, exercise, 3);
  }, [allExercises, exercise]);

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
        celebrate: {
          marginTop: 4,
          padding: 14,
          borderRadius: 14,
          backgroundColor: "#ecfdf5",
          borderWidth: 1,
          borderColor: "#bbf7d0",
          gap: 10
        },
        celebrateTitle: { fontSize: 15, fontWeight: "800", color: "#14532d" },
        celebrateLead: { fontSize: 13, lineHeight: 18, color: "#166534" },
        homeLink: { fontSize: 13, fontWeight: "800", color: "#166534", marginTop: 2 },
        relatedBlock: {
          marginTop: 8,
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: 10
        },
        relatedEyebrow: {
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: colors.textMuted
        },
        relatedTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        relatedLead: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
        relatedCard: {
          gap: 8,
          minHeight: 148,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border
        },
        relatedTop: { flexDirection: "row", gap: 10, alignItems: "center" },
        relatedEmoji: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        },
        relatedEmojiText: { fontSize: 22 },
        relatedCardTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
        relatedMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
        relatedSummary: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
        relatedCta: { fontSize: 13, fontWeight: "800", color: colors.primary, marginTop: 2 },
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
  const completed = doneCount === exercise.steps.length && exercise.steps.length > 0;

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

      <Text style={styles.sectionTitle}>
        Cómo hacerlo ({doneCount}/{exercise.steps.length})
      </Text>
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

      {completed ? (
        <View style={styles.celebrate}>
          <Text style={styles.celebrateTitle}>¡Listo! Buen trabajo.</Text>
          <Text style={styles.celebrateLead}>
            Abajo tenés sugerencias para seguir tu tratamiento, o volvé al inicio.
          </Text>
          <Pressable onPress={() => navigation.navigate("Tabs", { screen: "home" })} hitSlop={8}>
            <Text style={styles.homeLink}>Volver a Inicio →</Text>
          </Pressable>
        </View>
      ) : null}

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

      {related.length > 0 ? (
        <View style={styles.relatedBlock}>
          <Text style={styles.relatedEyebrow}>También te puede servir</Text>
          <Text style={styles.relatedTitle}>Más ejercicios de {categoryLabel(exercise.category)}</Text>
          <Text style={styles.relatedLead}>
            Seguí tu tratamiento con estas sugerencias de la misma categoría.
          </Text>
          {related.map((item) => {
            const itemAccent = categoryAccent(item.category);
            return (
              <Pressable
                key={item.id}
                style={styles.relatedCard}
                onPress={() => navigation.replace("ExerciseDetail", { slug: item.slug })}
              >
                <View style={styles.relatedTop}>
                  <View style={[styles.relatedEmoji, { backgroundColor: itemAccent.accentSoft }]}>
                    <Text style={styles.relatedEmojiText}>{item.emoji}</Text>
                  </View>
                  <Text style={styles.relatedCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <Text style={styles.relatedMeta}>
                  {categoryLabel(item.category)} · {item.durationMinutes} min ·{" "}
                  {difficultyLabel(item.difficulty)}
                </Text>
                <Text style={styles.relatedSummary} numberOfLines={3}>
                  {item.summary}
                </Text>
                <Text style={styles.relatedCta}>Ver ejercicio →</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
