import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getGoogleCalendarStatus, startGoogleCalendarConnect } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { usePatientProfile } from "../../context/PatientProfileContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { PostIntakeParamList } from "../../navigation/types";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";

function buildCalendarConnectStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      gap: 14
    },
    hero: {
      borderRadius: 24,
      padding: 22,
      gap: 8
    },
    kicker: {
      color: "rgba(255,255,255,0.8)",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase"
    },
    title: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5
    },
    lead: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 15,
      lineHeight: 22,
      marginTop: 4
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    bullet: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22
    },
    message: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600"
    }
  });
}

export function CalendarConnectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildCalendarConnectStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<PostIntakeParamList>>();
  const { token } = useAuth();
  const { refresh } = usePatientProfile();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const attachCalendar = useCallback(async () => {
    if (!token) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const redirectUrl = Linking.createURL("gcal");
      const { authUrl } = await startGoogleCalendarConnect({
        token,
        returnPath: "/profile",
        clientOrigin: redirectUrl
      });

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      WebBrowser.maybeCompleteAuthSession();

      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const status = Array.isArray(parsed.queryParams?.calendar_sync)
          ? parsed.queryParams?.calendar_sync[0]
          : parsed.queryParams?.calendar_sync;
        if (status === "connected") {
          setMessage("Calendario vinculado. Tus sesiones se sincronizan con Google.");
        } else if (status === "error") {
          setMessage("No se pudo completar la vinculación. Probá de nuevo más tarde.");
        } else {
          setMessage("Listo.");
        }
      }

      await refresh();
      await getGoogleCalendarStatus(token);
    } catch (calendarError) {
      const err = calendarError instanceof Error ? calendarError.message : "Error";
      if (err.includes("503")) {
        setMessage("Google Calendar no está configurado en el servidor.");
      } else {
        setMessage(err);
      }
    } finally {
      setBusy(false);
    }
  }, [refresh, token]);

  const skip = useCallback(() => {
    navigation.navigate("Matching");
  }, [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.kicker}>Opcional</Text>
        <Text style={styles.title}>Conectá tu Google Calendar</Text>
        <Text style={styles.lead}>
          Recibí invitaciones automáticas con Meet en tu agenda. Podés hacerlo ahora o más tarde desde Perfil.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.bullet}>• Invitaciones con hora en tu zona</Text>
        <Text style={styles.bullet}>• Enlaces de videollamada en el evento</Text>
        <Text style={styles.bullet}>• Misma cuenta OAuth que usa la plataforma en tu región</Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton
          label={busy ? "Abriendo Google…" : "Vincular Google Calendar"}
          loading={busy}
          onPress={() => {
            void attachCalendar();
          }}
        />
        <PrimaryButton label="Continuar sin vincular" variant="ghost" onPress={skip} />
      </View>
    </View>
  );
}
