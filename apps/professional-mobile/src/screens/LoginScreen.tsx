import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiBaseUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radii } from "../theme/colors";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.brand}>MotivarCare</Text>
        <Text style={styles.tag}>Portal profesional</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.sub}>Usá la misma cuenta del consultorio.</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Entrar"
            loading={loading}
            onPress={() => {
              setLoading(true);
              setError("");
              void signIn(email, password)
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "No se pudo entrar.");
                })
                .finally(() => setLoading(false));
            }}
          />
        </View>
        <Text style={styles.meta}>{apiBaseUrl}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  inner: { flex: 1, paddingHorizontal: 16 },
  brand: { fontSize: 28, fontWeight: "800", color: colors.primary, letterSpacing: -0.8 },
  tag: { marginTop: 4, marginBottom: 20, color: colors.muted, fontSize: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
    gap: 8
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { color: colors.muted, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted },
  input: {
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: colors.text
  },
  error: { color: colors.danger, fontWeight: "600" },
  meta: { marginTop: 16, textAlign: "center", color: colors.hint, fontSize: 11 }
});
