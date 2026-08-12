/**
 * Deep linking for MotivarCare patient mobile (Wave 0).
 * Custom scheme: motivarcare://verify-email?token=…
 *               motivarcare://reset-password?token=…
 */
import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";

const prefix = Linking.createURL("/");

/** Loose typing: auth stack and email-gate share verify-email / reset-password paths. */
export const authLinking: LinkingOptions<Record<string, object | undefined>> = {
  prefixes: [prefix, "motivarcare://"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: {
        path: "reset-password",
        parse: {
          token: (value: string) => value
        }
      },
      VerifyEmailToken: {
        path: "verify-email",
        parse: {
          token: (value: string) => value
        }
      },
      VerifyEmailRequired: "verify-email-required",
      PaymentReturn: "payment-return"
    }
  }
};
