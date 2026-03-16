import { describe, expect, it } from "vitest";
import { createAuthToken, hashPassword, verifyAuthToken, verifyPassword } from "./auth.js";

describe("auth lib", () => {
  it("hashPassword y verifyPassword funcionan con password correcto", () => {
    const hashed = hashPassword("SecurePass123");

    expect(hashed.startsWith("pbkdf2$")).toBe(true);
    expect(verifyPassword("SecurePass123", hashed)).toBe(true);
    expect(verifyPassword("WrongPass999", hashed)).toBe(false);
  });

  it("createAuthToken y verifyAuthToken devuelven payload valido", () => {
    const token = createAuthToken({
      userId: "user-1",
      role: "PROFESSIONAL",
      email: "pro@example.com"
    });

    const payload = verifyAuthToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-1");
    expect(payload?.role).toBe("PROFESSIONAL");
    expect(payload?.email).toBe("pro@example.com");
  });

  it("verifyAuthToken rechaza token alterado", () => {
    const token = createAuthToken({
      userId: "user-2",
      role: "PATIENT",
      email: "patient@example.com"
    });

    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature}x`;

    expect(verifyAuthToken(tampered)).toBeNull();
    expect(verifyAuthToken("invalid-token")).toBeNull();
  });
});
