import { ActivityIndicator, View } from "react-native";
import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { MoreDrawer } from "../components/MoreDrawer";
import { colors } from "../theme/colors";
import { AgendaSettingsScreen } from "../screens/AgendaSettingsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PatientDetailScreen } from "../screens/PatientDetailScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ChromeProvider, useChrome } from "./ChromeContext";
import { MainTabs } from "./MainTabs";
import type { AuthStackParamList, ProRootStackParamList } from "./types";

const navigationRef = createNavigationContainerRef<ProRootStackParamList>();

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<ProRootStackParamList>();

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function AuthenticatedApp() {
  const chrome = useChrome();
  return (
    <>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={MainTabs} />
        <RootStack.Screen name="Profile" component={ProfileScreen} />
        <RootStack.Screen name="Settings" component={SettingsScreen} />
        <RootStack.Screen name="AgendaSettings" component={AgendaSettingsScreen} />
        <RootStack.Screen name="Reports" component={ReportsScreen} />
        <RootStack.Screen name="PatientDetail" component={PatientDetailScreen} />
      </RootStack.Navigator>
      <MoreDrawer
        open={chrome.drawerOpen}
        onClose={chrome.closeDrawer}
        onProfile={() => {
          chrome.closeDrawer();
          if (navigationRef.isReady()) {
            navigationRef.navigate("Profile");
          }
        }}
        onReports={() => {
          chrome.closeDrawer();
          if (navigationRef.isReady()) {
            navigationRef.navigate("Reports");
          }
        }}
        onAgendaSettings={() => {
          chrome.closeDrawer();
          if (navigationRef.isReady()) {
            navigationRef.navigate("AgendaSettings");
          }
        }}
        onSettings={() => {
          chrome.closeDrawer();
          if (navigationRef.isReady()) {
            navigationRef.navigate("Settings");
          }
        }}
      />
    </>
  );
}

export function AppNavigator() {
  const { loading, token } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!token ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      ) : (
        <ChromeProvider>
          <AuthenticatedApp />
        </ChromeProvider>
      )}
    </NavigationContainer>
  );
}
