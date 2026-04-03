import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { usePatientProfile } from "../../context/PatientProfileContext";
import { useAuth } from "../../auth/AuthContext";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";

function buildRiskBlockedStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      gap: 16
    },
    hero: {
      borderRadius: 24,
      padding: 22,
      gap: 10
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800"
    },
    heroText: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 15,
      lineHeight: 22
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6
    },
    value: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text
    },
    note: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      marginVertical: 8
    }
  });
}

export function RiskBlockedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildRiskBlockedStyles(colors), [colors]);
  const { profile } = usePatientProfile();
  const { signOut } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Revisión humana</Text>
        <Text style={styles.heroText}>
          Por seguridad, un administrador debe aprobar tu cuenta antes de reservar sesiones. Te avisaremos por email.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Nivel informado</Text>
        <Text style={styles.value}>{profile?.intakeRiskLevel ?? "—"}</Text>
        <Text style={styles.label}>Estado</Text>
        <Text style={styles.value}>{profile?.intakeTriageDecision ?? "pendiente"}</Text>
        <Text style={styles.note}>
          Si necesitás ayuda inmediata, contactá una línea de crisis local o servicios de emergencia.
        </Text>

        <PrimaryButton
          label="Cerrar sesión"
          variant="danger"
          onPress={() => {
            void signOut();
          }}
        />
      </View>
    </View>
  );
}
