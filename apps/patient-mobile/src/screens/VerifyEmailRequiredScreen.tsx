import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resendEmailVerification } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";

function buildStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      paddingHorizontal: 16
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    chip: {
      alignSelf: "flex-start",
      backgroundColor: colors.primarySoft,
      color: colors.primaryDark,
      overflow: "hidden",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 12,
      fontWeight: "800"
    },
    title: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
    error: { color: colors.danger, fontWeight: "600" },
    success: { color: colors.success, fontWeight: "600" },
    logout: { color: colors.primary, fontWeight: "800", textAlign: "center", paddingVertical: 8 }
  });
}

export function VerifyEmailRequiredScreen() {
  const insets = useSafeAreaInsets();
  const { token, signOut, refreshAuthMe } = useAuth();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onResend = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await resendEmailVerification(token);
      setMessage(response.message || "Te reenviamos el correo de verificación.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reenviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await refreshAuthMe();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el estado.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        <Text style={styles.chip}>Verificación requerida</Text>
        <Text style={styles.title}>Revisá tu correo para continuar</Text>
        <Text style={styles.body}>Abrí tu correo y seguí las instrucciones.</Text>
        <Text style={styles.body}>Chequeá SPAM si no lo ves.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <PrimaryButton label="Reenviar correo" loading={loading} onPress={() => void onResend()} />
        <PrimaryButton
          label="Ya verifiqué — actualizar"
          variant="ghost"
          loading={refreshing}
          onPress={() => void onRefresh()}
        />

        <Pressable onPress={() => void signOut()}>
          <Text style={styles.logout}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}
