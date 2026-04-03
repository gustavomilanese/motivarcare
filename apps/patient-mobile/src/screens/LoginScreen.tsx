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
import { LinearGradient } from "expo-linear-gradient";
import { apiBaseUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import type { AuthStackParamList } from "../navigation/types";

function buildLoginStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollInner: {
      flexGrow: 1
    },
    hero: {
      marginHorizontal: 16,
      borderRadius: 24,
      padding: 22,
      gap: 6
    },
    brand: {
      color: "#FFFFFF",
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -1
    },
    tag: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 16
    },
    card: {
      marginTop: 8,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 22,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.tabBarShadow,
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text
    },
    sub: {
      color: colors.textMuted,
      marginBottom: 8,
      fontSize: 15
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
    linkWrap: {
      alignItems: "center",
      paddingVertical: 8
    },
    link: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: 15
    },
    meta: {
      marginTop: 20,
      color: colors.textSubtle,
      fontSize: 11,
      textAlign: "center"
    }
  });
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuth();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildLoginStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión";
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
        contentContainerStyle={[styles.scrollInner, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      >
        <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.brand}>MotivarCare</Text>
          <Text style={styles.tag}>Terapia conectada a tu vida real</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.title}>Entrá</Text>
          <Text style={styles.sub}>Usá la misma cuenta que en la web.</Text>

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

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            editable={!loading}
            onSubmitEditing={() => {
              void onSubmit();
            }}
            placeholder="••••••••"
            placeholderTextColor={colors.textSubtle}
            returnKeyType="go"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Iniciar sesión" loading={loading} onPress={() => void onSubmit()} />

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              navigation.navigate("Register");
            }}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>Crear cuenta paciente</Text>
          </Pressable>

          <Text style={styles.meta}>API · {apiBaseUrl}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
