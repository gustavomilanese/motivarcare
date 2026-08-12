import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { fetchDiaryEntries } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import { moodMeta } from "../../wellbeing/diaryMoods";
import type { EmotionalDiaryEntry } from "../../wellbeing/types";
import { formatDateTime } from "../../utils/date";

export function DiaryRecordsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<EmotionalDiaryEntry[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchDiaryEntries({ token });
      setEntries(res.entries);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los registros");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        backRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 16,
          marginBottom: 8
        },
        backText: { color: colors.primary, fontWeight: "700" },
        title: {
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          paddingHorizontal: 16,
          marginBottom: 12
        },
        card: {
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 4
        },
        cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
        cardMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
        cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
        error: { color: colors.danger, textAlign: "center", fontWeight: "700", padding: 12 },
        empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
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
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Diario</Text>
      </Pressable>
      <Text style={styles.title}>Registros</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={<Text style={styles.empty}>Sin registros todavía.</Text>}
        renderItem={({ item }) => {
          const mood = moodMeta(item.mood);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {mood.emoji} {item.title || mood.labelEs}
                {item.status === "draft" ? " · borrador" : ""}
              </Text>
              <Text style={styles.cardMeta}>{formatDateTime(item.publishedAt ?? item.createdAt)}</Text>
              {item.whatHappened ? (
                <Text style={styles.cardBody} numberOfLines={4}>
                  {item.whatHappened}
                </Text>
              ) : null}
              {item.shareWithPsychologist ? (
                <Text style={styles.cardMeta}>Compartido con profesional</Text>
              ) : (
                <Text style={styles.cardMeta}>Privado</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
