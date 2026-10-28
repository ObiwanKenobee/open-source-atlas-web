import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  authenticate,
  createSession,
  deleteExpiredSessions,
  normalizeEmail,
  revokeSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "./auth.ts";
import { DomainError } from "./db.ts";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(500),
});

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; firstAt: number }>();

function isBlocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > FAILURE_WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.firstAt > FAILURE_WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
  if (failures.size > 1000) {
    const cutoff = Date.now() - FAILURE_WINDOW_MS;
    for (const [candidate, value] of failures) {
      if (value.firstAt < cutoff) failures.delete(candidate);
    }
  }
}

function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function registerAuthRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.post("/api/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const key = `${request.ip}:${normalizeEmail(input.email)}`;
    if (isBlocked(key)) {
      throw new DomainError(
        429,
        "too_many_attempts",
        "Too many failed sign-in attempts. Wait 15 minutes and try again.",
      );
    }
    const actor = authenticate(db, input.email, input.password);
    if (!actor) {
      recordFailure(key);
      throw new DomainError(401, "invalid_credentials", "Email or password is incorrect.");
    }
    failures.delete(key);
    deleteExpiredSessions(db);
    const session = createSession(db, actor.id);
    reply.setCookie(SESSION_COOKIE, session.token, cookieOptions());
    reply.header("cache-control", "no-store");
    return { actor };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) revokeSession(db, token);
    reply.clearCookie(SESSION_COOKIE, { path: "/", sameSite: "lax" });
    return { ok: true };
  });

  app.get("/api/auth/session", async (request) => {
    return { actor: request.actor };
  });
}
