import { type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export function Screen(props: PropsWithChildren<{ padded?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.body, props.padded !== false && styles.padded]}>{props.children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  padded: {
    paddingHorizontal: 12
  }
});
