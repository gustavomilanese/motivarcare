import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ModalProps
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SessionPackage } from "../api/types";
import type { AppThemeColors } from "../theme/colors";
import type { AppGradients } from "../theme/ThemeContext";
import { useThemeMode } from "../theme/ThemeContext";
import { formatMoneyFromCents } from "../utils/date";
import { PrimaryButton } from "./ui/PrimaryButton";

export type McarePurchaseFlow =
  | { kind: "confirm"; pkg: SessionPackage }
  | { kind: "success"; credits: number }
  | { kind: "error"; message: string };

type Props = {
  flow: McarePurchaseFlow | null;
  onClose: () => void;
  onConfirmPurchase: (pkg: SessionPackage) => void | Promise<void>;
  confirming: boolean;
};

type SheetStyles = ReturnType<typeof buildMcareSheetStyles>;

function buildMcareSheetStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end"
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.52)"
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 22,
      paddingTop: 8,
      gap: 18,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.ghostBorder,
      shadowColor: colors.tabBarShadow,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -8 },
      elevation: 16
    },
    handleWrap: {
      alignItems: "center",
      paddingVertical: 6
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6
    },
    heroIconError: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.dangerSurface,
      borderWidth: 1,
      borderColor: colors.dangerBorder
    },
    heroText: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.primary,
      textTransform: "uppercase"
    },
    eyebrowSuccess: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.success,
      textTransform: "uppercase"
    },
    eyebrowError: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.danger,
      textTransform: "uppercase"
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.6,
      lineHeight: 28
    },
    pkgName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 2
    },
    summaryCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    summaryLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecond
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text
    },
    summaryValueMuted: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textMuted
    },
    summaryRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    summaryTotalLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text
    },
    summaryTotalValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.primaryDark,
      letterSpacing: -0.4
    },
    demoNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.ghostBorder
    },
    demoNoticeText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: colors.primaryDark,
      lineHeight: 18
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12
    },
    actionsHalf: {
      flex: 1,
      minWidth: 0,
      borderRadius: 16
    },
    bodyCenter: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecond,
      textAlign: "center",
      lineHeight: 24
    },
    hintCenter: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginTop: -8
    },
    singleCta: {
      borderRadius: 16,
      minHeight: 54
    }
  });
}

function packageUnitCents(pkg: SessionPackage): number {
  return Math.round(pkg.priceCents / Math.max(1, pkg.credits));
}

export function McarePurchaseSheets(props: Props) {
  const { flow, onClose, onConfirmPurchase, confirming } = props;
  const { colors, gradients } = useThemeMode();
  const sheetStyles = useMemo(() => buildMcareSheetStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const visible = flow !== null;

  const animationType: ModalProps["animationType"] = "slide";

  return (
    <Modal visible={visible} animationType={animationType} transparent onRequestClose={onClose}>
      {flow ? (
        <View style={sheetStyles.root}>
          <Pressable style={sheetStyles.backdrop} onPress={confirming ? undefined : onClose} accessibilityRole="button" />
          <View style={[sheetStyles.sheet, { paddingBottom: 22 + insets.bottom }]}>
            <View style={sheetStyles.handleWrap}>
              <View style={sheetStyles.handle} />
            </View>

            {flow.kind === "confirm" ? (
              <ConfirmBody
                pkg={flow.pkg}
                onClose={onClose}
                onConfirm={() => void onConfirmPurchase(flow.pkg)}
                confirming={confirming}
                sheetStyles={sheetStyles}
                gradients={gradients}
                colors={colors}
              />
            ) : null}
            {flow.kind === "success" ? (
              <SuccessBody credits={flow.credits} onClose={onClose} sheetStyles={sheetStyles} />
            ) : null}
            {flow.kind === "error" ? (
              <ErrorBody message={flow.message} onClose={onClose} sheetStyles={sheetStyles} />
            ) : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function ConfirmBody(props: {
  pkg: SessionPackage;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  sheetStyles: SheetStyles;
  gradients: AppGradients;
  colors: AppThemeColors;
}) {
  const { pkg, onClose, onConfirm, confirming, sheetStyles: styles, gradients, colors } = props;
  const totalLabel = formatMoneyFromCents(pkg.priceCents, pkg.currency);
  const unitLabel = formatMoneyFromCents(packageUnitCents(pkg), pkg.currency);
  const sessionsLabel = pkg.credits === 1 ? "1 sesión" : `${pkg.credits} sesiones`;

  return (
    <>
      <View style={styles.heroRow}>
        <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
          <Ionicons name="sparkles" size={26} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>MCare Plus</Text>
          <Text style={styles.title}>Confirmá tu paquete</Text>
          {pkg.name ? <Text style={styles.pkgName}>{pkg.name}</Text> : null}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Incluye</Text>
          <Text style={styles.summaryValue}>{sessionsLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Precio por sesión</Text>
          <Text style={styles.summaryValueMuted}>{unitLabel}</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{totalLabel}</Text>
        </View>
      </View>

      <View style={styles.demoNotice}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.demoNoticeText}>
          En este entorno la compra es simulada: no se cobra ningún importe real.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Ahora no"
          variant="ghost"
          onPress={onClose}
          disabled={confirming}
          style={styles.actionsHalf}
        />
        <PrimaryButton label="Confirmar compra" loading={confirming} onPress={onConfirm} style={styles.actionsHalf} />
      </View>
    </>
  );
}

function SuccessBody(props: { credits: number; onClose: () => void; sheetStyles: SheetStyles }) {
  const { credits, onClose, sheetStyles: styles } = props;
  const line =
    credits === 1 ? "Tenés 1 sesión disponible para agendar." : `Tenés ${credits} sesiones disponibles para agendar.`;

  return (
    <>
      <View style={styles.heroRow}>
        <LinearGradient colors={["#34D399", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
          <Ionicons name="checkmark-done" size={28} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.heroText}>
          <Text style={styles.eyebrowSuccess}>Listo</Text>
          <Text style={styles.title}>¡Acreditamos tu paquete!</Text>
        </View>
      </View>
      <Text style={styles.bodyCenter}>{line}</Text>
      <Text style={styles.hintCenter}>Usá el botón + en Inicio para elegir fecha y hora.</Text>
      <PrimaryButton label="Genial" onPress={onClose} style={styles.singleCta} />
    </>
  );
}

function ErrorBody(props: { message: string; onClose: () => void; sheetStyles: SheetStyles }) {
  const { message, onClose, sheetStyles: styles } = props;

  return (
    <>
      <View style={styles.heroRow}>
        <View style={styles.heroIconError}>
          <Ionicons name="cloud-offline-outline" size={28} color="#DC2626" />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrowError}>No se pudo completar</Text>
          <Text style={styles.title}>Algo salió mal</Text>
        </View>
      </View>
      <Text style={styles.bodyCenter}>{message}</Text>
      <PrimaryButton label="Entendido" onPress={onClose} style={styles.singleCta} />
    </>
  );
}
