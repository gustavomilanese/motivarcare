import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { colors, radii } from "../theme/colors";
import { PersonAvatar } from "./PersonAvatar";

type Props = {
  open: boolean;
  onClose: () => void;
  onProfile: () => void;
  onReports: () => void;
  onAgendaSettings: () => void;
  onSettings: () => void;
};

export function MoreDrawer(props: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Profesional";

  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={props.onClose} />
        <View style={[styles.panel, { paddingTop: insets.top }]}>
          <Pressable style={styles.head} onPress={props.onProfile}>
            <PersonAvatar uri={user?.avatarUrl} name={user?.fullName ?? ""} size={48} />
            <View style={styles.headCopy}>
              <Text style={styles.name}>{firstName}</Text>
              <Text style={styles.profileLink}>Mi perfil ›</Text>
            </View>
          </Pressable>

          <Text style={styles.group}>Consultorio</Text>
          <DrawerItem icon="document-text-outline" label="Reportes" onPress={props.onReports} />
          <DrawerItem icon="calendar-outline" label="Ajustes de agenda" onPress={props.onAgendaSettings} />

          <Text style={styles.group}>Cuenta</Text>
          <DrawerItem icon="settings-outline" label="Ajustes" onPress={props.onSettings} />
          <DrawerItem
            icon="log-out-outline"
            label="Salir"
            onPress={() => {
              props.onClose();
              void signOut();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function DrawerItem(props: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={styles.item}>
      <Ionicons name={props.icon} size={20} color={colors.text} />
      <Text style={styles.itemLabel}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row"
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay
  },
  panel: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.primary
  },
  headCopy: {
    flex: 1
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },
  profileLink: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontSize: 14
  },
  group: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radii.control
  },
  itemLabel: {
    fontSize: 16,
    color: colors.text
  }
});
