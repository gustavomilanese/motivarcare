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
import {
  fetchDiaryEntries,
  fetchDiarySessionSummary,
  sendDiarySessionSummary
} from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { PatientRootStackParamList } from "../../navigation/types";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeMode } from "../../theme/ThemeContext";
import { moodMeta } from "../../wellbeing/diaryMoods";
import type { EmotionalDiaryEntry, EmotionalDiarySessionSummary } from "../../wellbeing/types";
import { formatDateTime } from "../../utils/date";

const NEED_LABELS: Record<string, string> = {
  rest: "Descansar",
  talk: "Hablarlo",
  breathe: "Respirar",
  boundaries: "Poner límites",
  organize: "Ordenar ideas"
};

export function DiaryRecordsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<EmotionalDiaryEntry[]>([]);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [summary, setSummary] = useState<EmotionalDiarySessionSummary | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

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

  async function handlePreview() {
    if (!token) return;
    setSummaryLoading(true);
    setError("");
    setSentNotice(null);
    try {
      const result = await fetchDiarySessionSummary(token);
      setSummary(result);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "No pudimos armar el informe");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSend() {
    if (!token) return;
    setSendLoading(true);
    setError("");
    setSentNotice(null);
    try {
      const result = await sendDiarySessionSummary(token);
      setSummary(result.summary);
      setSentNotice(`Listo: enviamos el informe a ${result.professionalName}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No pudimos enviar el informe");
    } finally {
      setSendLoading(false);
    }
  }

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
        reportCard: {
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 14,
          borderRadius: 16,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10
        },
        reportEyebrow: {
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: colors.primary
        },
        reportTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        reportLead: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
        actions: { gap: 8 },
        sent: {
          padding: 10,
          borderRadius: 12,
          backgroundColor: "#ecfdf5",
          borderWidth: 1,
          borderColor: "#bbf7d0",
          color: "#166534",
          fontWeight: "700",
          fontSize: 13
        },
        block: {
          marginTop: 4,
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8
        },
        blockTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
        blockMeta: { fontSize: 12, color: colors.textMuted },
        fieldLabel: {
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: colors.textMuted
        },
        fieldBody: { fontSize: 14, lineHeight: 20, color: colors.text },
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
        loader: { flex: 1, alignItems: "center", justifyContent: "center" },
        sectionLabel: {
          fontSize: 15,
          fontWeight: "800",
          color: colors.text,
          paddingHorizontal: 16,
          marginBottom: 8
        }
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
        ListHeaderComponent={
          <View>
            <View style={styles.reportCard}>
              <Text style={styles.reportEyebrow}>Antes de tu sesión</Text>
              <Text style={styles.reportTitle}>Enviar informe al psicólogo/a</Text>
              <Text style={styles.reportLead}>
                Armá el informe con las entradas que compartiste, revisalo y envialo. Así queda claro que lo recibió.
              </Text>
              <View style={styles.actions}>
                <PrimaryButton
                  label={summaryLoading ? "Armando informe…" : "Vista previa"}
                  variant="ghost"
                  onPress={() => void handlePreview()}
                  disabled={summaryLoading || sendLoading}
                />
                <PrimaryButton
                  label={sendLoading ? "Enviando…" : "Enviar al psicólogo/a"}
                  onPress={() => void handleSend()}
                  disabled={sendLoading || summaryLoading}
                />
              </View>
              {sentNotice ? <Text style={styles.sent}>{sentNotice}</Text> : null}
              {summary ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.blockTitle}>{summary.headline}</Text>
                  {(summary.blocks ?? []).map((block, index) => {
                    const mood = moodMeta(block.mood);
                    return (
                      <View key={block.entryId} style={styles.block}>
                        <Text style={styles.blockTitle}>
                          {index + 1}. {block.title}
                        </Text>
                        <Text style={styles.blockMeta}>
                          {mood.emoji} {mood.labelEs} · {formatDateTime(block.publishedAt)}
                        </Text>
                        {block.whatHappened ? (
                          <>
                            <Text style={styles.fieldLabel}>Qué pasó</Text>
                            <Text style={styles.fieldBody}>{block.whatHappened}</Text>
                          </>
                        ) : null}
                        {block.feelings.length > 0 ? (
                          <>
                            <Text style={styles.fieldLabel}>Sentimientos</Text>
                            <Text style={styles.fieldBody}>{block.feelings.join(" · ")}</Text>
                          </>
                        ) : null}
                        {block.recurringThought ? (
                          <>
                            <Text style={styles.fieldLabel}>Pensamiento que volvía</Text>
                            <Text style={styles.fieldBody}>{block.recurringThought}</Text>
                          </>
                        ) : null}
                        {block.needsNow.length > 0 ? (
                          <>
                            <Text style={styles.fieldLabel}>Qué necesitaba</Text>
                            <Text style={styles.fieldBody}>
                              {block.needsNow.map((id) => NEED_LABELS[id] ?? id).join(" · ")}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <Text style={styles.sectionLabel}>Tus entradas</Text>
          </View>
        }
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
