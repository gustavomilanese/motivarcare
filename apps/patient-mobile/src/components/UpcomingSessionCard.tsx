import { Ionicons } from "@expo/vector-icons";
import { useMemo, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BookingItem } from "../api/types";
import type { AppThemeColors } from "../theme/colors";
import type { ThemeMode } from "../theme/ThemeContext";
import { useThemeMode } from "../theme/ThemeContext";
import { PersonAvatar } from "./PersonAvatar";

type Props = PropsWithChildren<{
  booking: BookingItem;
  onPress?: () => void;
  showRescheduleAction?: boolean;
  onReschedulePress?: () => void;
}>;

function buildSessionCardStyles(c: AppThemeColors, mode: ThemeMode) {
  const cardBorder = mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.07)";
  const iconPillBg = mode === "dark" ? "rgba(95, 68, 235, 0.2)" : "#F3F4FF";

  return StyleSheet.create({
    sessionCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      shadowColor: mode === "dark" ? "#000" : "#0F172A",
      shadowOpacity: mode === "dark" ? 0.4 : 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5
    },
    sessionCardTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      width: "100%"
    },
    sessionCardPressed: {
      opacity: 0.95,
      backgroundColor: c.surfacePressed,
      borderColor: "rgba(95, 68, 235, 0.35)"
    },
    sessionCardTrial: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: "rgba(245, 158, 11, 0.5)"
    },
    sessionTime: {
      width: 38,
      fontSize: 12,
      fontWeight: "600",
      color: c.groupedSecondary,
      marginTop: 2,
      fontVariant: ["tabular-nums"]
    },
    sessionCardBody: {
      flex: 1,
      minWidth: 0,
      paddingTop: 1,
      alignItems: "stretch"
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8
    },
    headerMain: {
      flex: 1,
      minWidth: 0
    },
    iconColumn: {
      alignItems: "flex-end",
      justifyContent: "flex-start"
    },
    iconPill: {
      width: 30,
      height: 30,
      borderRadius: 999,
      backgroundColor: iconPillBg,
      alignItems: "center",
      justifyContent: "center"
    },
    iconPillPressed: {
      opacity: 0.85
    },
    sessionDateLine: {
      fontSize: 12,
      fontWeight: "400",
      color: c.groupedSecondary,
      marginBottom: 3,
      textTransform: "capitalize"
    },
    sessionNameLine: {
      fontSize: 15,
      fontWeight: "700",
      color: c.groupedLabel,
      letterSpacing: -0.2,
      lineHeight: 19
    },
    sessionMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "nowrap",
      marginTop: 4,
      minWidth: 0,
      alignSelf: "stretch"
    },
    sessionStatusLine: {
      fontSize: 11,
      fontWeight: "600",
      flexShrink: 1,
      minWidth: 0
    },
    sessionStatusOk: {
      color: "#248A3D"
    },
    sessionStatusPending: {
      color: "#B45309"
    },
    actionsSlot: {
      marginTop: 12,
      width: "100%",
      alignSelf: "stretch"
    }
  });
}

export function UpcomingSessionCard(props: Props) {
  const { booking, onPress, showRescheduleAction, onReschedulePress, children } = props;
  const { colors, mode } = useThemeMode();
  const styles = useMemo(() => buildSessionCardStyles(colors, mode), [colors, mode]);

  const name = booking.counterpartName ?? "Profesional";
  const timeOnly = formatTimeOnly(booking.startsAt);
  const dateLine = formatSessionCardDate(booking.startsAt);
  const isTrial = booking.bookingMode === "trial";
  const statusMain = booking.status === "requested" ? "Solicitada" : "Confirmada";
  const statusLine = isTrial ? `${statusMain} · Sesión de prueba` : statusMain;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.sessionCard,
        isTrial && styles.sessionCardTrial,
        pressed && onPress && styles.sessionCardPressed
      ]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Sesión con ${name}, ${dateLine} ${timeOnly}${
        isTrial ? ", sesión de prueba" : ""
      }`}
    >
      <View style={styles.sessionCardTopRow}>
        <Text style={styles.sessionTime}>{timeOnly}</Text>
        <PersonAvatar uri={booking.counterpartPhotoUrl} name={name} size={44} />
        <View style={styles.sessionCardBody}>
          <View style={styles.headerRow}>
            <View style={styles.headerMain}>
              <Text style={styles.sessionDateLine} numberOfLines={1}>
                {dateLine}
              </Text>
              <Text style={styles.sessionNameLine} numberOfLines={2}>
                {name}
              </Text>
              <View style={styles.sessionMetaRow}>
                <Text
                  style={[
                    styles.sessionStatusLine,
                    booking.status === "requested" ? styles.sessionStatusPending : styles.sessionStatusOk
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {statusLine}
                </Text>
              </View>
            </View>
            {showRescheduleAction && onReschedulePress ? (
              <View style={styles.iconColumn}>
                <Pressable
                  onPress={onReschedulePress}
                  hitSlop={8}
                  style={({ pressed }) => [styles.iconPill, pressed && styles.iconPillPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Reprogramar sesión"
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {children ? <View style={styles.actionsSlot}>{children}</View> : null}
    </Pressable>
  );
}

function formatSessionCardDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "long" });
}

function formatTimeOnly(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
