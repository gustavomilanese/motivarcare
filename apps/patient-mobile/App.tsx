import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider, useThemeMode } from "./src/theme/ThemeContext";

function ThemedAppNavigator() {
  const { mode } = useThemeMode();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <AppNavigator />
      <OfflineBanner />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <ThemedAppNavigator />
          </AuthProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
