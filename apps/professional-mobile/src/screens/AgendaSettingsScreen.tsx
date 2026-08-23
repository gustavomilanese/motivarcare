import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyProfile, patchPublicProfile } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StackHeader } from "../components/StackHeader";
import type { ProRootStackParamList } from "../navigation/types";
import { colors, radii } from "../theme/colors";

const MIN_BOOKING_NOTICE_HOURS = 24;

export function AgendaSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProRootStackParamList>>();
  const { token } = useAuth();
  const [professionalId, setProfessionalId] = useState("");
  const [hours, setHours] = useState(String(MIN_BOOKING_NOTICE_HOURS));
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNotice, setSavingNotice] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      setLoading(true);
      void getMyProfile(token)
        .then((response) => {
          const profile = response.profile;
          setProfessionalId(profile?.id ?? "");
          setHours(String(Math.max(MIN_BOOKING_NOTICE_HOURS, profile?.cancellationHours ?? MIN_BOOKING_NOTICE_HOURS)));
          setPrice(profile?.sessionPriceUsd ? String(profile.sessionPriceUsd) : "");
          setError("");
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo cargar el perfil."))
        .finally(() => setLoading(false));
    }, [token])
  );

  return (
    <Screen>
      <StackHeader title="Ajustes de agenda" onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        <Card>
          <Text style={styles.kicker}>Tiempo mínimo para agendar</Text>
          <Text style={styles.body}>
            Define con cuántas horas de anticipación se puede reservar una sesión. El mínimo permitido es 24 horas.
          </Text>
          <Text style={styles.label}>Horas mínimas</Text>
          <TextInput
            value={hours}
            onChangeText={setHours}
            keyboardType="number-pad"
            style={styles.input}
          />
          <PrimaryButton
            label="Guardar anticipación"
            loading={savingNotice}
            onPress={() => {
              if (!token || !professionalId) {
                return;
              }
              const normalized = Math.max(MIN_BOOKING_NOTICE_HOURS, Math.min(168, Math.round(Number(hours || MIN_BOOKING_NOTICE_HOURS))));
              setSavingNotice(true);
              setError("");
              setMessage("");
              void patchPublicProfile(token, professionalId, { cancellationHours: normalized })
                .then(() => {
                  setHours(String(normalized));
                  setMessage(`Tiempo mínimo para agendar actualizado: ${normalized} horas.`);
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo guardar."))
                .finally(() => setSavingNotice(false));
            }}
          />
        </Card>
        <Card>
          <Text style={styles.kicker}>Valor de sesión</Text>
          <Text style={styles.body}>Precio de lista en USD. Los pacientes lo ven convertido a su moneda local.</Text>
          <Text style={styles.label}>USD</Text>
          <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" style={styles.input} />
          <PrimaryButton
            label="Guardar valor"
            loading={savingPrice}
            onPress={() => {
              if (!token || !professionalId) {
                return;
              }
              const usdRounded = Math.max(0, Math.min(10_000_000, Math.round(Number(price || 0))));
              setSavingPrice(true);
              setError("");
              setMessage("");
              void patchPublicProfile(token, professionalId, { sessionPriceUsd: usdRounded > 0 ? usdRounded : null })
                .then(() => {
                  setPrice(usdRounded > 0 ? String(usdRounded) : "");
                  setMessage(usdRounded > 0 ? `Valor de sesión actualizado: USD ${usdRounded}.` : "Valor de sesión quitado.");
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo guardar."))
                .finally(() => setSavingPrice(false));
            }}
          />
        </Card>
        <Text style={styles.hint}>Las vacaciones se marcan en Horarios → Publicados.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: 12 },
  kicker: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 },
  input: {
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: colors.text,
    marginBottom: 12
  },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.success, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.muted }
});
