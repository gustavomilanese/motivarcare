import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { STORAGE_DEFER_PROFESSIONAL_SELECTION } from "../constants/storageKeys";
import { BookingsRefreshProvider } from "../context/BookingsRefreshContext";
import { PatientProfileProvider, usePatientProfile } from "../context/PatientProfileContext";
import { DlocalCheckoutReturnHost } from "../payments/DlocalCheckoutReturnHost";
import { TrialCheckoutReturnHost } from "../payments/TrialCheckoutReturnHost";
import { MacaHost } from "../maca/MacaHost";
import { PushNotificationsHost } from "../notifications/PushNotificationsHost";
import { PatientPreferencesProvider } from "../context/PatientPreferencesContext";
import type { AppThemeColors } from "../theme/colors";
import { useThemeMode } from "../theme/ThemeContext";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { VerifyEmailRequiredScreen } from "../screens/VerifyEmailRequiredScreen";
import { VerifyEmailTokenScreen } from "../screens/VerifyEmailTokenScreen";
import { IntakeOnboardingGate } from "../screens/onboarding/IntakeOnboardingGate";
import { RiskBlockedScreen } from "../screens/onboarding/RiskBlockedScreen";
import { CalendarConnectScreen } from "../screens/onboarding/CalendarConnectScreen";
import { MatchingScreen } from "../screens/onboarding/MatchingScreen";
import { DiaryHomeScreen } from "../screens/wellbeing/DiaryHomeScreen";
import { DiaryNewEntryScreen } from "../screens/wellbeing/DiaryNewEntryScreen";
import { DiaryRecordsScreen } from "../screens/wellbeing/DiaryRecordsScreen";
import { ExercisesListScreen } from "../screens/wellbeing/ExercisesListScreen";
import { ExerciseDetailScreen } from "../screens/wellbeing/ExerciseDetailScreen";
import { ExerciseRoutineScreen } from "../screens/wellbeing/ExerciseRoutineScreen";
import { RelaxationMusicScreen } from "../screens/wellbeing/RelaxationMusicScreen";
import { HelpFaqScreen } from "../screens/help/HelpFaqScreen";
import { MainTabs } from "./MainTabs";
import { authLinking } from "./linking";
import type { AuthStackParamList, PatientRootStackParamList, PostIntakeParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const PostIntakeStack = createNativeStackNavigator<PostIntakeParamList>();
const PatientRootStack = createNativeStackNavigator<PatientRootStackParamList>();

type EmailGateParamList = {
  VerifyEmailRequired: undefined;
  VerifyEmailToken: { token?: string } | undefined;
};

const EmailGateStack = createNativeStackNavigator<EmailGateParamList>();

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

function PatientRootNavigator() {
  return (
    <PatientRootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <PatientRootStack.Screen name="Tabs" component={MainTabs} />
      <PatientRootStack.Screen name="ProfessionalMatching" component={MatchingScreen} />
      <PatientRootStack.Screen name="DiaryHome" component={DiaryHomeScreen} />
      <PatientRootStack.Screen name="DiaryNew" component={DiaryNewEntryScreen} />
      <PatientRootStack.Screen name="DiaryRecords" component={DiaryRecordsScreen} />
      <PatientRootStack.Screen name="ExercisesList" component={ExercisesListScreen} />
      <PatientRootStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <PatientRootStack.Screen name="ExerciseRoutine" component={ExerciseRoutineScreen} />
      <PatientRootStack.Screen name="RelaxationMusic" component={RelaxationMusicScreen} />
      <PatientRootStack.Screen name="HelpFaq" component={HelpFaqScreen} />
    </PatientRootStack.Navigator>
  );
}

function AuthenticatedGate() {
  const { profile, loading } = usePatientProfile();
  const [deferChoice, setDeferChoice] = useState<boolean | null>(null);

  const shouldResolveDefer =
    Boolean(profile?.intakeCompletedAt) && !profile?.intakeRiskBlocked && !profile?.activeProfessional;

  useEffect(() => {
    if (!shouldResolveDefer) {
      setDeferChoice(null);
      return;
    }
    setDeferChoice(null);
    let alive = true;
    void AsyncStorage.getItem(STORAGE_DEFER_PROFESSIONAL_SELECTION).then((raw) => {
      if (alive) {
        setDeferChoice(raw === "true");
      }
    });
    return () => {
      alive = false;
    };
  }, [shouldResolveDefer]);

  if (loading) {
    return <LoadingApp />;
  }

  if (!profile?.intakeCompletedAt) {
    return <IntakeOnboardingGate />;
  }

  if (profile.intakeRiskBlocked) {
    return <RiskBlockedScreen />;
  }

  if (!profile.activeProfessional) {
    if (deferChoice === null) {
      return <LoadingApp />;
    }
    if (deferChoice) {
      return <PatientRootNavigator />;
    }
    return <PostIntakeNavigator />;
  }

  return <PatientRootNavigator />;
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="VerifyEmailToken" component={VerifyEmailTokenScreen} />
    </AuthStack.Navigator>
  );
}

function EmailVerificationGateNavigator() {
  return (
    <EmailGateStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="VerifyEmailRequired">
      <EmailGateStack.Screen name="VerifyEmailRequired" component={VerifyEmailRequiredScreen} />
      <EmailGateStack.Screen name="VerifyEmailToken" component={VerifyEmailTokenScreen} />
    </EmailGateStack.Navigator>
  );
}

export function AppNavigator() {
  const { loading, token, needsEmailVerification } = useAuth();
  const { mode, colors } = useThemeMode();

  if (loading) {
    return <LoadingApp />;
  }

  const navigationTheme = buildNavigationTheme(mode === "dark", colors);
  const linking = !token || needsEmailVerification ? authLinking : undefined;

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      {!token ? (
        <AuthNavigator />
      ) : needsEmailVerification ? (
        <EmailVerificationGateNavigator />
      ) : (
        <PatientProfileProvider>
          <PatientPreferencesProvider>
            <BookingsRefreshProvider>
              <AuthenticatedGate />
              <DlocalCheckoutReturnHost />
              <TrialCheckoutReturnHost />
              <MacaHost />
              <PushNotificationsHost />
            </BookingsRefreshProvider>
          </PatientPreferencesProvider>
        </PatientProfileProvider>
      )}
    </NavigationContainer>
  );
}
