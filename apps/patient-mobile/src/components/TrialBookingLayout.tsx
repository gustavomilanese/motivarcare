import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BookingItem } from "../api/types";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import {
  bookingDurationMinutes,
  deviceTimeZoneLabel,
  formatDayTwoDigits,
  formatMonthAbbrevUpper,
  formatWeekdayTimeRangeEs
} from "../utils/bookingDisplay";
import { PersonAvatar } from "./PersonAvatar";

type Props = {
  booking: BookingItem;
  /** Lista compacta (Inicio) vs tarjeta detalle (Sesiones) */
  compact?: boolean;
};

function buildTrialBookingStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 12
    },
    rootCompact: {
      gap: 10
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.groupedLabel,
      letterSpacing: -0.3,
      lineHeight: 24
    },
    titleCompact: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.groupedLabel,
      letterSpacing: -0.25,
      lineHeight: 21
    },
    scheduleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12
    },
    datePill: {
      width: 48,
      minHeight: 52,
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6
    },
    datePillCompact: {
      width: 44,
      minHeight: 48,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 5
    },
    datePillMonth: {
      fontSize: 10,
      fontWeight: "800",
      color: "#EA580C",
      letterSpacing: 0.4
    },
    datePillDay: {
      marginTop: 2,
      fontSize: 18,
      fontWeight: "800",
      color: colors.groupedLabel
    },
    timeCol: {
      flex: 1,
      minWidth: 0,
      paddingTop: 2
    },
    timeRange: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.groupedLabel,
      lineHeight: 20
    },
    timeRangeCompact: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.groupedLabel,
      lineHeight: 19
    },
    tzNote: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "400",
      color: colors.groupedSecondary,
      lineHeight: 16
    },
    tzNoteCompact: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: "400",
      color: colors.groupedSecondary,
      lineHeight: 15
    },
    policy: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(34, 197, 94, 0.28)"
    },
    policyCompact: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.accentSoft,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(34, 197, 94, 0.25)"
    },
    policyIcon: {
      marginTop: 1
    },
    policyText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "400",
      color: colors.success,
      lineHeight: 18
    },
    policyTextCompact: {
      flex: 1,
      fontSize: 12,
      fontWeight: "400",
      color: colors.success,
      lineHeight: 16
    },
    policyLead: {
      fontWeight: "700",
      color: colors.accent
    },
    proRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 2
    },
    proTextCol: {
      flex: 1,
      minWidth: 0
    },
    proLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.groupedSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    proLabelCompact: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.groupedSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.35
    },
    proName: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: "600",
      color: colors.groupedLabel
    },
    proNameCompact: {
      marginTop: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.groupedLabel
    }
  });
}

export function TrialBookingLayout(props: Props) {
  const { booking, compact } = props;
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildTrialBookingStyles(colors), [colors]);
  const name = booking.counterpartName ?? "Profesional";
  const dur = bookingDurationMinutes(booking.startsAt, booking.endsAt);
  const range = formatWeekdayTimeRangeEs(booking.startsAt, booking.endsAt);
  const month = formatMonthAbbrevUpper(booking.startsAt);
  const day = formatDayTwoDigits(booking.startsAt);
  const tzRaw = booking.patientTimezoneAtBooking?.trim() || deviceTimeZoneLabel();
  const tz = tzRaw.replace(/_/g, " ");

  return (
    <View style={compact ? styles.rootCompact : styles.root}>
      <Text style={compact ? styles.titleCompact : styles.title}>
        Sesión de prueba{dur != null ? `, ${dur} min` : ""}
      </Text>

      <View style={styles.scheduleRow}>
        <View style={compact ? styles.datePillCompact : styles.datePill}>
          <Text style={styles.datePillMonth}>{month}</Text>
          <Text style={styles.datePillDay}>{day}</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={compact ? styles.timeRangeCompact : styles.timeRange}>{range}</Text>
          {tz ? (
            <Text style={compact ? styles.tzNoteCompact : styles.tzNote}>
              La fecha y la hora se muestran según tu zona horaria actual {tz}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={compact ? styles.policyCompact : styles.policy}>
        <Ionicons name="sync-outline" size={compact ? 18 : 20} color={colors.success} style={styles.policyIcon} />
        <Text style={compact ? styles.policyTextCompact : styles.policyText}>
          <Text style={styles.policyLead}>Podés reprogramar la sesión gratis </Text>
          hasta 24 horas antes (desde la web o la app en Sesiones), o de mutuo acuerdo con el especialista.
        </Text>
      </View>

      <View style={styles.proRow}>
        <PersonAvatar uri={booking.counterpartPhotoUrl} name={name} size={compact ? 36 : 44} />
        <View style={styles.proTextCol}>
          <Text style={compact ? styles.proLabelCompact : styles.proLabel}>Especialista</Text>
          <Text style={compact ? styles.proNameCompact : styles.proName} numberOfLines={2}>
            {name}
          </Text>
        </View>
      </View>
    </View>
  );
}
