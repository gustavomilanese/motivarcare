import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetchWebContent } from "../../api/client";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import { categoryAccent, categoryLabel, difficultyLabel } from "../../wellbeing/labels";
import type { ExercisePost, ExerciseRoutine } from "../../wellbeing/types";

export function ExercisesListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const content = await fetchWebContent();
      setExercises((content.exercises ?? []).filter((e) => e.status === "published"));
      setRoutines((content.exerciseRoutines ?? []).filter((r) => r.status === "published"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los ejercicios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        hero: { marginHorizontal: 16, borderRadius: 22, padding: 18, gap: 6, marginBottom: 12 },
        heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
        heroLead: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
        back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
        backText: { color: "rgba(255,255,255,0.95)", fontWeight: "700" },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "800",
          color: colors.text,
          marginHorizontal: 16,
          marginBottom: 8,
          marginTop: 8
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 14,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 6
        },
        cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
        cardMeta: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
        cardSummary: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
        badge: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          overflow: "hidden",
          fontSize: 12,
          fontWeight: "700"
        },
        error: { color: colors.danger, textAlign: "center", padding: 16, fontWeight: "700" },
        empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
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

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color="#fff" />
          <Text style={styles.backText}>Inicio</Text>
        </Pressable>
        <Text style={styles.heroTitle}>Ejercicios</Text>
        <Text style={styles.heroLead}>Prácticas cortas para respirar, anclarte y soltar tensión.</Text>
      </LinearGradient>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          routines.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Rutinas</Text>
              {routines.map((routine) => (
                <Pressable
                  key={routine.id}
                  style={styles.card}
                  onPress={() => navigation.navigate("ExerciseRoutine", { slug: routine.slug })}
                >
                  <Text style={styles.cardTitle}>
                    {routine.emoji} {routine.title}
                  </Text>
                  <Text style={styles.cardMeta}>{routine.totalDurationMinutes} min · {routine.exercises.length} ejercicios</Text>
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {routine.summary}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.sectionTitle}>Todos los ejercicios</Text>
            </View>
          ) : (
            <Text style={styles.sectionTitle}>Todos los ejercicios</Text>
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>Todavía no hay ejercicios publicados.</Text>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => {
          const accent = categoryAccent(item.category);
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ExerciseDetail", { slug: item.slug })}
            >
              <Text style={[styles.badge, { backgroundColor: accent.accentSoft, color: accent.accent }]}>
                {categoryLabel(item.category)}
              </Text>
              <Text style={styles.cardTitle}>
                {item.emoji} {item.title}
              </Text>
              <Text style={styles.cardMeta}>
                {item.durationMinutes} min · {difficultyLabel(item.difficulty)}
              </Text>
              <Text style={styles.cardSummary} numberOfLines={2}>
                {item.summary}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
