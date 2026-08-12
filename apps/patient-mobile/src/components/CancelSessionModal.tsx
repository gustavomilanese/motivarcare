import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cancelMineBooking } from "../api/client";
import type { BookingItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import { willPatientLoseCreditOnCancel } from "../utils/patientReschedule";
import { PrimaryButton } from "./ui/PrimaryButton";

type Props = {
  visible: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onCancelled: () => void;
};

function buildStyles(c: AppThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.5)" },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 12,
      borderTopWidth: 1,
      borderColor: c.border
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 999,
      backgroundColor: c.border,
      marginBottom: 4
    },
    title: { fontSize: 20, fontWeight: "800", color: c.text },
    sub: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    warnBox: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "rgba(220, 38, 38, 0.45)",
      backgroundColor: "rgba(220, 38, 38, 0.1)",
      padding: 14,
      gap: 6
    },
    warnTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: c.danger,
      letterSpacing: -0.2
    },
    warnBody: {
      fontSize: 14,
      lineHeight: 20,
      color: c.text,
      fontWeight: "600"
    },
    okBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted,
      padding: 14
    },
    input: {
      minHeight: 96,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.surfaceMuted,
      textAlignVertical: "top"
    },
    error: { color: c.danger, fontWeight: "600" }
  });
}

export function CancelSessionModal(props: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const losesCredit = Boolean(
    props.booking && willPatientLoseCreditOnCancel(props.booking.startsAt)
  );
  const isTrial = props.booking?.bookingMode === "trial";

  useEffect(() => {
    if (!props.visible) {
      setReason("");
      setError("");
      setLoading(false);
    }
  }, [props.visible]);

  const onSubmit = async () => {
    if (!token || !props.booking) {
      return;
    }
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Indicá el motivo (mínimo 3 caracteres).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await cancelMineBooking({ token, bookingId: props.booking.id, reason: trimmed });
      setReason("");
      props.onCancelled();
      props.onClose();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={props.onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Cancelar sesión</Text>

          {losesCredit ? (
            <View style={styles.warnBox} accessibilityRole="alert">
              <Text style={styles.warnTitle}>Vas a perder esta sesión</Text>
              <Text style={styles.warnBody}>
                {isTrial
                  ? "Faltan menos de 24 horas. Si cancelás ahora, perdés la sesión de prueba: no se puede reprogramar ni recuperar."
                  : "Faltan menos de 24 horas. Si cancelás ahora, perdés el crédito de esta sesión y no se vuelve a tu saldo."}
              </Text>
            </View>
          ) : (
            <View style={styles.okBox}>
              <Text style={styles.sub}>
                {isTrial
                  ? "Con más de 24 h de anticipación no se devuelve el dinero, pero podés elegir otro horario sin pagar de nuevo."
                  : "Con más de 24 h de anticipación el crédito vuelve a tus sesiones disponibles (sin reembolso en dinero)."}
              </Text>
            </View>
          )}

          <Text style={styles.sub}>Contanos el motivo de la cancelación.</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={styles.input}
            multiline
            editable={!loading}
            placeholder="Motivo de la cancelación"
            placeholderTextColor={colors.textSubtle}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={losesCredit ? "Cancelar y perder el crédito" : "Confirmar cancelación"}
            loading={loading}
            variant="danger"
            onPress={() => void onSubmit()}
          />
          <PrimaryButton label="Volver" variant="ghost" onPress={props.onClose} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
