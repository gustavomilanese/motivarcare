import { type PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii } from "../theme/colors";

export function Card(props: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, props.style]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16
  }
});
