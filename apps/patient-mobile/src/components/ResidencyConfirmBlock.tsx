import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  filterResidencyOptionsForPatientPortal,
  PATIENT_PORTAL_RESIDENCY_CODES,
  RESIDENCY_COUNTRY_OPTIONS
} from "@therapy/types";
import { PrimaryButton } from "./ui/PrimaryButton";
import { useThemeMode } from "../theme/ThemeContext";

function initialDraft(current?: string | null): string {
  const iso = (current ?? "").trim().toUpperCase();
  return (PATIENT_PORTAL_RESIDENCY_CODES as readonly string[]).includes(iso) ? iso : "AR";
}

export function ResidencyConfirmBlock(props: {
  currentIso?: string | null;
  saving?: boolean;
  onConfirm: (iso: string) => void | Promise<void>;
}) {
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const options = filterResidencyOptionsForPatientPortal(RESIDENCY_COUNTRY_OPTIONS);
  const [draft, setDraft] = useState(initialDraft(props.currentIso));

  return (
    <View style={styles.wrap}>
      <Text style={styles.copy}>
        El cobro usa el país que declaraste en el onboarding, no el de este teléfono. Confirmalo para continuar.
      </Text>
      <View style={styles.options}>
        {options.map((row) => {
          const selected = draft === row.code;
          return (
            <Pressable
              key={row.code}
              onPress={() => setDraft(row.code)}
              disabled={props.saving}
              style={[styles.option, selected ? styles.optionSelected : null]}
            >
              <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>{row.names.es}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton
        label={props.saving ? "Guardando..." : "Confirmar país y continuar"}
        loading={props.saving}
        disabled={props.saving || !draft}
        onPress={() => void props.onConfirm(draft)}
        style={styles.cta}
      />
    </View>
  );
}

function buildStyles(colors: import("../theme/colors").AppThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 12
    },
    copy: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecond,
      lineHeight: 20
    },
    options: {
      gap: 8
    },
    option: {
      minHeight: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text
    },
    optionLabelSelected: {
      color: colors.primaryDark
    },
    cta: {
      borderRadius: 8
    }
  });
}
