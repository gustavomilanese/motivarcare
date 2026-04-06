import { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { INTAKE_MAIN_REASON_VALUE_JOINER, intakeQuestions } from "../../constants/intakeQuestions";
import { submitPatientIntake } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { usePatientProfile } from "../../context/PatientProfileContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";

function buildIntakeStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollContent: {
      flexGrow: 1
    },
    hero: {
      marginHorizontal: 16,
      borderRadius: 24,
      padding: 22,
      gap: 8,
      marginBottom: 12
    },
    heroKicker: {
      color: "rgba(255,255,255,0.82)",
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.6
    },
    heroLead: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 15,
      lineHeight: 21,
      marginTop: 4
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.28)",
      marginTop: 12,
      overflow: "hidden"
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: "#FFFFFF"
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.tabBarShadow,
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3
    },
    qTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3
    },
    qHelp: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20
    },
    options: {
      gap: 10
    },
    optionBtn: {
      minHeight: 48
    },
    textArea: {
      minHeight: 120,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceMuted
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20
    },
    half: {
      flex: 1
    },
    error: {
      color: colors.danger,
      fontWeight: "600",
      fontSize: 14
    }
  });
}

export function IntakeWizardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildIntakeStyles(colors), [colors]);
  const { token } = useAuth();
  const { refresh } = usePatientProfile();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const question = intakeQuestions[index];
  const progress = useMemo(() => ((index + 1) / intakeQuestions.length) * 100, [index]);

  const persistAnswer = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }, [question.id]);

  const toggleMultiOption = useCallback(
    (option: string) => {
      setAnswers((prev) => {
        const pieces = (prev[question.id] ?? "")
          .split(/\n/)
          .map((piece) => piece.trim())
          .filter(Boolean);
        const next = pieces.includes(option) ? pieces.filter((p) => p !== option) : [...pieces, option];
        return { ...prev, [question.id]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER) };
      });
    },
    [question.id]
  );

  const goNext = useCallback(async () => {
    Keyboard.dismiss();
    const currentAnswer = answers[question.id]?.trim() ?? "";
    if (!currentAnswer) {
      setError("Completá esta respuesta para continuar.");
      return;
    }
    setError("");

    if (index < intakeQuestions.length - 1) {
      setIndex((i) => i + 1);
      return;
    }

    if (!token) {
      return;
    }

    setLoading(true);
    try {
      await submitPatientIntake({ token, answers: { ...answers, [question.id]: currentAnswer } });
      await refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "No se pudo guardar el intake.";
      setError(message.includes("409") || message.includes("already") ? "El intake ya fue completado." : message);
    } finally {
      setLoading(false);
    }
  }, [answers, index, question.id, refresh, token]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    setError("");
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const draft = answers[question.id] ?? "";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 4 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }
        ]}
      >
        <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroKicker}>Paso {index + 1} de {intakeQuestions.length}</Text>
          <Text style={styles.heroTitle}>Tu bienestar empieza acá</Text>
          <Text style={styles.heroLead}>Respuestas confidenciales · Mejor matching con tu profesional</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.qTitle}>{question.title}</Text>
          <Text style={styles.qHelp}>{question.help}</Text>

          {question.options ? (
            <View style={styles.options}>
              {question.options.map((opt) => {
                const selected = question.allowMultiple
                  ? draft
                      .split(/\n/)
                      .map((piece) => piece.trim())
                      .filter(Boolean)
                      .includes(opt)
                  : draft === opt;
                return (
                  <PrimaryButton
                    key={opt}
                    label={opt}
                    variant={selected ? "primary" : "ghost"}
                    onPress={() => {
                      Keyboard.dismiss();
                      setError("");
                      if (question.allowMultiple) {
                        toggleMultiOption(opt);
                      } else {
                        persistAnswer(opt);
                      }
                    }}
                    style={styles.optionBtn}
                  />
                );
              })}
            </View>
          ) : (
            <TextInput
              value={draft}
              onChangeText={(text) => {
                setError("");
                persistAnswer(text);
              }}
              placeholder="Escribí aquí..."
              placeholderTextColor={colors.textSubtle}
              multiline
              style={styles.textArea}
              textAlignVertical="top"
              blurOnSubmit={false}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {index > 0 ? (
              <PrimaryButton label="Atrás" variant="ghost" onPress={goBack} style={styles.half} />
            ) : (
              <View style={styles.half} />
            )}
            <PrimaryButton
              label={index >= intakeQuestions.length - 1 ? "Finalizar" : "Siguiente"}
              loading={loading}
              onPress={() => {
                void goNext();
              }}
              style={styles.half}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
