import { useEffect, useMemo, useState } from "react";
import { useThemeMode } from "../theme/ThemeContext";
import { View, Pressable, StyleSheet, Text } from "react-native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps
} from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { getChatThreads } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HomeScreen } from "../screens/HomeScreen";
import { SessionsScreen } from "../screens/SessionsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import type { PatientTabParamList } from "./types";

export type RootTabsParamList = PatientTabParamList;

const Tabs = createMaterialTopTabNavigator<PatientTabParamList>();

export function MainTabs() {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setUnreadCount(0);
      return;
    }

    const update = async () => {
      try {
        const response = await getChatThreads(token);
        if (!alive) {
          return;
        }
        const next = response.threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
        setUnreadCount(next);
      } catch {
        // noop
      }
    };

    void update();
    const interval = setInterval(() => {
      void update();
    }, 12000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [token]);

  const badge = useMemo(() => (unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined), [unreadCount]);

  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: false,
        tabBarShowLabel: false,
        tabBarStyle: { height: 0, opacity: 0 },
        tabBarIndicatorStyle: { opacity: 0 }
      }}
      tabBar={(props) => <BottomTabBar {...props} badge={badge} />}
    >
      <Tabs.Screen name="profile" component={ProfileScreen} />
      <Tabs.Screen name="home" component={HomeScreen} />
      <Tabs.Screen name="sessions" component={SessionsScreen} />
      <Tabs.Screen name="chat" component={ChatScreen} />
    </Tabs.Navigator>
  );
}

type BottomBarProps = MaterialTopTabBarProps & { badge?: string | number };

function BottomTabBar({ state, navigation, badge }: BottomBarProps) {
  const { colors } = useThemeMode();
  const barStyles = useMemo(() => buildTabBarStyles(colors), [colors]);

  return (
    <View style={barStyles.wrap}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          if (!focused) {
            navigation.navigate(route.name);
          }
        };

        const color = focused ? colors.primary : colors.textMuted;
        const size = 22;

        let icon: keyof typeof Ionicons.glyphMap = "ellipse";
        let label = "";
        if (route.name === "home") {
          icon = "home";
          label = "Inicio";
        } else if (route.name === "sessions") {
          icon = "calendar";
          label = "Sesiones";
        } else if (route.name === "chat") {
          icon = "chatbubbles";
          label = "Chat";
        } else if (route.name === "profile") {
          icon = "person-circle";
          label = "Mi cuenta";
        }

        const showBadge = route.name === "chat" && badge != null;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [barStyles.item, pressed && barStyles.itemPressed]}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
          >
            <View style={barStyles.iconRow}>
              <Ionicons name={icon} color={color} size={size} />
              {showBadge ? (
                <View style={barStyles.badge}>
                  <Text style={barStyles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[barStyles.label, focused && barStyles.labelFocused]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildTabBarStyles(c: import("../theme/colors").AppThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 14,
      right: 14,
      bottom: 14,
      height: 68,
      paddingBottom: 10,
      paddingTop: 10,
      borderTopWidth: 0,
      borderRadius: 24,
      backgroundColor: c.tabBarBg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      shadowColor: c.tabBarShadow,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2
    },
    itemPressed: {
      opacity: 0.9
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 0,
      color: c.textMuted
    },
    labelFocused: {
      color: c.primary
    },
    badge: {
      marginLeft: 4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4
    },
    badgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700"
    }
  });
}

