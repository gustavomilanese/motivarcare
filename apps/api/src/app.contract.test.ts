import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

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
});
