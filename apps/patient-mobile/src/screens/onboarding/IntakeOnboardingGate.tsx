import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { fetchActiveIntakeChatSession, getPublicFeatures } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useThemeMode } from "../../theme/ThemeContext";
import { IntakeChatScreen } from "./IntakeChatScreen";
import { IntakeMethodChooserScreen } from "./IntakeMethodChooserScreen";
import { IntakeWizardScreen } from "./IntakeWizardScreen";

type IntakePath = "loading" | "chooser" | "classic" | "chat";

/**
 * Gate previo al intake: si el flag público habilita chat, ofrece chooser;
 * si no, entra directo al wizard clásico.
 */
export function IntakeOnboardingGate() {
  const { token } = useAuth();
  const { colors } = useThemeMode();
  const [path, setPath] = useState<IntakePath>("loading");
  const [chatEnabled, setChatEnabled] = useState(false);
  const [hasActiveChat, setHasActiveChat] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const features = await getPublicFeatures();
        if (!alive) {
          return;
        }
        const enabled = Boolean(features.intakeChatEnabled);
        setChatEnabled(enabled);
        if (!enabled) {
          setPath("classic");
          return;
        }
        if (token) {
          const active = await fetchActiveIntakeChatSession(token);
          if (!alive) {
            return;
          }
          setHasActiveChat(Boolean(active?.session));
        }
        setPath("chooser");
      } catch {
        if (alive) {
          setPath("classic");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const onChooseClassic = useCallback(() => setPath("classic"), []);
  const onChooseChat = useCallback(() => setPath("chat"), []);
  const onBackToChooser = useCallback(() => setPath("chooser"), []);

  if (path === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (path === "chooser") {
    return (
      <IntakeMethodChooserScreen
        hasActiveChatSession={hasActiveChat}
        onChooseClassic={onChooseClassic}
        onChooseChat={onChooseChat}
      />
    );
  }

  if (path === "chat") {
    return <IntakeChatScreen onSwitchToClassic={onChooseClassic} onCancel={onBackToChooser} />;
  }

  return (
    <IntakeWizardScreen onSwitchToChat={chatEnabled ? onChooseChat : undefined} />
  );
}
