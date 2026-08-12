import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import type { AuthStackParamList } from "../navigation/types";

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
      borderColor: colors.border,
      alignItems: "center"
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
    body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center" },
    error: { color: colors.danger, fontWeight: "600", textAlign: "center" }
  });
}

export function VerifyEmailTokenScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, "VerifyEmailToken">>();
  const tokenParam = route.params?.token?.trim() ?? "";
  const { applyVerifyEmailLink, token, signOut } = useAuth();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [state, setState] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (!tokenParam) {
      setState("error");
      setMessage("Falta el token del enlace. Abrí el link del correo o pedí uno nuevo.");
      return;
    }

    void (async () => {
      try {
        await applyVerifyEmailLink(tokenParam);
        // Auth gate will move the user into the app once emailVerified flips.
      } catch (requestError) {
        setState("error");
        setMessage(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo verificar el email. El enlace puede haber expirado."
        );
      }
    })();
  }, [tokenParam, applyVerifyEmailLink]);

  return (
    <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        {state === "loading" ? (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.title}>Verificando tu email…</Text>
            <Text style={styles.body}>Un momento, estamos confirmando el enlace.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>No se pudo verificar</Text>
            <Text style={styles.error}>{message}</Text>
            <PrimaryButton
              label={token ? "Volver" : "Ir al inicio de sesión"}
              onPress={() => {
                if (token) {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                    return;
                  }
                  void signOut();
                  return;
                }
                navigation.navigate("Login");
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}
