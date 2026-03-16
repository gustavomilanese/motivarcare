import type { Request } from "express";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { runtimeState } from "./operational.js";

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestsTotal = new Counter({
  name: "api_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [register]
});

const httpRequestDurationMs = new Histogram({
  name: "api_http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1500, 3000, 5000],
  registers: [register]
});

const inFlightGauge = new Gauge({
  name: "api_inflight_requests",
  help: "Current in-flight requests",
  registers: [register]
});

function getRouteLabel(req: Request): string {
  const routePath =
    typeof req.route?.path === "string"
      ? req.route.path
      : Array.isArray(req.route?.path)
        ? req.route.path.join("|")
        : "unmatched";

  return `${req.baseUrl || ""}${routePath}`;
}

export function observeHttpRequest(params: {
  req: Request;
  statusCode: number;
  elapsedMs: number;
}) {
  const route = getRouteLabel(params.req);
  const labels = {
    method: params.req.method,
    route,
    status: String(params.statusCode)
  };

  httpRequestsTotal.inc(labels, 1);
  httpRequestDurationMs.observe(labels, params.elapsedMs);
  inFlightGauge.set(runtimeState.inFlightRequests);
}

export async function metricsSnapshot(): Promise<string> {
  inFlightGauge.set(runtimeState.inFlightRequests);
  return register.metrics();
}

export function metricsContentType(): string {
  return register.contentType;
}
