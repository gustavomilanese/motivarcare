import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { useMemo } from "react";
import { useThemeMode } from "../../theme/ThemeContext";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
  labelStyle?: TextStyle;
};

export function PrimaryButton(props: Props) {
  const { label, loading, variant = "primary", style, labelStyle, disabled, ...rest } = props;
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildButtonStyles(colors), [colors]);
  const ghost = variant === "ghost";
  const danger = variant === "danger";

  return (
    <Pressable
      {...rest}
      disabled={disabled ?? loading}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        ghost && styles.ghost,
        danger && styles.danger,
        !ghost && !danger && styles.primary,
        (pressed || loading) && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.primary : "#FFFFFF"} />
      ) : (
        <Text style={[styles.label, ghost && styles.labelGhost, danger && styles.labelDanger, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

function buildButtonStyles(c: import("../../theme/colors").AppThemeColors) {
  return StyleSheet.create({
    base: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20
    },
    primary: {
      backgroundColor: c.primary
    },
    ghost: {
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.ghostBorder
    },
    danger: {
      backgroundColor: c.dangerSurface,
      borderWidth: 1,
      borderColor: c.dangerBorder
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.985 }]
    },
    disabled: {
      opacity: 0.55
    },
    label: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: -0.2
    },
    labelGhost: {
      color: c.primaryDark
    },
    labelDanger: {
      color: c.danger,
      fontWeight: "700"
    }
  });
}
