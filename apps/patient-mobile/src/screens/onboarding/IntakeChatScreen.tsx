import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  sendIntakeChatMessage,
  startOrResumeIntakeChat,
  submitIntakeChatSession
} from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { usePatientProfile } from "../../context/PatientProfileContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  ts: string;
  quickReplies?: string[];
};

function buildStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    hero: {
      marginHorizontal: 16,
      borderRadius: 20,
      padding: 16,
      gap: 6,
      marginBottom: 8
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800"
    },
    heroMeta: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 13
    },
    switchBtn: {
      alignSelf: "flex-start",
      marginTop: 4
    },
    switchText: {
      color: "rgba(255,255,255,0.95)",
      fontWeight: "700",
      fontSize: 13,
      textDecorationLine: "underline"
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10
    },
    bubbleAssistant: {
      alignSelf: "flex-start",
      maxWidth: "88%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    bubbleUser: {
      alignSelf: "flex-end",
      maxWidth: "88%",
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 12
    },
    bubbleTextAssistant: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21
    },
    bubbleTextUser: {
      color: "#FFFFFF",
      fontSize: 15,
      lineHeight: 21
    },
    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8
    },
    quickChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6
    },
    quickChipText: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: 13
    },
    safety: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: "rgba(220,38,38,0.12)"
    },
    safetyText: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: 13
    },
    inputRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 8,
      alignItems: "flex-end"
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15
    },
    footerActions: {
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 8
    },
    error: {
      color: colors.danger,
      textAlign: "center",
      fontWeight: "700",
      paddingHorizontal: 16,
      marginBottom: 6
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    }
  });
}

export function IntakeChatScreen(props: {
  onSwitchToClassic: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const { token } = useAuth();
  const { refresh } = usePatientProfile();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [canSubmitEarly, setCanSubmitEarly] = useState(false);
  const [safetyFlagged, setSafetyFlagged] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<string | undefined>();
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const applySession = useCallback(
    (session: {
      sessionId: string;
      messages: ChatMessage[];
      readyToSubmit: boolean;
      canSubmitEarly: boolean;
      safetyFlagged: boolean;
      safetyAlertMessage?: string;
      quota: { turnsRemaining: number };
    }) => {
      setSessionId(session.sessionId);
      setMessages(session.messages);
      setReadyToSubmit(session.readyToSubmit);
      setCanSubmitEarly(session.canSubmitEarly);
      setSafetyFlagged(session.safetyFlagged);
      setSafetyAlert(session.safetyAlertMessage);
      setTurnsRemaining(session.quota.turnsRemaining);
    },
    []
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    let alive = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const { session } = await startOrResumeIntakeChat(token);
        if (alive) {
          applySession(session);
        }
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo iniciar el chat");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, applySession]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!token || !sessionId || !trimmed || sending) {
        return;
      }
      setSending(true);
      setError("");
      setDraft("");
      try {
        const { session } = await sendIntakeChatMessage({
          token,
          sessionId,
          message: trimmed
        });
        applySession(session);
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: true });
        });
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "No se pudo enviar");
      } finally {
        setSending(false);
      }
    },
    [token, sessionId, sending, applySession]
  );

  const submit = useCallback(
    async (mode: "full" | "early") => {
      if (!token || !sessionId || submitting) {
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        await submitIntakeChatSession({ token, sessionId, mode });
        await refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No se pudo finalizar");
      } finally {
        setSubmitting(false);
      }
    },
    [token, sessionId, submitting, refresh]
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Entrevista en chat</Text>
        <Text style={styles.heroMeta}>
          {turnsRemaining != null ? `${turnsRemaining} turnos restantes` : "Asistente de intake"}
        </Text>
        <Pressable style={styles.switchBtn} onPress={props.onSwitchToClassic}>
          <Text style={styles.switchText}>Pasar al cuestionario</Text>
        </Pressable>
      </LinearGradient>

      {safetyFlagged ? (
        <View style={styles.safety}>
          <Text style={styles.safetyText}>
            {safetyAlert ?? "Detectamos una situación sensible. Si estás en crisis, pedí ayuda local."}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, index) => `${item.ts}-${index}`}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View style={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
              <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{item.content}</Text>
              {!isUser && item.quickReplies && item.quickReplies.length > 0 && item === lastAssistant ? (
                <View style={styles.quickRow}>
                  {item.quickReplies.map((reply) => (
                    <Pressable
                      key={reply}
                      style={styles.quickChip}
                      onPress={() => void send(reply)}
                      disabled={sending}
                    >
                      <Text style={styles.quickChipText}>{reply}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.inputRow, { paddingBottom: 4 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribí tu respuesta…"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!sending && !submitting}
        />
        <PrimaryButton
          label="Enviar"
          loading={sending}
          onPress={() => void send(draft)}
          disabled={!draft.trim()}
        />
      </View>

      <View style={[styles.footerActions, { paddingBottom: insets.bottom + 12 }]}>
        {readyToSubmit ? (
          <PrimaryButton label="Finalizar y ver profesionales" loading={submitting} onPress={() => void submit("full")} />
        ) : canSubmitEarly ? (
          <PrimaryButton
            label="Ver profesionales con lo respondido"
            variant="ghost"
            loading={submitting}
            onPress={() => void submit("early")}
          />
        ) : null}
        <PrimaryButton label="Volver" variant="ghost" onPress={props.onCancel} />
      </View>
    </KeyboardAvoidingView>
  );
}
