import {
  kindLabel,
  type PortalNotificationItem
} from "@therapy/patient-core";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";

type Props = {
  visible: boolean;
  language?: "es" | "en" | "pt";
  items: PortalNotificationItem[];
  onClose: () => void;
  onOpen: (item: PortalNotificationItem) => void;
  onDismiss: (item: PortalNotificationItem) => void;
};

function buildStyles(c: AppThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end"
    },
    sheet: {
      maxHeight: "78%",
      backgroundColor: c.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingBottom: 16
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceMuted
    },
    empty: {
      paddingVertical: 28,
      textAlign: "center",
      color: c.textMuted,
      fontSize: 15
    },
    row: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      marginTop: 10
    },
    itemButton: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: c.surfaceMuted
    },
    itemButtonUnread: {
      borderColor: "#CEC5FF",
      backgroundColor: "rgba(95, 68, 235, 0.06)"
    },
    kind: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: c.textMuted,
      marginBottom: 4
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
      marginBottom: 2
    },
    itemBody: {
      fontSize: 13,
      color: c.text,
      marginBottom: 2
    },
    itemMeta: {
      fontSize: 12,
      color: c.textMuted
    },
    dismissButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface
    }
  });
}

export function NotificationsSheet(props: Props) {
  const { colors } = useThemeMode();
  const insets = useSafeAreaInsets();
  const styles = buildStyles(colors);
  const language = props.language ?? "es";

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={() => undefined}>
          <View style={styles.head}>
            <Text style={styles.title}>Notificaciones</Text>
            <Pressable style={styles.closeButton} onPress={props.onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          {props.items.length === 0 ? (
            <Text style={styles.empty}>Sin novedades por ahora.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {props.items.slice(0, 12).map((item) => (
                <View key={item.id} style={styles.row}>
                  <Pressable
                    style={[styles.itemButton, item.unread ? styles.itemButtonUnread : null]}
                    onPress={() => props.onOpen(item)}
                  >
                    <Text style={styles.kind}>{kindLabel(language, item.kind)}</Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.body ? <Text style={styles.itemBody}>{item.body}</Text> : null}
                    {item.meta ? <Text style={styles.itemMeta}>{item.meta}</Text> : null}
                  </Pressable>
                  <Pressable
                    style={styles.dismissButton}
                    onPress={() => props.onDismiss(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Descartar"
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
