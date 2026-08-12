import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

/**
 * Contiene crashes de UI y ofrece reintentar sin matar toda la app.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message?.trim() || "Algo salió mal."
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Ups, hubo un error</Text>
        <Text style={styles.body}>
          La app se recuperó, pero esta pantalla falló. Probá de nuevo. Si sigue pasando, cerrá y
          volvé a abrir MotivarCare.
        </Text>
        <Text style={styles.detail} numberOfLines={4}>
          {this.state.message}
        </Text>
        <Pressable style={styles.btn} onPress={this.reset}>
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
    backgroundColor: "#F7F8FC",
    gap: 12
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center"
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center"
  },
  detail: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center"
  },
  btn: {
    marginTop: 8,
    backgroundColor: "#5F44EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15
  }
});
