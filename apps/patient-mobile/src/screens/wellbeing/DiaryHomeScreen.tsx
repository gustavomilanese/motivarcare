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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetchDiaryEntries, fetchDiaryStats } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import { moodMeta, MOOD_OPTIONS } from "../../wellbeing/diaryMoods";
import type { EmotionalDiaryEntry, EmotionalDiaryMood, EmotionalDiaryStats } from "../../wellbeing/types";
import { formatDateTime } from "../../utils/date";

export function DiaryHomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<EmotionalDiaryEntry[]>([]);
  const [stats, setStats] = useState<EmotionalDiaryStats | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [entriesRes, statsRes] = await Promise.all([
        fetchDiaryEntries({ token, status: "published" }),
        fetchDiaryStats(token)
      ]);
      setEntries(entriesRes.entries.slice(0, 8));
      setStats(statsRes.stats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el diario");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openNew = useCallback(
    (mood?: EmotionalDiaryMood) => {
      navigation.navigate("DiaryNew", mood ? { mood } : undefined);
    },
    [navigation]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        hero: { marginHorizontal: 16, borderRadius: 22, padding: 18, gap: 6, marginBottom: 12 },
        back: { flexDirection: "row", alignItems: "center", gap: 4 },
        backText: { color: "#fff", fontWeight: "700" },
        heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
        heroLead: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
        moodRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 14 },
        moodBtn: { alignItems: "center", gap: 4, flex: 1 },
        moodEmoji: { fontSize: 28 },
        moodLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
        statsCard: {
          marginHorizontal: 16,
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 6,
          marginBottom: 12
        },
        statsTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
        statsMeta: { fontSize: 13, color: colors.textMuted },
        sectionTitle: {
          marginHorizontal: 16,
          marginBottom: 8,
          fontSize: 16,
          fontWeight: "800",
          color: colors.text
        },
        entryCard: {
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 4
        },
        entryTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
        entryMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
        entryBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
        actions: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
        error: { color: colors.danger, textAlign: "center", fontWeight: "700", padding: 12 },
        empty: { textAlign: "center", color: colors.textMuted, marginVertical: 16 },
        loader: { flex: 1, alignItems: "center", justifyContent: "center" }
      }),
    [colors]
  );

  if (loading && entries.length === 0) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
    >
      <LinearGradient colors={[...gradients.hero]} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color="#fff" />
          <Text style={styles.backText}>Inicio</Text>
        </Pressable>
        <Text style={styles.heroTitle}>Diario emocional</Text>
        <Text style={styles.heroLead}>Registrá cómo te sentís. Podés compartir con tu profesional si querés.</Text>
      </LinearGradient>

      <Text style={styles.sectionTitle}>¿Cómo estás hoy?</Text>
      <View style={styles.moodRow}>
        {MOOD_OPTIONS.map((mood) => (
          <Pressable key={mood.id} style={styles.moodBtn} onPress={() => openNew(mood.id)}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.labelEs}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Nueva entrada" onPress={() => openNew()} />
        <PrimaryButton
          label="Ver todos los registros"
          variant="ghost"
          onPress={() => navigation.navigate("DiaryRecords")}
        />
      </View>

      {stats ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Este mes</Text>
          <Text style={styles.statsMeta}>{stats.entriesThisMonth} entradas</Text>
          <Text style={styles.statsMeta}>{stats.consecutiveDays} días seguidos</Text>
          <Text style={styles.statsMeta}>
            Ánimo más frecuente: {moodMeta(stats.mostFrequentMood).emoji} {moodMeta(stats.mostFrequentMood).labelEs}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Últimas entradas</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay entradas. Empezá con el ánimo de hoy.</Text>
      ) : (
        entries.map((entry) => {
          const mood = moodMeta(entry.mood);
          return (
            <View key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryTitle}>
                {mood.emoji} {entry.title || mood.labelEs}
              </Text>
              <Text style={styles.entryMeta}>{formatDateTime(entry.publishedAt ?? entry.createdAt)}</Text>
              {entry.whatHappened ? (
                <Text style={styles.entryBody} numberOfLines={3}>
                  {entry.whatHappened}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
