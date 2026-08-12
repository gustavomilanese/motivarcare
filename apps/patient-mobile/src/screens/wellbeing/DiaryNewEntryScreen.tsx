import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH } from "@therapy/types";
import { createDiaryEntry } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import { FEELING_CHIPS, MOOD_OPTIONS, NEED_OPTIONS } from "../../wellbeing/diaryMoods";
import type { EmotionalDiaryMood } from "../../wellbeing/types";

export function DiaryNewEntryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const route = useRoute<RouteProp<PatientRootStackParamList, "DiaryNew">>();
  const initialMood = route.params?.mood;

  const [mood, setMood] = useState<EmotionalDiaryMood>(initialMood ?? "regular");
  const [whatHappened, setWhatHappened] = useState("");
  const [recurringThought, setRecurringThought] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [needsNow, setNeedsNow] = useState<string[]>([]);
  const [shareWithPsychologist, setShareWithPsychologist] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleFeeling = useCallback((feeling: string) => {
    setFeelings((prev) => (prev.includes(feeling) ? prev.filter((f) => f !== feeling) : [...prev, feeling]));
  }, []);

  const toggleNeed = useCallback((needId: string) => {
    setNeedsNow((prev) => (prev.includes(needId) ? prev.filter((n) => n !== needId) : [...prev, needId]));
  }, []);

  const save = useCallback(
    async (status: "draft" | "published") => {
      if (!token) return;
      setSaving(true);
      setError("");
      try {
        await createDiaryEntry({
          token,
          input: {
            status,
            mood,
            whatHappened: whatHappened.trim().slice(0, EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH),
            feelings,
            recurringThought: recurringThought.trim(),
            needsNow,
            isPrivate: !shareWithPsychologist,
            shareWithPsychologist
          }
        });
        navigation.replace("DiaryHome");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No se pudo guardar");
      } finally {
        setSaving(false);
      }
    },
    [token, mood, whatHappened, feelings, recurringThought, needsNow, shareWithPsychologist, navigation]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        pad: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
        backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        backText: { color: colors.primary, fontWeight: "700" },
        title: { fontSize: 22, fontWeight: "800", color: colors.text },
        label: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 4 },
        moodRow: { flexDirection: "row", justifyContent: "space-between" },
        moodBtn: {
          alignItems: "center",
          padding: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          flex: 1,
          marginHorizontal: 2
        },
        moodBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
        moodEmoji: { fontSize: 24 },
        input: {
          minHeight: 100,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: 12,
          color: colors.text,
          backgroundColor: colors.surface,
          textAlignVertical: "top"
        },
        inputSingle: {
          minHeight: 48,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.text,
          backgroundColor: colors.surface
        },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: colors.surface
        },
        chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
        chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingVertical: 8
        },
        switchLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "600" },
        error: { color: colors.danger, fontWeight: "700" },
        counter: { fontSize: 12, color: colors.textMuted, textAlign: "right" }
      }),
    [colors]
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Pressable
          style={styles.backRow}
          onPress={() => {
            if (whatHappened.trim() || feelings.length > 0) {
              Alert.alert("¿Salir sin guardar?", "Vas a perder lo que escribiste.", [
                { text: "Seguir editando", style: "cancel" },
                { text: "Salir", style: "destructive", onPress: () => navigation.goBack() }
              ]);
              return;
            }
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.title}>Nueva entrada</Text>

        <Text style={styles.label}>Ánimo</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.moodBtn, mood === option.id && styles.moodBtnActive]}
              onPress={() => setMood(option.id)}
            >
              <Text style={styles.moodEmoji}>{option.emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>¿Qué pasó hoy?</Text>
        <TextInput
          style={styles.input}
          multiline
          value={whatHappened}
          onChangeText={setWhatHappened}
          maxLength={EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
          placeholder="Contá con tus palabras…"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.counter}>
          {whatHappened.length}/{EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Sentimientos</Text>
        <View style={styles.chips}>
          {FEELING_CHIPS.map((feeling) => {
            const active = feelings.includes(feeling);
            return (
              <Pressable
                key={feeling}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleFeeling(feeling)}
              >
                <Text style={styles.chipText}>{feeling}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pensamiento que se repite</Text>
        <TextInput
          style={styles.inputSingle}
          value={recurringThought}
          onChangeText={setRecurringThought}
          placeholder="Opcional"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>¿Qué necesitás ahora?</Text>
        <View style={styles.chips}>
          {NEED_OPTIONS.map((need) => {
            const active = needsNow.includes(need.id);
            return (
              <Pressable
                key={need.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleNeed(need.id)}
              >
                <Text style={styles.chipText}>
                  {need.icon} {need.labelEs}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Compartir con mi profesional</Text>
          <Switch
            value={shareWithPsychologist}
            onValueChange={setShareWithPsychologist}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={shareWithPsychologist ? colors.primary : "#f4f3f4"}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Publicar entrada" loading={saving} onPress={() => void save("published")} />
        <PrimaryButton label="Guardar borrador" variant="ghost" loading={saving} onPress={() => void save("draft")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
