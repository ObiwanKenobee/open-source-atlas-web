import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  Actor,
  AgentContribution,
  Alternative,
  Authorization,
  Correction,
  Decision,
  DecisionPayload,
  DecisionStatus,
  Evidence,
  Execution,
  Lesson,
  Observation,
  OracleFinding,
  Outcome,
  ResourceCommitment,
} from "../../shared/types.ts";
import {
  DomainError,
  allRows,
  firstRow,
  insertRow,
  nowIso,
  updateRow,
} from "./db.ts";
import {
  GUEST_ACTOR,
  nextStage,
  permissions,
  readiness,
  transitionPermission,
  type Snapshot,
} from "./gates.ts";

function text(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function logEvent(
  db: DatabaseSync,
  decisionId: string,
  actorId: string,
  type: string,
  summary: string,
  at: string = nowIso(),
  payload: unknown = null,
): void {
  insertRow(db, "events", {
    decisionId,
    type,
    actorId,
    summary,
    payloadJson: payload,
    createdAt: at,
  });
}

export function getSnapshot(db: DatabaseSync, id: string): Snapshot {
  const decision = firstRow<Decision>(db, "SELECT * FROM decisions WHERE id = ?", id);
  if (!decision) throw new DomainError(404, "not_found", "Decision not found.");
  return {
    decision,
    observations: allRows<Observation>(
      db,
      "SELECT * FROM observations WHERE decision_id = ? ORDER BY observed_at DESC, created_at DESC",
      id,
    ),
    evidence: allRows<Evidence>(db, "SELECT * FROM evidence WHERE decision_id = ? ORDER BY created_at DESC", id),
    alternatives: allRows<Alternative>(
      db,
      "SELECT * FROM alternatives WHERE decision_id = ? ORDER BY created_at ASC",
      id,
    ),
    authorizations: allRows<Authorization>(
      db,
      "SELECT * FROM authorizations WHERE decision_id = ? ORDER BY authorized_at DESC",
      id,
    ),
    resources: allRows<ResourceCommitment>(
      db,
      "SELECT * FROM resource_commitments WHERE decision_id = ? ORDER BY approved_at ASC",
      id,
    ),
    executions: allRows<Execution>(
      db,
      "SELECT * FROM executions WHERE decision_id = ? ORDER BY started_at ASC",
      id,
    ),
    outcomes: allRows<Outcome>(
      db,
      "SELECT * FROM outcomes WHERE decision_id = ? ORDER BY measured_at DESC, created_at DESC",
      id,
    ),
    corrections: allRows<Correction>(
      db,
      "SELECT * FROM corrections WHERE decision_id = ? ORDER BY raised_at DESC",
      id,
    ),
    lessons: allRows<Lesson>(db, "SELECT * FROM lessons WHERE decision_id = ? ORDER BY recorded_at DESC", id),
    contributions: allRows<AgentContribution>(
      db,
      "SELECT * FROM agent_contributions WHERE decision_id = ? ORDER BY created_at DESC",
      id,
    ),
    events: allRows(
      db,
      "SELECT * FROM events WHERE decision_id = ? ORDER BY id DESC LIMIT 80",
      id,
    ),
  };
}

export function getPayload(db: DatabaseSync, id: string, actor: Actor = GUEST_ACTOR): DecisionPayload {
  const snapshot = getSnapshot(db, id);
  return {
    ...snapshot,
    readiness: readiness(snapshot, actor),
    permissions: permissions(actor, snapshot),
  };
}

export function listDecisions(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT d.id, d.title, d.status, d.place_name, d.synthetic, d.updated_at,
        (SELECT COUNT(*) FROM evidence e WHERE e.decision_id = d.id AND e.status = 'accepted') AS accepted_evidence,
        (SELECT COUNT(*) FROM corrections c WHERE c.decision_id = d.id AND c.status = 'open') AS open_corrections
       FROM decisions d ORDER BY d.updated_at DESC`,
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: row.status as DecisionStatus,
    placeName: (row.place_name as string | null) ?? null,
    synthetic: Boolean(row.synthetic),
    updatedAt: String(row.updated_at),
    acceptedEvidence: Number(row.accepted_evidence ?? 0),
    openCorrections: Number(row.open_corrections ?? 0),
  }));
}

function requireHuman(actor: Actor, message: string): void {
  if (actor.isAgent) {
    throw new DomainError(403, "agent_not_permitted", message);
  }
}

function requirePermission(allowed: boolean, message: string): void {
  if (!allowed) throw new DomainError(403, "not_permitted", message);
}

function requireAnalyst(
  actor: Actor,
  snapshot: Snapshot,
  message: string,
  key: "addEvidence" | "addObservation" | "addAlternative" | "selectAlternative" | "editDecision" | "reviewEvidence",
): void {
  requireHuman(actor, "AI agents may not modify institutional records. Their output is advisory and must be reviewed by a person.");
  requirePermission(permissions(actor, snapshot)[key], message);
}

function requireDecision(db: DatabaseSync, id: string): Decision {
  const decision = firstRow<Decision>(db, "SELECT * FROM decisions WHERE id = ?", id);
  if (!decision) throw new DomainError(404, "not_found", "Decision not found.");
  return decision;
}

export interface CreateDecisionInput {
  title: string;
  placeName?: string;
  problemStatement?: string;
  affectedPopulation?: string;
  placeGeoJson?: { type: "Point"; coordinates: [number, number] };
}

export function createDecision(db: DatabaseSync, actor: Actor, input: CreateDecisionInput): string {
  requireHuman(actor, "AI agents may not open decisions.");
  if (actor.role !== "analyst" && actor.role !== "steward") {
    throw new DomainError(403, "not_permitted", "Only a person with the analyst or steward role may open a decision.");
  }
  const id = randomUUID();
  const at = nowIso();
  insertRow(db, "decisions", {
    id,
    title: input.title.trim(),
    status: "draft",
    placeName: text(input.placeName),
    placeGeoJson: input.placeGeoJson ?? null,
    problemStatement: text(input.problemStatement),
    affectedPopulation: text(input.affectedPopulation),
    baselineMetric: null,
    baselineValue: null,
    baselineUnit: null,
    baselineMethod: null,
    baselineObservedAt: null,
    baselineLockedAt: null,
    synthetic: true,
    createdBy: actor.id,
    createdAt: at,
    updatedAt: at,
  });
  logEvent(db, id, actor.id, "decision.created", `Decision opened: ${input.title.trim()}`, at);
  return id;
}

const BASELINE_KEYS = [
  "baselineMetric",
  "baselineValue",
  "baselineUnit",
  "baselineMethod",
  "baselineObservedAt",
] as const;

const DECISION_EDITABLE_KEYS = [
  "title",
  "placeName",
  "placeGeoJson",
  "problemStatement",
  "affectedPopulation",
  "baselineMetric",
  "baselineValue",
  "baselineUnit",
  "baselineMethod",
  "baselineObservedAt",
] as const;

export function updateDecision(
  db: DatabaseSync,
  actor: Actor,
  id: string,
  patch: Record<string, unknown>,
): void {
  const snapshot = getSnapshot(db, id);
  requireAnalyst(actor, snapshot, "Only an analyst or steward may edit a decision before authorization.", "editDecision");
  if (snapshot.decision.baselineLockedAt) {
    const touchingBaseline = BASELINE_KEYS.some((key) => key in patch);
    if (touchingBaseline) {
      throw new DomainError(
        409,
        "baseline_locked",
        "The baseline is immutable once analysis begins. Record a correction instead of rewriting history.",
      );
    }
  }
  const changes: Record<string, unknown> = {};
  for (const key of DECISION_EDITABLE_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (key === "baselineValue") {
      changes[key] = value === null || value === undefined ? null : Number(value);
    } else if (key === "placeGeoJson") {
      changes[key] = value ?? null;
    } else {
      changes[key] = text(value as string | null | undefined);
    }
  }
  if (Object.keys(changes).length === 0) return;
  updateRow(db, "decisions", id, { ...changes, updatedAt: nowIso() });
  logEvent(db, id, actor.id, "decision.updated", "Decision details updated");
}

export interface ObservationInput {
  observedAt: string;
  method: string;
  valueText: string;
  sourceRef?: string | null;
  limitations?: string | null;
}

export function addObservation(db: DatabaseSync, actor: Actor, id: string, input: ObservationInput): string {
  const snapshot = getSnapshot(db, id);
  requireAnalyst(
    actor,
    snapshot,
    "Only an analyst or steward may record observations.",
    "addObservation",
  );
  const observationId = randomUUID();
  const at = nowIso();
  insertRow(db, "observations", {
    id: observationId,
    decisionId: id,
    observedAt: input.observedAt,
    observerId: actor.id,
    method: input.method,
    valueText: input.valueText,
    sourceRef: text(input.sourceRef),
    limitations: text(input.limitations),
    createdAt: at,
  });
  logEvent(db, id, actor.id, "observation.added", `Observation recorded: ${input.method}`, at);
  return observationId;
}

export interface EvidenceInput {
  title: string;
  sourceType: Evidence["sourceType"];
  sourceRef: string;
  url?: string | null;
  publishedAt?: string | null;
  independenceNote?: string | null;
  limitations?: string | null;
}

export function addEvidence(db: DatabaseSync, actor: Actor, id: string, input: EvidenceInput): string {
  const snapshot = getSnapshot(db, id);
  requireAnalyst(actor, snapshot, "Only an analyst or steward may add evidence.", "addEvidence");
  const evidenceId = randomUUID();
  const at = nowIso();
  insertRow(db, "evidence", {
    id: evidenceId,
    decisionId: id,
    title: input.title,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    url: text(input.url),
    publishedAt: text(input.publishedAt),
    independenceNote: text(input.independenceNote),
    limitations: text(input.limitations),
    status: "proposed",
    contributedBy: actor.id,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: at,
  });
  logEvent(db, id, actor.id, "evidence.proposed", `Evidence proposed: ${input.title}`, at);
  return evidenceId;
}

export function reviewEvidence(
  db: DatabaseSync,
  actor: Actor,
  evidenceId: string,
  status: "accepted" | "rejected",
  note?: string | null,
): void {
  const evidence = firstRow<Evidence>(db, "SELECT * FROM evidence WHERE id = ?", evidenceId);
  if (!evidence) throw new DomainError(404, "not_found", "Evidence not found.");
  const snapshot = getSnapshot(db, evidence.decisionId);
  requireAnalyst(
    actor,
    snapshot,
    "Only a person with the analyst or steward role may review evidence.",
    "reviewEvidence",
  );
  if (evidence.status !== "proposed") {
    throw new DomainError(409, "already_reviewed", "This evidence has already been reviewed.");
  }
  if (evidence.contributedBy === actor.id) {
    throw new DomainError(
      403,
      "self_review",
      "A contributor may not review their own evidence. A second person must assess it.",
    );
  }
  const at = nowIso();
  updateRow(db, "evidence", evidenceId, {
    status,
    reviewedBy: actor.id,
    reviewedAt: at,
    reviewNote: text(note),
  });
  logEvent(
    db,
    evidence.decisionId,
    actor.id,
    `evidence.${status}`,
    `Evidence ${status}: ${evidence.title}`,
    at,
  );
}

export interface AlternativeInput {
  name: string;
  description: string;
  estCostAmount?: number | null;
  estCostCurrency?: string | null;
  expectedBenefit?: string | null;
  risks?: string | null;
  uncertainties?: string | null;
}

export function addAlternative(db: DatabaseSync, actor: Actor, id: string, input: AlternativeInput): string {
  const snapshot = getSnapshot(db, id);
  requireAnalyst(
    actor,
    snapshot,
    "Alternatives can only be added by an analyst or steward before authorization.",
    "addAlternative",
  );
  const alternativeId = randomUUID();
  const at = nowIso();
  insertRow(db, "alternatives", {
    id: alternativeId,
    decisionId: id,
    name: input.name,
    description: input.description,
    estCostAmount: input.estCostAmount ?? null,
    estCostCurrency: text(input.estCostCurrency),
    expectedBenefit: text(input.expectedBenefit),
    risks: text(input.risks),
    uncertainties: text(input.uncertainties),
    selected: false,
    selectionRationale: null,
    createdBy: actor.id,
    createdAt: at,
  });
  logEvent(db, id, actor.id, "alternative.added", `Alternative added: ${input.name}`, at);
  return alternativeId;
}

export interface AlternativePatch {
  selected?: boolean;
  selectionRationale?: string | null;
  uncertainties?: string | null;
  risks?: string | null;
  expectedBenefit?: string | null;
}

export function updateAlternative(
  db: DatabaseSync,
  actor: Actor,
  alternativeId: string,
  patch: AlternativePatch,
): void {
  const alternative = firstRow<Alternative>(db, "SELECT * FROM alternatives WHERE id = ?", alternativeId);
  if (!alternative) throw new DomainError(404, "not_found", "Alternative not found.");
  const snapshot = getSnapshot(db, alternative.decisionId);
  requireAnalyst(
    actor,
    snapshot,
    "Alternatives can only be edited by an analyst or steward before authorization.",
    "selectAlternative",
  );
  if (patch.selected === true) {
    for (const other of snapshot.alternatives) {
      if (other.id !== alternativeId && other.selected) {
        updateRow(db, "alternatives", other.id, { selected: false });
      }
    }
  }
  const changes: Record<string, unknown> = {};
  if (patch.selected !== undefined) changes.selected = patch.selected;
  if ("selectionRationale" in patch) changes.selectionRationale = text(patch.selectionRationale);
  if ("uncertainties" in patch) changes.uncertainties = text(patch.uncertainties);
  if ("risks" in patch) changes.risks = text(patch.risks);
  if ("expectedBenefit" in patch) changes.expectedBenefit = text(patch.expectedBenefit);
  if (Object.keys(changes).length === 0) return;
  updateRow(db, "alternatives", alternativeId, changes);
  logEvent(
    db,
    alternative.decisionId,
    actor.id,
    patch.selected ? "alternative.selected" : "alternative.updated",
    patch.selected ? `Alternative selected: ${alternative.name}` : `Alternative updated: ${alternative.name}`,
  );
}

export interface AuthorizationInput {
  scope: string;
  conditions: string;
  coiDeclaration: string;
}

export function createAuthorization(
  db: DatabaseSync,
  actor: Actor,
  id: string,
  input: AuthorizationInput,
): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not authorize decisions.");
  requirePermission(
    permissions(actor, snapshot).createAuthorization,
    "Only a person with the authorizer role may record an authorization, and only at the evaluated stage.",
  );
  if (snapshot.authorizations.some((a) => a.status === "active")) {
    throw new DomainError(409, "already_authorized", "An active authorization already exists for this decision.");
  }
  const authorizationId = randomUUID();
  const at = nowIso();
  insertRow(db, "authorizations", {
    id: authorizationId,
    decisionId: id,
    authorizerId: actor.id,
    scope: input.scope,
    conditions: input.conditions,
    coiDeclaration: input.coiDeclaration,
    status: "active",
    authorizedAt: at,
  });
  logEvent(db, id, actor.id, "authorization.recorded", "Authorization recorded with scope and conditions", at);
  return authorizationId;
}

export interface ResourceInput {
  instrument: ResourceCommitment["instrument"];
  amount?: number | null;
  currency?: string | null;
  funder: string;
  termsNote?: string | null;
  notes?: string | null;
}

export function createResource(db: DatabaseSync, actor: Actor, id: string, input: ResourceInput): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not commit resources.");
  requirePermission(
    permissions(actor, snapshot).createResource,
    "Only an authorizer or steward may record a resource commitment while the decision is authorized or executing.",
  );
  if (input.instrument !== "in_kind" && (input.amount === null || input.amount === undefined || input.amount <= 0)) {
    throw new DomainError(400, "invalid_amount", "A monetary commitment requires a positive amount.");
  }
  const resourceId = randomUUID();
  const at = nowIso();
  insertRow(db, "resource_commitments", {
    id: resourceId,
    decisionId: id,
    instrument: input.instrument,
    amount: input.instrument === "in_kind" ? (input.amount ?? null) : input.amount,
    currency: input.instrument === "in_kind" ? text(input.currency) : text(input.currency) ?? "KES",
    funder: input.funder,
    termsNote: text(input.termsNote),
    approvedBy: actor.id,
    approvedAt: at,
    notes: text(input.notes),
  });
  logEvent(db, id, actor.id, "resource.approved", `Resource commitment recorded: ${input.instrument}`, at);
  return resourceId;
}

export interface ExecutionInput {
  startedAt?: string;
  workPerformed?: string | null;
  deviations?: string | null;
  status?: "planned" | "in_progress";
}

export function createExecution(db: DatabaseSync, actor: Actor, id: string, input: ExecutionInput): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not record execution.");
  requirePermission(
    permissions(actor, snapshot).createExecution,
    "Only an implementer or steward may open an execution record while the decision is authorized or executing.",
  );
  const executionId = randomUUID();
  const at = nowIso();
  insertRow(db, "executions", {
    id: executionId,
    decisionId: id,
    implementerId: actor.id,
    startedAt: input.startedAt ?? at,
    endedAt: null,
    workPerformed: text(input.workPerformed),
    deviations: text(input.deviations),
    status: input.status ?? "in_progress",
    createdAt: at,
  });
  logEvent(db, id, actor.id, "execution.opened", "Execution record opened by implementer", at);
  return executionId;
}

export interface ExecutionPatch {
  status?: Execution["status"];
  endedAt?: string | null;
  workPerformed?: string | null;
  deviations?: string | null;
}

export function updateExecution(
  db: DatabaseSync,
  actor: Actor,
  executionId: string,
  patch: ExecutionPatch,
): void {
  const execution = firstRow<Execution>(db, "SELECT * FROM executions WHERE id = ?", executionId);
  if (!execution) throw new DomainError(404, "not_found", "Execution record not found.");
  const snapshot = getSnapshot(db, execution.decisionId);
  requireHuman(actor, "AI agents may not modify execution records.");
  requirePermission(
    permissions(actor, snapshot).updateExecution,
    "Only an implementer or steward may update an execution record while the decision is authorized or executing.",
  );
  const changes: Record<string, unknown> = {};
  if (patch.status) changes.status = patch.status;
  if ("endedAt" in patch) changes.endedAt = text(patch.endedAt);
  if ("workPerformed" in patch) changes.workPerformed = text(patch.workPerformed);
  if ("deviations" in patch) changes.deviations = text(patch.deviations);
  if (patch.status === "completed" && !execution.endedAt && !patch.endedAt) {
    changes.endedAt = nowIso();
  }
  if (Object.keys(changes).length === 0) return;
  updateRow(db, "executions", executionId, changes);
  logEvent(
    db,
    execution.decisionId,
    actor.id,
    "execution.updated",
    `Execution updated: ${patch.status ?? "details changed"}`,
  );
}

export interface OutcomeInput {
  measuredAt: string;
  metric: string;
  value: number;
  unit: string;
  classification: Outcome["classification"];
  method: string;
  baselineValue?: number | null;
  baselineNote: string;
  uncertaintyNote: string;
  attributionMethod?: string | null;
}

export function createOutcome(db: DatabaseSync, actor: Actor, id: string, input: OutcomeInput): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not verify outcomes.");
  requirePermission(
    permissions(actor, snapshot).createOutcome,
    "Only a person with the verifier role may record outcomes while executing or verified.",
  );
  const activeAuthorization = snapshot.authorizations.find((a) => a.status === "active");
  if (activeAuthorization && activeAuthorization.authorizerId === actor.id) {
    throw new DomainError(
      403,
      "verifier_not_independent",
      "The verifier must be independent of the authorizer. Record the outcome under a different person.",
    );
  }
  if (input.classification === "attributed" && !text(input.attributionMethod)) {
    throw new DomainError(
      400,
      "attribution_required",
      "An attributed outcome requires a documented attribution method. Otherwise record it as observed, estimated, or uncertain.",
    );
  }
  const outcomeId = randomUUID();
  const at = nowIso();
  insertRow(db, "outcomes", {
    id: outcomeId,
    decisionId: id,
    measuredAt: input.measuredAt,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    classification: input.classification,
    method: input.method,
    baselineValue: input.baselineValue ?? snapshot.decision.baselineValue,
    baselineNote: input.baselineNote,
    uncertaintyNote: input.uncertaintyNote,
    attributionMethod: text(input.attributionMethod),
    verifierId: actor.id,
    createdAt: at,
  });
  logEvent(
    db,
    id,
    actor.id,
    "outcome.recorded",
    `Outcome recorded (${input.classification}): ${input.metric}`,
    at,
  );
  return outcomeId;
}

const CORRECTION_TARGETS: Record<string, string> = {
  observation: "observations",
  evidence: "evidence",
  alternative: "alternatives",
  authorization: "authorizations",
  resource: "resource_commitments",
  execution: "executions",
  outcome: "outcomes",
  lesson: "lessons",
};

export interface CorrectionInput {
  targetType: Correction["targetType"];
  targetId?: string | null;
  description: string;
}

export function addCorrection(db: DatabaseSync, actor: Actor, id: string, input: CorrectionInput): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not raise corrections.");
  requirePermission(
    permissions(actor, snapshot).addCorrection,
    "A person may raise corrections while the decision is open. Reopening a learned decision is not supported in this prototype.",
  );
  if (input.targetType !== "decision") {
    if (!input.targetId) {
      throw new DomainError(400, "target_required", "A correction to a record must name the record.");
    }
    const table = CORRECTION_TARGETS[input.targetType];
    if (!table) throw new DomainError(400, "invalid_target", "Unknown correction target.");
    const target = firstRow<{ decisionId: string }>(
      db,
      `SELECT decision_id AS decisionId FROM ${table} WHERE id = ?`,
      input.targetId,
    );
    if (!target || target.decisionId !== id) {
      throw new DomainError(400, "invalid_target", "The referenced record does not belong to this decision.");
    }
  }
  const correctionId = randomUUID();
  const at = nowIso();
  insertRow(db, "corrections", {
    id: correctionId,
    decisionId: id,
    targetType: input.targetType,
    targetId: text(input.targetId),
    description: input.description,
    raisedBy: actor.id,
    raisedAt: at,
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    status: "open",
  });
  logEvent(db, id, actor.id, "correction.raised", `Correction raised on ${input.targetType}`, at);
  return correctionId;
}

export function resolveCorrection(
  db: DatabaseSync,
  actor: Actor,
  correctionId: string,
  resolution: string,
): void {
  const correction = firstRow<Correction>(db, "SELECT * FROM corrections WHERE id = ?", correctionId);
  if (!correction) throw new DomainError(404, "not_found", "Correction not found.");
  const snapshot = getSnapshot(db, correction.decisionId);
  requireHuman(actor, "AI agents may not resolve corrections.");
  requirePermission(
    permissions(actor, snapshot).resolveCorrection,
    "Only a steward or verifier may resolve corrections while the decision is open.",
  );
  if (correction.status === "resolved") {
    throw new DomainError(409, "already_resolved", "This correction is already resolved.");
  }
  const at = nowIso();
  updateRow(db, "corrections", correctionId, {
    status: "resolved",
    resolution,
    resolvedBy: actor.id,
    resolvedAt: at,
  });
  logEvent(db, correction.decisionId, actor.id, "correction.resolved", "Correction resolved with recorded rationale", at);
}

export interface LessonInput {
  summary: string;
  whatWorked?: string | null;
  whatDidnt?: string | null;
  changes?: string | null;
}

export function addLesson(db: DatabaseSync, actor: Actor, id: string, input: LessonInput): string {
  const snapshot = getSnapshot(db, id);
  requireHuman(actor, "AI agents may not record lessons.");
  requirePermission(
    permissions(actor, snapshot).addLesson,
    "Only a steward may record lessons after the outcome is verified.",
  );
  const lessonId = randomUUID();
  const at = nowIso();
  insertRow(db, "lessons", {
    id: lessonId,
    decisionId: id,
    summary: input.summary,
    whatWorked: text(input.whatWorked),
    whatDidnt: text(input.whatDidnt),
    changes: text(input.changes),
    recordedBy: actor.id,
    recordedAt: at,
  });
  logEvent(db, id, actor.id, "lesson.recorded", "Lesson recorded", at);
  return lessonId;
}

export function oracleFindings(snapshot: Snapshot): OracleFinding[] {
  const findings: OracleFinding[] = [];
  const decision = snapshot.decision;
  const accepted = snapshot.evidence.filter((e) => e.status === "accepted");
  const selected = snapshot.alternatives.filter((a) => a.selected);
  const auth = snapshot.authorizations.find((a) => a.status === "active");
  const outcome = snapshot.outcomes[0];
  const baselineMissing = [
    decision.baselineMetric,
    decision.baselineValue,
    decision.baselineUnit,
    decision.baselineMethod,
    decision.baselineObservedAt,
  ].some((v) => v === null || (typeof v === "string" && v.trim() === ""));
  if (baselineMissing) {
    findings.push({ severity: "high", message: "Baseline is incomplete. Impact cannot be assessed without a pre-intervention measurement." });
  }
  if (accepted.length < 2) {
    findings.push({ severity: "high", message: `Only ${accepted.length} accepted evidence source(s). The evaluation gate requires at least two.` });
  }
  if (accepted.length > 0 && !accepted.some((e) => e.independenceNote)) {
    findings.push({ severity: "medium", message: "No accepted source documents its independence. Consider whether sources share an author or funder." });
  }
  if (snapshot.alternatives.length < 2) {
    findings.push({ severity: "medium", message: `Only ${snapshot.alternatives.length} alternative(s) recorded. A decision without compared options cannot show that it was reasoned.` });
  }
  if (selected.length !== 1) {
    findings.push({ severity: "medium", message: "No single alternative is selected. The decision is not yet well-formed." });
  } else if (!selected[0].selectionRationale) {
    findings.push({ severity: "medium", message: "The selected alternative has no recorded selection rationale." });
  }
  if (snapshot.decision.status !== "draft" && !auth) {
    findings.push({ severity: "medium", message: "No authorization is on record for a decision that has advanced past drafting." });
  }
  if (outcome) {
    if (outcome.classification === "estimated" || outcome.classification === "uncertain") {
      findings.push({
        severity: "low",
        message: `Outcome "${outcome.metric}" is classified ${outcome.classification}. Report it as such; do not present it as observed impact.`,
      });
    }
    if (auth && outcome.verifierId === auth.authorizerId) {
      findings.push({ severity: "high", message: "The verifier is the same person as the authorizer. Independent verification is not satisfied." });
    }
  }
  const open = snapshot.corrections.filter((c) => c.status === "open");
  if (open.length > 0) {
    findings.push({ severity: "medium", message: `${open.length} correction(s) remain open. The learning stage is blocked until they are resolved.` });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "low",
      message: "No structural gaps detected in the recorded fields. This is a completeness check, not an assessment of the intervention's merits.",
    });
  }
  return findings;
}

export function runOracleScan(db: DatabaseSync, actor: Actor, id: string): string {
  if (!actor.isAgent || actor.agentRole !== "oracle") {
    throw new DomainError(403, "agent_required", "Only the Oracle agent may run this scan.");
  }
  const snapshot = getSnapshot(db, id);
  logEvent(db, id, actor.id, "oracle.scan", "Oracle ran a deterministic evidence-gap scan");
  const findings = oracleFindings(snapshot);
  const contributionId = randomUUID();
  const at = nowIso();
  insertRow(db, "agent_contributions", {
    id: contributionId,
    decisionId: id,
    agentId: actor.id,
    kind: "evidence_gap_flag",
    content: JSON.stringify({
      findings,
      method: "deterministic rule set v1 (no model inference)",
      note: "Advisory only. A person must accept or reject this contribution; it changes no decision state.",
    }),
    status: "pending",
    reviewedBy: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: at,
  });
  logEvent(db, id, actor.id, "contribution.created", `Oracle scan produced ${findings.length} finding(s)`, at);
  return contributionId;
}

export function reviewContribution(
  db: DatabaseSync,
  actor: Actor,
  contributionId: string,
  status: "accepted" | "rejected",
  note?: string | null,
): void {
  const contribution = firstRow<AgentContribution>(
    db,
    "SELECT * FROM agent_contributions WHERE id = ?",
    contributionId,
  );
  if (!contribution) throw new DomainError(404, "not_found", "Agent contribution not found.");
  const snapshot = getSnapshot(db, contribution.decisionId);
  requireHuman(actor, "An agent may not review its own output. A person must review it.");
  requirePermission(
    permissions(actor, snapshot).reviewContribution,
    "A person may review agent output at any stage; review changes no decision state.",
  );
  if (contribution.status !== "pending") {
    throw new DomainError(409, "already_reviewed", "This agent contribution has already been reviewed.");
  }
  const at = nowIso();
  updateRow(db, "agent_contributions", contributionId, {
    status,
    reviewedBy: actor.id,
    reviewNote: text(note),
    reviewedAt: at,
  });
  logEvent(
    db,
    contribution.decisionId,
    actor.id,
    `contribution.${status}`,
    `Agent contribution ${status}`,
    at,
  );
}

export function transition(
  db: DatabaseSync,
  actor: Actor,
  id: string,
  to: DecisionStatus,
): { from: DecisionStatus; to: DecisionStatus } {
  const snapshot = getSnapshot(db, id);
  const from = snapshot.decision.status;
  const expected = nextStage(from);
  if (!expected) {
    throw new DomainError(409, "workflow_complete", "This decision has reached the end of the recorded cycle.");
  }
  if (to !== expected) {
    throw new DomainError(
      409,
      "invalid_transition",
      `The next permitted stage is "${expected}". Stages cannot be skipped.`,
    );
  }
  const check = readiness(snapshot, actor);
  const blockReason = transitionPermission(actor, to, snapshot);
  if (blockReason) {
    throw new DomainError(403, "not_permitted", blockReason);
  }
  if (!check.requirements.every((r) => r.met)) {
    const missing = check.requirements.filter((r) => !r.met).map((r) => r.label);
    throw new DomainError(
      409,
      "transition_blocked",
      `Cannot advance to ${to}. ${missing.length} requirement(s) unmet.`,
      missing,
    );
  }
  const at = nowIso();
  const changes: Record<string, unknown> = { status: to, updatedAt: at };
  if (!snapshot.decision.baselineLockedAt) {
    changes.baselineLockedAt = at;
  }
  updateRow(db, "decisions", id, changes);
  logEvent(db, id, actor.id, "transition", `Advanced from ${from} to ${to}`, at);
  return { from, to };
}
