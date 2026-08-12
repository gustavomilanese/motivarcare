import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeMode } from "../theme/ThemeContext";

/**
 * Banner global cuando no hay conectividad (API / deep links / checkout fallan sin red).
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeMode();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
    });
    void NetInfo.fetch().then((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
    });
    return () => unsub();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          position: "absolute",
          top: insets.top + 4,
          left: 12,
          right: 12,
          zIndex: 100,
          backgroundColor: colors.danger,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14
        },
        text: {
          color: "#FFFFFF",
          fontWeight: "700",
          fontSize: 13,
          textAlign: "center"
        }
      }),
    [colors.danger, insets.top]
  );

  if (!offline) {
    return null;
  }

  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.text}>Sin conexión. Algunas funciones pueden no estar disponibles.</Text>
    </View>
  );
}
