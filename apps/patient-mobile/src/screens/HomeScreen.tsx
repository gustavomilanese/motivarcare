import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getBookingsMine, getSessionPackages, purchasePackage } from "../api/client";
import type { BookingItem, SessionPackage } from "../api/types";
import { compareUpcomingBookings, isBookingUpcoming } from "../utils/bookingUpcoming";
import { useAuth } from "../auth/AuthContext";
import { BookSessionModal } from "../components/BookSessionModal";
import { McarePurchaseSheets, type McarePurchaseFlow } from "../components/McarePurchaseSheets";
import { PersonAvatar } from "../components/PersonAvatar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useBookingsRefresh } from "../context/BookingsRefreshContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import type { PatientTabParamList } from "../navigation/types";
import type { AppThemeColors } from "../theme/colors";
import type { ThemeMode } from "../theme/ThemeContext";
import { useThemeMode } from "../theme/ThemeContext";
import { formatMoneyFromCents } from "../utils/date";
import { UpcomingSessionCard } from "../components/UpcomingSessionCard";

type HomeNav = BottomTabNavigationProp<PatientTabParamList>;

function packageUnitCents(pkg: SessionPackage): number {
  return Math.round(pkg.priceCents / Math.max(1, pkg.credits));
}

const AVATAR_HEADER = 48;
/** Alineado con `MainTabs` tabBar flotante: `bottom: 14` + `height: 68` */
const TAB_BAR_FLOAT_BOTTOM = 14;
const TAB_BAR_FLOAT_HEIGHT = 68;
const TAB_BAR_OVERLAY_CLEARANCE = TAB_BAR_FLOAT_BOTTOM + TAB_BAR_FLOAT_HEIGHT;

function buildHomeStyles(c: AppThemeColors, mode: ThemeMode) {
  const savePillBg = mode === "dark" ? "#E4E4E7" : c.groupedLabel;
  const savePillFg = mode === "dark" ? "#18181B" : "#FFFFFF";
  const selectedCardBg =
    mode === "dark" ? "rgba(167, 139, 250, 0.14)" : "rgba(95, 68, 235, 0.06)";
  const stickyBarBg = mode === "dark" ? "rgba(15, 23, 42, 0.97)" : "rgba(250, 249, 252, 0.97)";
  const dividerHairline = mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(60, 60, 67, 0.12)";

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.homeCanvas
    },
    homeColumn: {
      flex: 1
    },
    homeScroll: {
      flex: 1
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 12
    },
    scrollFooter: {
      height: 4
    },
    loaderWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.homeCanvas
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 20
    },
    profileHeaderMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      minWidth: 0
    },
    avatarWrap: {
      position: "relative"
    },
    avatarStatusDot: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#34C759",
      borderWidth: 2,
      borderColor: c.surface
    },
    profileTextBlock: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center"
    },
    sessionsHintPill: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "nowrap",
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: c.primary,
      borderWidth: 0
    },
    sessionsHintPillMuted:
      mode === "dark"
        ? {
            backgroundColor: "rgba(148, 163, 184, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(148, 163, 184, 0.22)"
          }
        : {
            backgroundColor: "rgba(15, 23, 42, 0.045)",
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.08)"
          },
    sessionsHintPillText: {
      flexShrink: 1,
      minWidth: 0
    },
    sessionsHintNumber: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.3
    },
    sessionsHintSuffix: {
      fontSize: 12,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.92)",
      letterSpacing: -0.1
    },
    sessionsHintEmpty: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
      letterSpacing: -0.1
    },
    profileHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    },
    headerIconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    headerIconButtonPressed: {
      opacity: 0.88
    },
    section: {
      marginTop: 5,
      marginBottom: 20
    },
    mcarePurchaseOuter: {
      marginTop: 16,
      borderRadius: 20,
      overflow: "hidden",
      position: "relative",
      backgroundColor: c.mcareOuterBase
    },
    mcarePurchaseContent: {
      padding: 14
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingRight: 2,
      gap: 8
    },
    sectionHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      flexShrink: 0
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: c.groupedLabel,
      letterSpacing: -0.2,
      flex: 1,
      paddingHorizontal: 2
    },
    inlineLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 0
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: "600",
      color: c.primary
    },
    sessionCards: {
      gap: 18
    },
    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.groupedLabel
    },
    emptyMeta: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: "400",
      color: c.groupedSecondary,
      lineHeight: 18
    },
    mcareSectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      paddingRight: 2
    },
    mcareSectionTitle: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: c.primary,
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.1,
      overflow: "hidden"
    },
    mcareCardStack: {
      gap: 8
    },
    mcareOptionCard: {
      borderRadius: 16,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginVertical: 5,
      borderWidth: 0,
      shadowColor: "#000000",
      shadowOpacity: mode === "dark" ? 0.35 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1
    },
    mcareOptionCardSelected: {
      borderColor: c.primary,
      borderWidth: 2,
      backgroundColor: selectedCardBg,
      shadowColor: c.primary,
      shadowOpacity: 0.12
    },
    mcareOptionCardPressed: {
      opacity: 0.95
    },
    mcareOptionMarketing: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    },
    mcareOptionMarketingLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: c.primaryDark
    },
    mcareOptionMarketingSpacer: {
      flex: 1
    },
    mcareSavePill: {
      backgroundColor: savePillBg,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999
    },
    mcareSavePillText: {
      fontSize: 12,
      fontWeight: "800",
      color: savePillFg,
      letterSpacing: 0.2
    },
    mcareOptionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: dividerHairline,
      marginBottom: 8
    },
    mcareOptionPriceRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12
    },
    mcareOptionLeft: {
      flex: 1,
      minWidth: 0
    },
    mcareOptionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.groupedLabel,
      letterSpacing: -0.35,
      lineHeight: 18
    },
    mcareOptionUnit: {
      fontSize: 13,
      fontWeight: "700",
      color: c.groupedLabel,
      fontVariant: ["tabular-nums"]
    },
    mcareStickyBar: {
      paddingHorizontal: 20,
      backgroundColor: stickyBarBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: dividerHairline
    },
    mcareStickyCta: {
      borderRadius: 28,
      minHeight: 54
    }
  });
}

/**
 * Home: toque en avatar → perfil; pastilla de sesiones; tema desde icono.
 * MCare: bloque compacto con gradiente según tema.
 */
export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();
  const { colors, gradients, mode, toggle } = useThemeMode();
  const styles = useMemo(() => buildHomeStyles(colors, mode), [colors, mode]);
  const { token, user } = useAuth();
  const { profile, loading: profileLoading, refresh: refreshProfile } = usePatientProfile();
  const { bookingsEpoch } = useBookingsRefresh();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const mcareSectionY = useRef(0);
  const [bookSessionOpen, setBookSessionOpen] = useState(false);
  const [sessionPackages, setSessionPackages] = useState<SessionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [mcarePurchasing, setMcarePurchasing] = useState(false);
  const [mcarePurchaseFlow, setMcarePurchaseFlow] = useState<McarePurchaseFlow | null>(null);

  const displayName = useMemo(() => (user?.fullName ?? "").trim() || " ", [user?.fullName]);
  const patientAvatarUri = useMemo(
    () => profile?.avatarUrl ?? user?.avatarUrl ?? null,
    [profile?.avatarUrl, user?.avatarUrl]
  );
  const availableSessions = profile?.latestPackage?.remainingCredits ?? 0;

  const loadBookings = useCallback(async () => {
    if (!token) {
      setBookings([]);
      return;
    }
    try {
      const bookingsRes = await getBookingsMine(token);
      const live = bookingsRes.bookings
        .filter(
          (item) => ["confirmed", "requested"].includes(item.status) && isBookingUpcoming(item)
        )
        .sort(compareUpcomingBookings);
      setBookings(live.slice(0, 3));
    } catch {
      setBookings([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setBookings([]);
        setLoading(false);
        return () => {
          active = false;
        };
      }
      setLoading(true);
      void (async () => {
        try {
          await loadBookings();
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [token, loadBookings])
  );

  useEffect(() => {
    if (!token || bookingsEpoch < 1) {
      return;
    }
    void loadBookings();
  }, [bookingsEpoch, loadBookings, token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setSessionPackages([]);
        setSelectedPackageId(null);
        return () => {
          active = false;
        };
      }
      void (async () => {
        try {
          const response = await getSessionPackages({
            token,
            professionalId: profile?.activeProfessional?.id ?? null
          });
          if (!active) {
            return;
          }
          const sorted = (response.sessionPackages ?? [])
            .filter((pkg) => pkg.active)
            .sort((a, b) => a.credits - b.credits);
          setSessionPackages(sorted);
          setSelectedPackageId((prev) => (prev && sorted.some((pkg) => pkg.id === prev) ? prev : null));
        } catch {
          if (!active) {
            return;
          }
          setSessionPackages([]);
          setSelectedPackageId(null);
        }
      })();
      return () => {
        active = false;
      };
    }, [token, profile?.activeProfessional?.id])
  );

  const upcoming = useMemo(() => bookings, [bookings]);

  const goToSessions = () => {
    navigation.navigate("sessions");
  };

  const focusMcareSection = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, mcareSectionY.current - 16),
        animated: true
      });
    });
  }, []);

  const openMeet = async (url: string | null | undefined) => {
    if (!url) {
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const onUpcomingPress = (booking: BookingItem) => {
    if (booking.joinUrl) {
      void openMeet(booking.joinUrl);
      return;
    }
    Alert.alert(
      "Videollamada",
      "El enlace aparece cuando la sesión queda confirmada. Podés seguir el estado en la pestaña Sesiones.",
      [{ text: "Entendido", style: "cancel" }, { text: "Ir a Sesiones", onPress: goToSessions }]
    );
  };

  const selectedPackage = useMemo(
    () => sessionPackages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [sessionPackages, selectedPackageId]
  );

  const runMcarePurchase = useCallback(
    async (pkg: SessionPackage) => {
      if (!token) {
        return;
      }
      setMcarePurchasing(true);
      try {
        const res = await purchasePackage({ token, packageId: pkg.id });
        await refreshProfile();
        setMcarePurchaseFlow({ kind: "success", credits: res.purchase.remainingCredits });
        setSelectedPackageId(null);
      } catch (purchaseError) {
        setMcarePurchaseFlow({
          kind: "error",
          message: purchaseError instanceof Error ? purchaseError.message : "Probá de nuevo en unos minutos."
        });
      } finally {
        setMcarePurchasing(false);
      }
    },
    [refreshProfile, token]
  );

  const promptMcareCheckout = useCallback((pkg: SessionPackage) => {
    if (mcarePurchasing) {
      return;
    }
    setMcarePurchaseFlow({ kind: "confirm", pkg });
  }, [mcarePurchasing]);

  const closeMcarePurchaseFlow = useCallback(() => {
    setMcarePurchaseFlow(null);
  }, []);
  const selectedMcareTotalLabel = selectedPackage
    ? formatMoneyFromCents(selectedPackage.priceCents, selectedPackage.currency)
    : "--";

  if ((loading || profileLoading) && !profile && !user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const showProfilePulse = Boolean(profile?.intakeCompletedAt) && !profile?.intakeRiskBlocked;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.homeColumn}>
        <ScrollView
          ref={scrollRef}
          style={styles.homeScroll}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: 16 + TAB_BAR_OVERLAY_CLEARANCE + insets.bottom
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderMain}>
            <Pressable
              onPress={() => navigation.navigate("profile")}
              accessibilityRole="button"
              accessibilityLabel="Ir al perfil"
              hitSlop={10}
            >
              <View style={styles.avatarWrap}>
                <PersonAvatar uri={patientAvatarUri} name={displayName} size={AVATAR_HEADER} />
                {showProfilePulse ? <View style={styles.avatarStatusDot} /> : null}
              </View>
            </Pressable>
            <View
              style={styles.profileTextBlock}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${displayName}. ${
                availableSessions > 0
                  ? `${availableSessions} ${availableSessions === 1 ? "sesión disponible" : "sesiones disponibles"}`
                  : "Sin sesiones disponibles"
              }`}
            >
              <View
                style={[
                  styles.sessionsHintPill,
                  availableSessions < 1 && styles.sessionsHintPillMuted
                ]}
              >
                {availableSessions > 0 ? (
                  <Text
                    style={styles.sessionsHintPillText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    <Text style={styles.sessionsHintNumber}>{availableSessions}</Text>
                    <Text style={styles.sessionsHintSuffix}>
                      {availableSessions === 1 ? " sesión disponible" : " sesiones disponibles"}
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.sessionsHintEmpty}>Sin sesiones disponibles</Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.profileHeaderActions}>
            <Pressable
              onPress={() => setBookSessionOpen(true)}
              style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Agendar una sesión"
              hitSlop={8}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={toggle}
              style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              hitSlop={8}
            >
              <Ionicons
                name={mode === "dark" ? "moon" : "sunny"}
                size={26}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Próximas sesiones
            </Text>
            <View style={styles.sectionHeaderActions}>
              {upcoming.length > 0 ? (
                <Pressable onPress={goToSessions} hitSlop={8} style={styles.inlineLink}>
                  <Text style={styles.sectionLink}>Todas</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {upcoming.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin turnos agendados</Text>
              <Text style={styles.emptyMeta}>
                Usá el botón + de arriba para elegir fecha y horario. Si no tenés créditos, comprá
                un paquete en MCare Plus más abajo.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionCards}>
              {upcoming.map((b) => (
                <UpcomingSessionCard key={b.id} booking={b} onPress={() => onUpcomingPress(b)} />
              ))}
            </View>
          )}
        </View>

        <View
          style={[styles.section, styles.mcarePurchaseOuter]}
          onLayout={(e) => {
            mcareSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <LinearGradient
            colors={[...gradients.mcarePastel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.mcarePurchaseContent} pointerEvents="box-none">
            <View style={styles.mcareSectionHeaderRow}>
              <Text style={styles.mcareSectionTitle} numberOfLines={1}>
                Sumá sesiones
              </Text>
            </View>
            <View style={styles.mcareCardStack}>
              {sessionPackages.map((pkg) => {
                const selected = selectedPackageId === pkg.id;
                const unitLabel = formatMoneyFromCents(packageUnitCents(pkg), pkg.currency);
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() =>
                      setSelectedPackageId((current) => (current === pkg.id ? null : pkg.id))
                    }
                    style={({ pressed }) => [
                      styles.mcareOptionCard,
                      selected && styles.mcareOptionCardSelected,
                      pressed && styles.mcareOptionCardPressed
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${pkg.name}. ${selected ? "Seleccionado" : "Tocar para seleccionar"}.`}
                  >
                    <View style={styles.mcareOptionMarketing}>
                      {pkg.marketingLabel ? (
                        <Text style={styles.mcareOptionMarketingLabel}>{pkg.marketingLabel}</Text>
                      ) : (
                        <View style={styles.mcareOptionMarketingSpacer} />
                      )}
                      {pkg.discountPercent > 0 ? (
                        <View style={styles.mcareSavePill}>
                          <Text style={styles.mcareSavePillText}>Ahorrá {pkg.discountPercent}%</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.mcareOptionDivider} />
                    <View style={styles.mcareOptionPriceRow}>
                      <View style={styles.mcareOptionLeft}>
                        <Text style={styles.mcareOptionTitle}>{pkg.credits} sesiones</Text>
                      </View>
                      <Text style={styles.mcareOptionUnit}>{unitLabel} c/u</Text>
                    </View>
                  </Pressable>
                );
              })}
              {sessionPackages.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyMeta}>Todavía no hay paquetes disponibles para compra.</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.scrollFooter} />
      </ScrollView>
        {selectedPackage ? (
          <View
            style={[
              styles.mcareStickyBar,
              {
                paddingTop: 10,
                paddingBottom: insets.bottom + TAB_BAR_OVERLAY_CLEARANCE + 12
              }
            ]}
          >
            <PrimaryButton
              label={`Continuar — ${selectedMcareTotalLabel} total`}
              loading={mcarePurchasing}
              onPress={() => {
                promptMcareCheckout(selectedPackage);
              }}
              style={styles.mcareStickyCta}
              accessibilityLabel={`Continuar con el pago, ${selectedMcareTotalLabel} en total`}
            />
          </View>
        ) : null}
      </View>
      <BookSessionModal
        visible={bookSessionOpen}
        onClose={() => setBookSessionOpen(false)}
        onFocusPurchase={focusMcareSection}
      />
      <McarePurchaseSheets
        flow={mcarePurchaseFlow}
        onClose={closeMcarePurchaseFlow}
        onConfirmPurchase={runMcarePurchase}
        confirming={mcarePurchasing}
      />
    </SafeAreaView>
  );
}
