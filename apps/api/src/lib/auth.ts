import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const PASSWORD_PREFIX = "pbkdf2";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";

export interface AuthTokenPayload {
  userId: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  email: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSegment(segment: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(segment).digest("base64url");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return `${PASSWORD_PREFIX}$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [prefix, rawIterations, salt, storedHash] = hashedPassword.split("$");

  if (!prefix || !rawIterations || !salt || !storedHash || prefix !== PASSWORD_PREFIX) {
    return false;
  }

  const iterations = Number(rawIterations);
  if (!Number.isFinite(iterations) || iterations < 1000) {
    return false;
  }

  const computedHash = crypto.pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("hex");

  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

export function createAuthToken(payload: Omit<AuthTokenPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = signSegment(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSegment(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const parsedPayload = JSON.parse(rawPayload) as AuthTokenPayload;

    if (!parsedPayload.userId || !parsedPayload.role || !parsedPayload.email) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsedPayload.exp <= now) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.auth = {
    userId: payload.userId,
    role: payload.role,
    email: payload.email
  };

  next();
}

export function requireRole(roles: Array<"PATIENT" | "PROFESSIONAL" | "ADMIN">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
