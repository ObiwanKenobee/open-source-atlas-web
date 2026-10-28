import { useState } from "react";
import type {
  Actor,
  AgentContribution,
  Alternative,
  AuditEvent,
  Authorization,
  Correction,
  Evidence,
  Execution,
  Lesson,
  Observation,
  OracleFinding,
  Outcome,
  ResourceCommitment,
} from "@shared/types";
import {
  actorLabel,
  coordLabel,
  formatAmount,
  formatDate,
  formatDateTime,
  formatNumber,
  shortId,
} from "../lib/format";
import { Button, Chip, Empty } from "./Common";

export type ActorMap = Record<string, Actor>;

export function EvidenceList({
  items,
  actorMap,
  actor,
  canReview,
  onReview,
}: {
  items: Evidence[];
  actorMap: ActorMap;
  actor: Actor;
  canReview: boolean;
  onReview: (evidence: Evidence) => void;
}) {
  if (items.length === 0) {
    return <Empty>No evidence has been recorded. Findings are not evidence until a source is named and reviewed.</Empty>;
  }
  const sourceLabel: Record<string, string> = {
    dataset: "Dataset",
    report: "Report",
    field_measurement: "Field measurement",
    interview: "Interview",
    administrative_record: "Administrative record",
    other: "Other",
  };
  return (
    <ul className="record-list">
      {items.map((evidence) => {
        const tone = evidence.status === "accepted" ? "moss" : evidence.status === "rejected" ? "clay" : "ochre";
        return (
          <li key={evidence.id} className={`record evidence-${evidence.status}`}>
            <div className="record-head">
              <div>
                <h3>{evidence.title}</h3>
                <p className="meta">
                  {sourceLabel[evidence.sourceType] ?? evidence.sourceType} · {evidence.sourceRef}
                  {evidence.publishedAt ? ` · published ${formatDate(evidence.publishedAt)}` : ""}
                </p>
              </div>
              <Chip tone={tone}>{evidence.status}</Chip>
            </div>
            {evidence.independenceNote ? (
              <p className="note-line">
                <span className="note-label">Independence:</span> {evidence.independenceNote}
              </p>
            ) : (
              <p className="note-line note-missing">No independence assessment recorded.</p>
            )}
            {evidence.limitations && (
              <p className="note-line">
                <span className="note-label">Limitations:</span> {evidence.limitations}
              </p>
            )}
            <div className="record-foot">
              <span className="meta">
                Proposed by {actorMap[evidence.contributedBy]?.name ?? shortId(evidence.contributedBy)} ·{" "}
                {formatDate(evidence.createdAt)}
                {evidence.reviewedBy
                  ? ` · reviewed by ${actorMap[evidence.reviewedBy]?.name ?? shortId(evidence.reviewedBy)} ${formatDate(evidence.reviewedAt)}`
                  : ""}
              </span>
              {evidence.status === "proposed" &&
                (evidence.contributedBy === actor.id ? (
                  <span className="meta italic">Awaiting review by a second person.</span>
                ) : canReview ? (
                  <Button size="sm" variant="secondary" onClick={() => onReview(evidence)}>
                    Review
                  </Button>
                ) : null)}
            </div>
            {evidence.reviewNote && <p className="review-note">Review note: {evidence.reviewNote}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function ObservationList({ items, actorMap }: { items: Observation[]; actorMap: ActorMap }) {
  if (items.length === 0) return <Empty>No field observations recorded.</Empty>;
  return (
    <ul className="record-list">
      {items.map((observation) => (
        <li key={observation.id} className="record">
          <div className="record-head">
            <div>
              <h3>{observation.method}</h3>
              <p className="meta">
                Observed {formatDate(observation.observedAt)} · {actorMap[observation.observerId]?.name ?? shortId(observation.observerId)}
              </p>
            </div>
          </div>
          <p>{observation.valueText}</p>
          {observation.sourceRef && (
            <p className="note-line">
              <span className="note-label">Source:</span> {observation.sourceRef}
            </p>
          )}
          {observation.limitations && (
            <p className="note-line">
              <span className="note-label">Limitations:</span> {observation.limitations}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AlternativeList({
  items,
  canSelect,
  onSelect,
}: {
  items: Alternative[];
  canSelect: boolean;
  onSelect: (alternative: Alternative) => void;
}) {
  if (items.length === 0) return <Empty>No alternatives documented. At least two are required before evaluation.</Empty>;
  return (
    <ul className="alternative-list">
      {items.map((alternative) => (
        <li key={alternative.id} className={`alternative ${alternative.selected ? "alternative-selected" : ""}`}>
          <div className="record-head">
            <div>
              <h3>{alternative.name}</h3>
              <p className="meta">
                {alternative.estCostAmount !== null
                  ? formatAmount(alternative.estCostAmount, alternative.estCostCurrency)
                  : "Cost not stated"}
              </p>
            </div>
            {alternative.selected ? <Chip tone="moss">Selected</Chip> : canSelect ? (
              <Button size="sm" onClick={() => onSelect(alternative)}>
                Select this option
              </Button>
            ) : null}
          </div>
          <p>{alternative.description}</p>
          <dl className="definition-list">
            {alternative.expectedBenefit && (
              <>
                <dt>Expected benefit</dt>
                <dd>{alternative.expectedBenefit}</dd>
              </>
            )}
            {alternative.risks && (
              <>
                <dt>Risks</dt>
                <dd>{alternative.risks}</dd>
              </>
            )}
            {alternative.uncertainties && (
              <>
                <dt>Uncertainties</dt>
                <dd>{alternative.uncertainties}</dd>
              </>
            )}
          </dl>
          {alternative.selected && alternative.selectionRationale && (
            <div className="selection-note">
              <span className="note-label">Selection rationale</span>
              <p>{alternative.selectionRationale}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AuthorizationList({ items, actorMap }: { items: Authorization[]; actorMap: ActorMap }) {
  if (items.length === 0) {
    return <Empty>No authorization on record. A named authorizer must record scope, conditions, and conflicts before execution.</Empty>;
  }
  return (
    <ul className="record-list">
      {items.map((authorization) => (
        <li key={authorization.id} className="record authorization-record">
          <div className="record-head">
            <div>
              <h3>Authorized by {actorMap[authorization.authorizerId]?.name ?? shortId(authorization.authorizerId)}</h3>
              <p className="meta">
                {formatDateTime(authorization.authorizedAt)} ·{" "}
                {actorMap[authorization.authorizerId]?.organization ?? "—"}
              </p>
            </div>
            <Chip tone="moss">{authorization.status}</Chip>
          </div>
          <dl className="definition-list">
            <dt>Scope</dt>
            <dd>{authorization.scope}</dd>
            <dt>Conditions</dt>
            <dd>{authorization.conditions}</dd>
            <dt>Conflict of interest</dt>
            <dd>{authorization.coiDeclaration}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

const INSTRUMENT_LABEL: Record<ResourceCommitment["instrument"], string> = {
  grant: "Grant",
  donation: "Donation",
  loan: "Loan",
  investment: "Investment",
  in_kind: "In kind",
};

export function ResourceList({ items, actorMap }: { items: ResourceCommitment[]; actorMap: ActorMap }) {
  if (items.length === 0) return <Empty>No resource commitment recorded. Execution cannot start without one.</Empty>;
  return (
    <ul className="record-list compact">
      {items.map((resource) => (
        <li key={resource.id} className="record">
          <div className="record-head">
            <div>
              <h3>{formatAmount(resource.amount, resource.currency)}</h3>
              <p className="meta">
                {INSTRUMENT_LABEL[resource.instrument]} · {resource.funder}
              </p>
            </div>
            <Chip tone="slate">{INSTRUMENT_LABEL[resource.instrument]}</Chip>
          </div>
          {resource.termsNote && (
            <p className="note-line">
              <span className="note-label">Terms:</span> {resource.termsNote}
            </p>
          )}
          <p className="meta">
            Approved by {actorMap[resource.approvedBy]?.name ?? shortId(resource.approvedBy)} ·{" "}
            {formatDate(resource.approvedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

const EXECUTION_TONE: Record<Execution["status"], "neutral" | "moss" | "ochre" | "clay" | "slate"> = {
  planned: "neutral",
  in_progress: "ochre",
  completed: "moss",
  failed: "clay",
  abandoned: "clay",
};

export function ExecutionList({
  items,
  actorMap,
  canUpdate,
  onUpdate,
}: {
  items: Execution[];
  actorMap: ActorMap;
  canUpdate: boolean;
  onUpdate: (execution: Execution) => void;
}) {
  if (items.length === 0) return <Empty>No execution record opened.</Empty>;
  return (
    <ul className="record-list">
      {items.map((execution) => (
        <li key={execution.id} className="record">
          <div className="record-head">
            <div>
              <h3>
                {formatDate(execution.startedAt)} → {execution.endedAt ? formatDate(execution.endedAt) : "ongoing"}
              </h3>
              <p className="meta">
                Implementer: {actorMap[execution.implementerId]?.name ?? shortId(execution.implementerId)}
              </p>
            </div>
            <div className="record-actions">
              <Chip tone={EXECUTION_TONE[execution.status]}>{execution.status.replace("_", " ")}</Chip>
              {canUpdate && (
                <Button size="sm" variant="secondary" onClick={() => onUpdate(execution)}>
                  Update
                </Button>
              )}
            </div>
          </div>
          {execution.workPerformed && <p>{execution.workPerformed}</p>}
          {execution.deviations && (
            <p className="deviation">
              <span className="note-label">Deviations:</span> {execution.deviations}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

const CLASSIFICATION_TONE: Record<Outcome["classification"], "moss" | "ochre" | "clay" | "slate"> = {
  observed: "moss",
  estimated: "ochre",
  attributed: "clay",
  uncertain: "slate",
};

export function OutcomeList({ items, actorMap }: { items: Outcome[]; actorMap: ActorMap }) {
  if (items.length === 0) return <Empty>No outcome measured. Verification requires a measurement against the baseline.</Empty>;
  return (
    <ul className="record-list">
      {items.map((outcome) => {
        const delta =
          outcome.baselineValue !== null ? outcome.value - outcome.baselineValue : null;
        return (
          <li key={outcome.id} className="record outcome-record">
            <div className="record-head">
              <div>
                <h3>{outcome.metric}</h3>
                <p className="meta">Measured {formatDate(outcome.measuredAt)}</p>
              </div>
              <Chip tone={CLASSIFICATION_TONE[outcome.classification]}>{outcome.classification}</Chip>
            </div>
            <div className="outcome-value">
              <strong>{formatNumber(outcome.value)}</strong>
              <span>{outcome.unit}</span>
              {outcome.baselineValue !== null && (
                <span className="outcome-delta">
                  Baseline {formatNumber(outcome.baselineValue)} → recorded change{" "}
                  {delta !== null && delta > 0 ? "+" : ""}
                  {formatNumber(delta)} {outcome.unit}
                  <em> (recorded change, not an attribution)</em>
                </span>
              )}
            </div>
            <dl className="definition-list">
              <dt>Method</dt>
              <dd>{outcome.method}</dd>
              <dt>Baseline comparison</dt>
              <dd>{outcome.baselineNote}</dd>
              <dt>Uncertainty</dt>
              <dd>{outcome.uncertaintyNote}</dd>
              {outcome.attributionMethod && (
                <>
                  <dt>Attribution method</dt>
                  <dd>{outcome.attributionMethod}</dd>
                </>
              )}
            </dl>
            <p className="meta">
              Verified by {actorMap[outcome.verifierId]?.name ?? shortId(outcome.verifierId)} ·{" "}
              {actorMap[outcome.verifierId]?.organization ?? "—"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CorrectionList({
  items,
  actorMap,
  canResolve,
  onResolve,
}: {
  items: Correction[];
  actorMap: ActorMap;
  canResolve: boolean;
  onResolve: (correction: Correction) => void;
}) {
  if (items.length === 0) return <Empty>No corrections raised. Corrections are how the record admits error.</Empty>;
  return (
    <ul className="record-list compact">
      {items.map((correction) => (
        <li key={correction.id} className="record">
          <div className="record-head">
            <div>
              <h3>{correction.targetType}</h3>
              <p className="meta">
                Raised by {actorMap[correction.raisedBy]?.name ?? shortId(correction.raisedBy)} ·{" "}
                {formatDate(correction.raisedAt)}
                {correction.targetId ? ` · record ${shortId(correction.targetId)}` : ""}
              </p>
            </div>
            <div className="record-actions">
              <Chip tone={correction.status === "open" ? "clay" : "moss"}>{correction.status}</Chip>
              {correction.status === "open" && canResolve && (
                <Button size="sm" onClick={() => onResolve(correction)}>
                  Resolve
                </Button>
              )}
            </div>
          </div>
          <p>{correction.description}</p>
          {correction.resolution && (
            <p className="review-note">
              <span className="note-label">Resolution:</span> {correction.resolution} ·{" "}
              {actorMap[correction.resolvedBy ?? ""]?.name ?? ""} {formatDate(correction.resolvedAt)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LessonList({ items, actorMap }: { items: Lesson[]; actorMap: ActorMap }) {
  if (items.length === 0) return <Empty>No lesson recorded yet.</Empty>;
  return (
    <ul className="record-list">
      {items.map((lesson) => (
        <li key={lesson.id} className="record">
          <div className="record-head">
            <div>
              <h3>Lesson</h3>
              <p className="meta">
                {actorMap[lesson.recordedBy]?.name ?? shortId(lesson.recordedBy)} · {formatDate(lesson.recordedAt)}
              </p>
            </div>
          </div>
          <p>{lesson.summary}</p>
          <dl className="definition-list">
            {lesson.whatWorked && (
              <>
                <dt>What worked</dt>
                <dd>{lesson.whatWorked}</dd>
              </>
            )}
            {lesson.whatDidnt && (
              <>
                <dt>What did not work</dt>
                <dd>{lesson.whatDidnt}</dd>
              </>
            )}
            {lesson.changes && (
              <>
                <dt>Next time</dt>
                <dd>{lesson.changes}</dd>
              </>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function parseFindings(content: string): { findings: OracleFinding[]; method?: string; note?: string } {
  try {
    const parsed = JSON.parse(content) as { findings?: OracleFinding[]; method?: string; note?: string };
    return { findings: parsed.findings ?? [], method: parsed.method, note: parsed.note };
  } catch {
    return { findings: [{ severity: "low", message: content }] };
  }
}

export function ContributionList({
  items,
  actorMap,
  canReview,
  onReview,
}: {
  items: AgentContribution[];
  actorMap: ActorMap;
  canReview: boolean;
  onReview: (contribution: AgentContribution) => void;
}) {
  if (items.length === 0) return <Empty>No agent output recorded.</Empty>;
  return (
    <ul className="record-list">
      {items.map((contribution) => {
        const parsed = parseFindings(contribution.content);
        return (
          <li key={contribution.id} className="record agent-record">
            <div className="record-head">
              <div>
                <h3>
                  {actorMap[contribution.agentId]?.name ?? shortId(contribution.agentId)} · {contribution.kind.replace(/_/g, " ")}
                </h3>
                <p className="meta">
                  {formatDateTime(contribution.createdAt)}
                  {contribution.requestedBy
                    ? ` · requested by ${actorMap[contribution.requestedBy]?.name ?? shortId(contribution.requestedBy)}`
                    : ""}
                  {parsed.method ? ` · ${parsed.method}` : ""}
                </p>
              </div>
              <Chip tone={contribution.status === "pending" ? "ochre" : contribution.status === "accepted" ? "moss" : "clay"}>
                {contribution.status}
              </Chip>
            </div>
            <ul className="findings">
              {parsed.findings.map((finding, index) => (
                <li key={index} className={`finding severity-${finding.severity}`}>
                  <span className="severity-dot" aria-hidden="true" />
                  <span>
                    <span className="severity-label">{finding.severity}</span> {finding.message}
                  </span>
                </li>
              ))}
            </ul>
            {parsed.note && <p className="meta italic">{parsed.note}</p>}
            <div className="record-foot">
              <span className="meta">
                {contribution.reviewedBy
                  ? `Reviewed by ${actorMap[contribution.reviewedBy]?.name ?? shortId(contribution.reviewedBy)} ${formatDate(contribution.reviewedAt)}`
                  : "Awaiting human review. Agent output does not change the decision."}
              </span>
              {contribution.status === "pending" && canReview && (
                <Button size="sm" variant="secondary" onClick={() => onReview(contribution)}>
                  Review output
                </Button>
              )}
            </div>
            {contribution.reviewNote && <p className="review-note">Review note: {contribution.reviewNote}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityLog({ events, actorMap }: { events: AuditEvent[]; actorMap: ActorMap }) {
  const [expanded, setExpanded] = useState(false);
  if (events.length === 0) return <Empty>No activity recorded.</Empty>;
  const shown = expanded ? events : events.slice(0, 12);
  return (
    <div>
      <ol className="activity">
        {shown.map((event) => (
          <li key={event.id}>
            <span className="activity-time">{formatDateTime(event.createdAt)}</span>
            <span className="activity-actor">{actorMap[event.actorId]?.name ?? shortId(event.actorId)}</span>
            <span className="activity-summary">{event.summary}</span>
          </li>
        ))}
      </ol>
      {events.length > 12 && (
        <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show fewer" : `Show all ${events.length} events`}
        </Button>
      )}
    </div>
  );
}

export function DecisionHeaderMeta({
  placeName,
  geo,
  createdBy,
  createdAt,
  synthetic,
}: {
  placeName: string | null;
  geo: { coordinates: [number, number] } | null;
  createdBy: string;
  createdAt: string;
  synthetic: boolean;
}) {
  return (
    <p className="decision-meta">
      {placeName ?? "Place not recorded"}
      {geo ? ` · ${coordLabel(geo)}` : ""} · opened by {createdBy} {formatDate(createdAt)}
      {synthetic && <Chip tone="outline">Synthetic record</Chip>}
    </p>
  );
}

export function actorName(actorMap: ActorMap, id: string): string {
  return actorLabel(actorMap[id]);
}
