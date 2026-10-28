import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import type { DatabaseSync } from "node:sqlite";
import { ZodError } from "zod";
import type { Actor } from "../../shared/types.ts";
import { DomainError } from "./db.ts";
import { resolveSession, SESSION_COOKIE } from "./auth.ts";
import { registerAuthRoutes } from "./auth-routes.ts";
import { registerRoutes } from "./routes.ts";

declare module "fastify" {
  interface FastifyRequest {
    actor: Actor | null;
  }
}

const PUBLIC_ROUTES = new Set(["/api/health", "/api/auth/login", "/api/auth/logout"]);

function allowedOrigins(): string[] {
  const raw = process.env.APP_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173";
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

export function buildApp(db: DatabaseSync): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(cookie);
  app.decorateRequest("actor", null);

  app.addHook("onRequest", async (request) => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (!origin) return;
    if (!allowedOrigins().includes(origin)) {
      throw new DomainError(403, "origin_rejected", "Request origin is not allowed.");
    }
  });

  app.addHook("preHandler", async (request, reply) => {
    if (PUBLIC_ROUTES.has(request.routeOptions.url ?? "")) return;
    const token = request.cookies[SESSION_COOKIE];
    const session = token ? resolveSession(db, token) : null;
    if (!session) {
      throw new DomainError(401, "authentication_required", "Sign in to use the decision engine.");
    }
    request.actor = session.actor;
    reply.header("cache-control", "no-store");
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.status).send({
        error: error.code,
        message: error.message,
        missing: error.missing,
      });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        message: error.issues[0]?.message ?? "Invalid input.",
        issues: error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      });
    }
    if ((error as { statusCode?: number }).statusCode === 400) {
      return reply.code(400).send({ error: "bad_request", message: "Malformed request body." });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "internal_error", message: "Unexpected server error." });
  });

  registerAuthRoutes(app, db);
  registerRoutes(app, db);
  return app;
}
