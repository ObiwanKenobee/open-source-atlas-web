export const STATUSES = [
  "draft",
  "understanding",
  "evaluated",
  "authorized",
  "executing",
  "verified",
  "learned",
] as const;

export type DecisionStatus = (typeof STATUSES)[number];

export const HUMAN_ROLES = ["analyst", "authorizer", "implementer", "verifier", "steward"] as const;
export type HumanRole = (typeof HUMAN_ROLES)[number];

export const AGENT_ROLES = [
  "oracle",
  "gaia",
  "solomon",
  "aegis",
  "athena",
  "leonardo",
  "builder",
] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const EVIDENCE_SOURCES = [
  "dataset",
  "report",
  "field_measurement",
  "interview",
  "administrative_record",
  "other",
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_STATES = ["proposed", "accepted", "rejected"] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const INSTRUMENTS = ["grant", "donation", "loan", "investment", "in_kind"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const EXECUTION_STATES = ["planned", "in_progress", "completed", "failed", "abandoned"] as const;
export type ExecutionState = (typeof EXECUTION_STATES)[number];

export const OUTCOME_CLASSIFICATIONS = ["observed", "estimated", "attributed", "uncertain"] as const;
export type OutcomeClassification = (typeof OUTCOME_CLASSIFICATIONS)[number];

export interface Actor {
  id: string;
  name: string;
  organization: string;
  role: HumanRole | null;
  isAgent: boolean;
  agentRole: AgentRole | null;
}

export interface Decision {
  id: string;
  title: string;
  status: DecisionStatus;
  placeName: string | null;
  placeGeoJson: { type: "Point"; coordinates: [number, number] } | null;
  problemStatement: string | null;
  affectedPopulation: string | null;
  baselineMetric: string | null;
  baselineValue: number | null;
  baselineUnit: string | null;
  baselineMethod: string | null;
  baselineObservedAt: string | null;
  baselineLockedAt: string | null;
  synthetic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionSummary {
  id: string;
  title: string;
  status: DecisionStatus;
  placeName: string | null;
  synthetic: boolean;
  updatedAt: string;
  acceptedEvidence: number;
  openCorrections: number;
}

export interface Observation {
  id: string;
  decisionId: string;
  observedAt: string;
  observerId: string;
  method: string;
  valueText: string;
  sourceRef: string | null;
  limitations: string | null;
  createdAt: string;
}

export interface Evidence {
  id: string;
  decisionId: string;
  title: string;
  sourceType: EvidenceSourceType;
  sourceRef: string;
  url: string | null;
  publishedAt: string | null;
  independenceNote: string | null;
  limitations: string | null;
  status: EvidenceState;
  contributedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface Alternative {
  id: string;
  decisionId: string;
  name: string;
  description: string;
  estCostAmount: number | null;
  estCostCurrency: string | null;
  expectedBenefit: string | null;
  risks: string | null;
  uncertainties: string | null;
  selected: boolean;
  selectionRationale: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Authorization {
  id: string;
  decisionId: string;
  authorizerId: string;
  scope: string;
  conditions: string;
  coiDeclaration: string;
  status: "active" | "revoked";
  authorizedAt: string;
}

export interface ResourceCommitment {
  id: string;
  decisionId: string;
  instrument: Instrument;
  amount: number | null;
  currency: string | null;
  funder: string;
  termsNote: string | null;
  approvedBy: string;
  approvedAt: string;
  notes: string | null;
}

export interface Execution {
  id: string;
  decisionId: string;
  implementerId: string;
  startedAt: string;
  endedAt: string | null;
  workPerformed: string | null;
  deviations: string | null;
  status: ExecutionState;
  createdAt: string;
}

export interface Outcome {
  id: string;
  decisionId: string;
  measuredAt: string;
  metric: string;
  value: number;
  unit: string;
  classification: OutcomeClassification;
  method: string;
  baselineValue: number | null;
  baselineNote: string;
  uncertaintyNote: string;
  attributionMethod: string | null;
  verifierId: string;
  createdAt: string;
}

export interface Correction {
  id: string;
  decisionId: string;
  targetType: string;
  targetId: string | null;
  description: string;
  raisedBy: string;
  raisedAt: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  status: "open" | "resolved";
}

export interface Lesson {
  id: string;
  decisionId: string;
  summary: string;
  whatWorked: string | null;
  whatDidnt: string | null;
  changes: string | null;
  recordedBy: string;
  recordedAt: string;
}

export interface AgentContribution {
  id: string;
  decisionId: string;
  agentId: string;
  kind: "evidence_gap_flag" | "proposal" | "summary";
  content: string;
  status: "pending" | "accepted" | "rejected";
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AuditEvent {
  id: number;
  decisionId: string;
  type: string;
  actorId: string;
  summary: string;
  createdAt: string;
}

export interface Requirement {
  id: string;
  label: string;
  met: boolean;
  detail: string | null;
}

export interface Readiness {
  current: DecisionStatus;
  next: DecisionStatus | null;
  actorCanTransition: boolean;
  actorBlockReason: string | null;
  requirements: Requirement[];
  warnings: Requirement[];
  canTransition: boolean;
}

export interface Permissions {
  addObservation: boolean;
  addEvidence: boolean;
  reviewEvidence: boolean;
  addAlternative: boolean;
  selectAlternative: boolean;
  createAuthorization: boolean;
  createResource: boolean;
  createExecution: boolean;
  updateExecution: boolean;
  createOutcome: boolean;
  addCorrection: boolean;
  resolveCorrection: boolean;
  addLesson: boolean;
  runOracle: boolean;
  reviewContribution: boolean;
  editDecision: boolean;
}

export interface OracleFinding {
  severity: "high" | "medium" | "low";
  message: string;
}

export interface DecisionPayload {
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
  readiness: Readiness;
  permissions: Permissions;
}

export interface DecisionExport extends DecisionPayload {
  exportedAt: string;
  notice: string;
}
