import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/colors";

type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message?.trim() || "Algo salió mal." };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Hubo un error</Text>
        <Text style={styles.body}>{this.state.message}</Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ hasError: false, message: "" })}>
          <Text style={styles.btnText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.canvas,
    gap: 12
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 14, color: colors.muted, textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.control
  },
  btnText: { color: "#fff", fontWeight: "700" }
});
