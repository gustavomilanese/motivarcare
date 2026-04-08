import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  getProfileMe,
  startGoogleCalendarConnect,
  syncTimezone
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import { PersonAvatar } from "../components/PersonAvatar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useThemeMode } from "../theme/ThemeContext";
import { formatDate } from "../utils/date";

const TAB_BAR_BOTTOM_PAD = 90;

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { token, user, signOut } = useAuth();
  const { profile: patientProfile, refresh: refreshProfileContext } = usePatientProfile();
  const { mode, setMode, colors: c } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [error, setError] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [profileDetails, setProfileDetails] = useState({
    timezone: null as string | null,
    latestPackage: null as string | null,
    latestPackagePurchasedAt: null as string | null,
    creditsRemaining: null as number | null,
    recentPackages: [] as { id: string; name: string; credits: number; purchasedAt: string }[]
  });

  const divider = useMemo(
    () => (mode === "dark" ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)"),
    [mode]
  );

  const heroGradient = useMemo(
    () =>
      mode === "dark"
        ? (["rgba(124, 106, 252, 0.28)", "rgba(2, 6, 23, 0)"] as const)
        : (["rgba(95, 68, 235, 0.16)", "rgba(247, 248, 252, 0)"] as const),
    [mode]
  );

  const statWell = useMemo(
    () => (mode === "dark" ? c.surfacePressed : "rgba(95, 68, 235, 0.07)"),
    [mode, c.surfacePressed]
  );

  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [profileResponse, calendarStatus] = await Promise.all([
        getProfileMe(token),
        getGoogleCalendarStatus(token)
      ]);
      setProfileDetails({
        timezone: profileResponse.profile?.lastSeenTimezone ?? profileResponse.profile?.timezone ?? null,
        latestPackage: profileResponse.profile?.latestPackage?.name ?? null,
        latestPackagePurchasedAt: profileResponse.profile?.latestPackage?.purchasedAt ?? null,
        creditsRemaining: profileResponse.profile?.latestPackage?.remainingCredits ?? null,
        recentPackages: profileResponse.profile?.recentPackages ?? []
      });
      setCalendarConnected(calendarStatus.connected);
      setCalendarEmail(calendarStatus.connection?.providerEmail ?? null);
      await syncTimezone({ token, timezone: deviceTimeZone(), persistPreference: false });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar perfil");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connectCalendar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCalendarBusy(true);
    try {
      const redirectUrl = Linking.createURL("gcal");
      const { authUrl } = await startGoogleCalendarConnect({
        token,
        returnPath: "/profile",
        clientOrigin: redirectUrl
      });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      WebBrowser.maybeCompleteAuthSession();
      if (result.type === "success") {
        await refresh();
        await refreshProfileContext();
      }
    } catch (calendarError) {
      Alert.alert("Calendario", calendarError instanceof Error ? calendarError.message : "Error");
    } finally {
      setCalendarBusy(false);
    }
  }, [refresh, refreshProfileContext, token]);

  const disconnectCalendar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCalendarBusy(true);
    try {
      await disconnectGoogleCalendar(token);
      await refresh();
    } catch (disconnectError) {
      Alert.alert("Calendario", disconnectError instanceof Error ? disconnectError.message : "Error");
    } finally {
      setCalendarBusy(false);
    }
  }, [refresh, token]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + TAB_BAR_BOTTOM_PAD
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: c.text }]}>Perfil</Text>
      <Text style={[styles.screenSubtitle, { color: c.textMuted }]}>
        Tu cuenta, plan y preferencias
      </Text>

      <View style={styles.heroBlock}>
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGlow}
          pointerEvents="none"
        />
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: c.surface,
              borderColor: divider,
              shadowColor: mode === "dark" ? "#000" : "#0F172A"
            }
          ]}
        >
          <View style={styles.heroTop}>
            <View style={[styles.avatarRing, { borderColor: c.primary }]}>
              <PersonAvatar
                uri={patientProfile?.avatarUrl ?? user?.avatarUrl ?? null}
                name={user?.fullName ?? "Paciente"}
                size={56}
              />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={[styles.name, { color: c.text }]}>{user?.fullName ?? "Paciente"}</Text>
              {user?.email ? (
                <Text style={[styles.email, { color: c.textMuted }]}>{user.email}</Text>
              ) : null}
              <View style={[styles.rolePill, { backgroundColor: c.accentSoft }]}>
                <Ionicons name="shield-checkmark" size={13} color={c.success} />
                <Text style={[styles.roleText, { color: c.success }]}>Paciente verificado</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroStats, { backgroundColor: statWell }]}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: c.textSubtle }]}>Sesiones disponibles</Text>
              <Text style={[styles.heroStatValue, { color: c.text }]}>
                {profileDetails.creditsRemaining != null ? String(profileDetails.creditsRemaining) : "—"}
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: divider }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: c.textSubtle }]}>Plan activo</Text>
              <Text style={[styles.heroStatValue, { color: c.text }]} numberOfLines={1}>
                {profileDetails.latestPackage ?? "Sin paquete"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: c.textSubtle }]}>Cuenta</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: c.surface, borderColor: c.border, shadowColor: mode === "dark" ? "#000" : "#0F172A" }
        ]}
      >
        {loading ? (
          <View style={styles.groupLoading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            <View style={styles.groupRow}>
              <View style={[styles.rowIconWrap, { backgroundColor: c.primarySoft }]}>
                <Ionicons name="time-outline" size={18} color={c.primary} />
              </View>
              <View style={[styles.rowBody, styles.rowBodyGrow]}>
                <Text style={[styles.rowLabel, { color: c.textMuted }]}>Zona horaria</Text>
                <Text style={[styles.rowValue, { color: c.text }]}>
                  {profileDetails.timezone ?? deviceTimeZone()}
                </Text>
              </View>
              {profileDetails.latestPackagePurchasedAt ? (
                <View style={[styles.rowBody, styles.rowBodyEnd, { alignItems: "flex-end" }]}>
                  <Text style={[styles.rowLabel, { color: c.textMuted }]}>Última compra</Text>
                  <Text style={[styles.rowValue, { color: c.text }]} numberOfLines={1}>
                    {formatDate(profileDetails.latestPackagePurchasedAt)}
                  </Text>
              </View>
            ) : null}
          </View>
          </>
        )}
      </View>

      {profileDetails.recentPackages.length > 0 ? (
        <>
          <Text style={[styles.sectionHeading, { color: c.textSubtle }]}>Historial de compras</Text>
          <View
            style={[
              styles.group,
              { backgroundColor: c.surface, borderColor: c.border, shadowColor: mode === "dark" ? "#000" : "#0F172A" }
            ]}
          >
            {profileDetails.recentPackages.map((purchase, index) => (
              <View key={purchase.id}>
                {index > 0 ? (
                  <View style={[styles.historyHairline, { backgroundColor: divider }]} />
                ) : null}
                <View style={styles.historyRow}>
                  <View style={[styles.viewIconWrap, { backgroundColor: c.primarySoft }]}>
                    <Ionicons name="bag-outline" size={17} color={c.primary} />
                  </View>
                  <View style={styles.historyMain}>
                    <Text style={[styles.historyName, { color: c.text }]} numberOfLines={1}>
                      {purchase.name}
                    </Text>
                    <Text style={[styles.historyMeta, { color: c.textMuted }]}>
                      {purchase.credits} {purchase.credits === 1 ? "sesión" : "sesiones"}
                    </Text>
                  </View>
                  <Text style={[styles.historyDate, { color: c.textSubtle }]}>
                    {formatDate(purchase.purchasedAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionHeading, { color: c.textSubtle }]}>Preferencias</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: c.surface, borderColor: c.border, shadowColor: mode === "dark" ? "#000" : "#0F172A" }
        ]}
      >
        <View style={styles.prefRow}>
          <View style={[styles.rowIconWrap, { backgroundColor: c.primarySoft }]}>
            <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={18} color={c.primary} />
          </View>
          <View style={styles.prefText}>
            <Text style={[styles.rowValue, { color: c.text }]}>Apariencia</Text>
            <Text style={[styles.prefHint, { color: c.textMuted }]}>
              {mode === "dark" ? "Modo oscuro" : "Modo claro"}
            </Text>
          </View>
          <Switch
            value={mode === "dark"}
            onValueChange={(value) => setMode(value ? "dark" : "light")}
            thumbColor={mode === "dark" ? c.primary : "#FFFFFF"}
            trackColor={{ false: c.border, true: c.primarySoft }}
          />
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: c.textSubtle }]}>Calendario</Text>
      <View
        style={[
          styles.group,
          styles.calendarGroup,
          { backgroundColor: c.surface, borderColor: c.border, shadowColor: mode === "dark" ? "#000" : "#0F172A" }
        ]}
      >
        <View style={styles.calIntro}>
          <View style={[styles.calIconSquircle, { backgroundColor: "rgba(234, 67, 53, 0.12)" }]}>
            <Ionicons name="logo-google" size={22} color="#EA4335" />
          </View>
          <View style={styles.calIntroText}>
            <Text style={[styles.calTitle, { color: c.text }]}>Google Calendar</Text>
            <Text style={[styles.calSub, { color: c.textMuted }]}>
              {calendarConnected ? `Vinculado${calendarEmail ? ` · ${calendarEmail}` : ""}` : "Sin vincular"}
            </Text>
          </View>
        </View>
        {calendarConnected ? (
          <PrimaryButton
            label="Desconectar"
            variant="danger"
            loading={calendarBusy}
            onPress={() => void disconnectCalendar()}
            style={styles.calButton}
          />
        ) : (
          <PrimaryButton
            label="Conectar cuenta Google"
            loading={calendarBusy}
            onPress={() => void connectCalendar()}
            style={styles.calButton}
          />
        )}
        <Text style={[styles.calHint, { color: c.textSubtle }]}>
          Sincronizamos tus turnos para que no te pierdas ninguna sesión.
        </Text>
      </View>

      <Pressable
        onPress={() => {
          void signOut();
        }}
        style={({ pressed }) => [
          styles.signOut,
          {
            borderColor: mode === "dark" ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.35)",
            backgroundColor: mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)"
          },
          pressed && { opacity: 0.88 }
        ]}
      >
        <Ionicons name="log-out-outline" size={22} color={c.danger} />
        <Text style={[styles.signOutTitle, { color: c.danger }]}>Cerrar sesión</Text>
        <Text style={[styles.signOutHint, { color: c.textMuted }]}>En este dispositivo</Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1.1,
    marginBottom: 4
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
    marginBottom: 22
  },
  heroBlock: {
    marginBottom: 26,
    position: "relative"
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    top: -6,
    left: -10,
    right: -10,
    height: 200,
    borderRadius: 28
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.11,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0
  },
  name: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.6
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500"
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  roleText: {
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.2
  },
  heroStats: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    overflow: "hidden"
  },
  heroStat: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1
  },
  heroStatValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.35
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 2
  },
  group: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 22,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  groupLoading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  viewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  rowBody: {
    flex: 1,
    minWidth: 0
  },
  rowBodyGrow: {
    flex: 1
  },
  rowBodyEnd: {
    flex: 0,
    maxWidth: "42%",
    minWidth: 100
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
    lineHeight: 21
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50
  },
  historyHairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13
  },
  historyMain: {
    flex: 1,
    minWidth: 0
  },
  historyName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  historyMeta: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500"
  },
  historyDate: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"]
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12
  },
  prefText: {
    flex: 1,
    minWidth: 0
  },
  prefHint: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500"
  },
  calendarGroup: {
    paddingBottom: 14
  },
  calIntro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 14,
    paddingBottom: 6
  },
  calIconSquircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  calIntroText: {
    flex: 1,
    minWidth: 0
  },
  calTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.35
  },
  calSub: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 19
  },
  calButton: {
    marginTop: 6
  },
  calHint: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 12,
    paddingHorizontal: 2
  },
  signOut: {
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 4
  },
  signOutTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2
  },
  signOutHint: {
    fontSize: 13,
    fontWeight: "500"
  },
  error: {
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16
  }
});
