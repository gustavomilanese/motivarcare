import { type PropsWithChildren, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

function buildCardStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      shadowColor: colors.tabBarShadow,
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2
    }
  });
}

export function Card(props: CardProps) {
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildCardStyles(colors), [colors]);
  return <View style={[styles.card, props.style]}>{props.children}</View>;
}

