import { createHmac } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { isDlocalGoConfigured } from "./lib/dlocalGoClient.js";

describe("API contract basics", () => {
  it("GET / responde servicio activo", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      service: "therapy-api",
      status: "running"
    });
  });

  it("GET /health/live responde live sin depender de DB", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("therapy-api");
  });

  it("GET /health/live con Origin arbitrario sigue 200 (healthcheck PaaS no debe pasar por CORS)", async () => {
    const response = await request(app)
      .get("/health/live")
      .set("Origin", "https://healthcheck-not-in-cors-list.example");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("GET /metrics expone metricas Prometheus", async () => {
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("api_http_requests_total");
  });

  it("aplica headers de seguridad basicos", async () => {
    const response = await request(app).get("/");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("same-origin");
  });

  it("/api/auth/me sin token devuelve error uniforme", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
    expect(response.body.message).toBe("Missing bearer token");
    expect(typeof response.body.requestId).toBe("string");
    expect(response.body.requestId.length).toBeGreaterThan(0);
  });

  it("/api/v1/auth/me sin token mantiene mismo contrato", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
    expect(response.body.message).toBe("Missing bearer token");
    expect(typeof response.body.requestId).toBe("string");
    expect(response.body.requestId.length).toBeGreaterThan(0);
  });

  it("/api/auth/verify-email sin token devuelve BAD_REQUEST", async () => {
    const response = await request(app).get("/api/auth/verify-email");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
    expect(response.body.message).toBe("Invalid verification token");
    expect(typeof response.body.requestId).toBe("string");
    expect(response.body.requestId.length).toBeGreaterThan(0);
  });

  it("POST /api/payouts/dlocal/webhook acepta JSON crudo (501 sin credenciales, 401 sin firma)", async () => {
    const raw = JSON.stringify({ payout_id: "po-contract-test" });
    const response = await request(app)
      .post("/api/payouts/dlocal/webhook")
      .set("Content-Type", "application/json")
      .send(raw);

    expect([401, 501]).toContain(response.status);
    expect(response.status).not.toBe(400);
  });

  it("POST /api/payouts/dlocal/webhook verifica HMAC sobre el JSON crudo", async () => {
    if (!isDlocalGoConfigured()) {
      return;
    }
    const raw = JSON.stringify({ payout_id: "po-hmac-raw-body" });
    const signature = createHmac("sha256", env.DLOCALGO_API_SECRET)
      .update(`${env.DLOCALGO_API_KEY}${raw}`, "utf8")
      .digest("hex");
    const response = await request(app)
      .post("/api/payouts/dlocal/webhook")
      .set("Content-Type", "application/json")
      .set("Authorization", `V2-HMAC-SHA256, Signature: ${signature}`)
      .send(raw);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(400);
  });
});
