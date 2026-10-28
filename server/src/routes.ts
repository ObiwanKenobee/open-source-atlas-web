import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { Actor } from "../../shared/types.ts";
import {
  AGENT_ROLES,
  EVIDENCE_SOURCES,
  EXECUTION_STATES,
  INSTRUMENTS,
  OUTCOME_CLASSIFICATIONS,
  STATUSES,
} from "../../shared/types.ts";
import { DomainError, nowIso } from "./db.ts";
import { getActor, listActors } from "./actors.ts";
import { GUEST_ACTOR } from "./gates.ts";
import {
  addAlternative,
  addCorrection,
  addEvidence,
  addLesson,
  addObservation,
  createAuthorization,
  createDecision,
  createExecution,
  createOutcome,
  createResource,
  getPayload,
  listDecisions,
  resolveCorrection,
  reviewContribution,
  reviewEvidence,
  runOracleScan,
  transition,
  updateAlternative,
  updateDecision,
  updateExecution,
} from "./service.ts";

const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]),
});

const decisionCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  placeName: z.string().max(200).optional(),
  problemStatement: z.string().max(4000).optional(),
  affectedPopulation: z.string().max(2000).optional(),
  placeGeoJson: pointSchema.optional(),
});

const decisionPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  placeName: z.string().max(200).nullish(),
  problemStatement: z.string().max(4000).nullish(),
  affectedPopulation: z.string().max(2000).nullish(),
  baselineMetric: z.string().max(300).nullish(),
  baselineValue: z.number().nullish(),
  baselineUnit: z.string().max(60).nullish(),
  baselineMethod: z.string().max(2000).nullish(),
  baselineObservedAt: z.string().max(40).nullish(),
  placeGeoJson: pointSchema.nullish(),
});

const observationSchema = z.object({
  observedAt: z.string().min(4).max(40),
  method: z.string().trim().min(1).max(500),
  valueText: z.string().trim().min(1).max(4000),
  sourceRef: z.string().max(500).nullish(),
  limitations: z.string().max(2000).nullish(),
});

const evidenceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  sourceType: z.enum(EVIDENCE_SOURCES),
  sourceRef: z.string().trim().min(1).max(500),
  url: z.string().max(1000).nullish(),
  publishedAt: z.string().max(40).nullish(),
  independenceNote: z.string().max(2000).nullish(),
  limitations: z.string().max(2000).nullish(),
});

const evidenceReviewSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  note: z.string().max(2000).nullish(),
});

const alternativeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  estCostAmount: z.number().nonnegative().nullish(),
  estCostCurrency: z.string().max(8).nullish(),
  expectedBenefit: z.string().max(2000).nullish(),
  risks: z.string().max(2000).nullish(),
  uncertainties: z.string().max(2000).nullish(),
});

const alternativePatchSchema = z.object({
  selected: z.boolean().optional(),
  selectionRationale: z.string().max(2000).nullish(),
  uncertainties: z.string().max(2000).nullish(),
  risks: z.string().max(2000).nullish(),
  expectedBenefit: z.string().max(2000).nullish(),
});

const authorizationSchema = z.object({
  scope: z.string().trim().min(1).max(4000),
  conditions: z.string().trim().min(1).max(4000),
  coiDeclaration: z.string().trim().min(1).max(2000),
});

const resourceSchema = z.object({
  instrument: z.enum(INSTRUMENTS),
  amount: z.number().nonnegative().nullish(),
  currency: z.string().max(8).nullish(),
  funder: z.string().trim().min(1).max(300),
  termsNote: z.string().max(2000).nullish(),
  notes: z.string().max(2000).nullish(),
});

const executionSchema = z.object({
  startedAt: z.string().max(40).optional(),
  workPerformed: z.string().max(4000).nullish(),
  deviations: z.string().max(4000).nullish(),
  status: z.enum(["planned", "in_progress"]).optional(),
});

const executionPatchSchema = z.object({
  status: z.enum(EXECUTION_STATES).optional(),
  endedAt: z.string().max(40).nullish(),
  workPerformed: z.string().max(4000).nullish(),
  deviations: z.string().max(4000).nullish(),
});

const outcomeSchema = z.object({
  measuredAt: z.string().min(4).max(40),
  metric: z.string().trim().min(1).max(300),
  value: z.number(),
  unit: z.string().trim().min(1).max(60),
  classification: z.enum(OUTCOME_CLASSIFICATIONS),
  method: z.string().trim().min(1).max(2000),
  baselineValue: z.number().nullish(),
  baselineNote: z.string().trim().min(1).max(2000),
  uncertaintyNote: z.string().trim().min(1).max(2000),
  attributionMethod: z.string().max(2000).nullish(),
});

const correctionSchema = z.object({
  targetType: z.enum([
    "decision",
    "observation",
    "evidence",
    "alternative",
    "authorization",
    "resource",
    "execution",
    "outcome",
    "lesson",
  ]),
  targetId: z.string().max(80).nullish(),
  description: z.string().trim().min(1).max(4000),
});

const correctionPatchSchema = z.object({
  resolution: z.string().trim().min(1).max(4000),
});

const lessonSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  whatWorked: z.string().max(4000).nullish(),
  whatDidnt: z.string().max(4000).nullish(),
  changes: z.string().max(4000).nullish(),
});

const transitionSchema = z.object({
  to: z.enum(STATUSES),
});

const contributionReviewSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  note: z.string().max(2000).nullish(),
});

const agentScanSchema = z.object({
  agentId: z.enum(AGENT_ROLES).optional(),
});

export function registerRoutes(app: FastifyInstance, db: DatabaseSync): void {
  function resolveActor(request: FastifyRequest, required: boolean): Actor {
    const header = request.headers["x-actor-id"];
    const id = Array.isArray(header) ? header[0] : header;
    if (!id) {
      if (!required) return GUEST_ACTOR;
      throw new DomainError(401, "actor_required", "Select an acting identity to modify records.");
    }
    const actor = getActor(db, id);
    if (!actor) throw new DomainError(401, "actor_unknown", "Unknown acting identity.");
    return actor;
  }

  app.get("/api/health", async () => ({ ok: true, service: "atlas-decision-engine" }));

  app.get("/api/actors", async () => ({ actors: listActors(db) }));

  app.get("/api/decisions", async () => ({ decisions: listDecisions(db) }));

  app.post("/api/decisions", async (request, reply) => {
    const actor = resolveActor(request, true);
    const input = decisionCreateSchema.parse(request.body);
    const id = createDecision(db, actor, input);
    return reply.code(201).send({ id });
  });

  app.get("/api/decisions/:id", async (request) => {
    const actor = resolveActor(request, false);
    const { id } = request.params as { id: string };
    return getPayload(db, id, actor);
  });

  app.get("/api/decisions/:id/export", async (request, reply) => {
    const actor = resolveActor(request, false);
    const { id } = request.params as { id: string };
    const payload = getPayload(db, id, actor);
    reply.header("Content-Disposition", `attachment; filename="atlas-decision-${id}.json"`);
    return reply.send({
      ...payload,
      exportedAt: nowIso(),
      notice:
        "Prototype export. Records marked synthetic are fictional demonstration data. Decisions require human authorization; agent contributions are advisory and show their review state.",
    });
  });

  app.patch("/api/decisions/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const patch = decisionPatchSchema.parse(request.body);
    updateDecision(db, actor, id, patch as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/decisions/:id/observations", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = observationSchema.parse(request.body);
    const observationId = addObservation(db, actor, id, input);
    return reply.code(201).send({ id: observationId });
  });

  app.post("/api/decisions/:id/evidence", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = evidenceSchema.parse(request.body);
    const evidenceId = addEvidence(db, actor, id, input);
    return reply.code(201).send({ id: evidenceId });
  });

  app.patch("/api/evidence/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = evidenceReviewSchema.parse(request.body);
    reviewEvidence(db, actor, id, input.status, input.note);
    return { ok: true };
  });

  app.post("/api/decisions/:id/alternatives", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = alternativeSchema.parse(request.body);
    const alternativeId = addAlternative(db, actor, id, input);
    return reply.code(201).send({ id: alternativeId });
  });

  app.patch("/api/alternatives/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const patch = alternativePatchSchema.parse(request.body);
    updateAlternative(db, actor, id, patch);
    return { ok: true };
  });

  app.post("/api/decisions/:id/authorizations", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = authorizationSchema.parse(request.body);
    const authorizationId = createAuthorization(db, actor, id, input);
    return reply.code(201).send({ id: authorizationId });
  });

  app.post("/api/decisions/:id/resources", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = resourceSchema.parse(request.body);
    const resourceId = createResource(db, actor, id, input);
    return reply.code(201).send({ id: resourceId });
  });

  app.post("/api/decisions/:id/executions", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = executionSchema.parse(request.body);
    const executionId = createExecution(db, actor, id, input);
    return reply.code(201).send({ id: executionId });
  });

  app.patch("/api/executions/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const patch = executionPatchSchema.parse(request.body);
    updateExecution(db, actor, id, patch);
    return { ok: true };
  });

  app.post("/api/decisions/:id/outcomes", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = outcomeSchema.parse(request.body);
    const outcomeId = createOutcome(db, actor, id, input);
    return reply.code(201).send({ id: outcomeId });
  });

  app.post("/api/decisions/:id/corrections", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = correctionSchema.parse(request.body);
    const correctionId = addCorrection(db, actor, id, input);
    return reply.code(201).send({ id: correctionId });
  });

  app.patch("/api/corrections/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = correctionPatchSchema.parse(request.body);
    resolveCorrection(db, actor, id, input.resolution);
    return { ok: true };
  });

  app.post("/api/decisions/:id/lessons", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = lessonSchema.parse(request.body);
    const lessonId = addLesson(db, actor, id, input);
    return reply.code(201).send({ id: lessonId });
  });

  app.post("/api/decisions/:id/transitions", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = transitionSchema.parse(request.body);
    return transition(db, actor, id, input.to);
  });

  app.post("/api/decisions/:id/oracle-scan", async (request, reply) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    agentScanSchema.parse(request.body ?? {});
    const contributionId = runOracleScan(db, actor, id);
    return reply.code(201).send({ id: contributionId });
  });

  app.patch("/api/contributions/:id", async (request) => {
    const actor = resolveActor(request, true);
    const { id } = request.params as { id: string };
    const input = contributionReviewSchema.parse(request.body);
    reviewContribution(db, actor, id, input.status, input.note);
    return { ok: true };
  });
}
