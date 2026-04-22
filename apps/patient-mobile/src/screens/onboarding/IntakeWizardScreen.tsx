import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { RESIDENCY_COUNTRY_OPTIONS } from "@therapy/types";
import {
  applyIntakeOptionSelection,
  buildTherapistPreferencesStored,
  coerceTherapistOption,
  intakePieces,
  INTAKE_MAIN_REASON_VALUE_JOINER,
  intakeQuestions,
  isSafetyRiskFrequentlyAnswer,
  parseTherapistPreferencesStored,
  PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES,
  THERAPIST_PREF_AGE_OPTIONS_ES,
  THERAPIST_PREF_EXCLUSIVE_ES,
  THERAPIST_PREF_GENDER_OPTIONS_ES,
  THERAPIST_PREF_LGBT_OPTIONS_ES
} from "../../constants/intakeQuestions";
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
    crisisCard: {
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerSurface
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
    optionBlock: {
      gap: 6
    },
    optionSub: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
      marginHorizontal: 4
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
    otherFollowLabel: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4
    },
    crisisList: {
      marginTop: 8,
      gap: 10
    },
    crisisBullet: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text
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
    },
    therapistPrefWrap: {
      gap: 16,
      marginTop: 4
    },
    therapistNoPref: {
      width: "100%",
      alignSelf: "stretch",
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: 16
    },
    therapistNoPrefActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    therapistNoPrefText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primary,
      textAlign: "center"
    },
    therapistNoPrefTextActive: {
      color: "#FFFFFF"
    },
    prefFieldBlock: {
      gap: 6
    },
    prefFieldLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    prefFieldOpen: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    prefFieldOpenText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "600"
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      justifyContent: "flex-end"
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 28,
      maxHeight: "58%"
    },
    modalOption: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 8
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "600"
    },
    safetyModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      justifyContent: "center",
      padding: 20
    },
    safetyModalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      maxHeight: "90%"
    },
    safetyModalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text
    },
    safetyModalBody: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text
    },
    safetyModalSubhead: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4
    }
  });
}

export function IntakeWizardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildIntakeStyles(colors), [colors]);
  const { token, signOut } = useAuth();
  const { refresh } = usePatientProfile();
  const [screenIndex, setScreenIndex] = useState(0);
  const [residencyCountry, setResidencyCountry] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [crisisGate, setCrisisGate] = useState(false);
  const [safetyFrequentModal, setSafetyFrequentModal] = useState(false);
  const [picker, setPicker] = useState<null | "gender" | "age" | "lgbt">(null);

  const totalScreens = 1 + intakeQuestions.length;
  const questionIdx = screenIndex === 0 ? -1 : screenIndex - 1;
  const question = questionIdx >= 0 ? intakeQuestions[questionIdx] : null;
  const progress = useMemo(() => ((screenIndex + 1) / totalScreens) * 100, [screenIndex, totalScreens]);

  const persistAnswer = useCallback(
    (value: string) => {
      if (!question) {
        return;
      }
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    },
    [question]
  );

  const goNext = useCallback(async () => {
    Keyboard.dismiss();

    if (screenIndex === 0) {
      const iso = residencyCountry.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(iso)) {
        setError("Elegí tu país de residencia para continuar.");
        return;
      }
      setError("");
      setScreenIndex(1);
      return;
    }

    if (!question) {
      return;
    }

    const raw = answers[question.id] ?? "";
    const currentAnswer = raw.trim();
    if (!currentAnswer) {
      setError("Completá esta respuesta para continuar.");
      return;
    }

    const follow = question.otherFollowupOption;
    if (follow && question.allowMultiple) {
      const pcs = intakePieces(raw);
      if (pcs.includes(follow)) {
        const detail = pcs.find((p) => p.startsWith(`${follow}:`));
        if (!detail || detail.slice(follow.length + 1).trim().length === 0) {
          setError(`Si elegiste «${follow}», completá el detalle en el campo de texto.`);
          return;
        }
      }
    }

    setError("");

    if (question.id === "emotionalState" && raw.trim() === PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES) {
      setCrisisGate(true);
      return;
    }

    if (screenIndex < totalScreens - 1) {
      setScreenIndex((i) => i + 1);
      return;
    }

    if (question.id === "safetyRisk" && isSafetyRiskFrequentlyAnswer(currentAnswer)) {
      setSafetyFrequentModal(true);
      return;
    }

    if (!token) {
      return;
    }

    const isoRes = residencyCountry.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(isoRes)) {
      setError("Falta país de residencia.");
      setScreenIndex(0);
      return;
    }

    setLoading(true);
    try {
      await submitPatientIntake({
        token,
        answers: { ...answers, [question.id]: raw },
        residencyCountry: isoRes
      });
      await refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "No se pudo guardar el intake.";
      setError(message.includes("409") || message.includes("already") ? "El intake ya fue completado." : message);
    } finally {
      setLoading(false);
    }
  }, [answers, question, refresh, residencyCountry, screenIndex, token, totalScreens]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    setError("");
    setScreenIndex((i) => Math.max(0, i - 1));
  }, []);

  const draft = question ? answers[question.id] ?? "" : "";
  const pieces = useMemo(() => intakePieces(draft), [draft]);
  const followMark = question?.otherFollowupOption;
  const showOtherFollowup =
    Boolean(question && followMark)
    && pieces.some((p) => p === followMark || (followMark && p.startsWith(`${followMark}:`)));
  const otherDetailValue = (() => {
    if (!followMark) {
      return "";
    }
    const hit = pieces.find((p) => p.startsWith(`${followMark}:`));
    return hit ? hit.slice(followMark.length + 1) : "";
  })();

  const therapistPrefParsed =
    question?.therapistPreferenceComposite
      ? parseTherapistPreferencesStored(answers.therapistPreferences ?? "")
      : null;

  useEffect(() => {
    if (question?.id !== "therapistPreferences") {
      return;
    }
    setAnswers((prev) => {
      if (prev.therapistPreferences?.trim()) {
        return prev;
      }
      return {
        ...prev,
        therapistPreferences: buildTherapistPreferencesStored(
          false,
          THERAPIST_PREF_GENDER_OPTIONS_ES[0],
          THERAPIST_PREF_AGE_OPTIONS_ES[0],
          THERAPIST_PREF_LGBT_OPTIONS_ES[0]
        )
      };
    });
  }, [question?.id]);

  const scrollPad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 };

  if (crisisGate) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 4 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, scrollPad]}
        >
          <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroKicker}>Apoyo inmediato</Text>
            <Text style={styles.heroTitle}>Tu bienestar es lo primero</Text>
            <Text style={styles.heroLead}>Si estás en peligro o con pensamientos de hacerte daño, buscá ayuda ahora.</Text>
          </LinearGradient>

          <View style={[styles.card, styles.crisisCard]}>
            <Text style={styles.qTitle}>Recursos de emergencia</Text>
            <View style={styles.crisisList}>
              <Text style={styles.crisisBullet}>• Emergencias: 911 / 112 o la guardia más cercana.</Text>
              <Text style={styles.crisisBullet}>• Argentina: 135 (CABA y GBA) / 143 (crisis y prevención del suicidio).</Text>
              <Text style={styles.crisisBullet}>• México: SAPTEL 55 5259 8121 (CDMX).</Text>
            </View>
            <Text style={styles.qHelp}>
              Para seguir con el cuestionario, elegí otra opción en «¿Cómo te sentís hoy?».
            </Text>
            <PrimaryButton
              label="Volver al cuestionario"
              onPress={() => {
                setCrisisGate(false);
                setAnswers((prev) => ({ ...prev, emotionalState: "" }));
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const pickerOptions =
    picker === "gender"
      ? THERAPIST_PREF_GENDER_OPTIONS_ES
      : picker === "age"
        ? THERAPIST_PREF_AGE_OPTIONS_ES
        : picker === "lgbt"
          ? THERAPIST_PREF_LGBT_OPTIONS_ES
          : [];

  return (
    <>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 4 : 0}
      >
        <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, scrollPad]}
      >
        <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroKicker}>
            Paso {screenIndex + 1} de {totalScreens}
          </Text>
          <Text style={styles.heroTitle}>Tu bienestar empieza acá</Text>
          <Text style={styles.heroLead}>Respuestas confidenciales · Mejor matching con tu profesional</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.card}>
          {screenIndex === 0 ? (
            <>
              <Text style={styles.qTitle}>País de residencia</Text>
              <View style={{ gap: 10 }}>
                {RESIDENCY_COUNTRY_OPTIONS.map((row) => {
                  const selected = residencyCountry === row.code;
                  return (
                    <PrimaryButton
                      key={row.code}
                      label={row.names.es}
                      variant={selected ? "primary" : "ghost"}
                      onPress={() => {
                        setError("");
                        setResidencyCountry(row.code);
                      }}
                      style={styles.optionBtn}
                    />
                  );
                })}
              </View>
            </>
          ) : question ? (
            <>
          <Text style={styles.qTitle}>{question.title}</Text>
          <Text style={styles.qHelp}>{question.help}</Text>

          {question.therapistPreferenceComposite && therapistPrefParsed ? (
            <View style={styles.therapistPrefWrap}>
              <Pressable
                onPress={() => {
                  setError("");
                  const p = parseTherapistPreferencesStored(answers.therapistPreferences ?? "");
                  if (p.exclusive) {
                    setAnswers((prev) => ({
                      ...prev,
                      therapistPreferences: buildTherapistPreferencesStored(
                        false,
                        THERAPIST_PREF_GENDER_OPTIONS_ES[0],
                        THERAPIST_PREF_AGE_OPTIONS_ES[0],
                        THERAPIST_PREF_LGBT_OPTIONS_ES[0]
                      )
                    }));
                    return;
                  }
                  setAnswers((prev) => ({ ...prev, therapistPreferences: THERAPIST_PREF_EXCLUSIVE_ES }));
                  setScreenIndex((i) => Math.min(i + 1, totalScreens - 1));
                }}
                style={[styles.therapistNoPref, therapistPrefParsed.exclusive && styles.therapistNoPrefActive]}
              >
                <Text style={[styles.therapistNoPrefText, therapistPrefParsed.exclusive && styles.therapistNoPrefTextActive]}>
                  {THERAPIST_PREF_EXCLUSIVE_ES}
                </Text>
              </Pressable>

              {!therapistPrefParsed.exclusive ? (
                <View style={{ gap: 12 }}>
                  <View style={styles.prefFieldBlock}>
                    <Text style={styles.prefFieldLabel}>Género del/de la psicólogo/a</Text>
                    <Pressable style={styles.prefFieldOpen} onPress={() => setPicker("gender")}>
                      <Text style={styles.prefFieldOpenText}>
                        {coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, therapistPrefParsed.gender)}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.prefFieldBlock}>
                    <Text style={styles.prefFieldLabel}>Edad aproximada del/de la psicólogo/a</Text>
                    <Pressable style={styles.prefFieldOpen} onPress={() => setPicker("age")}>
                      <Text style={styles.prefFieldOpenText}>
                        {coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, therapistPrefParsed.age)}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.prefFieldBlock}>
                    <Text style={styles.prefFieldLabel}>Experiencia en temas LGBTIQ+</Text>
                    <Pressable style={styles.prefFieldOpen} onPress={() => setPicker("lgbt")}>
                      <Text style={styles.prefFieldOpenText}>
                        {coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, therapistPrefParsed.lgbtq)}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ) : question.options ? (
            <View style={styles.options}>
              {question.options.map((opt, optIdx) => {
                const multi = Boolean(question.allowMultiple);
                const follow = question.otherFollowupOption;
                const selected = multi
                  ? pieces.includes(opt) ||
                    Boolean(follow && opt === follow && pieces.some((p) => follow && p.startsWith(`${follow}:`)))
                  : draft === opt;
                const isCrisisOption =
                  Boolean(question.crisisLastOption && question.options && optIdx === question.options.length - 1);
                const sub = question.optionSubtexts?.[optIdx];
                const variant = isCrisisOption ? "danger" : selected ? "primary" : "ghost";
                return (
                  <View key={opt} style={styles.optionBlock}>
                    <PrimaryButton
                      label={opt}
                      variant={variant}
                      onPress={() => {
                        Keyboard.dismiss();
                        setError("");
                        if (question.id === "safetyRisk" && isSafetyRiskFrequentlyAnswer(opt)) {
                          setAnswers((prev) => applyIntakeOptionSelection(prev, question, opt));
                          setSafetyFrequentModal(true);
                          return;
                        }
                        setAnswers((prev) => applyIntakeOptionSelection(prev, question, opt));
                      }}
                      style={styles.optionBtn}
                    />
                    {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
                  </View>
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

          {showOtherFollowup && followMark ? (
            <>
              <Text style={styles.otherFollowLabel}>Detalle (obligatorio si elegiste «Otro»)</Text>
              <TextInput
                value={otherDetailValue}
                onChangeText={(text) => {
                  setError("");
                  setAnswers((prev) => {
                    const pcs = intakePieces(prev[question.id] ?? "").filter(
                      (p) => p !== followMark && !p.startsWith(`${followMark}:`)
                    );
                    const trimmed = text.trim();
                    const next = trimmed ? [...pcs, `${followMark}: ${text}`] : pcs;
                    return { ...prev, [question.id]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER) };
                  });
                }}
                placeholder="Escribí brevemente…"
                placeholderTextColor={colors.textSubtle}
                multiline
                style={styles.textArea}
                textAlignVertical="top"
                blurOnSubmit={false}
              />
            </>
          ) : null}
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {screenIndex > 0 ? (
              <PrimaryButton label="Atrás" variant="ghost" onPress={goBack} style={styles.half} />
            ) : (
              <View style={styles.half} />
            )}
            <PrimaryButton
              label={screenIndex >= totalScreens - 1 ? "Finalizar" : "Siguiente"}
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

      <Modal
        visible={safetyFrequentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSafetyFrequentModal(false);
          void signOut();
        }}
      >
        <View style={styles.safetyModalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={styles.safetyModalCard}>
              <Text style={styles.safetyModalTitle}>Apoyo inmediato</Text>
              <Text style={styles.safetyModalBody}>
                Lo que estás sintiendo es importante y no tenés que afrontarlo solo/a. En este momento, lo más recomendable es
                buscar ayuda inmediata a través de un servicio de emergencia, una línea de apoyo en crisis o una persona de
                confianza que pueda acompañarte ahora.
              </Text>
              <Text style={styles.safetyModalSubhead}>Argentina — recursos</Text>
              <Text style={styles.safetyModalBody}>• Línea de apoyo al suicida y crisis: 0800-345-1435 (gratis, las 24 h).</Text>
              <Text style={styles.safetyModalBody}>• Emergencias: 911.</Text>
              <Text style={styles.safetyModalBody}>
                Gracias por tu tiempo. No guardamos este cuestionario; podés iniciar sesión de nuevo cuando te sientas en
                condiciones.
              </Text>
              <PrimaryButton
                label="Entendido, salir"
                onPress={() => {
                  setSafetyFrequentModal(false);
                  void signOut();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {pickerOptions.map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.modalOption}
                  onPress={() => {
                    setError("");
                    setAnswers((prev) => {
                      const p = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                      if (picker === "gender") {
                        return {
                          ...prev,
                          therapistPreferences: buildTherapistPreferencesStored(
                            false,
                            opt,
                            coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, p.age),
                            coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, p.lgbtq)
                          )
                        };
                      }
                      if (picker === "age") {
                        return {
                          ...prev,
                          therapistPreferences: buildTherapistPreferencesStored(
                            false,
                            coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, p.gender),
                            opt,
                            coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, p.lgbtq)
                          )
                        };
                      }
                      return {
                        ...prev,
                        therapistPreferences: buildTherapistPreferencesStored(
                          false,
                          coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, p.gender),
                          coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, p.age),
                          opt
                        )
                      };
                    });
                    setPicker(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
