import { rmSync } from "node:fs";
import { defaultDbPath, insertRow, openDb } from "./db.ts";
import { ensureBaseActors } from "./actors.ts";
import { getSnapshot, logEvent, oracleFindings } from "./service.ts";

for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${defaultDbPath}${suffix}`, { force: true });
}

const db = openDb();
ensureBaseActors(db);

const GRACE = "actor-analyst-1";
const PETER = "actor-analyst-2";
const RUTH = "actor-authorizer-1";
const SAMUEL = "actor-implementer-1";
const ESTHER = "actor-verifier-1";
const DANIEL = "actor-steward-1";
const ORACLE = "agent-oracle";

const WATER = "dec-water-reliability";
const WASH = "dec-school-wash";
const FLOOD = "dec-flood-ew";

function decision(overrides: Record<string, unknown>): void {
  insertRow(db, "decisions", {
    status: "draft",
    synthetic: 1,
    createdAt: "2026-07-06T08:00:00.000Z",
    updatedAt: "2026-07-06T08:00:00.000Z",
    ...overrides,
  });
}

decision({
  id: WATER,
  title: "Nakuru water-point reliability pilot (synthetic)",
  status: "verified",
  placeName: "Nakuru County, sample wards (fictional)",
  placeGeoJson: { type: "Point", coordinates: [36.08, -0.3031] },
  problemStatement:
    "In the sample wards, shared water points deliver intermittent service, forcing households to queue or use unprotected sources. This demonstration treats water-point reliability as the measurable condition it is trying to improve. It does not assert a causal link to health or livelihood outcomes.",
  affectedPopulation:
    "Approximately 12,400 residents using 14 shared water points (synthetic figures used only to demonstrate the workflow).",
  baselineMetric: "Functional water-point days per month",
  baselineValue: 18.2,
  baselineUnit: "days per month",
  baselineMethod: "Review of 14 water-point service logs over three months (synthetic extract)",
  baselineObservedAt: "2026-06-30",
  baselineLockedAt: "2026-07-20T09:00:00.000Z",
  createdBy: GRACE,
  createdAt: "2026-07-06T08:00:00.000Z",
  updatedAt: "2026-10-14T16:00:00.000Z",
});

logEvent(db, WATER, GRACE, "decision.created", "Decision opened: Nakuru water-point reliability pilot", "2026-07-06T08:00:00.000Z");
logEvent(db, WATER, GRACE, "observation.added", "Observation recorded: Review of water-point logs", "2026-07-08T09:10:00.000Z");
logEvent(db, WATER, PETER, "observation.added", "Observation recorded: Community baraza notes", "2026-07-09T14:00:00.000Z");
logEvent(db, WATER, GRACE, "evidence.proposed", "Evidence proposed: Water-point service logs", "2026-07-10T10:00:00.000Z");
logEvent(db, WATER, PETER, "evidence.accepted", "Evidence accepted: Water-point service logs", "2026-07-11T09:00:00.000Z");
logEvent(db, WATER, GRACE, "evidence.proposed", "Evidence proposed: Household reliability survey", "2026-07-11T15:00:00.000Z");
logEvent(db, WATER, PETER, "evidence.accepted", "Evidence accepted: Household reliability survey", "2026-07-12T11:30:00.000Z");
logEvent(db, WATER, GRACE, "evidence.proposed", "Evidence proposed: County water asset register extract", "2026-07-13T08:45:00.000Z");
logEvent(db, WATER, PETER, "evidence.accepted", "Evidence accepted: County water asset register extract", "2026-07-14T10:15:00.000Z");
logEvent(db, WATER, GRACE, "observation.added", "Observation recorded: Technician inspection", "2026-07-15T16:20:00.000Z");
logEvent(db, WATER, GRACE, "evidence.proposed", "Evidence proposed: Unverified social media claim", "2026-07-16T08:00:00.000Z");
logEvent(db, WATER, PETER, "evidence.rejected", "Evidence rejected: Unverified social media claim", "2026-07-16T13:00:00.000Z");
logEvent(db, WATER, GRACE, "evidence.proposed", "Evidence proposed: Vendor quotation", "2026-07-18T09:30:00.000Z");
logEvent(db, WATER, PETER, "evidence.accepted", "Evidence accepted: Vendor quotation", "2026-07-19T10:00:00.000Z");
logEvent(db, WATER, GRACE, "transition", "Advanced from draft to understanding", "2026-07-20T09:00:00.000Z");
logEvent(db, WATER, GRACE, "alternative.added", "Alternative added: Targeted repair plus maintenance contract", "2026-07-21T10:00:00.000Z");
logEvent(db, WATER, GRACE, "alternative.added", "Alternative added: Solar backup and remote monitoring", "2026-07-21T10:20:00.000Z");
logEvent(db, WATER, GRACE, "alternative.added", "Alternative added: Community-managed upkeep", "2026-07-21T10:40:00.000Z");
logEvent(db, WATER, GRACE, "alternative.selected", "Alternative selected: Targeted repair plus maintenance contract", "2026-07-25T09:15:00.000Z");
logEvent(db, WATER, GRACE, "transition", "Advanced from understanding to evaluated", "2026-08-03T08:30:00.000Z");
logEvent(db, WATER, RUTH, "authorization.recorded", "Authorization recorded with scope and conditions", "2026-08-11T11:00:00.000Z");
logEvent(db, WATER, RUTH, "transition", "Advanced from evaluated to authorized", "2026-08-12T09:00:00.000Z");
logEvent(db, WATER, RUTH, "resource.approved", "Resource commitment recorded: grant", "2026-08-14T10:00:00.000Z");
logEvent(db, WATER, DANIEL, "resource.approved", "Resource commitment recorded: in_kind", "2026-08-15T15:00:00.000Z");
logEvent(db, WATER, SAMUEL, "execution.opened", "Execution record opened by implementer", "2026-08-18T08:00:00.000Z");
logEvent(db, WATER, SAMUEL, "transition", "Advanced from authorized to executing", "2026-08-19T08:30:00.000Z");
logEvent(db, WATER, GRACE, "correction.raised", "Correction raised on evidence", "2026-09-05T09:00:00.000Z");
logEvent(db, WATER, DANIEL, "correction.resolved", "Correction resolved with recorded rationale", "2026-09-06T14:00:00.000Z");
logEvent(db, WATER, SAMUEL, "execution.updated", "Execution updated: completed", "2026-09-02T17:00:00.000Z");
logEvent(db, WATER, SAMUEL, "execution.updated", "Execution updated: completed", "2026-10-10T16:30:00.000Z");
logEvent(db, WATER, ESTHER, "outcome.recorded", "Outcome recorded (observed): Functional water-point days per month", "2026-10-12T10:00:00.000Z");
logEvent(db, WATER, ESTHER, "outcome.recorded", "Outcome recorded (estimated): Share of users reporting reliable supply", "2026-10-12T10:40:00.000Z");
logEvent(db, WATER, ESTHER, "transition", "Advanced from executing to verified", "2026-10-14T16:00:00.000Z");
logEvent(db, WATER, PETER, "correction.raised", "Correction raised on outcome", "2026-10-16T09:20:00.000Z");
logEvent(db, WATER, ORACLE, "oracle.scan", "Oracle ran a deterministic evidence-gap scan", "2026-10-20T08:00:00.000Z");
logEvent(db, WATER, ORACLE, "contribution.created", "Oracle scan produced 1 finding(s)", "2026-10-20T08:00:00.000Z");

insertRow(db, "observations", {
  id: "obs-water-logs",
  decisionId: WATER,
  observedAt: "2026-07-07",
  observerId: GRACE,
  method: "Review of 14 water-point service logs (synthetic extract)",
  valueText:
    "Average of 18.2 functional days per month. Four points fell below 15 days. March entries have gaps and two caretakers reported using estimated dates.",
  sourceRef: "Trust log extract WP-2026-H1 (fictional dataset)",
  limitations: "Logs are self-reported by caretakers; no independent meter data exists.",
  createdAt: "2026-07-08T09:10:00.000Z",
});

insertRow(db, "observations", {
  id: "obs-water-baraza",
  decisionId: WATER,
  observedAt: "2026-07-09",
  observerId: PETER,
  method: "Community baraza (open meeting) with residents of two wards",
  valueText:
    "Residents described queues of 40–90 minutes and said they sometimes use an unprotected spring. Attendance was approximately 60 people, mostly women.",
  sourceRef: "Baraza notes 2026-07-09 (fictional)",
  limitations: "Convenience sample; attendance does not represent all users.",
  createdAt: "2026-07-09T14:00:00.000Z",
});

insertRow(db, "observations", {
  id: "obs-water-inspection",
  decisionId: WATER,
  observedAt: "2026-07-14",
  observerId: GRACE,
  method: "Joint technician inspection of all 14 points",
  valueText:
    "Three pumps failed at inspection; two require seals and one has an electrical fault. Two points show structural cracks around the apron.",
  sourceRef: "Inspection sheet IS-14 (fictional)",
  limitations: "Single visit; no water-quality testing was performed.",
  createdAt: "2026-07-15T16:20:00.000Z",
});

const evidenceRows = [
  {
    id: "ev-water-logs",
    title: "Water-point service logs, January–June 2026 (sample)",
    sourceType: "dataset",
    sourceRef: "Trust log extract WP-2026-H1 (fictional dataset)",
    url: null,
    publishedAt: "2026-07-05",
    independenceNote: "Compiled by the water trust's own field officers. Not independent of the intervention.",
    limitations: "Self-reported caretaker logs with gaps in March.",
    status: "accepted",
    contributedBy: GRACE,
    reviewedBy: PETER,
    reviewedAt: "2026-07-11T09:00:00.000Z",
    reviewNote: "Accepted as the baseline source, with limitations recorded.",
    createdAt: "2026-07-10T10:00:00.000Z",
  },
  {
    id: "ev-water-survey",
    title: "Household reliability survey, June 2026",
    sourceType: "field_measurement",
    sourceRef: "Survey 2026-06 (synthetic, n=210 households)",
    url: null,
    publishedAt: "2026-07-10",
    independenceNote: "Fielded by a separate survey team using a ward-list sampling frame.",
    limitations: "Two wards excluded for access reasons.",
    status: "accepted",
    contributedBy: GRACE,
    reviewedBy: PETER,
    reviewedAt: "2026-07-12T11:30:00.000Z",
    reviewNote: "Sampling frame documented; accepted.",
    createdAt: "2026-07-11T15:00:00.000Z",
  },
  {
    id: "ev-water-register",
    title: "County water asset register extract",
    sourceType: "administrative_record",
    sourceRef: "Nakuru County asset register extract (fictional)",
    url: null,
    publishedAt: "2026-06-20",
    independenceNote: "County-held administrative record, compiled independently of this project.",
    limitations: "Register last updated in February 2026.",
    status: "accepted",
    contributedBy: GRACE,
    reviewedBy: PETER,
    reviewedAt: "2026-07-14T10:15:00.000Z",
    reviewNote: null,
    createdAt: "2026-07-13T08:45:00.000Z",
  },
  {
    id: "ev-water-quote",
    title: "Vendor quotation for pump repair and maintenance",
    sourceType: "other",
    sourceRef: "Quotation Q-4471 (fictional)",
    url: null,
    publishedAt: "2026-07-17",
    independenceNote: "Single vendor quotation. Price was compared with two informal quotes that are not attached.",
    limitations: "Not a competitive tender; prices may not reflect market rates.",
    status: "accepted",
    contributedBy: GRACE,
    reviewedBy: PETER,
    reviewedAt: "2026-07-19T10:00:00.000Z",
    reviewNote: "Accepted for cost planning only, not as evidence of value for money.",
    createdAt: "2026-07-18T09:30:00.000Z",
  },
  {
    id: "ev-water-social",
    title: "Unverified social media claim about service failure",
    sourceType: "other",
    sourceRef: "Post archived 2026-07-15 (fictional)",
    url: null,
    publishedAt: "2026-07-15",
    independenceNote: null,
    limitations: "Anonymous account; no corroboration.",
    status: "rejected",
    contributedBy: GRACE,
    reviewedBy: PETER,
    reviewedAt: "2026-07-16T13:00:00.000Z",
    reviewNote: "Unverifiable; not used in the evidence base.",
    createdAt: "2026-07-16T08:00:00.000Z",
  },
  {
    id: "ev-water-baraza",
    title: "Community feedback notes from July baraza",
    sourceType: "interview",
    sourceRef: "Baraza notes 2026-07 (fictional)",
    url: null,
    publishedAt: "2026-07-17",
    independenceNote: "Facilitated by the implementing partner's community liaison; reflects participants' views only.",
    limitations: "Convenience sample; not statistically representative.",
    status: "proposed",
    contributedBy: PETER,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: "2026-07-17T11:00:00.000Z",
  },
];

for (const evidence of evidenceRows) {
  insertRow(db, "evidence", { decisionId: WATER, ...evidence });
}

insertRow(db, "alternatives", {
  id: "alt-water-repair",
  decisionId: WATER,
  name: "Targeted repair plus six-month maintenance contract",
  description:
    "Repair the failed points and place all 14 points on a scheduled maintenance contract with monthly technician visits and a shared failure log.",
  estCostAmount: 4800000,
  estCostCurrency: "KES",
  expectedBenefit: "Restores service and creates a reliability record that can be measured against the baseline.",
  risks: "Contractor dependency; spare-part lead times could delay repairs.",
  uncertainties: "Failure rates may change after repair, and six months may not cover a full seasonal cycle.",
  selected: 1,
  selectionRationale:
    "Lower cost per functional point-month than the monitoring retrofit, and the maintenance schedule directly produces the data needed to test the reliability claim. The community-upkeep option was not selected because caretaker capacity is unverified.",
  createdBy: GRACE,
  createdAt: "2026-07-21T10:00:00.000Z",
});

insertRow(db, "alternatives", {
  id: "alt-water-solar",
  decisionId: WATER,
  name: "Solar backup and remote monitoring retrofit",
  description:
    "Install solar pumping backups and remote sensors at all 14 points, with a data platform for fault detection.",
  estCostAmount: 7200000,
  estCostCurrency: "KES",
  expectedBenefit: "Reduces power-related downtime and produces continuous operational data.",
  risks: "Higher capital cost; sensors require maintenance and connectivity.",
  uncertainties: "Sensor uptime under local conditions is unknown; savings from avoided downtime are modelled, not observed.",
  selected: 0,
  selectionRationale: null,
  createdBy: GRACE,
  createdAt: "2026-07-21T10:20:00.000Z",
});

insertRow(db, "alternatives", {
  id: "alt-water-community",
  decisionId: WATER,
  name: "Community-managed upkeep with caretaker stipends",
  description:
    "Fund trained caretakers in each ward to perform routine maintenance and log service days, with a small repair fund.",
  estCostAmount: 3100000,
  estCostCurrency: "KES",
  expectedBenefit: "Builds local ownership and lowers recurring contractor costs.",
  risks: "Caretaker turnover and uneven technical capacity.",
  uncertainties: "Volunteer continuity is untested; repair quality cannot be assured without supervision.",
  selected: 0,
  selectionRationale: null,
  createdBy: GRACE,
  createdAt: "2026-07-21T10:40:00.000Z",
});

insertRow(db, "authorizations", {
  id: "auth-water-1",
  decisionId: WATER,
  authorizerId: RUTH,
  scope:
    "Approve up to KES 4,800,000 for repair works at 14 water points and a six-month maintenance contract, as described in the selected alternative.",
  conditions:
    "Monthly expenditure statements; maintenance log shared with the authorizer; any scope change above 10% requires a new authorization; grievance channel reported in each update.",
  coiDeclaration:
    "No financial interest in the contracted vendors and no family relationship with vendor principals, declared for this prototype record.",
  status: "active",
  authorizedAt: "2026-08-11T11:00:00.000Z",
});

insertRow(db, "resource_commitments", {
  id: "res-water-grant",
  decisionId: WATER,
  instrument: "grant",
  amount: 4800000,
  currency: "KES",
  funder: "Example Foundation (fictional)",
  termsNote: "Disbursed quarterly against verified milestones; unspent funds returned.",
  approvedBy: RUTH,
  approvedAt: "2026-08-14T10:00:00.000Z",
  notes: "Synthetic commitment created for demonstration.",
});

insertRow(db, "resource_commitments", {
  id: "res-water-tools",
  decisionId: WATER,
  instrument: "in_kind",
  amount: null,
  currency: null,
  funder: "Maji Field Services (fictional)",
  termsNote: "14 tool kits provided for the maintenance period and returned afterwards.",
  approvedBy: DANIEL,
  approvedAt: "2026-08-15T15:00:00.000Z",
  notes: "In-kind support; no monetary value asserted.",
});

insertRow(db, "executions", {
  id: "exec-water-phase1",
  decisionId: WATER,
  implementerId: SAMUEL,
  startedAt: "2026-08-18T08:00:00.000Z",
  endedAt: "2026-09-02T17:00:00.000Z",
  workPerformed:
    "Replaced pumps and seals at 8 points and installed 2 solar backup units. Photographs and parts serial numbers recorded.",
  deviations: "Two points were delayed six days waiting for imported seals.",
  status: "completed",
  createdAt: "2026-08-18T08:00:00.000Z",
});

insertRow(db, "executions", {
  id: "exec-water-phase2",
  decisionId: WATER,
  implementerId: SAMUEL,
  startedAt: "2026-09-03T08:00:00.000Z",
  endedAt: "2026-10-10T16:30:00.000Z",
  workPerformed:
    "Monthly technician visits to all 14 points; repaired 5 additional failures; trained two local caretakers per ward.",
  deviations: "Point 7 failed twice. Its downtime record is disputed and is the subject of an open correction.",
  status: "completed",
  createdAt: "2026-09-03T08:00:00.000Z",
});

insertRow(db, "outcomes", {
  id: "out-water-days",
  decisionId: WATER,
  measuredAt: "2026-10-12",
  metric: "Functional water-point days per month",
  value: 25.1,
  unit: "days per month",
  classification: "observed",
  method:
    "21-day review of the shared maintenance log across all 14 points, cross-checked against caretaker call-in records.",
  baselineValue: 18.2,
  baselineNote:
    "Compared with the June 2026 baseline of 18.2 days per month from the same log source. Same source and metric; the observation window is shorter than the baseline window.",
  uncertaintyNote:
    "Covers one season only, has no comparison group, and depends on the same self-reported log source. The change cannot be attributed to the intervention on this evidence alone.",
  attributionMethod: null,
  verifierId: ESTHER,
  createdAt: "2026-10-12T10:00:00.000Z",
});

insertRow(db, "outcomes", {
  id: "out-water-satisfaction",
  decisionId: WATER,
  measuredAt: "2026-10-12",
  metric: "Share of surveyed users reporting reliable supply five or more days per week",
  value: 71,
  unit: "% of respondents",
  classification: "estimated",
  method: "Post-intervention household survey (n=186) with ward-level weighting. No comparable baseline survey exists.",
  baselineValue: null,
  baselineNote:
    "No baseline survey was conducted. This figure is a post-only estimate and cannot be compared with a pre-intervention value.",
  uncertaintyNote:
    "Sampling and recall bias are likely; respondents may associate the survey with the implementing partner. Reported as an estimate, not an observed impact.",
  attributionMethod: null,
  verifierId: ESTHER,
  createdAt: "2026-10-12T10:40:00.000Z",
});

insertRow(db, "corrections", {
  id: "cor-water-figures",
  decisionId: WATER,
  targetType: "evidence",
  targetId: "ev-water-survey",
  description:
    "The survey table lists 210 households in the source note but 186 in the outcome method. The difference was not explained.",
  raisedBy: GRACE,
  raisedAt: "2026-09-05T09:00:00.000Z",
  resolution:
    "The 210 figure was the issued sample; 186 completed interviews. Both documents were annotated to distinguish issued sample from completed responses.",
  resolvedBy: DANIEL,
  resolvedAt: "2026-09-06T14:00:00.000Z",
  status: "resolved",
});

insertRow(db, "corrections", {
  id: "cor-water-point7",
  decisionId: WATER,
  targetType: "outcome",
  targetId: "out-water-days",
  description:
    "Point 7 is recorded as functional for 26 days but the caretaker log shows a nine-day outage. The discrepancy changes the average by approximately 0.3 days and has not been reconciled.",
  raisedBy: PETER,
  raisedAt: "2026-10-16T09:20:00.000Z",
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  status: "open",
});

const waterSnapshot = getSnapshot(db, WATER);
const findings = oracleFindings(waterSnapshot);
insertRow(db, "agent_contributions", {
  id: "contrib-water-open-correction",
  decisionId: WATER,
  agentId: ORACLE,
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
  createdAt: "2026-10-20T08:00:00.000Z",
});

decision({
  id: WASH,
  title: "School WASH rehabilitation — scoping (synthetic)",
  status: "understanding",
  placeName: "Nakuru County, three-school sample (fictional)",
  placeGeoJson: { type: "Point", coordinates: [36.07, -0.29] },
  problemStatement:
    "Sanitation blocks at three sample schools are unusable. This scoping record tests whether a structured decision record improves delivery accountability; it does not yet choose an intervention.",
  affectedPopulation: "Approximately 1,900 pupils and 48 staff at three schools (synthetic figures).",
  baselineMetric: "Functioning sanitation blocks",
  baselineValue: 4,
  baselineUnit: "blocks",
  baselineMethod: "Visual inspection of all blocks, September 2026",
  baselineObservedAt: "2026-09-25",
  baselineLockedAt: "2026-10-01T10:00:00.000Z",
  createdBy: GRACE,
  createdAt: "2026-09-28T09:00:00.000Z",
  updatedAt: "2026-10-02T11:00:00.000Z",
});

logEvent(db, WASH, GRACE, "decision.created", "Decision opened: School WASH rehabilitation scoping", "2026-09-28T09:00:00.000Z");
logEvent(db, WASH, PETER, "observation.added", "Observation recorded: Inspection of sanitation blocks", "2026-09-29T10:00:00.000Z");
logEvent(db, WASH, PETER, "evidence.proposed", "Evidence proposed: School infrastructure audit", "2026-09-29T15:00:00.000Z");
logEvent(db, WASH, GRACE, "evidence.accepted", "Evidence accepted: School infrastructure audit", "2026-09-30T09:00:00.000Z");
logEvent(db, WASH, GRACE, "transition", "Advanced from draft to understanding", "2026-10-01T10:00:00.000Z");
logEvent(db, WASH, GRACE, "evidence.proposed", "Evidence proposed: Contractor cost estimate", "2026-10-02T11:00:00.000Z");

insertRow(db, "observations", {
  id: "obs-wash-inspection",
  decisionId: WASH,
  observedAt: "2026-09-28",
  observerId: PETER,
  method: "Visual inspection of sanitation blocks at three schools",
  valueText: "Four of eleven blocks are usable; seven lack water or doors. One school has no usable block.",
  sourceRef: "Inspection notes WASH-3 (fictional)",
  limitations: "No water-quality testing, no pupil interviews yet.",
  createdAt: "2026-09-29T10:00:00.000Z",
});

insertRow(db, "evidence", {
  id: "ev-wash-audit",
  decisionId: WASH,
  title: "School infrastructure audit, September 2026",
  sourceType: "administrative_record",
  sourceRef: "County education audit extract (fictional)",
  url: null,
  publishedAt: "2026-09-05",
  independenceNote: "County education office record, not produced by the implementing partner.",
  limitations: "Audit covers structural condition, not usage or hygiene behaviour.",
  status: "accepted",
  contributedBy: PETER,
  reviewedBy: GRACE,
  reviewedAt: "2026-09-30T09:00:00.000Z",
  reviewNote: "Accepted for baseline context. Does not establish demand or usage patterns.",
  createdAt: "2026-09-29T15:00:00.000Z",
});

insertRow(db, "evidence", {
  id: "ev-wash-estimate",
  decisionId: WASH,
  title: "Contractor cost estimate for block rehabilitation",
  sourceType: "other",
  sourceRef: "Estimate E-221 (fictional)",
  url: null,
  publishedAt: "2026-10-02",
  independenceNote: "Single contractor estimate; no independent quantity survey.",
  limitations: "Not a tender; likely optimistic on labour availability.",
  status: "proposed",
  contributedBy: GRACE,
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: "2026-10-02T11:00:00.000Z",
});

decision({
  id: FLOOD,
  title: "Flood early-warning feasibility — scoping (synthetic)",
  status: "draft",
  placeName: "Nakuru County, low-lying wards (fictional)",
  createdBy: DANIEL,
  createdAt: "2026-10-21T09:00:00.000Z",
  updatedAt: "2026-10-21T09:00:00.000Z",
});

logEvent(db, FLOOD, DANIEL, "decision.created", "Decision opened: Flood early-warning feasibility scoping", "2026-10-21T09:00:00.000Z");

console.log("Seeded synthetic demonstration data:");
console.log(`  ${WATER} — verified, one open correction, LEARN blocked`);
console.log(`  ${WASH} — understanding, no alternatives yet`);
console.log(`  ${FLOOD} — draft, no evidence yet`);
