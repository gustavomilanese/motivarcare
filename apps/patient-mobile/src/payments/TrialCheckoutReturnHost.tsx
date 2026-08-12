import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { McarePurchaseSheets } from "../components/McarePurchaseSheets";
import { useThemeMode } from "../theme/ThemeContext";
import { useTrialCheckoutReturn } from "./useTrialCheckoutReturn";

/**
 * Listens for trial dLocal return / pending fulfill and surfaces success/error.
 * Must sit under Auth + PatientProfileProvider + BookingsRefreshProvider.
 */
export function TrialCheckoutReturnHost() {
  const { colors } = useThemeMode();
  const { processing, success, errorMessage, dismissSuccess, dismissError } =
    useTrialCheckoutReturn();

  return (
    <>
      <Modal visible={processing} transparent animationType="fade">
        <View style={styles.loaderRoot}>
          <View style={[styles.loaderCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loaderText, { color: colors.text }]}>
              Confirmando tu sesión de prueba…
            </Text>
          </View>
        </View>
      </Modal>

      <McarePurchaseSheets
        flow={
          success
            ? { kind: "success", credits: 1 }
            : errorMessage
              ? { kind: "error", message: errorMessage }
              : null
        }
        confirming={false}
        onClose={() => {
          dismissSuccess();
          dismissError();
        }}
        onConfirmPurchase={async () => undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loaderRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.45)",
    padding: 24
  },
  loaderCard: {
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 14,
    alignItems: "center",
    minWidth: 220
  },
  loaderText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  }
});
