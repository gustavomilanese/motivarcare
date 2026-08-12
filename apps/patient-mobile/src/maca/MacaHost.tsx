import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getBookingsMine, getPublicFeatures } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useThemeMode } from "../theme/ThemeContext";
import { patientMacaEligible } from "./patientMacaEligibility";
import { useTreatmentChat } from "./useTreatmentChat";

const ASSISTANT_NAME = "Maca";

/**
 * FAB + panel de Maca (treatment chat). Respeta feature flag + elegibilidad.
 */
export function MacaHost() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const { token } = useAuth();
  const { profile } = usePatientProfile();
  const [flagOn, setFlagOn] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const features = await getPublicFeatures();
        if (!alive) return;
        setFlagOn(Boolean(features.treatmentChatEnabled));
      } catch {
        if (alive) setFlagOn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!token || !flagOn) {
        if (alive) setEligible(false);
        return;
      }
      try {
        const bookingsRes = await getBookingsMine(token);
        const credits = profile?.latestPackage?.remainingCredits ?? 0;
        if (alive) {
          setEligible(
            patientMacaEligible({
              creditsRemaining: credits,
              bookings: bookingsRes.bookings ?? []
            })
          );
        }
      } catch {
        if (alive) {
          setEligible((profile?.latestPackage?.remainingCredits ?? 0) > 0);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, flagOn, profile?.latestPackage?.remainingCredits]);

  const chat = useTreatmentChat({ authToken: token, enabled: open && flagOn && eligible });

  const visible = flagOn && eligible;

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || chat.sending) return;
    setDraft("");
    void chat.sendMessage(text);
  }, [draft, chat]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fab: {
          position: "absolute",
          right: 18,
          bottom: Math.max(insets.bottom, 12) + 78,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          zIndex: 40
        },
        fabLabel: { color: "#fff", fontWeight: "800", fontSize: 12, marginTop: 1 },
        panel: {
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 8
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
        headerMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
        body: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
        bubbleUser: {
          alignSelf: "flex-end",
          maxWidth: "88%",
          backgroundColor: colors.primary,
          borderRadius: 16,
          padding: 12,
          marginBottom: 8
        },
        bubbleAssistant: {
          alignSelf: "flex-start",
          maxWidth: "88%",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          padding: 12,
          marginBottom: 8
        },
        bubbleTextUser: { color: "#fff", fontSize: 15, lineHeight: 21 },
        bubbleTextAssistant: { color: colors.text, fontSize: 15, lineHeight: 21 },
        safety: {
          marginHorizontal: 14,
          marginBottom: 8,
          padding: 10,
          borderRadius: 12,
          backgroundColor: "rgba(220,38,38,0.12)"
        },
        safetyText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
        error: { color: colors.danger, fontWeight: "700", paddingHorizontal: 14, marginBottom: 6 },
        hint: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 14, marginBottom: 6 },
        inputRow: {
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 14,
          paddingTop: 8,
          alignItems: "flex-end"
        },
        input: {
          flex: 1,
          minHeight: 44,
          maxHeight: 110,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.text
        },
        consentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 8
        },
        consentText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
        loader: { flex: 1, alignItems: "center", justifyContent: "center" }
      }),
    [colors, insets.bottom, insets.top]
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat con Maca"
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
        <Text style={styles.fabLabel}>{ASSISTANT_NAME}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={styles.panel}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
              <Text style={styles.headerMeta}>
                {chat.conversation
                  ? `${chat.conversation.quota.dailyTurnsRemaining} turnos hoy · ${chat.conversation.session.minutesRemaining} min sesión`
                  : "Asistente de bienestar"}
              </Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>

          {chat.loadState === "loading" || chat.loadState === "idle" ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <>
              <Text style={styles.hint}>
                Orientación general del portal y bienestar. No reemplaza el chat con tu profesional ni emergencias.
              </Text>
              {chat.safetyAlert ? (
                <View style={styles.safety}>
                  <Text style={styles.safetyText}>{chat.safetyAlert}</Text>
                </View>
              ) : null}
              {chat.errorMessage ? <Text style={styles.error}>{chat.errorMessage}</Text> : null}

              <FlatList
                ref={listRef}
                style={styles.body}
                data={chat.messages}
                keyExtractor={(item) => item.id}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isUser = item.role === "user";
                  return (
                    <View style={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
                      <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                        {item.content}
                      </Text>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.hint}>Escribile a Maca para empezar.</Text>
                }
              />

              {chat.conversation ? (
                <View style={styles.consentRow}>
                  <Text style={styles.consentText}>
                    Permitir que tu profesional vea un resumen de este chat
                  </Text>
                  <Switch
                    value={chat.conversation.professionalShareConsent}
                    disabled={chat.consentSaving}
                    onValueChange={(v) => void chat.setShareConsent(v)}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={
                      chat.conversation.professionalShareConsent ? colors.primary : "#f4f3f4"
                    }
                  />
                </View>
              ) : null}

              <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10 }]}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Escribí un mensaje…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  editable={!chat.sending}
                />
                <PrimaryButton
                  label="Enviar"
                  loading={chat.sending}
                  disabled={!draft.trim()}
                  onPress={send}
                />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
