import type { Response } from "express";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export function sendApiError(params: {
  res: Response;
  status: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}) {
  const requestId = String(params.res.getHeader("x-request-id") ?? "");
  return params.res.status(params.status).json({
    error: params.message,
    code: params.code,
    message: params.message,
    requestId,
    ...(params.details !== undefined ? { details: params.details } : {})
  });
}

