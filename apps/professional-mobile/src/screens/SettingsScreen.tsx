import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  changePassword,
  disconnectCalendar,
  getCalendarStatus,
  startCalendarConnect
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StackHeader } from "../components/StackHeader";
import type { ProRootStackParamList } from "../navigation/types";
import { colors, radii } from "../theme/colors";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProRootStackParamList>>();
  const { token, signOut } = useAuth();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCalendar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCalendarLoading(true);
    try {
      const status = await getCalendarStatus(token);
      setCalendarConnected(status.connected);
      setCalendarEmail(status.connection?.providerEmail ?? "");
    } catch {
      setCalendarConnected(false);
      setCalendarEmail("");
    } finally {
      setCalendarLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadCalendar();
    }, [loadCalendar])
  );

  return (
    <Screen>
      <StackHeader title="Ajustes" onBack={() => navigation.goBack()} />
      <Text style={styles.lead}>Preferencias de cuenta, sincronización y seguridad de tu portal profesional.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        <Card>
          <Text style={styles.kicker}>Google Calendar</Text>
          {calendarLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : calendarConnected ? (
            <>
              <Text style={styles.body}>Conectado como {calendarEmail || "—"}</Text>
              <PrimaryButton
                variant="ghost"
                label="Desconectar"
                loading={calendarBusy}
                onPress={() => {
                  if (!token) {
                    return;
                  }
                  setCalendarBusy(true);
                  setError("");
                  void disconnectCalendar(token)
                    .then(() => {
                      setCalendarConnected(false);
                      setCalendarEmail("");
                      setMessage("Google Calendar desconectado.");
                    })
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo desconectar."))
                    .finally(() => setCalendarBusy(false));
                }}
              />
            </>
          ) : (
            <>
              <Text style={styles.body}>Invitaciones con hora en tu zona y enlaces de Meet en el evento.</Text>
              <PrimaryButton
                label="Vincular Google Calendar"
                loading={calendarBusy}
                onPress={() => {
                  if (!token) {
                    return;
                  }
                  setCalendarBusy(true);
                  setError("");
                  setMessage("");
                  const redirectUrl = Linking.createURL("gcal");
                  void startCalendarConnect(token, { clientOrigin: redirectUrl, returnPath: "/ajustes" })
                    .then(async ({ authUrl }) => {
                      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
                      WebBrowser.maybeCompleteAuthSession();
                      if (result.type === "success") {
                        setMessage("Calendario vinculado.");
                      }
                      await loadCalendar();
                    })
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo conectar."))
                    .finally(() => setCalendarBusy(false));
                }}
              />
            </>
          )}
        </Card>
        <Card>
          <Text style={styles.kicker}>Cambiar contraseña</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Contraseña actual"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nueva contraseña"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repetir nueva"
            secureTextEntry
            style={styles.input}
          />
          <PrimaryButton
            label="Actualizar contraseña"
            loading={savingPassword}
            onPress={() => {
              if (!token) {
                return;
              }
              if (!currentPassword || !newPassword || !confirmPassword) {
                setError("Completá contraseña actual, nueva y repetida.");
                return;
              }
              setSavingPassword(true);
              setError("");
              setMessage("");
              void changePassword(token, { currentPassword, newPassword, confirmPassword })
                .then((response) => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setMessage(response.message || "Contraseña actualizada.");
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo actualizar."))
                .finally(() => setSavingPassword(false));
            }}
          />
        </Card>
        <PrimaryButton variant="danger" label="Salir" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 8 },
  list: { paddingBottom: 32, gap: 12 },
  kicker: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 12 },
  input: {
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: colors.text,
    marginBottom: 8
  },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.success, marginBottom: 8 }
});
