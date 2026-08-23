import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onBack: () => void;
};

export function StackHeader(props: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={props.onBack} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹ Volver</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {props.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    marginBottom: 8,
    gap: 8
  },
  back: { minHeight: 44, justifyContent: "center", paddingRight: 4 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  title: { flex: 1, fontSize: 18, fontWeight: "600", color: colors.textSecondary }
});
