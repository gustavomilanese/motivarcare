import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PATIENT_FAQ_ES } from "../../help/patientFaqEs";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";

export function HelpFaqScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        pad: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
        backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        backText: { color: colors.primary, fontWeight: "700" },
        title: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 4 },
        lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
        sectionTitle: {
          fontSize: 15,
          fontWeight: "800",
          color: colors.textSubtle ?? colors.textMuted,
          marginTop: 12,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.4
        },
        item: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          gap: 8
        },
        qRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        q: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
        a: { fontSize: 14, color: colors.textMuted, lineHeight: 20 }
      }),
    [colors]
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.pad, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backText}>Mi cuenta</Text>
      </Pressable>
      <Text style={styles.title}>Preguntas frecuentes</Text>
      <Text style={styles.lead}>Respuestas rápidas sobre sesiones, pagos, Maca y bienestar.</Text>

      {PATIENT_FAQ_ES.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => {
            const key = `${section.title}:${item.q}`;
            const open = openKey === key;
            return (
              <Pressable
                key={key}
                style={[styles.item, { marginBottom: 8 }]}
                onPress={() => setOpenKey(open ? null : key)}
              >
                <View style={styles.qRow}>
                  <Text style={styles.q}>{item.q}</Text>
                  <Ionicons name={open ? "remove" : "add"} size={18} color={colors.primary} />
                </View>
                {open ? <Text style={styles.a}>{item.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
