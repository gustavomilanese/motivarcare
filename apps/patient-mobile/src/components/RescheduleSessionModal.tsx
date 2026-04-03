import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMatchingProfessionals, rescheduleMineBooking } from "../api/client";
import type { BookingItem, MatchingProfessional, MatchingSlot } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useBookingsRefresh } from "../context/BookingsRefreshContext";
import { PrimaryButton } from "./ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import { upcomingAvailabilitySlots } from "../utils/availabilitySlots";
import { deviceTimeZone, formatDateTime } from "../utils/date";

function buildRescheduleModalStyles(colors: AppThemeColors) {
  return StyleSheet.create({
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
      maxHeight: "78%"
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text
    },
    modalSub: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 20
    },
    lead: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted
    },
    error: {
      fontSize: 14,
      color: colors.danger,
      fontWeight: "600"
    },
    loader: {
      paddingVertical: 28,
      alignItems: "center",
      justifyContent: "center"
    },
    slotsHint: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      fontWeight: "500"
    },
    slotScroll: {
      maxHeight: 360
    },
    slotScrollContent: {
      gap: 10,
      paddingBottom: 4
    },
    slotPick: {
      minHeight: 50,
      backgroundColor: "transparent",
      borderColor: colors.ghostBorder,
      borderWidth: 1.4,
      borderRadius: 14
    },
    slotPickLabel: {
      color: colors.primaryDark,
      fontWeight: "700",
      letterSpacing: -0.1
    }
  });
}

type Props = {
  visible: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onRescheduled?: () => void;
};

export function RescheduleSessionModal(props: Props) {
  const { visible, booking, onClose, onRescheduled } = props;
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildRescheduleModalStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { touchBookings } = useBookingsRefresh();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [professional, setProfessional] = useState<MatchingProfessional | null>(null);

  const professionalId = booking?.professionalId ?? null;

  const reload = useCallback(async () => {
    if (!token || !professionalId) {
      return;
    }
    setLoading(true);
    setError("");
    setProfessional(null);
    try {
      const res = await getMatchingProfessionals(token);
      const pro = res.professionals.find((p) => p.id === professionalId);
      if (!pro) {
        setError("No encontramos los horarios de tu profesional. Probá de nuevo más tarde.");
      } else {
        setProfessional(pro);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar horarios.");
    } finally {
      setLoading(false);
    }
  }, [token, professionalId]);

  useEffect(() => {
    if (!visible || !booking || !token || !professionalId) {
      setError("");
      setProfessional(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      setProfessional(null);
      try {
        const res = await getMatchingProfessionals(token);
        if (cancelled) {
          return;
        }
        const pro = res.professionals.find((p) => p.id === professionalId);
        if (!pro) {
          setError("No encontramos los horarios de tu profesional. Probá de nuevo más tarde.");
        } else {
          setProfessional(pro);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No pudimos cargar horarios.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, booking, token, professionalId]);

  const pickSlot = async (slot: MatchingSlot) => {
    if (!token || !booking) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const startsAt = typeof slot.startsAt === "string" ? slot.startsAt : new Date(slot.startsAt).toISOString();
      const endsAt = typeof slot.endsAt === "string" ? slot.endsAt : new Date(slot.endsAt).toISOString();
      await rescheduleMineBooking({
        token,
        bookingId: booking.id,
        startsAt,
        endsAt,
        patientTimezone: deviceTimeZone()
      });
      touchBookings();
      onRescheduled?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos reprogramar. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const slots = professional ? upcomingAvailabilitySlots(professional.slots ?? []) : [];
  const noSlots = Boolean(professional && slots.length === 0);

  const renderBody = () => {
    if (!booking || !professionalId) {
      return <Text style={styles.lead}>No hay una sesión seleccionada.</Text>;
    }
    if (loading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (error && !professional) {
      return (
        <>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label="Reintentar" variant="ghost" onPress={() => void reload()} />
        </>
      );
    }
    if (noSlots) {
      return (
        <Text style={styles.lead}>
          Por ahora no hay otros turnos publicados. Volvé más tarde o escribile a tu profesional por chat.
        </Text>
      );
    }
    return (
      <>
        <Text style={styles.slotsHint}>Elegí un nuevo horario. Tu sesión actual se mueve a ese turno.</Text>
        <ScrollView
          style={styles.slotScroll}
          contentContainerStyle={styles.slotScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {slots.map((slot) => (
            <PrimaryButton
              key={slot.id}
              label={formatDateTime(slot.startsAt)}
              variant="ghost"
              disabled={submitting}
              onPress={() => void pickSlot(slot)}
              style={styles.slotPick}
              labelStyle={styles.slotPickLabel}
            />
          ))}
        </ScrollView>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.modalTitle}>Reprogramar sesión</Text>
          {booking ? (
            <Text style={styles.modalSub}>
              Actual: {formatDateTime(booking.startsAt)} · {booking.counterpartName ?? "Profesional"}
            </Text>
          ) : null}
          {error && professional ? <Text style={styles.error}>{error}</Text> : null}
          {renderBody()}
          <PrimaryButton label="Cerrar" variant="ghost" onPress={onClose} disabled={submitting} />
        </View>
      </View>
    </Modal>
  );
}
