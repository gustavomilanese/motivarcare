import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from "react-native";
import { colors, radii } from "../theme/colors";

type Props = Omit<PressableProps, "children" | "style"> & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
};

export function PrimaryButton(props: Props) {
  const { label, loading, variant = "primary", disabled, style, ...rest } = props;
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "ghost" && styles.labelGhost,
            variant === "danger" && styles.labelDanger
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  primary: {
    backgroundColor: colors.primary
  },
  ghost: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  danger: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  pressed: {
    opacity: 0.92
  },
  disabled: {
    opacity: 0.5
  },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  },
  labelGhost: {
    color: colors.text
  },
  labelDanger: {
    color: colors.danger
  }
});
