import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps
} from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { getChatThreads } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii } from "../theme/colors";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import { PatientsScreen } from "../screens/PatientsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { IncomeScreen } from "../screens/IncomeScreen";
import { useChrome } from "./ChromeContext";
import type { ProTabParamList } from "./types";

const Tabs = createMaterialTopTabNavigator<ProTabParamList>();

const ITEMS: Array<{
  name: keyof ProTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { name: "dashboard", label: "Dashboard", icon: "grid-outline" },
  { name: "horarios", label: "Horarios", icon: "time-outline" },
  { name: "pacientes", label: "Pacientes", icon: "people-outline" },
  { name: "chat", label: "Chat", icon: "chatbubbles-outline" },
  { name: "ingresos", label: "Ingresos", icon: "cash-outline" }
];

export function MainTabs() {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!token) {
      return;
    }
    const update = async () => {
      try {
        const response = await getChatThreads(token);
        if (alive) {
          setUnread(response.threads.reduce((sum, thread) => sum + thread.unreadCount, 0));
        }
      } catch {
        // noop
      }
    };
    void update();
    const interval = setInterval(() => void update(), 12000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [token]);

  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: false,
        tabBarShowLabel: false,
        tabBarStyle: { height: 0, opacity: 0 },
        tabBarIndicatorStyle: { opacity: 0 }
      }}
      tabBar={(props) => <IslandTabBar {...props} unread={unread} />}
    >
      <Tabs.Screen name="dashboard" component={DashboardScreen} />
      <Tabs.Screen name="horarios" component={ScheduleScreen} />
      <Tabs.Screen name="pacientes" component={PatientsScreen} />
      <Tabs.Screen name="chat" component={ChatScreen} />
      <Tabs.Screen name="ingresos" component={IncomeScreen} />
    </Tabs.Navigator>
  );
}

function IslandTabBar({ state, navigation, unread }: MaterialTopTabBarProps & { unread: number }) {
  const insets = useSafeAreaInsets();
  const { tabBarHidden } = useChrome();
  const bottom = Math.max(10, insets.bottom);

  if (tabBarHidden) {
    return null;
  }

  return (
    <View style={[styles.wrap, { bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const item = ITEMS.find((entry) => entry.name === route.name);
        if (!item) {
          return null;
        }
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              if (!focused) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={item.icon} size={20} color={focused ? "#fff" : colors.muted} />
              {item.name === "chat" && unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 72,
    paddingHorizontal: 6,
    borderRadius: radii.island,
    backgroundColor: colors.tabBarBg,
    borderWidth: 1,
    borderColor: colors.tabBarBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrapActive: {
    backgroundColor: colors.primary
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted
  },
  labelActive: {
    color: colors.primary
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700"
  }
});
