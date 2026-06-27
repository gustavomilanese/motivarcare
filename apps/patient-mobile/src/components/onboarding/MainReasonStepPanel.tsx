import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  detectMainReasonCategory,
  individualMainReasonPieces,
  intakePieces,
  PATIENT_COUPLES_THERAPY_FOCUS_OPTIONS_ES,
  PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES,
  type MainReasonCategory
} from "../../constants/intakeQuestions";
import { PrimaryButton } from "../ui/PrimaryButton";
import type { AppThemeColors } from "../../theme/colors";

const OTHER_OPTION_ES = "Otro";

function buildStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 16
    },
    categories: {
      gap: 10
    },
    category: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 4
    },
    categoryCouples: {
      borderColor: "rgba(219, 39, 119, 0.2)",
      backgroundColor: "#fff9fc"
    },
    categoryActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    categoryCouplesActive: {
      borderColor: "rgba(219, 39, 119, 0.45)",
      backgroundColor: "#fff1f7"
    },
    categoryLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text
    },
    categoryHint: {
      fontSize: 13,
      color: colors.textMuted
    },
    panel: {
      gap: 12
    },
    panelCouples: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(219, 39, 119, 0.16)",
      backgroundColor: "#fff5f9",
      padding: 14,
      gap: 12
    },
    panelLead: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text
    },
    panelSub: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginTop: -4
    },
    options: {
      gap: 10
    },
    optionBtn: {
      width: "100%"
    },
    otherLabel: {
      fontSize: 14,
      color: colors.textMuted
    },
    textArea: {
      minHeight: 96,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 12,
      fontSize: 15,
      color: colors.text
    }
  });
}

export function MainReasonStepPanel(props: {
  colors: AppThemeColors;
  mainReason: string;
  couplesFocus: string;
  onCategoryChange: (category: MainReasonCategory) => void;
  onToggleIndividual: (option: string) => void;
  onToggleCouplesFocus: (option: string) => void;
  onOtherDetailChange: (detail: string) => void;
}) {
  const styles = buildStyles(props.colors);
  const category = detectMainReasonCategory(props.mainReason, props.couplesFocus);
  const individualSelected = individualMainReasonPieces(props.mainReason);
  const couplesSelected = intakePieces(props.couplesFocus);
  const otherDetail = (() => {
    const hit = individualSelected.find((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));
    return hit ? hit.slice(OTHER_OPTION_ES.length + 1).trim() : "";
  })();
  const showOtherFollowup =
    individualSelected.includes(OTHER_OPTION_ES)
    || individualSelected.some((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));

  return (
    <View style={styles.wrap}>
      <View style={styles.categories}>
        <Pressable
          onPress={() => props.onCategoryChange("individual")}
          style={[styles.category, category === "individual" ? styles.categoryActive : null]}
        >
          <Text style={styles.categoryLabel}>Terapia individual</Text>
          <Text style={styles.categoryHint}>Para vos</Text>
        </Pressable>
        <Pressable
          onPress={() => props.onCategoryChange("couples")}
          style={[
            styles.category,
            styles.categoryCouples,
            category === "couples" ? styles.categoryCouplesActive : null
          ]}
        >
          <Text style={styles.categoryLabel}>Terapia de pareja</Text>
          <Text style={styles.categoryHint}>Con tu pareja</Text>
        </Pressable>
      </View>

      {category === "individual" ? (
        <View style={styles.panel}>
          <Text style={styles.panelLead}>Marcá uno o varios motivos de consulta.</Text>
          <View style={styles.options}>
            {PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES.map((option) => {
              const selected =
                individualSelected.includes(option)
                || (option === OTHER_OPTION_ES
                  && individualSelected.some((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`)));
              return (
                <PrimaryButton
                  key={option}
                  label={option}
                  variant={selected ? "primary" : "ghost"}
                  onPress={() => props.onToggleIndividual(option)}
                  style={styles.optionBtn}
                />
              );
            })}
          </View>
          {showOtherFollowup ? (
            <>
              <Text style={styles.otherLabel}>Detalle (obligatorio si elegiste «Otro»)</Text>
              <TextInput
                value={otherDetail}
                onChangeText={props.onOtherDetailChange}
                placeholder="Escribí brevemente…"
                placeholderTextColor={props.colors.textSubtle}
                multiline
                style={styles.textArea}
                textAlignVertical="top"
              />
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.panelCouples}>
          <Text style={styles.panelLead}>¿Qué aspectos de la pareja querés trabajar?</Text>
          <Text style={styles.panelSub}>Elegí uno o varios. Nos ayuda a orientar el match con tu profesional.</Text>
          <View style={styles.options}>
            {PATIENT_COUPLES_THERAPY_FOCUS_OPTIONS_ES.map((option) => {
              const selected = couplesSelected.includes(option);
              return (
                <PrimaryButton
                  key={option}
                  label={option}
                  variant={selected ? "primary" : "ghost"}
                  onPress={() => props.onToggleCouplesFocus(option)}
                  style={styles.optionBtn}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
