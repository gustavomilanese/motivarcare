import { describe, expect, it } from "vitest";
import { DIARY_SESSION_REPORT_CHAT_PREFIX } from "@therapy/types";
import type { ThreadSummary } from "../types";
import {
  friendlyCalendarOAuthReturnMessage,
  professionalAuthSurfaceMessage,
  professionalAuthValidationMessage,
  professionalSurfaceMessage
} from "./friendlyProfessionalSurfaceMessages";
import { buildPatientMessageNotificationItems } from "./portalPatientNotifications";

function thread(input: {
  lastBody: string;
  fromPatient?: boolean;
} & Partial<Omit<ThreadSummary, "lastMessage">>): ThreadSummary {
  const { lastBody, fromPatient, ...rest } = input;
  return {
    id: "th_1",
    patientId: "pat_1",
    professionalId: "pro_1",
    counterpartName: "Camila",
    counterpartUserId: "user_pat",
    lastMessage: {
      id: "msg_1",
      body: lastBody,
      createdAt: "2026-08-16T12:00:00.000Z",
      senderUserId: fromPatient === false ? "user_pro" : "user_pat"
    },
    unreadCount: 1,
    createdAt: "2026-08-01T12:00:00.000Z",
    ...rest
  };
}

describe("portalPatientNotifications", () => {
  it("ignores messages sent by the professional", () => {
    expect(
      buildPatientMessageNotificationItems("es", [thread({ lastBody: "Hola", fromPatient: false })])
    ).toEqual([]);
  });

  it("parses diary reports onto the patient ficha", () => {
    const items = buildPatientMessageNotificationItems("es", [
      thread({ lastBody: `${DIARY_SESSION_REPORT_CHAT_PREFIX} sueño irregular` })
    ]);
    expect(items[0]?.title).toContain("diario");
    expect(items[0]?.href).toBe("/pacientes/pat_1?diaryReport=1");
  });

  it("parses patient cancellations into a dedicated title", () => {
    const items = buildPatientMessageNotificationItems("es", [
      thread({ lastBody: "Camila canceló su sesión del lunes. Motivo: viaje" })
    ]);
    expect(items[0]?.title).toContain("cancelada");
    expect(items[0]?.detail).toContain("viaje");
    expect(items[0]?.href).toContain("/chat?patientId=pat_1");
  });
});

describe("friendlyProfessionalSurfaceMessages", () => {
  it("translates auth and network errors", () => {
    expect(professionalAuthSurfaceMessage("Invalid credentials", "es")).toContain("contraseña");
    expect(professionalAuthSurfaceMessage("Cannot reach API at http://localhost:4000", "es")).toContain(
      "conectar"
    );
    expect(professionalAuthValidationMessage("portal-mismatch", "es")).toContain("portal profesional");
  });

  it("keeps dashboard complete/payout copy specific", () => {
    expect(professionalSurfaceMessage("dashboard-complete-booking", "es")).toContain("registrar");
    expect(professionalSurfaceMessage("dashboard-submit-payout", "es")).toContain("cobro");
    expect(professionalSurfaceMessage("verify-resend", "es", "RESEND_API_KEY missing")).toContain("Railway");
  });

  it("explains calendar OAuth return reasons", () => {
    expect(friendlyCalendarOAuthReturnMessage("es", { status: "cancelled", reason: null })).toContain(
      "Google Calendar"
    );
    expect(
      friendlyCalendarOAuthReturnMessage("es", { status: "error", reason: "redirect_uri_mismatch" })
    ).toContain("callback");
  });
});
