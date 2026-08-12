import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";
import { useThemeMode } from "../../theme/ThemeContext";

function buildStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      gap: 14
    },
    hero: {
      borderRadius: 24,
      padding: 22,
      gap: 8
    },
    title: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800"
    },
    lead: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 15,
      lineHeight: 22
    },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border
    },
    badge: {
      alignSelf: "flex-start",
      fontSize: 11,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    optionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text
    },
    optionDesc: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4
    },
    bullet: {
      fontSize: 13,
      color: colors.textMuted,
      flex: 1
    }
  });
}

export function IntakeMethodChooserScreen(props: {
  hasActiveChatSession?: boolean;
  onChooseClassic: () => void;
  onChooseChat: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.title}>¿Cómo querés hacer la entrevista?</Text>
        <Text style={styles.lead}>
          Las dos modalidades terminan igual: matchearte con el profesional adecuado.
        </Text>
      </LinearGradient>

      <Pressable style={styles.option} onPress={props.onChooseClassic}>
        <Text style={styles.badge}>Tradicional</Text>
        <Text style={styles.optionTitle}>Cuestionario paso a paso</Text>
        <Text style={styles.optionDesc}>
          Preguntas con opciones. Tarda unos minutos. Ideal si preferís lo directo.
        </Text>
        <View style={styles.row}>
          <Ionicons name="list-outline" size={16} color={colors.primary} />
          <Text style={styles.bullet}>Sin uso de IA</Text>
        </View>
        <PrimaryButton label="Continuar con cuestionario" onPress={props.onChooseClassic} />
      </Pressable>

      <Pressable style={styles.option} onPress={props.onChooseChat}>
        <Text style={styles.badge}>Beta</Text>
        <Text style={styles.optionTitle}>
          {props.hasActiveChatSession ? "Continuar conversación" : "Chat conversacional"}
        </Text>
        <Text style={styles.optionDesc}>
          Charlá con un asistente que te guía. Podés pasar al cuestionario cuando quieras.
        </Text>
        <View style={styles.row}>
          <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
          <Text style={styles.bullet}>Asistido por IA</Text>
        </View>
        <PrimaryButton
          label={props.hasActiveChatSession ? "Retomar chat" : "Empezar chat"}
          onPress={props.onChooseChat}
        />
      </Pressable>
    </View>
  );
}
