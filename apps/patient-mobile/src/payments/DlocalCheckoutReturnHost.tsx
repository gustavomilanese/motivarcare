import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { usePatientProfile } from "../context/PatientProfileContext";
import { McarePurchaseSheets } from "../components/McarePurchaseSheets";
import { useThemeMode } from "../theme/ThemeContext";
import { useDlocalCheckoutReturn } from "./useDlocalCheckoutReturn";

/**
 * Listens for dLocal return / pending fulfill and surfaces success/error sheets.
 * Must sit under Auth + PatientProfileProvider.
 */
export function DlocalCheckoutReturnHost() {
  const { colors } = useThemeMode();
  const { refresh } = usePatientProfile();
  const { processing, successCredits, errorMessage, dismissSuccess, dismissError } =
    useDlocalCheckoutReturn();

  return (
    <>
      <Modal visible={processing} transparent animationType="fade">
        <View style={styles.loaderRoot}>
          <View style={[styles.loaderCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loaderText, { color: colors.text }]}>Confirmando tu pago…</Text>
          </View>
        </View>
      </Modal>

      <McarePurchaseSheets
        flow={
          successCredits != null
            ? { kind: "success", credits: successCredits }
            : errorMessage
              ? { kind: "error", message: errorMessage }
              : null
        }
        confirming={false}
        onClose={() => {
          dismissSuccess();
          dismissError();
        }}
        onConfirmPurchase={async () => {
          await refresh();
        }}
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
    fontWeight: "700"
  }
});
