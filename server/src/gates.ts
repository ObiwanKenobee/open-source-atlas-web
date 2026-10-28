import type {
  Actor,
  AgentContribution,
  Alternative,
  AuditEvent,
  Authorization,
  Correction,
  Decision,
  DecisionStatus,
  Evidence,
  Execution,
  Lesson,
  Observation,
  Outcome,
  Permissions,
  Readiness,
  Requirement,
  ResourceCommitment,
} from "../../shared/types.ts";
import { STATUSES } from "../../shared/types.ts";

export interface Snapshot {
  decision: Decision;
  observations: Observation[];
  evidence: Evidence[];
  alternatives: Alternative[];
  authorizations: Authorization[];
  resources: ResourceCommitment[];
  executions: Execution[];
  outcomes: Outcome[];
  corrections: Correction[];
  lessons: Lesson[];
  contributions: AgentContribution[];
  events: AuditEvent[];
}

export const GUEST_ACTOR: Actor = {
  id: "guest",
  name: "Unauthenticated visitor",
  organization: "—",
  role: null,
  isAgent: false,
  agentRole: null,
};

export function nextStage(status: DecisionStatus): DecisionStatus | null {
  const index = STATUSES.indexOf(status);
  return STATUSES[index + 1] ?? null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function requirement(id: string, label: string, met: boolean, detail: string | null = null): Requirement {
  return { id, label, met, detail };
}

function humanRole(actor: Actor): string | null {
  return actor.isAgent ? null : actor.role;
}

function isAnalystOrSteward(actor: Actor): boolean {
  return humanRole(actor) === "analyst" || humanRole(actor) === "steward";
}

function missingBaselineFields(decision: Decision): string[] {
  const missing: string[] = [];
  if (!hasText(decision.baselineMetric)) missing.push("metric");
  if (decision.baselineValue === null) missing.push("value");
  if (!hasText(decision.baselineUnit)) missing.push("unit");
  if (!hasText(decision.baselineMethod)) missing.push("method");
  if (!hasText(decision.baselineObservedAt)) missing.push("observed date");
  return missing;
}

function baselineRequirement(decision: Decision): Requirement {
  const missing = missingBaselineFields(decision);
  return requirement(
    "baseline",
    "Baseline fully recorded",
    missing.length === 0,
    missing.length === 0 ? null : `Missing: ${missing.join(", ")}`,
  );
}

function latestOutcome(snapshot: Snapshot): Outcome | null {
  return snapshot.outcomes[0] ?? null;
}

function activeAuthorization(snapshot: Snapshot): Authorization | null {
  return snapshot.authorizations.find((a) => a.status === "active") ?? snapshot.authorizations[0] ?? null;
}

function acceptedEvidence(snapshot: Snapshot): Evidence[] {
  return snapshot.evidence.filter((e) => e.status === "accepted");
}

function selectedAlternatives(snapshot: Snapshot): Alternative[] {
  return snapshot.alternatives.filter((a) => a.selected);
}

export function transitionPermission(actor: Actor, next: DecisionStatus, snapshot: Snapshot): string | null {
  if (actor.isAgent) return "AI agents cannot advance a decision. Only a person may authorize a stage change.";
  switch (next) {
    case "understanding":
    case "evaluated":
      return isAnalystOrSteward(actor) ? null : "Only an analyst or steward may advance analysis stages.";
    case "authorized": {
      if (humanRole(actor) !== "authorizer") return "Only a person with the authorizer role may authorize this decision.";
      const authorization = activeAuthorization(snapshot);
      if (authorization && authorization.authorizerId !== actor.id) {
        return "The acting authorizer does not match the recorded authorization.";
      }
      return null;
    }
    case "executing":
      return humanRole(actor) === "implementer" || humanRole(actor) === "steward"
        ? null
        : "Only an implementer or steward may start execution.";
    case "verified": {
      if (humanRole(actor) !== "verifier") return "Only a person with the verifier role may verify outcomes.";
      const outcome = latestOutcome(snapshot);
      if (!outcome) return "Record and measure an outcome first.";
      if (outcome.verifierId !== actor.id) return "The acting verifier does not match the recorded outcome verifier.";
      return null;
    }
    case "learned":
      return humanRole(actor) === "steward" ? null : "Only a steward may close a decision into learning.";
    default:
      return "This stage cannot be advanced.";
  }
}

function stageRequirements(next: DecisionStatus, snapshot: Snapshot, actor: Actor): Requirement[] {
  const { decision } = snapshot;
  const accepted = acceptedEvidence(snapshot);
  const selected = selectedAlternatives(snapshot);
  const selectedAlt = selected[0] ?? null;
  const auth = activeAuthorization(snapshot);
  const outcome = latestOutcome(snapshot);
  const openCorrections = snapshot.corrections.filter((c) => c.status === "open");
  const reqs: Requirement[] = [];

  switch (next) {
    case "understanding": {
      reqs.push(requirement("place", "Place recorded", hasText(decision.placeName)));
      reqs.push(requirement("problem", "Problem statement recorded", hasText(decision.problemStatement)));
      reqs.push(requirement("affected", "Affected population described", hasText(decision.affectedPopulation)));
      reqs.push(baselineRequirement(decision));
      reqs.push(
        requirement(
          "observation",
          "At least one observation recorded",
          snapshot.observations.length > 0,
          `${snapshot.observations.length} recorded`,
        ),
      );
      reqs.push(
        requirement(
          "evidence",
          "At least one evidence source accepted by a reviewer",
          accepted.length > 0,
          `${accepted.length} accepted`,
        ),
      );
      break;
    }
    case "evaluated": {
      reqs.push(
        requirement(
          "alternatives",
          "At least two alternatives documented",
          snapshot.alternatives.length >= 2,
          `${snapshot.alternatives.length} recorded`,
        ),
      );
      reqs.push(
        requirement(
          "selected",
          "Exactly one alternative selected",
          selected.length === 1,
          `${selected.length} selected`,
        ),
      );
      reqs.push(requirement("rationale", "Selection rationale recorded", !!selectedAlt && hasText(selectedAlt.selectionRationale)));
      reqs.push(
        requirement("uncertainty", "Uncertainties documented for the selected option", !!selectedAlt && hasText(selectedAlt.uncertainties)),
      );
      reqs.push(
        requirement("evidence2", "At least two accepted evidence sources", accepted.length >= 2, `${accepted.length} accepted`),
      );
      reqs.push(
        requirement(
          "independence",
          "Source independence assessed",
          accepted.some((e) => hasText(e.independenceNote)),
          "No accepted source has an independence note",
        ),
      );
      break;
    }
    case "authorized": {
      reqs.push(
        requirement(
          "authorization",
          "Authorization recorded with scope and conflict-of-interest declaration",
          !!auth && hasText(auth.scope) && hasText(auth.coiDeclaration),
          auth ? null : "No authorization recorded",
        ),
      );
      reqs.push(
        requirement(
          "authorizer",
          "Acting authorizer matches the recorded authorizer",
          !!auth && auth.authorizerId === actor.id,
          auth ? null : "Record an authorization first",
        ),
      );
      reqs.push(
        requirement("evidence2", "At least two accepted evidence sources", accepted.length >= 2, `${accepted.length} accepted`),
      );
      reqs.push(requirement("selection", "A selected alternative exists", selected.length === 1));
      break;
    }
    case "executing": {
      const approvedResource = snapshot.resources.some(
        (r) => hasText(r.funder) && (r.instrument === "in_kind" || (r.amount ?? 0) > 0),
      );
      reqs.push(requirement("resource", "Resource commitment recorded and approved", approvedResource));
      reqs.push(requirement("authorization", "Active authorization on record", !!auth && auth.status === "active"));
      reqs.push(
        requirement(
          "implementer",
          "Implementer assigned",
          snapshot.executions.some((e) => hasText(e.implementerId)),
        ),
      );
      reqs.push(
        requirement(
          "started",
          "Execution record opened by the implementer",
          snapshot.executions.some((e) => e.status === "in_progress"),
        ),
      );
      break;
    }
    case "verified": {
      reqs.push(
        requirement(
          "execution",
          "At least one execution completed",
          snapshot.executions.some((e) => e.status === "completed"),
        ),
      );
      reqs.push(requirement("outcome", "Outcome measured", snapshot.outcomes.length > 0));
      reqs.push(requirement("method", "Measurement method documented", !!outcome && hasText(outcome.method)));
      reqs.push(
        requirement("uncertainty", "Uncertainty and limitations documented", !!outcome && hasText(outcome.uncertaintyNote)),
      );
      reqs.push(
        requirement("baselineCompare", "Comparison with baseline documented", !!outcome && hasText(outcome.baselineNote)),
      );
      reqs.push(
        requirement(
          "verifier",
          "Outcome recorded by an independent verifier",
          !!outcome && !!auth && outcome.verifierId !== auth.authorizerId,
          outcome && auth ? "Verifier matches the authorizer" : "Verifier or authorization missing",
        ),
      );
      if (outcome?.classification === "attributed") {
        reqs.push(
          requirement(
            "attribution",
            "Attribution method documented",
            hasText(outcome.attributionMethod),
            "Outcome is classified as attributed without a method",
          ),
        );
      }
      break;
    }
    case "learned": {
      reqs.push(requirement("lesson", "Lesson recorded", snapshot.lessons.length > 0));
      reqs.push(
        requirement(
          "corrections",
          "All corrections resolved",
          openCorrections.length === 0,
          `${openCorrections.length} open`,
        ),
      );
      reqs.push(requirement("outcome", "A verified outcome exists", snapshot.outcomes.length > 0));
      break;
    }
    default:
      break;
  }
  return reqs;
}

function stageWarnings(snapshot: Snapshot): Requirement[] {
  const warnings: Requirement[] = [];
  const pending = snapshot.contributions.filter((c) => c.status === "pending");
  if (pending.length > 0) {
    warnings.push(
      requirement(
        "pending-contributions",
        `${pending.length} agent finding${pending.length === 1 ? "" : "s"} awaiting human review`,
        false,
        "Agent output does not affect a decision until a person reviews it.",
      ),
    );
  }
  const accepted = acceptedEvidence(snapshot);
  const withoutIndependence = accepted.filter((e) => !hasText(e.independenceNote));
  if (withoutIndependence.length > 0) {
    warnings.push(
      requirement(
        "independence-gap",
        `${withoutIndependence.length} accepted source${withoutIndependence.length === 1 ? "" : "s"} without an independence assessment`,
        false,
      ),
    );
  }
  for (const outcome of snapshot.outcomes) {
    if (outcome.classification === "estimated" || outcome.classification === "uncertain") {
      warnings.push(
        requirement(
          `classification-${outcome.id}`,
          `Outcome "${outcome.metric}" is classified ${outcome.classification}`,
          false,
          "It must not be presented as observed impact.",
        ),
      );
    }
  }
  const open = snapshot.corrections.filter((c) => c.status === "open");
  if (open.length > 0) {
    warnings.push(
      requirement("open-corrections", `${open.length} open correction${open.length === 1 ? "" : "s"}`, false),
    );
  }
  return warnings;
}

export function readiness(snapshot: Snapshot, actor: Actor): Readiness {
  const current = snapshot.decision.status;
  const next = nextStage(current);
  if (!next) {
    return {
      current,
      next: null,
      actorCanTransition: false,
      actorBlockReason: "The decision has reached the end of the recorded cycle.",
      requirements: [],
      warnings: stageWarnings(snapshot),
      canTransition: false,
    };
  }
  const requirements = stageRequirements(next, snapshot, actor);
  const actorBlockReason = transitionPermission(actor, next, snapshot);
  const actorCanTransition = actorBlockReason === null;
  const canTransition = actorCanTransition && requirements.every((r) => r.met);
  return {
    current,
    next,
    actorCanTransition,
    actorBlockReason,
    requirements,
    warnings: stageWarnings(snapshot),
    canTransition,
  };
}

export function permissions(actor: Actor, snapshot: Snapshot): Permissions {
  const human = !actor.isAgent;
  const role = humanRole(actor);
  const status = snapshot.decision.status;
  const analyst = human && (role === "analyst" || role === "steward");
  const preAuthorization = status === "draft" || status === "understanding" || status === "evaluated";
  return {
    addObservation: analyst,
    addEvidence: analyst,
    reviewEvidence: analyst,
    addAlternative: analyst && preAuthorization,
    selectAlternative: analyst && preAuthorization,
    createAuthorization: human && role === "authorizer" && status === "evaluated",
    createResource: human && (role === "authorizer" || role === "steward") && (status === "authorized" || status === "executing"),
    createExecution: human && (role === "implementer" || role === "steward") && (status === "authorized" || status === "executing"),
    updateExecution: human && (role === "implementer" || role === "steward") && (status === "authorized" || status === "executing"),
    createOutcome: human && role === "verifier" && (status === "executing" || status === "verified"),
    addCorrection: human && status !== "learned",
    resolveCorrection: human && (role === "steward" || role === "verifier") && status !== "learned",
    addLesson: human && role === "steward" && status === "verified",
    runOracle: actor.isAgent && actor.agentRole === "oracle",
    reviewContribution: human,
    editDecision: analyst && preAuthorization,
  };
}
