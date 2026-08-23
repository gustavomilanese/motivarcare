import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/colors";

type Props = {
  title: string;
  onMore?: () => void;
  hideMore?: boolean;
};

export function AppHeader(props: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {props.title}
      </Text>
      {props.hideMore ? null : (
        <Pressable onPress={props.onMore} hitSlop={10} style={styles.more} accessibilityLabel="Más opciones">
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 8
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.02,
    color: colors.textSecondary
  },
  more: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center"
  }
});
