import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { FastifyInstance } from "fastify";
import { DomainError, openDb } from "../db.ts";
import { ensureBaseActors, getActor } from "../actors.ts";
import { buildApp } from "../app.ts";
import { createSession, SESSION_COOKIE } from "../auth.ts";
import {
  createAuthorization,
  createDecision,
  reviewContribution,
  transition,
} from "../service.ts";

const GRACE = "actor-analyst-1";
const PETER = "actor-analyst-2";
const RUTH = "actor-authorizer-1";
const SAMUEL = "actor-implementer-1";
const ESTHER = "actor-verifier-1";
const DANIEL = "actor-steward-1";
const ORACLE = "agent-oracle";
const HUMANS = [GRACE, PETER, RUTH, SAMUEL, ESTHER, DANIEL];

interface Response {
  status: number;
  body: any;
}

const sessionTokens = new WeakMap<FastifyInstance, Map<string, string>>();

function setup(t: TestContext) {
  const db = openDb(":memory:");
  ensureBaseActors(db);
  const tokens = new Map<string, string>();
  for (const actorId of HUMANS) {
    tokens.set(actorId, createSession(db, actorId).token);
  }
  const app = buildApp(db);
  sessionTokens.set(app, tokens);
  t.after(async () => {
    await app.close();
    db.close();
  });
  return { db, app };
}

function assertForbidden(fn: () => unknown): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof DomainError && error.status === 403,
  );
}

async function send(
  app: FastifyInstance,
  method: "GET" | "POST" | "PATCH",
  url: string,
  actorId: string,
  payload?: unknown,
): Promise<Response> {
  const token = sessionTokens.get(app)?.get(actorId);
  if (!token) throw new Error(`No test session for ${actorId}. Agents do not hold sessions.`);
  const response = await app.inject({
    method,
    url,
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
  let body: any = null;
  try {
    body = response.json();
  } catch {
    body = response.body;
  }
  return { status: response.statusCode, body };
}

async function createBaselineDecision(app: FastifyInstance): Promise<string> {
  const created = await send(app, "POST", "/api/decisions", GRACE, {
    title: "Test decision",
    placeName: "Test place",
  });
  assert.equal(created.status, 201);
  const id: string = created.body.id;
  const patched = await send(app, "PATCH", `/api/decisions/${id}`, GRACE, {
    problemStatement: "A measurable problem.",
    affectedPopulation: "1,000 people.",
    baselineMetric: "Functional days",
    baselineValue: 18,
    baselineUnit: "days",
    baselineMethod: "Log review",
    baselineObservedAt: "2026-01-31",
  });
  assert.equal(patched.status, 200);
  return id;
}

async function addAcceptedEvidence(app: FastifyInstance, decisionId: string, title: string): Promise<string> {
  const created = await send(app, "POST", `/api/decisions/${decisionId}/evidence`, GRACE, {
    title,
    sourceType: "dataset",
    sourceRef: `${title} source`,
    independenceNote: "Independent collection team.",
  });
  assert.equal(created.status, 201);
  const reviewed = await send(app, "PATCH", `/api/evidence/${created.body.id}`, PETER, {
    status: "accepted",
  });
  assert.equal(reviewed.status, 200);
  return created.body.id;
}

async function driveToEvaluated(app: FastifyInstance): Promise<string> {
  const id = await createBaselineDecision(app);
  const observation = await send(app, "POST", `/api/decisions/${id}/observations`, GRACE, {
    observedAt: "2026-01-15",
    method: "Site visit",
    valueText: "Observed intermittent service.",
  });
  assert.equal(observation.status, 201);
  await addAcceptedEvidence(app, id, "Evidence one");
  await addAcceptedEvidence(app, id, "Evidence two");
  const toUnderstanding = await send(app, "POST", `/api/decisions/${id}/transitions`, GRACE, {
    to: "understanding",
  });
  assert.equal(toUnderstanding.status, 200, JSON.stringify(toUnderstanding.body));
  for (const name of ["Option A", "Option B"]) {
    const alternative = await send(app, "POST", `/api/decisions/${id}/alternatives`, GRACE, {
      name,
      description: `${name} description`,
    });
    assert.equal(alternative.status, 201);
    if (name === "Option A") {
      const selected = await send(app, "PATCH", `/api/alternatives/${alternative.body.id}`, GRACE, {
        selected: true,
        selectionRationale: "Best evidence fit.",
        uncertainties: "Costs may rise.",
      });
      assert.equal(selected.status, 200);
    }
  }
  const toEvaluated = await send(app, "POST", `/api/decisions/${id}/transitions`, GRACE, {
    to: "evaluated",
  });
  assert.equal(toEvaluated.status, 200, JSON.stringify(toEvaluated.body));
  return id;
}

async function driveToExecuting(app: FastifyInstance): Promise<string> {
  const id = await driveToEvaluated(app);
  const auth = await send(app, "POST", `/api/decisions/${id}/authorizations`, RUTH, {
    scope: "Approve the selected option.",
    conditions: "Monthly reporting.",
    coiDeclaration: "No conflict declared.",
  });
  assert.equal(auth.status, 201, JSON.stringify(auth.body));
  const authorized = await send(app, "POST", `/api/decisions/${id}/transitions`, RUTH, { to: "authorized" });
  assert.equal(authorized.status, 200, JSON.stringify(authorized.body));
  const resource = await send(app, "POST", `/api/decisions/${id}/resources`, RUTH, {
    instrument: "grant",
    amount: 100000,
    currency: "KES",
    funder: "Example funder",
  });
  assert.equal(resource.status, 201);
  const execution = await send(app, "POST", `/api/decisions/${id}/executions`, SAMUEL, {
    workPerformed: "Work started.",
  });
  assert.equal(execution.status, 201);
  const started = await send(app, "POST", `/api/decisions/${id}/transitions`, SAMUEL, { to: "executing" });
  assert.equal(started.status, 200, JSON.stringify(started.body));
  return id;
}

async function driveToVerified(app: FastifyInstance): Promise<string> {
  const id = await driveToExecuting(app);
  const executions = await send(app, "GET", `/api/decisions/${id}`, DANIEL);
  const executionId = executions.body.executions[0].id;
  const completed = await send(app, "PATCH", `/api/executions/${executionId}`, SAMUEL, { status: "completed" });
  assert.equal(completed.status, 200);
  const outcome = await send(app, "POST", `/api/decisions/${id}/outcomes`, ESTHER, {
    measuredAt: "2026-03-01",
    metric: "Functional days",
    value: 25,
    unit: "days",
    classification: "observed",
    method: "Log review over 30 days",
    baselineNote: "Compared with the recorded baseline of 18 days.",
    uncertaintyNote: "Single season; no comparison group.",
  });
  assert.equal(outcome.status, 201, JSON.stringify(outcome.body));
  const verified = await send(app, "POST", `/api/decisions/${id}/transitions`, ESTHER, { to: "verified" });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  return id;
}

test("an AI agent cannot authenticate, create, authorize, or advance a decision", async (t) => {
  const { db, app } = setup(t);
  assertForbidden(() => createSession(db, ORACLE));

  const id = await driveToEvaluated(app);
  const oracle = getActor(db, ORACLE);
  assert.ok(oracle);

  assertForbidden(() => createDecision(db, oracle, { title: "Agent decision" }));
  assertForbidden(() => transition(db, oracle, id, "authorized"));
  assertForbidden(() =>
    createAuthorization(db, oracle, id, {
      scope: "Agent scope",
      conditions: "None",
      coiDeclaration: "None",
    }),
  );
});

test("advancing to understanding reports unmet requirements instead of silently passing", async (t) => {
  const { app } = setup(t);
  const created = await send(app, "POST", "/api/decisions", GRACE, { title: "Empty decision" });
  const id = created.body.id;
  const attempt = await send(app, "POST", `/api/decisions/${id}/transitions`, GRACE, { to: "understanding" });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.error, "transition_blocked");
  assert.ok(attempt.body.missing.includes("Baseline fully recorded"));
  assert.ok(attempt.body.missing.includes("At least one observation recorded"));
});

test("stages cannot be skipped", async (t) => {
  const { app } = setup(t);
  const id = await createBaselineDecision(app);
  const attempt = await send(app, "POST", `/api/decisions/${id}/transitions`, GRACE, { to: "authorized" });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.error, "invalid_transition");
});

test("evidence contributors cannot review their own evidence", async (t) => {
  const { app } = setup(t);
  const id = await createBaselineDecision(app);
  const evidence = await send(app, "POST", `/api/decisions/${id}/evidence`, GRACE, {
    title: "Self-reviewed evidence",
    sourceType: "report",
    sourceRef: "Source",
  });
  assert.equal(evidence.status, 201);
  const selfReview = await send(app, "PATCH", `/api/evidence/${evidence.body.id}`, GRACE, {
    status: "accepted",
  });
  assert.equal(selfReview.status, 403);
  assert.equal(selfReview.body.error, "self_review");
  const independentReview = await send(app, "PATCH", `/api/evidence/${evidence.body.id}`, PETER, {
    status: "accepted",
  });
  assert.equal(independentReview.status, 200);
});

test("the baseline becomes immutable once analysis begins", async (t) => {
  const { app } = setup(t);
  const id = await createBaselineDecision(app);
  await send(app, "POST", `/api/decisions/${id}/observations`, GRACE, {
    observedAt: "2026-01-15",
    method: "Site visit",
    valueText: "Observed.",
  });
  await addAcceptedEvidence(app, id, "Evidence one");
  const advance = await send(app, "POST", `/api/decisions/${id}/transitions`, GRACE, { to: "understanding" });
  assert.equal(advance.status, 200);

  const rewrite = await send(app, "PATCH", `/api/decisions/${id}`, GRACE, { baselineValue: 4 });
  assert.equal(rewrite.status, 409);
  assert.equal(rewrite.body.error, "baseline_locked");

  const narrative = await send(app, "PATCH", `/api/decisions/${id}`, GRACE, { problemStatement: "Clarified problem." });
  assert.equal(narrative.status, 200);
});

test("authorization requires a recorded scope and the acting authorizer to match", async (t) => {
  const { app } = setup(t);
  const id = await driveToEvaluated(app);

  const noRecord = await send(app, "POST", `/api/decisions/${id}/transitions`, RUTH, { to: "authorized" });
  assert.equal(noRecord.status, 409);
  assert.equal(noRecord.body.error, "transition_blocked");

  const wrongActor = await send(app, "POST", `/api/decisions/${id}/authorizations`, SAMUEL, {
    scope: "Scope",
    conditions: "Conditions",
    coiDeclaration: "None",
  });
  assert.equal(wrongActor.status, 403);

  const auth = await send(app, "POST", `/api/decisions/${id}/authorizations`, RUTH, {
    scope: "Approve option A.",
    conditions: "Monthly reporting.",
    coiDeclaration: "No conflict.",
  });
  assert.equal(auth.status, 201);
  const authorized = await send(app, "POST", `/api/decisions/${id}/transitions`, RUTH, { to: "authorized" });
  assert.equal(authorized.status, 200);
});

test("execution cannot begin without an approved resource commitment", async (t) => {
  const { app } = setup(t);
  const id = await driveToEvaluated(app);
  await send(app, "POST", `/api/decisions/${id}/authorizations`, RUTH, {
    scope: "Scope",
    conditions: "Conditions",
    coiDeclaration: "None",
  });
  const authorized = await send(app, "POST", `/api/decisions/${id}/transitions`, RUTH, { to: "authorized" });
  assert.equal(authorized.status, 200);
  await send(app, "POST", `/api/decisions/${id}/executions`, SAMUEL, { workPerformed: "Started." });
  const attempt = await send(app, "POST", `/api/decisions/${id}/transitions`, SAMUEL, { to: "executing" });
  assert.equal(attempt.status, 409);
  assert.ok(attempt.body.missing.includes("Resource commitment recorded and approved"));
});

test("only a verifier can record outcomes, and attributed claims need a method", async (t) => {
  const { app } = setup(t);
  const id = await driveToExecuting(app);
  const snapshot = await send(app, "GET", `/api/decisions/${id}`, DANIEL);
  const executionId = snapshot.body.executions[0].id;
  await send(app, "PATCH", `/api/executions/${executionId}`, SAMUEL, { status: "completed" });

  const asAuthorizer = await send(app, "POST", `/api/decisions/${id}/outcomes`, RUTH, {
    measuredAt: "2026-03-01",
    metric: "Functional days",
    value: 25,
    unit: "days",
    classification: "observed",
    method: "Log review",
    baselineNote: "Compared with baseline.",
    uncertaintyNote: "Single season.",
  });
  assert.equal(asAuthorizer.status, 403);

  const attributed = await send(app, "POST", `/api/decisions/${id}/outcomes`, ESTHER, {
    measuredAt: "2026-03-01",
    metric: "Functional days",
    value: 25,
    unit: "days",
    classification: "attributed",
    method: "Log review",
    baselineNote: "Compared with baseline.",
    uncertaintyNote: "Single season.",
  });
  assert.equal(attributed.status, 400);
  assert.equal(attributed.body.error, "attribution_required");

  const honest = await send(app, "POST", `/api/decisions/${id}/outcomes`, ESTHER, {
    measuredAt: "2026-03-01",
    metric: "Functional days",
    value: 25,
    unit: "days",
    classification: "observed",
    method: "Log review over 30 days",
    baselineNote: "Compared with baseline.",
    uncertaintyNote: "Single season; no comparison group.",
  });
  assert.equal(honest.status, 201);
});

test("learning is blocked until corrections are resolved and a lesson is recorded", async (t) => {
  const { app } = setup(t);
  const id = await driveToVerified(app);

  const correction = await send(app, "POST", `/api/decisions/${id}/corrections`, PETER, {
    targetType: "decision",
    description: "A figure needs reconciliation.",
  });
  assert.equal(correction.status, 201);

  const blocked = await send(app, "POST", `/api/decisions/${id}/transitions`, DANIEL, { to: "learned" });
  assert.equal(blocked.status, 409);
  assert.ok(blocked.body.missing.includes("Lesson recorded"));
  assert.ok(blocked.body.missing.includes("All corrections resolved"));

  const lesson = await send(app, "POST", `/api/decisions/${id}/lessons`, DANIEL, {
    summary: "Maintenance scheduling produced usable reliability data.",
    whatWorked: "Shared log.",
    whatDidnt: "One point was repeatedly misreported.",
  });
  assert.equal(lesson.status, 201);

  const stillBlocked = await send(app, "POST", `/api/decisions/${id}/transitions`, DANIEL, { to: "learned" });
  assert.equal(stillBlocked.status, 409);

  const resolved = await send(app, "PATCH", `/api/corrections/${correction.body.id}`, DANIEL, {
    resolution: "Log reconciled with the caretaker record.",
  });
  assert.equal(resolved.status, 200);

  const learned = await send(app, "POST", `/api/decisions/${id}/transitions`, DANIEL, { to: "learned" });
  assert.equal(learned.status, 200);
});

test("agent output is advisory: a person requests it, only a person reviews it, and it changes no state", async (t) => {
  const { db, app } = setup(t);
  const id = await driveToVerified(app);
  const before = await send(app, "GET", `/api/decisions/${id}`, DANIEL);

  const scan = await send(app, "POST", `/api/decisions/${id}/oracle-scan`, DANIEL, {});
  assert.equal(scan.status, 201);

  const oracle = getActor(db, ORACLE);
  assert.ok(oracle);
  assertForbidden(() => reviewContribution(db, oracle, scan.body.id, "accepted"));

  const accepted = await send(app, "PATCH", `/api/contributions/${scan.body.id}`, DANIEL, {
    status: "accepted",
    note: "Reviewed; no action needed.",
  });
  assert.equal(accepted.status, 200);

  const after = await send(app, "GET", `/api/decisions/${id}`, DANIEL);
  assert.equal(after.body.decision.status, before.body.decision.status);
  assert.equal(after.body.outcomes.length, before.body.outcomes.length);
  const contribution = after.body.contributions.find((c: { id: string }) => c.id === scan.body.id);
  assert.equal(contribution.requestedBy, DANIEL);
  assert.equal(contribution.agentId, ORACLE);
});

test("the audit log records each stage change", async (t) => {
  const { app } = setup(t);
  const id = await driveToEvaluated(app);
  const payload = await send(app, "GET", `/api/decisions/${id}`, DANIEL);
  const transitions = payload.body.events.filter((e: { type: string }) => e.type === "transition");
  assert.equal(transitions.length, 2);
  assert.ok(transitions.some((e: { summary: string }) => e.summary.includes("draft to understanding")));
  assert.ok(transitions.some((e: { summary: string }) => e.summary.includes("understanding to evaluated")));
});
