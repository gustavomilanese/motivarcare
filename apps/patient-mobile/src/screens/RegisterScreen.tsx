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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import type { AuthStackParamList } from "../navigation/types";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function buildRegisterStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollInner: {
      flexGrow: 1
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 22,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text
    },
    sub: {
      color: colors.textMuted,
      marginBottom: 8
    },
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
    error: {
      color: colors.danger,
      fontWeight: "600"
    },
    link: {
      textAlign: "center",
      color: colors.primary,
      fontWeight: "800",
      paddingVertical: 8
    },
    passwordRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8
    },
    passwordInputWrap: {
      flex: 1,
      minWidth: 0
    },
    eyeBtn: {
      width: 48,
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    }
  });
}

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildRegisterStyles(colors), [colors]);
  const [fullName, setFullName] = useState("");
  const [residencyCountry, setResidencyCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden. Escribí la misma en ambos campos.");
      return;
    }
    const iso = residencyCountry.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) {
      setError("Indicá tu país de residencia con 2 letras (ISO), por ejemplo AR, US o MX.");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        timezone: deviceTimeZone(),
        residencyCountry: iso
      });
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "No se pudo registrar";
      setError(message);
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
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.sub}>Paciente · Acceso al portal móvil</Text>

          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            editable={!loading}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textSubtle}
            returnKeyType="next"
          />

          <Text style={styles.label}>País de residencia (ISO2)</Text>
          <Text style={styles.sub}>Ej. AR, US, BR — define el mercado de precios y paquetes.</Text>
          <TextInput
            value={residencyCountry}
            onChangeText={(v) => setResidencyCountry(v.toUpperCase().replace(/[^A-Za-z]/g, "").slice(0, 2))}
            style={styles.input}
            editable={!loading}
            placeholder="AR"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
            maxLength={2}
            returnKeyType="next"
          />

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
            returnKeyType="next"
          />

          <Text style={styles.label}>Contraseña (mín. 8)</Text>
          <View style={styles.passwordRow}>
            <View style={styles.passwordInputWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                editable={!loading}
                onSubmitEditing={() => {
                  void onSubmit();
                }}
                returnKeyType="go"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              onPress={() => setShowPassword((v) => !v)}
              style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.85 }]}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <Text style={styles.label}>Repetir contraseña</Text>
          <View style={styles.passwordRow}>
            <View style={styles.passwordInputWrap}>
              <TextInput
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry={!showPasswordConfirm}
                style={styles.input}
                editable={!loading}
                placeholder="Misma contraseña"
                placeholderTextColor={colors.textSubtle}
                returnKeyType="go"
                onSubmitEditing={() => {
                  void onSubmit();
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPasswordConfirm ? "Ocultar repetición" : "Ver repetición"}
              onPress={() => setShowPasswordConfirm((v) => !v)}
              style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.85 }]}
              hitSlop={8}
            >
              <Ionicons
                name={showPasswordConfirm ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Registrarme" loading={loading} onPress={() => void onSubmit()} />

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack();
            }}
          >
            <Text style={styles.link}>Ya tengo cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
