import { type PropsWithChildren, type ReactNode, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeMode } from "../theme/ThemeContext";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Botón atrás u otra acción a la izquierda del título */
  leading?: ReactNode;
  /** Encabezado más bajo (p. ej. chat con botón atrás) — evita sensación de amontonamiento */
  compact?: boolean;
  panHandlers?: any;
  scroll?: boolean;
}>;

export function Screen(props: ScreenProps) {
  const { title, subtitle, leading, compact, panHandlers, scroll = true, children } = props;
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildScreenStyles(colors), [colors]);

  const Head = (
    <View style={[styles.head, leading ? styles.headWithLeading : null]}>
      {leading ? <View style={styles.leadingWrap}>{leading}</View> : null}
      <View style={styles.headTitles}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} {...panHandlers}>
          {Head}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, compact && styles.contentCompact, styles.contentFill]} {...panHandlers}>
          {Head}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

function buildScreenStyles(c: import("../theme/colors").AppThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background
    },
    content: {
      padding: 16,
      gap: 14
    },
    contentCompact: {
      paddingTop: 10,
      gap: 10
    },
    contentFill: {
      flex: 1,
      minHeight: 0
    },
    head: {
      gap: 4
    },
    headWithLeading: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4
    },
    leadingWrap: {
      marginRight: 4,
      marginTop: 2
    },
    headTitles: {
      flex: 1,
      minWidth: 0,
      gap: 4
    },
    title: {
      color: c.text,
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -0.6,
      lineHeight: 36
    },
    titleCompact: {
      fontSize: 24,
      letterSpacing: -0.5,
      lineHeight: 29
    },
    subtitle: {
      color: c.textMuted,
      fontSize: 15,
      lineHeight: 20
    },
    subtitleCompact: {
      fontSize: 14,
      lineHeight: 19
    }
  });
}
