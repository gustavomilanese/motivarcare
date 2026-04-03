import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { BookingsRefreshProvider } from "../context/BookingsRefreshContext";
import { PatientProfileProvider, usePatientProfile } from "../context/PatientProfileContext";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { IntakeWizardScreen } from "../screens/onboarding/IntakeWizardScreen";
import { RiskBlockedScreen } from "../screens/onboarding/RiskBlockedScreen";
import { CalendarConnectScreen } from "../screens/onboarding/CalendarConnectScreen";
import { MatchingScreen } from "../screens/onboarding/MatchingScreen";
import { MainTabs } from "./MainTabs";
import type { AuthStackParamList, PostIntakeParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const PostIntakeStack = createNativeStackNavigator<PostIntakeParamList>();

function buildNavigationTheme(dark: boolean, colors: AppThemeColors): Theme {
  return {
    dark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.success
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" },
      medium: { fontFamily: "System", fontWeight: "500" },
      bold: { fontFamily: "System", fontWeight: "700" },
      heavy: { fontFamily: "System", fontWeight: "800" }
    }
  };
}

function LoadingApp() {
  const { colors } = useThemeMode();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function PostIntakeNavigator() {
  return (
    <PostIntakeStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="CalendarConnect">
      <PostIntakeStack.Screen name="CalendarConnect" component={CalendarConnectScreen} />
      <PostIntakeStack.Screen name="Matching" component={MatchingScreen} />
    </PostIntakeStack.Navigator>
  );
}

function AuthenticatedGate() {
  const { profile, loading } = usePatientProfile();

  if (loading) {
    return <LoadingApp />;
  }

  if (!profile?.intakeCompletedAt) {
    return <IntakeWizardScreen />;
  }

  if (profile.intakeRiskBlocked) {
    return <RiskBlockedScreen />;
  }

  if (!profile.activeProfessional) {
    return <PostIntakeNavigator />;
  }

  return <MainTabs />;
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export function AppNavigator() {
  const { loading, token } = useAuth();
  const { mode, colors } = useThemeMode();

  if (loading) {
    return <LoadingApp />;
  }

  const navigationTheme = buildNavigationTheme(mode === "dark", colors);

  return (
    <NavigationContainer theme={navigationTheme}>
      {!token ? (
        <AuthNavigator />
      ) : (
        <PatientProfileProvider>
          <BookingsRefreshProvider>
            <AuthenticatedGate />
          </BookingsRefreshProvider>
        </PatientProfileProvider>
      )}
    </NavigationContainer>
  );
}
