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
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { resetPassword } from "../api/client";
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

export function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const token = route.params?.token?.trim() ?? "";
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    if (password.length < 8) {
      setError("La nueva contraseña necesita al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (token.length < 32) {
      setError("Falta el token del enlace. Abrí el link del correo o pedí uno nuevo.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la contraseña.");
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
          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.sub}>Elegí una contraseña segura para tu cuenta de paciente.</Text>

          {done ? (
            <>
              <Text style={styles.success}>Tu contraseña fue actualizada. Ya podés iniciar sesión.</Text>
              <PrimaryButton label="Iniciar sesión" onPress={() => navigation.navigate("Login")} />
            </>
          ) : (
            <>
              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                editable={!loading}
                placeholder="••••••••"
                placeholderTextColor={colors.textSubtle}
              />
              <Text style={styles.label}>Confirmar</Text>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                style={styles.input}
                editable={!loading}
                placeholder="••••••••"
                placeholderTextColor={colors.textSubtle}
                returnKeyType="go"
                onSubmitEditing={() => {
                  void onSubmit();
                }}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Guardar contraseña" loading={loading} onPress={() => void onSubmit()} />
            </>
          )}

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
            <Text style={styles.link}>← Ir al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
