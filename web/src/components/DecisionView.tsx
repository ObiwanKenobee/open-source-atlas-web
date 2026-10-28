import { useMemo, useState } from "react";
import type {
  Actor,
  Alternative,
  Correction,
  DecisionPayload,
  Evidence,
  Execution,
  AgentContribution,
} from "@shared/types";
import { api, errorMessage } from "../lib/api";
import { actorLabel, formatDate, formatNumber, shortId } from "../lib/format";
import { Button, Chip, InlineNote, Section, StatusChip } from "./Common";
import {
  AlternativeForm,
  AuthorizationForm,
  CorrectionForm,
  DecisionEditForm,
  EvidenceForm,
  ExecutionForm,
  ExecutionUpdateForm,
  LessonForm,
  ObservationForm,
  OutcomeForm,
  ResourceForm,
  ResolveCorrectionForm,
  ReviewForm,
  SelectAlternativeForm,
  type CorrectionTarget,
} from "./Forms";
import { ReadinessPanel } from "./ReadinessPanel";
import { StageRail } from "./StageRail";
import {
  ActivityLog,
  AlternativeList,
  AuthorizationList,
  ContributionList,
  CorrectionList,
  EvidenceList,
  ExecutionList,
  LessonList,
  ObservationList,
  OutcomeList,
  ResourceList,
  type ActorMap,
} from "./Records";

type ModalState =
  | { kind: "edit" }
  | { kind: "observation" }
  | { kind: "evidence" }
  | { kind: "alternative" }
  | { kind: "selectAlternative"; alternative: Alternative }
  | { kind: "authorization" }
  | { kind: "resource" }
  | { kind: "execution" }
  | { kind: "updateExecution"; execution: Execution }
  | { kind: "outcome" }
  | { kind: "correction" }
  | { kind: "resolveCorrection"; correction: Correction }
  | { kind: "lesson" }
  | { kind: "reviewEvidence"; evidence: Evidence }
  | { kind: "reviewContribution"; contribution: AgentContribution }
  | null;

export function DecisionView({
  payload,
  actors,
  actingActor,
  onRefresh,
  notify,
  onError,
}: {
  payload: DecisionPayload;
  actors: Actor[];
  actingActor: Actor;
  onRefresh: () => void;
  notify: (message: string) => void;
  onError: (error: unknown) => void;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [scanning, setScanning] = useState(false);

  const actorMap = useMemo<ActorMap>(
    () => Object.fromEntries(actors.map((actor) => [actor.id, actor])),
    [actors],
  );

  const { decision, permissions, readiness } = payload;
  const accepted = payload.evidence.filter((item) => item.status === "accepted").length;
  const proposed = payload.evidence.filter((item) => item.status === "proposed").length;
  const close = () => setModal(null);
  const success = (message: string) => {
    setModal(null);
    onRefresh();
    notify(message);
  };

  const correctionTargets: CorrectionTarget[] = [
    { value: "decision", label: "The decision itself" },
    ...payload.evidence.map((item) => ({ value: `evidence:${item.id}`, label: `Evidence — ${item.title}` })),
    ...payload.alternatives.map((item) => ({ value: `alternative:${item.id}`, label: `Alternative — ${item.name}` })),
    ...payload.executions.map((item) => ({
      value: `execution:${item.id}`,
      label: `Execution — ${formatDate(item.startedAt)}`,
    })),
    ...payload.outcomes.map((item) => ({ value: `outcome:${item.id}`, label: `Outcome — ${item.metric}` })),
  ];

  async function advance() {
    if (!readiness.next) return;
    setTransitioning(true);
    try {
      await api.transition(decision.id, readiness.next);
      onRefresh();
      notify(`Advanced to ${readiness.next}. The stage change is in the audit log.`);
    } catch (error) {
      onError(error);
    } finally {
      setTransitioning(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      await api.runOracleScan(decision.id);
      onRefresh();
      notify("Oracle scan recorded as an agent contribution. A person must review it.");
    } catch (error) {
      onError(error);
    } finally {
      setScanning(false);
    }
  }

  const roleHint = (allowed: boolean, roles: string) =>
    allowed ? "" : ` Acting as ${actorLabel(actingActor)}. ${roles}`;

  return (
    <div>
      <header className="decision-header">
        <div className="crumbs">Decision workspace · {shortId(decision.id)}</div>
        <div className="title-row">
          <h1>{decision.title}</h1>
          <StatusChip status={decision.status} />
          {decision.synthetic && <Chip tone="outline">Synthetic</Chip>}
        </div>
        <p className="decision-meta">
          {decision.placeName ?? "Place not recorded"} · opened by{" "}
          {actorMap[decision.createdBy]?.name ?? shortId(decision.createdBy)} {formatDate(decision.createdAt)}
          {decision.baselineLockedAt ? ` · baseline locked ${formatDate(decision.baselineLockedAt)}` : ""}
        </p>
        <div className="header-actions">
          <a className="btn btn-secondary btn-md" href={api.exportUrl(decision.id)} download>
            Export record (JSON)
          </a>
        </div>
      </header>

      <StageRail current={decision.status} />

      <div className="workspace-grid">
        <div className="workspace-main">
          <Section
            index="01"
            title="Problem and baseline"
            subtitle="The condition, the people affected, and the pre-intervention measurement. The baseline locks when analysis begins."
            actions={
              permissions.editDecision ? (
                <Button size="sm" onClick={() => setModal({ kind: "edit" })}>
                  Edit record
                </Button>
              ) : null
            }
          >
            <dl className="definition-list two-col">
              <dt>Place</dt>
              <dd>{decision.placeName ?? "—"}</dd>
              <dt>Affected population</dt>
              <dd>{decision.affectedPopulation ?? "—"}</dd>
              <dt>Problem</dt>
              <dd>{decision.problemStatement ?? "—"}</dd>
              <dt>Baseline</dt>
              <dd>
                {decision.baselineValue !== null
                  ? `${formatNumber(decision.baselineValue)} ${decision.baselineUnit ?? ""} — ${decision.baselineMetric ?? ""}`
                  : "Not recorded"}
              </dd>
              <dt>Measurement method</dt>
              <dd>{decision.baselineMethod ?? "—"}</dd>
              <dt>Observed</dt>
              <dd>{formatDate(decision.baselineObservedAt)}</dd>
            </dl>
            {!decision.baselineMetric && (
              <InlineNote tone="ochre">
                The baseline is incomplete. Impact cannot be assessed without a pre-intervention measurement, and the
                gate to understanding will block.
              </InlineNote>
            )}
          </Section>

          <Section
            index="02"
            title="Evidence"
            subtitle={`${accepted} accepted · ${proposed} proposed. Evidence counts only after a second person reviews it.${roleHint(
              permissions.addEvidence,
              "Only an analyst or steward may add evidence.",
            )}`}
            actions={
              permissions.addEvidence ? (
                <Button size="sm" onClick={() => setModal({ kind: "evidence" })}>
                  Propose evidence
                </Button>
              ) : null
            }
          >
            <EvidenceList
              items={payload.evidence}
              actorMap={actorMap}
              actor={actingActor}
              canReview={permissions.reviewEvidence}
              onReview={(evidence) => setModal({ kind: "reviewEvidence", evidence })}
            />
          </Section>

          <Section
            index="03"
            title="Observations"
            subtitle={`What was seen or heard in the field, with method and limitations.${roleHint(
              permissions.addObservation,
              "Only an analyst or steward may record observations.",
            )}`}
            actions={
              permissions.addObservation ? (
                <Button size="sm" onClick={() => setModal({ kind: "observation" })}>
                  Add observation
                </Button>
              ) : null
            }
          >
            <ObservationList items={payload.observations} actorMap={actorMap} />
          </Section>

          <Section
            index="04"
            title="Alternatives"
            subtitle={`Feasible options with costs, benefits, risks, and uncertainties.${roleHint(
              permissions.addAlternative,
              "Alternatives can be edited by an analyst or steward before authorization.",
            )}`}
            actions={
              permissions.addAlternative ? (
                <Button size="sm" onClick={() => setModal({ kind: "alternative" })}>
                  Add alternative
                </Button>
              ) : null
            }
          >
            <AlternativeList
              items={payload.alternatives}
              canSelect={permissions.selectAlternative}
              onSelect={(alternative) => setModal({ kind: "selectAlternative", alternative })}
            />
          </Section>

          <Section
            index="05"
            title="Authorization"
            subtitle={`Who approved what, under which conditions, with which declared conflicts.${roleHint(
              permissions.createAuthorization,
              "Only a person with the authorizer role may record this, at the evaluated stage.",
            )}`}
            actions={
              permissions.createAuthorization ? (
                <Button size="sm" variant="primary" onClick={() => setModal({ kind: "authorization" })}>
                  Record authorization
                </Button>
              ) : null
            }
          >
            <AuthorizationList items={payload.authorizations} actorMap={actorMap} />
          </Section>

          <Section
            index="06"
            title="Resources"
            subtitle={`Committed funds and support, with instruments distinguished.${roleHint(
              permissions.createResource,
              "Only an authorizer or steward may approve resources once authorized.",
            )}`}
            actions={
              permissions.createResource ? (
                <Button size="sm" onClick={() => setModal({ kind: "resource" })}>
                  Record commitment
                </Button>
              ) : null
            }
          >
            <ResourceList items={payload.resources} actorMap={actorMap} />
          </Section>

          <Section
            index="07"
            title="Execution"
            subtitle={`Work performed, including deviations and failures.${roleHint(
              permissions.createExecution,
              "Only an implementer or steward may open or update execution records.",
            )}`}
            actions={
              permissions.createExecution ? (
                <Button size="sm" onClick={() => setModal({ kind: "execution" })}>
                  Open execution
                </Button>
              ) : null
            }
          >
            <ExecutionList
              items={payload.executions}
              actorMap={actorMap}
              canUpdate={permissions.updateExecution}
              onUpdate={(execution) => setModal({ kind: "updateExecution", execution })}
            />
          </Section>

          <Section
            index="08"
            title="Outcomes"
            subtitle={`What changed relative to the baseline, classified honestly.${roleHint(
              permissions.createOutcome,
              "Only a person with the verifier role may record outcomes.",
            )}`}
            actions={
              permissions.createOutcome ? (
                <Button size="sm" onClick={() => setModal({ kind: "outcome" })}>
                  Record outcome
                </Button>
              ) : null
            }
          >
            <div className="legend">
              <Chip tone="moss">observed</Chip> measured directly
              <Chip tone="ochre">estimated</Chip> modelled or inferred
              <Chip tone="clay">attributed</Chip> causal claim with a method
              <Chip tone="slate">uncertain</Chip> evidence insufficient
            </div>
            <OutcomeList items={payload.outcomes} actorMap={actorMap} />
          </Section>

          <Section
            index="09"
            title="Corrections"
            subtitle="Challenges, appeals, and corrections are appended, never overwritten. Learning requires all corrections resolved."
            actions={
              permissions.addCorrection ? (
                <Button size="sm" onClick={() => setModal({ kind: "correction" })}>
                  Raise correction
                </Button>
              ) : null
            }
          >
            <CorrectionList
              items={payload.corrections}
              actorMap={actorMap}
              canResolve={permissions.resolveCorrection}
              onResolve={(correction) => setModal({ kind: "resolveCorrection", correction })}
            />
          </Section>

          <Section
            index="10"
            title="Learning"
            subtitle={`What the record shows should change next time.${roleHint(
              permissions.addLesson,
              "Only a steward may record lessons after verification.",
            )}`}
            actions={
              permissions.addLesson ? (
                <Button size="sm" onClick={() => setModal({ kind: "lesson" })}>
                  Record lesson
                </Button>
              ) : null
            }
          >
            <LessonList items={payload.lessons} actorMap={actorMap} />
          </Section>

          <Section
            index="11"
            title="Agent review"
            subtitle={`Bounded analytical assistants. Output is advisory, labelled, and requires human review. Oracle here uses deterministic rules, not a language model.${roleHint(
              permissions.runOracleScan,
              "Only an analyst or steward may request a scan.",
            )}`}
            actions={
              permissions.runOracleScan ? (
                <Button size="sm" onClick={runScan} disabled={scanning}>
                  {scanning ? "Scanning…" : "Run Oracle scan"}
                </Button>
              ) : null
            }
          >
            <ContributionList
              items={payload.contributions}
              actorMap={actorMap}
              canReview={permissions.reviewContribution}
              onReview={(contribution) => setModal({ kind: "reviewContribution", contribution })}
            />
          </Section>

          <Section index="12" title="Activity log" subtitle="Append-only record of actions on this decision, newest first.">
            <ActivityLog events={payload.events} actorMap={actorMap} />
          </Section>
        </div>

        <ReadinessPanel readiness={readiness} onAdvance={advance} busy={transitioning} />
      </div>

      {modal?.kind === "edit" && (
        <DecisionEditForm decision={decision} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "observation" && (
        <ObservationForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "evidence" && (
        <EvidenceForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "alternative" && (
        <AlternativeForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "selectAlternative" && (
        <SelectAlternativeForm
          alternative={modal.alternative}
          onClose={close}
          onSuccess={success}
        />
      )}
      {modal?.kind === "authorization" && (
        <AuthorizationForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "resource" && (
        <ResourceForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "execution" && (
        <ExecutionForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "updateExecution" && (
        <ExecutionUpdateForm execution={modal.execution} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "outcome" && (
        <OutcomeForm
          decisionId={decision.id}
          baselineMetric={decision.baselineMetric}
          baselineUnit={decision.baselineUnit}
          baselineValue={decision.baselineValue}
          onClose={close}
          onSuccess={success}
        />
      )}
      {modal?.kind === "correction" && (
        <CorrectionForm
          decisionId={decision.id}
          targets={correctionTargets}
          onClose={close}
          onSuccess={success}
        />
      )}
      {modal?.kind === "resolveCorrection" && (
        <ResolveCorrectionForm correction={modal.correction} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "lesson" && (
        <LessonForm decisionId={decision.id} onClose={close} onSuccess={success} />
      )}
      {modal?.kind === "reviewEvidence" && (
        <ReviewForm
          title={`Review evidence: ${modal.evidence.title}`}
          subtitle="Accepting adds this source to the evidence base. Rejecting keeps it on record as rejected."
          onClose={close}
          onSubmit={(status, note) => api.reviewEvidence(modal.evidence.id, { status, note })}
          onSuccess={success}
        />
      )}
      {modal?.kind === "reviewContribution" && (
        <ReviewForm
          title="Review agent output"
          subtitle="A person must accept or reject agent findings. Reviewing changes no stage or measured value."
          onClose={close}
          onSubmit={(status, note) => api.reviewContribution(modal.contribution.id, { status, note })}
          onSuccess={success}
        />
      )}
    </div>
  );
}
