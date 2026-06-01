import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getEmergencyResources } from "@therapy/types";
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
    body: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20
    },
    subhead: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      marginTop: 8
    }
  });
}

export function RiskBlockedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildRiskBlockedStyles(colors), [colors]);
  const { profile } = usePatientProfile();
  const { signOut } = useAuth();

  const resources = useMemo(
    () => getEmergencyResources(profile?.residencyCountry ?? null),
    [profile?.residencyCountry]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroTitle}>Apoyo inmediato</Text>
        <Text style={styles.heroText}>
          Por lo que nos compartiste, no podemos continuar con el registro en MotivarCare. Buscá ayuda en una línea de crisis
          local o servicios de emergencia.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        {resources ? (
          <>
            <Text style={styles.subhead}>{resources.countryName} — recursos</Text>
            {resources.resources.map((resource) => (
              <Text key={`${resource.label}-${resource.contact}`} style={styles.body}>
                • {resource.label}: {resource.contact}
              </Text>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.body}>• Emergencias: 911 / 112 según tu país.</Text>
            <Text style={styles.body}>• Argentina: 0800-345-1435.</Text>
            <Text style={styles.body}>• Estados Unidos: 988.</Text>
          </>
        )}
        <Text style={styles.body}>
          Si necesitás ayuda inmediata, contactá estos servicios. Podés cerrar sesión y volver cuando te sientas en condiciones.
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
