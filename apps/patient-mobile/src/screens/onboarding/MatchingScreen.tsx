import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { createBooking, getMatchingProfessionals, setActiveProfessional } from "../../api/client";
import type { MatchingProfessional, MatchingSlot } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { useBookingsRefresh } from "../../context/BookingsRefreshContext";
import { usePatientProfile } from "../../context/PatientProfileContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";
import { upcomingAvailabilitySlots } from "../../utils/availabilitySlots";
import { deviceTimeZone, formatDateTime } from "../../utils/date";

/** Área scrolleable de turnos en el modal (~mitad de pantalla, adaptable). */
const SLOT_MODAL_SCROLL_MAX = Math.round(Dimensions.get("window").height * 0.52);

function buildMatchingStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    hero: {
      marginHorizontal: 16,
      borderRadius: 24,
      padding: 20,
      gap: 6,
      marginBottom: 10
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800"
    },
    heroLead: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 14,
      lineHeight: 20
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 12
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      marginBottom: 4
    },
    cardActive: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    row: {
      flexDirection: "row",
      gap: 12
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 16
    },
    avatarPh: {
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    avatarTxt: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.primary
    },
    cardBody: {
      flex: 1,
      gap: 3
    },
    name: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text
    },
    title: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600"
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4
    },
    score: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primaryDark
    },
    reason: {
      fontSize: 13,
      color: colors.textMuted
    },
    slotBtn: {
      minHeight: 46
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      marginTop: 40
    },
    error: {
      color: colors.danger,
      textAlign: "center",
      fontWeight: "700",
      paddingHorizontal: 16,
      paddingBottom: 12
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.48)",
      justifyContent: "flex-end"
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      gap: 12,
      maxHeight: "88%"
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text
    },
    modalSub: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: "600"
    },
    slotScroll: {
      maxHeight: SLOT_MODAL_SCROLL_MAX
    },
    slotScrollContent: {
      gap: 10,
      paddingBottom: 6
    },
    slotPick: {
      minHeight: 48
    },
    emptySlots: {
      fontSize: 14,
      color: colors.textMuted
    }
  });
}

export function MatchingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildMatchingStyles(colors), [colors]);
  const { token } = useAuth();
  const { refresh } = usePatientProfile();
  const { touchBookings } = useBookingsRefresh();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [professionals, setProfessionals] = useState<MatchingProfessional[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MatchingProfessional | null>(null);
  const [slotModal, setSlotModal] = useState<MatchingProfessional | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getMatchingProfessionals(token);
      setProfessionals(response.professionals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la lista. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickSlot = useCallback(
    async (professional: MatchingProfessional, slot: MatchingSlot) => {
      if (!token) {
        return;
      }
      setBooking(true);
      setError("");
      try {
        await setActiveProfessional({ token, professionalId: professional.id });
        const startsAt =
          typeof slot.startsAt === "string" ? slot.startsAt : new Date(slot.startsAt).toISOString();
        const endsAt = typeof slot.endsAt === "string" ? slot.endsAt : new Date(slot.endsAt).toISOString();
        await createBooking({
          token,
          professionalId: professional.id,
          startsAt,
          endsAt,
          patientTimezone: deviceTimeZone()
        });
        setSlotModal(null);
        await refresh();
        touchBookings();
      } catch (bookingError) {
        setError(bookingError instanceof Error ? bookingError.message : "No pudimos reservar. Intentá de nuevo.");
      } finally {
        setBooking(false);
      }
    },
    [refresh, token, touchBookings]
  );

  const renderItem = useCallback(
    ({ item }: { item: MatchingProfessional }) => {
      const active = selected?.id === item.id;
      return (
        <Pressable
          onPress={() => {
            setSelected(item);
          }}
          style={[styles.card, active && styles.cardActive]}
        >
          <View style={styles.row}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Text style={styles.avatarTxt}>{item.fullName.slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.scoreRow}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.score}>{Math.round(item.matchScore)}% compatibilidad</Text>
              </View>
              {item.matchReasons.slice(0, 2).map((reason) => (
                <Text key={reason} style={styles.reason}>
                  · {reason}
                </Text>
              ))}
            </View>
          </View>
          <PrimaryButton
            label="Ver horarios"
            variant="ghost"
            onPress={() => {
              setSlotModal(item);
            }}
            style={styles.slotBtn}
          />
        </Pressable>
      );
    },
    [selected?.id, styles, colors.primary]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Elegí tu profesional</Text>
        <Text style={styles.heroLead}>Orden según tu encuesta. Solo ves horarios que cada profesional publicó.</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={professionals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Todavía no hay profesionales para mostrar.</Text>}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={Boolean(slotModal)} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 14) + 16 }]}>
            <Text style={styles.modalTitle}>Elegí horario</Text>
            <Text style={styles.modalSub}>{slotModal?.fullName}</Text>
            {slotModal && upcomingAvailabilitySlots(slotModal.slots ?? []).length === 0 ? (
              <Text style={styles.emptySlots}>
                Todavía no hay turnos publicados para este profesional. Elegí otro o volvé más tarde.
              </Text>
            ) : (
              <ScrollView
                style={styles.slotScroll}
                contentContainerStyle={styles.slotScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {slotModal
                  ? upcomingAvailabilitySlots(slotModal.slots ?? []).map((slot) => (
                      <PrimaryButton
                        key={slot.id}
                        label={formatDateTime(slot.startsAt)}
                        variant="ghost"
                        loading={booking}
                        onPress={() => {
                          void pickSlot(slotModal, slot);
                        }}
                        style={styles.slotPick}
                      />
                    ))
                  : null}
              </ScrollView>
            )}
            <PrimaryButton
              label="Cerrar"
              variant="danger"
              onPress={() => {
                setSlotModal(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
