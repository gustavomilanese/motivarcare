import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getBookingsMine } from "../api/client";
import type { BookingItem } from "../api/types";
import { compareUpcomingBookings, isBookingUpcoming } from "../utils/bookingUpcoming";
import { useAuth } from "../auth/AuthContext";
import { useBookingsRefresh } from "../context/BookingsRefreshContext";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import type { PatientTabParamList } from "../navigation/types";
import { BookSessionModal } from "../components/BookSessionModal";
import { RescheduleSessionModal } from "../components/RescheduleSessionModal";
import { UpcomingSessionCard } from "../components/UpcomingSessionCard";
import { canPatientRescheduleBooking } from "../utils/patientReschedule";

type SessionsNav = BottomTabNavigationProp<PatientTabParamList>;
const TAB_BAR_HEIGHT_ESTIMATE = 68;

function buildSessionsStyles(c: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.4
    },
    pageSub: {
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 6,
      maxWidth: 260
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8
    },
    headerMain: {
      flex: 1,
      minWidth: 0
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    headerIconButtonPressed: {
      opacity: 0.65
    },
    sessionWrapper: {
      marginTop: 12,
      marginBottom: 12
    },
    actions: {
      alignSelf: "stretch",
      width: "100%",
      gap: 10
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      alignSelf: "stretch",
      width: "100%",
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.primary
    },
    primaryBtnPressed: {
      opacity: 0.65
    },
    primaryBtnText: {
      color: c.primary,
      fontSize: 14,
      fontWeight: "700"
    },
    pendingUrl: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center"
    },
    empty: {
      color: c.textMuted,
      textAlign: "center",
      marginTop: 16
    },
    error: {
      color: c.danger,
      fontWeight: "700",
      textAlign: "center"
    }
  });
}

export function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildSessionsStyles(colors), [colors]);
  const navigation = useNavigation<SessionsNav>();
  const { token } = useAuth();
  const { bookingsEpoch, touchBookings } = useBookingsRefresh();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookSessionOpen, setBookSessionOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setError("");
    try {
      const response = await getBookingsMine(token);
      const live = response.bookings
        .filter((item) => ["confirmed", "requested"].includes(item.status) && isBookingUpcoming(item))
        .sort(compareUpcomingBookings);
      setBookings(live);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar sesiones");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setBookings([]);
        setLoading(false);
        return;
      }
      void load();
    }, [token, load])
  );

  useEffect(() => {
    if (!token || bookingsEpoch < 1) {
      return;
    }
    void load();
  }, [bookingsEpoch, load, token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const openMeet = useCallback(async (url: string | null | undefined) => {
    if (!url) {
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24 + TAB_BAR_HEIGHT_ESTIMATE + 32
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
          <Text style={styles.pageTitle}>Sesiones</Text>
          <Text style={styles.pageSub}>Revisá tus sesiones agendadas y agendá nuevas</Text>
        </View>
        <Pressable
          onPress={() => setBookSessionOpen(true)}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Agendar una nueva sesión"
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {bookings.length === 0 ? <Text style={styles.empty}>No hay sesiones próximas.</Text> : null}

      {bookings.map((booking) => {
        const allowReschedule =
          booking.status === "confirmed" &&
          booking.bookingMode !== "trial" &&
          Boolean(booking.professionalId) &&
          canPatientRescheduleBooking(booking.startsAt);
        return (
        <View key={booking.id} style={styles.sessionWrapper}>
          <UpcomingSessionCard
            booking={booking}
            onPress={
              booking.joinUrl
                ? () => {
                    void openMeet(booking.joinUrl);
                  }
                : undefined
            }
            showRescheduleAction={allowReschedule}
            onReschedulePress={allowReschedule ? () => setRescheduleBooking(booking) : undefined}
          >
            <View style={styles.actions}>
              {booking.joinUrl ? (
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={() => void openMeet(booking.joinUrl)}
                >
                  <Ionicons name="videocam" size={18} color={colors.primary} />
                  <Text style={styles.primaryBtnText}>Entrar a la sesión</Text>
                </Pressable>
              ) : (
                <Text style={styles.pendingUrl}>El enlace se generará al confirmar la sesión.</Text>
              )}
            </View>
          </UpcomingSessionCard>
        </View>
        );
      })}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <BookSessionModal
        visible={bookSessionOpen}
        onClose={() => setBookSessionOpen(false)}
        onFocusPurchase={() => {
          navigation.navigate("home");
        }}
      />
      <RescheduleSessionModal
        visible={rescheduleBooking !== null}
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onRescheduled={() => {
          touchBookings();
          void load();
        }}
      />
    </ScrollView>
  );
}
