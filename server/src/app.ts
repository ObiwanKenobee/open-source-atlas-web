import Fastify, { type FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { ZodError } from "zod";
import { DomainError } from "./db.ts";
import { registerRoutes } from "./routes.ts";

export function buildApp(db: DatabaseSync): FastifyInstance {
  const app = Fastify({ logger: false });

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

  registerRoutes(app, db);
  return app;
}
