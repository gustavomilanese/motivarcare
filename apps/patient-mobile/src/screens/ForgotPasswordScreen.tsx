import { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { forgotPassword } from "../api/client";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import type { AuthStackParamList } from "../navigation/types";

function buildStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scrollInner: { flexGrow: 1 },
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    title: { fontSize: 26, fontWeight: "800", color: colors.text },
    sub: { color: colors.textMuted, marginBottom: 8, fontSize: 15, lineHeight: 22 },
    label: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    input: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceMuted
    },
    error: { color: colors.danger, fontWeight: "600" },
    success: { color: colors.success, fontWeight: "600", lineHeight: 20 },
    linkWrap: { alignItems: "center", paddingVertical: 8 },
    link: { color: colors.primary, fontWeight: "800", fontSize: 15 }
  });
}

export function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    setMessage("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Ingresá un email válido.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email: trimmed });
      setMessage(
        "Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo enviar el email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollInner,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.sub}>
            Te enviaremos un enlace por email para elegir una nueva contraseña.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
            placeholder="nombre@email.com"
            placeholderTextColor={colors.textSubtle}
            returnKeyType="go"
            onSubmitEditing={() => {
              void onSubmit();
            }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          <PrimaryButton label="Enviar enlace" loading={loading} onPress={() => void onSubmit()} />

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              navigation.navigate("Login");
            }}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>← Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
