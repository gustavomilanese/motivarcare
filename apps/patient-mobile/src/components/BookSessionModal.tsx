import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBooking, getMatchingProfessionals, setActiveProfessional } from "../api/client";
import type { MatchingProfessional, MatchingSlot } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useBookingsRefresh } from "../context/BookingsRefreshContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import { PrimaryButton } from "./ui/PrimaryButton";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import { upcomingAvailabilitySlots } from "../utils/availabilitySlots";
import { deviceTimeZone, formatDateTime } from "../utils/date";

function buildBookSessionModalStyles(colors: AppThemeColors) {
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
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: "600"
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
    },
    retryBtn: {
      marginTop: -4
    }
  });
}

type BookSessionModalProps = {
  visible: boolean;
  onClose: () => void;
  onBooked?: () => void;
  /** Cierra el modal y permite scrollear/resaltar la sección de compra en Home */
  onFocusPurchase?: () => void;
};

export function BookSessionModal(props: BookSessionModalProps) {
  const { visible, onClose, onBooked, onFocusPurchase } = props;
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildBookSessionModalStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { profile, refresh } = usePatientProfile();
  const { touchBookings } = useBookingsRefresh();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [professional, setProfessional] = useState<MatchingProfessional | null>(null);

  const credits = profile?.latestPackage?.remainingCredits ?? 0;
  const hasCredits = credits > 0;
  const activeId = profile?.activeProfessional?.id;

  const reload = useCallback(async () => {
    if (!token || !activeId) {
      return;
    }
    setLoading(true);
    setError("");
    setProfessional(null);
    try {
      const res = await getMatchingProfessionals(token);
      const pro = res.professionals.find((p) => p.id === activeId);
      if (!pro) {
        setError(
          "No encontramos a tu profesional en la lista por ahora. Tocá Reintentar o probá de nuevo en unos minutos."
        );
      } else {
        setProfessional(pro);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar los horarios. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [token, activeId]);

  useEffect(() => {
    if (!visible) {
      setError("");
      setProfessional(null);
      setLoading(false);
      return;
    }
    setError("");
    if (!hasCredits || !activeId) {
      setProfessional(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!token || !activeId) {
        return;
      }
      setLoading(true);
      setError("");
      setProfessional(null);
      try {
        const res = await getMatchingProfessionals(token);
        if (cancelled) {
          return;
        }
        const pro = res.professionals.find((p) => p.id === activeId);
        if (!pro) {
          setError(
            "No encontramos a tu profesional en la lista por ahora. Tocá Reintentar o probá de nuevo en unos minutos."
          );
        } else {
          setProfessional(pro);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No pudimos cargar los horarios. Revisá tu conexión.");
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
  }, [visible, hasCredits, activeId, token]);

  const slots = professional ? upcomingAvailabilitySlots(professional.slots ?? []) : [];
  const noSlots = Boolean(professional && slots.length === 0);

  const pickSlot = async (slot: MatchingSlot) => {
    if (!token || !professional) {
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
      await refresh();
      touchBookings();
      onClose();
      onBooked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos completar la reserva. Intentá de nuevo.");
    } finally {
      setBooking(false);
    }
  };

  const handleFocusPurchase = () => {
    onClose();
    onFocusPurchase?.();
  };

  const renderBody = () => {
    if (!hasCredits) {
      return (
        <>
          <Text style={styles.lead}>
            Necesitás créditos para reservar. Elegí un paquete abajo en MCare Plus y volvé a tocar + cuando
            esté acreditado.
          </Text>
          <PrimaryButton label="Ir a MCare Plus" onPress={handleFocusPurchase} />
        </>
      );
    }
    if (!activeId) {
      return (
        <Text style={styles.lead}>
          Para agendar necesitás un profesional asignado. Si recién instalaste la app, completá el registro y la
          elección de profesional.
        </Text>
      );
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
          <PrimaryButton label="Ir a MCare Plus" variant="ghost" onPress={handleFocusPurchase} />
          <PrimaryButton label="Reintentar" variant="ghost" onPress={() => void reload()} style={styles.retryBtn} />
        </>
      );
    }
    if (noSlots) {
      return (
        <>
          <Text style={styles.lead}>
            Por ahora no hay horarios publicados. Volvé en unos días o, si ya usaste tus créditos, podés sumar más con
            MCare Plus.
          </Text>
          <PrimaryButton label="Ir a MCare Plus" variant="ghost" onPress={handleFocusPurchase} />
        </>
      );
    }
    return (
      <>
        <Text style={styles.slotsHint}>
          Turnos que tu profesional tiene disponibles. Si no ves una fecha lejana, es que aún no publicó más cupos.
        </Text>
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
            disabled={booking}
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
          <Text style={styles.modalTitle}>Agendar sesión</Text>
          {professional ? <Text style={styles.modalSub}>Con {professional.fullName}</Text> : null}
          {!professional && hasCredits && activeId && !loading && !error ? (
            <Text style={styles.modalSub}>Cargando horarios…</Text>
          ) : null}
          {error && professional ? <Text style={styles.error}>{error}</Text> : null}
          {renderBody()}
          <PrimaryButton label="Volver" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
