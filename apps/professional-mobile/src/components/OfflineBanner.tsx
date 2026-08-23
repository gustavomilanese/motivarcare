import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "../theme/colors";

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
    });
    return () => unsub();
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <View style={[styles.banner, { top: insets.top + 4 }]} pointerEvents="none">
      <Text style={styles.text}>Sin conexión. Algunas funciones pueden no estar disponibles.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 100,
    backgroundColor: colors.danger,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center"
  }
});
