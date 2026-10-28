import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type {
  Alternative,
  Correction,
  Decision,
  Execution,
  Instrument,
  OutcomeClassification,
} from "@shared/types";
import { api, errorMessage } from "../lib/api";
import { formatDate, today } from "../lib/format";
import { Button, Field, FormError, Modal } from "./Common";

type Change = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

interface FormProps {
  decisionId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function useSubmission(onSuccess: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSuccess(message);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function FormShell({
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel,
  busy,
  error,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  children: ReactNode;
  wide?: boolean;
}) {
  const formId = useId();
  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      wide={wide}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={busy}>
            {busy ? "Recording…" : submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="form-grid" onSubmit={onSubmit}>
        {children}
        <FormError message={error} />
      </form>
    </Modal>
  );
}

const numberOrNull = (value: string): number | null => (value.trim() === "" ? null : Number(value));
const textOrNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export function DecisionForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [fields, setFields] = useState({
    title: "",
    placeName: "",
    problemStatement: "",
    affectedPopulation: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Open a decision"
      subtitle="Start with a place and a problem. Baseline, evidence, and alternatives come next."
      onClose={onClose}
      submitLabel="Open decision"
      busy={busy}
      error={error}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const created = await api.createDecision({
            title: fields.title,
            placeName: textOrNull(fields.placeName),
            problemStatement: textOrNull(fields.problemStatement),
            affectedPopulation: textOrNull(fields.affectedPopulation),
          });
          onSuccess(created.id);
        } catch (caught) {
          setError(errorMessage(caught));
          setBusy(false);
        }
      }}
    >
      <Field label="Title" required full>
        <input className="input" value={fields.title} onChange={set("title")} autoFocus />
      </Field>
      <Field label="Place" full>
        <input className="input" value={fields.placeName} onChange={set("placeName")} />
      </Field>
      <Field label="Problem statement" hint="What condition requires attention, and for whom?" full>
        <textarea className="input" rows={3} value={fields.problemStatement} onChange={set("problemStatement")} />
      </Field>
      <Field label="Affected population" full>
        <textarea className="input" rows={2} value={fields.affectedPopulation} onChange={set("affectedPopulation")} />
      </Field>
    </FormShell>
  );
}

export function DecisionEditForm({
  decision,
  onClose,
  onSuccess,
}: {
  decision: Decision;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const locked = Boolean(decision.baselineLockedAt);
  const [fields, setFields] = useState({
    title: decision.title,
    placeName: decision.placeName ?? "",
    problemStatement: decision.problemStatement ?? "",
    affectedPopulation: decision.affectedPopulation ?? "",
    baselineMetric: decision.baselineMetric ?? "",
    baselineValue: decision.baselineValue === null ? "" : String(decision.baselineValue),
    baselineUnit: decision.baselineUnit ?? "",
    baselineMethod: decision.baselineMethod ?? "",
    baselineObservedAt: decision.baselineObservedAt ?? "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Edit decision record"
      subtitle={
        locked
          ? `Baseline locked ${formatDate(decision.baselineLockedAt)}. Descriptive fields can still be clarified; measured values cannot be rewritten.`
          : "The baseline may be edited only while the decision is in draft."
      }
      onClose={onClose}
      submitLabel="Save changes"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        const payload: Record<string, unknown> = {
          title: fields.title,
          placeName: fields.placeName,
          problemStatement: fields.problemStatement,
          affectedPopulation: fields.affectedPopulation,
        };
        if (!locked) {
          Object.assign(payload, {
            baselineMetric: fields.baselineMetric,
            baselineValue: numberOrNull(fields.baselineValue),
            baselineUnit: fields.baselineUnit,
            baselineMethod: fields.baselineMethod,
            baselineObservedAt: fields.baselineObservedAt || null,
          });
        }
        run(() => api.updateDecision(decision.id, payload), "Decision record updated.");
      }}
    >
      <Field label="Title" required full>
        <input className="input" value={fields.title} onChange={set("title")} />
      </Field>
      <Field label="Place" full>
        <input className="input" value={fields.placeName} onChange={set("placeName")} />
      </Field>
      <Field label="Problem statement" full>
        <textarea className="input" rows={3} value={fields.problemStatement} onChange={set("problemStatement")} />
      </Field>
      <Field label="Affected population" full>
        <textarea className="input" rows={2} value={fields.affectedPopulation} onChange={set("affectedPopulation")} />
      </Field>
      <div className="form-divider">Baseline</div>
      <Field label="Metric" required={!locked}>
        <input className="input" value={fields.baselineMetric} onChange={set("baselineMetric")} disabled={locked} />
      </Field>
      <Field label="Value" required={!locked}>
        <input
          className="input"
          type="number"
          step="any"
          value={fields.baselineValue}
          onChange={set("baselineValue")}
          disabled={locked}
        />
      </Field>
      <Field label="Unit" required={!locked}>
        <input className="input" value={fields.baselineUnit} onChange={set("baselineUnit")} disabled={locked} />
      </Field>
      <Field label="Observed on" required={!locked}>
        <input
          className="input"
          type="date"
          value={fields.baselineObservedAt}
          onChange={set("baselineObservedAt")}
          disabled={locked}
        />
      </Field>
      <Field label="Measurement method" required={!locked} full>
        <textarea className="input" rows={2} value={fields.baselineMethod} onChange={set("baselineMethod")} disabled={locked} />
      </Field>
    </FormShell>
  );
}

export function ObservationForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({
    observedAt: today(),
    method: "",
    valueText: "",
    sourceRef: "",
    limitations: "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Record an observation"
      subtitle="What was observed, by whom, using which method, and with what limitations?"
      onClose={onClose}
      submitLabel="Record observation"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addObservation(decisionId, {
              observedAt: fields.observedAt,
              method: fields.method,
              valueText: fields.valueText,
              sourceRef: textOrNull(fields.sourceRef),
              limitations: textOrNull(fields.limitations),
            }),
          "Observation recorded.",
        );
      }}
    >
      <Field label="Observed on" required>
        <input className="input" type="date" value={fields.observedAt} onChange={set("observedAt")} />
      </Field>
      <Field label="Method" required>
        <input className="input" value={fields.method} onChange={set("method")} placeholder="Site visit, log review…" />
      </Field>
      <Field label="What was observed" required full>
        <textarea className="input" rows={3} value={fields.valueText} onChange={set("valueText")} />
      </Field>
      <Field label="Source reference" full>
        <input className="input" value={fields.sourceRef} onChange={set("sourceRef")} />
      </Field>
      <Field label="Limitations" full>
        <textarea className="input" rows={2} value={fields.limitations} onChange={set("limitations")} />
      </Field>
    </FormShell>
  );
}

export function EvidenceForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({
    title: "",
    sourceType: "dataset",
    sourceRef: "",
    publishedAt: "",
    independenceNote: "",
    limitations: "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Propose evidence"
      subtitle="Evidence is counted only after a second person reviews it. Record how independent the source is."
      onClose={onClose}
      submitLabel="Propose evidence"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addEvidence(decisionId, {
              title: fields.title,
              sourceType: fields.sourceType,
              sourceRef: fields.sourceRef,
              publishedAt: textOrNull(fields.publishedAt),
              independenceNote: textOrNull(fields.independenceNote),
              limitations: textOrNull(fields.limitations),
            }),
          "Evidence proposed. A second person must review it.",
        );
      }}
    >
      <Field label="Title" required full>
        <input className="input" value={fields.title} onChange={set("title")} />
      </Field>
      <Field label="Source type" required>
        <select className="input" value={fields.sourceType} onChange={set("sourceType")}>
          <option value="dataset">Dataset</option>
          <option value="report">Report</option>
          <option value="field_measurement">Field measurement</option>
          <option value="interview">Interview</option>
          <option value="administrative_record">Administrative record</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Published" >
        <input className="input" type="date" value={fields.publishedAt} onChange={set("publishedAt")} />
      </Field>
      <Field label="Source reference" required full>
        <input className="input" value={fields.sourceRef} onChange={set("sourceRef")} placeholder="Dataset name, document number, URL…" />
      </Field>
      <Field
        label="Independence assessment"
        hint="Who produced this? Do they share an author, funder, or interest with the intervention?"
        full
      >
        <textarea className="input" rows={2} value={fields.independenceNote} onChange={set("independenceNote")} />
      </Field>
      <Field label="Limitations" full>
        <textarea className="input" rows={2} value={fields.limitations} onChange={set("limitations")} />
      </Field>
    </FormShell>
  );
}

export function AlternativeForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({
    name: "",
    description: "",
    estCostAmount: "",
    estCostCurrency: "KES",
    expectedBenefit: "",
    risks: "",
    uncertainties: "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Add an alternative"
      subtitle="A decision with no compared options cannot show that it was reasoned."
      onClose={onClose}
      submitLabel="Add alternative"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addAlternative(decisionId, {
              name: fields.name,
              description: fields.description,
              estCostAmount: numberOrNull(fields.estCostAmount),
              estCostCurrency: textOrNull(fields.estCostCurrency),
              expectedBenefit: textOrNull(fields.expectedBenefit),
              risks: textOrNull(fields.risks),
              uncertainties: textOrNull(fields.uncertainties),
            }),
          "Alternative added.",
        );
      }}
    >
      <Field label="Name" required full>
        <input className="input" value={fields.name} onChange={set("name")} />
      </Field>
      <Field label="Description" required full>
        <textarea className="input" rows={2} value={fields.description} onChange={set("description")} />
      </Field>
      <Field label="Estimated cost">
        <input className="input" type="number" step="any" value={fields.estCostAmount} onChange={set("estCostAmount")} />
      </Field>
      <Field label="Currency">
        <select className="input" value={fields.estCostCurrency} onChange={set("estCostCurrency")}>
          <option value="KES">KES</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </Field>
      <Field label="Expected benefit" full>
        <textarea className="input" rows={2} value={fields.expectedBenefit} onChange={set("expectedBenefit")} />
      </Field>
      <Field label="Risks" full>
        <textarea className="input" rows={2} value={fields.risks} onChange={set("risks")} />
      </Field>
      <Field label="Uncertainties" hint="What could make this option fail or make its benefits smaller than modelled?" full>
        <textarea className="input" rows={2} value={fields.uncertainties} onChange={set("uncertainties")} />
      </Field>
    </FormShell>
  );
}

export function SelectAlternativeForm({
  alternative,
  onClose,
  onSuccess,
}: Omit<FormProps, "decisionId"> & { alternative: Alternative }) {
  const [fields, setFields] = useState({
    selectionRationale: alternative.selectionRationale ?? "",
    uncertainties: alternative.uncertainties ?? "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title={`Select “${alternative.name}”`}
      subtitle="Selecting one option deselects the others. Record why, and what remains uncertain."
      onClose={onClose}
      submitLabel="Record selection"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.updateAlternative(alternative.id, {
              selected: true,
              selectionRationale: fields.selectionRationale,
              uncertainties: fields.uncertainties,
            }),
          "Alternative selected.",
        );
      }}
    >
      <Field label="Selection rationale" required full>
        <textarea
          className="input"
          rows={4}
          value={fields.selectionRationale}
          onChange={set("selectionRationale")}
          placeholder="Why this option, compared with the others?"
        />
      </Field>
      <Field label="Uncertainties" required full>
        <textarea className="input" rows={3} value={fields.uncertainties} onChange={set("uncertainties")} />
      </Field>
    </FormShell>
  );
}

export function AuthorizationForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({ scope: "", conditions: "", coiDeclaration: "" });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Record authorization"
      subtitle="This action attaches your name, role, scope, conditions, and conflict-of-interest declaration to the decision."
      onClose={onClose}
      submitLabel="Record authorization"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        run(() => api.addAuthorization(decisionId, fields), "Authorization recorded.");
      }}
    >
      <Field label="Scope" required hint="What exactly is approved, and up to what limit?" full>
        <textarea className="input" rows={3} value={fields.scope} onChange={set("scope")} />
      </Field>
      <Field label="Conditions" required hint="Reporting, milestone checks, change control, grievance channels." full>
        <textarea className="input" rows={3} value={fields.conditions} onChange={set("conditions")} />
      </Field>
      <Field label="Conflict-of-interest declaration" required full>
        <textarea className="input" rows={2} value={fields.coiDeclaration} onChange={set("coiDeclaration")} />
      </Field>
    </FormShell>
  );
}

export function ResourceForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({
    instrument: "grant" as Instrument,
    amount: "",
    currency: "KES",
    funder: "",
    termsNote: "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  const inKind = fields.instrument === "in_kind";

  return (
    <FormShell
      title="Record a resource commitment"
      subtitle="Grants, donations, loans, investments, and in-kind support carry different obligations."
      onClose={onClose}
      submitLabel="Record commitment"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addResource(decisionId, {
              instrument: fields.instrument,
              amount: inKind ? null : numberOrNull(fields.amount),
              currency: inKind ? null : fields.currency,
              funder: fields.funder,
              termsNote: textOrNull(fields.termsNote),
            }),
          "Resource commitment recorded.",
        );
      }}
    >
      <Field label="Instrument" required>
        <select className="input" value={fields.instrument} onChange={set("instrument")}>
          <option value="grant">Grant</option>
          <option value="donation">Donation</option>
          <option value="loan">Loan</option>
          <option value="investment">Investment</option>
          <option value="in_kind">In kind</option>
        </select>
      </Field>
      <Field label={inKind ? "Value (not asserted)" : "Amount"} required={!inKind}>
        <input
          className="input"
          type="number"
          step="any"
          value={fields.amount}
          onChange={set("amount")}
          disabled={inKind}
        />
      </Field>
      <Field label="Currency" required={!inKind}>
        <select className="input" value={fields.currency} onChange={set("currency")} disabled={inKind}>
          <option value="KES">KES</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </Field>
      <Field label="Funder / provider" required>
        <input className="input" value={fields.funder} onChange={set("funder")} />
      </Field>
      <Field label="Terms and conditions" full>
        <textarea className="input" rows={2} value={fields.termsNote} onChange={set("termsNote")} />
      </Field>
    </FormShell>
  );
}

export function ExecutionForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({
    startedAt: today(),
    workPerformed: "",
    deviations: "",
    status: "in_progress" as "planned" | "in_progress",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Open an execution record"
      subtitle="You are recorded as the implementer for this work."
      onClose={onClose}
      submitLabel="Open execution"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addExecution(decisionId, {
              startedAt: fields.startedAt,
              workPerformed: textOrNull(fields.workPerformed),
              deviations: textOrNull(fields.deviations),
              status: fields.status,
            }),
          "Execution record opened.",
        );
      }}
    >
      <Field label="Started on" required>
        <input className="input" type="date" value={fields.startedAt} onChange={set("startedAt")} />
      </Field>
      <Field label="Status">
        <select className="input" value={fields.status} onChange={set("status")}>
          <option value="in_progress">In progress</option>
          <option value="planned">Planned</option>
        </select>
      </Field>
      <Field label="Work performed" full>
        <textarea className="input" rows={3} value={fields.workPerformed} onChange={set("workPerformed")} />
      </Field>
      <Field label="Deviations" full>
        <textarea className="input" rows={2} value={fields.deviations} onChange={set("deviations")} />
      </Field>
    </FormShell>
  );
}

export function ExecutionUpdateForm({
  execution,
  onClose,
  onSuccess,
}: {
  execution: Execution;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [fields, setFields] = useState({
    status: execution.status,
    endedAt: execution.endedAt ? execution.endedAt.slice(0, 10) : "",
    workPerformed: execution.workPerformed ?? "",
    deviations: execution.deviations ?? "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Update execution"
      subtitle="Record deviations and failures honestly; they are part of the decision record."
      onClose={onClose}
      submitLabel="Save execution"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.updateExecution(execution.id, {
              status: fields.status,
              endedAt: fields.endedAt || null,
              workPerformed: textOrNull(fields.workPerformed),
              deviations: textOrNull(fields.deviations),
            }),
          "Execution record updated.",
        );
      }}
    >
      <Field label="Status" required>
        <select className="input" value={fields.status} onChange={set("status")}>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </Field>
      <Field label="Ended on">
        <input className="input" type="date" value={fields.endedAt} onChange={set("endedAt")} />
      </Field>
      <Field label="Work performed" full>
        <textarea className="input" rows={3} value={fields.workPerformed} onChange={set("workPerformed")} />
      </Field>
      <Field label="Deviations and disputes" full>
        <textarea className="input" rows={2} value={fields.deviations} onChange={set("deviations")} />
      </Field>
    </FormShell>
  );
}

export function OutcomeForm({
  decisionId,
  baselineMetric,
  baselineUnit,
  baselineValue,
  onClose,
  onSuccess,
}: FormProps & {
  baselineMetric: string | null;
  baselineUnit: string | null;
  baselineValue: number | null;
}) {
  const [fields, setFields] = useState({
    measuredAt: today(),
    metric: baselineMetric ?? "",
    value: "",
    unit: baselineUnit ?? "",
    classification: "observed" as OutcomeClassification,
    method: "",
    baselineValue: baselineValue === null ? "" : String(baselineValue),
    baselineNote: "",
    uncertaintyNote: "",
    attributionMethod: "",
  });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Record an outcome"
      subtitle="You are recorded as the verifier. Classification is enforced: attributed claims require a method."
      onClose={onClose}
      submitLabel="Record outcome"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addOutcome(decisionId, {
              measuredAt: fields.measuredAt,
              metric: fields.metric,
              value: Number(fields.value),
              unit: fields.unit,
              classification: fields.classification,
              method: fields.method,
              baselineValue: numberOrNull(fields.baselineValue),
              baselineNote: fields.baselineNote,
              uncertaintyNote: fields.uncertaintyNote,
              attributionMethod: textOrNull(fields.attributionMethod),
            }),
          "Outcome recorded.",
        );
      }}
    >
      <Field label="Measured on" required>
        <input className="input" type="date" value={fields.measuredAt} onChange={set("measuredAt")} />
      </Field>
      <Field label="Classification" required>
        <select className="input" value={fields.classification} onChange={set("classification")}>
          <option value="observed">Observed</option>
          <option value="estimated">Estimated</option>
          <option value="attributed">Attributed (causal claim)</option>
          <option value="uncertain">Uncertain</option>
        </select>
      </Field>
      <Field label="Metric" required full>
        <input className="input" value={fields.metric} onChange={set("metric")} />
      </Field>
      <Field label="Value" required>
        <input className="input" type="number" step="any" value={fields.value} onChange={set("value")} />
      </Field>
      <Field label="Unit" required>
        <input className="input" value={fields.unit} onChange={set("unit")} />
      </Field>
      <Field label="Baseline value">
        <input className="input" type="number" step="any" value={fields.baselineValue} onChange={set("baselineValue")} />
      </Field>
      <Field label="Measurement method" required full>
        <textarea className="input" rows={2} value={fields.method} onChange={set("method")} />
      </Field>
      <Field label="Comparison with baseline" required hint="How comparable are the two measurements? What changed in method or window?" full>
        <textarea className="input" rows={2} value={fields.baselineNote} onChange={set("baselineNote")} />
      </Field>
      <Field label="Uncertainty and limitations" required full>
        <textarea className="input" rows={2} value={fields.uncertaintyNote} onChange={set("uncertaintyNote")} />
      </Field>
      <Field
        label="Attribution method"
        hint="Required only when the classification is attributed. Otherwise leave blank."
        full
      >
        <textarea className="input" rows={2} value={fields.attributionMethod} onChange={set("attributionMethod")} />
      </Field>
    </FormShell>
  );
}

export interface CorrectionTarget {
  value: string;
  label: string;
}

export function CorrectionForm({
  decisionId,
  targets,
  onClose,
  onSuccess,
}: FormProps & { targets: CorrectionTarget[] }) {
  const [fields, setFields] = useState({ target: "decision", description: "" });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Raise a correction"
      subtitle="Corrections are appended; they never overwrite the original record."
      onClose={onClose}
      submitLabel="Raise correction"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        const [targetType, targetId] = fields.target.split(":");
        run(
          () =>
            api.addCorrection(decisionId, {
              targetType: targetType === "decision" ? "decision" : targetType,
              targetId: targetId ?? null,
              description: fields.description,
            }),
          "Correction raised.",
        );
      }}
    >
      <Field label="Target" required full>
        <select className="input" value={fields.target} onChange={set("target")}>
          {targets.map((target) => (
            <option key={target.value} value={target.value}>
              {target.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="What is wrong or disputed?" required full>
        <textarea className="input" rows={3} value={fields.description} onChange={set("description")} />
      </Field>
    </FormShell>
  );
}

export function ResolveCorrectionForm({
  correction,
  onClose,
  onSuccess,
}: {
  correction: Correction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [resolution, setResolution] = useState("");
  const { busy, error, run } = useSubmission(onSuccess);

  return (
    <FormShell
      title="Resolve correction"
      subtitle={correction.description}
      onClose={onClose}
      submitLabel="Resolve correction"
      busy={busy}
      error={error}
      onSubmit={(event) => {
        event.preventDefault();
        run(() => api.resolveCorrection(correction.id, { resolution }), "Correction resolved.");
      }}
    >
      <Field label="Resolution and rationale" required full>
        <textarea className="input" rows={4} value={resolution} onChange={(event) => setResolution(event.target.value)} />
      </Field>
    </FormShell>
  );
}

export function LessonForm({ decisionId, onClose, onSuccess }: FormProps) {
  const [fields, setFields] = useState({ summary: "", whatWorked: "", whatDidnt: "", changes: "" });
  const { busy, error, run } = useSubmission(onSuccess);
  const set = (key: keyof typeof fields) => (event: Change) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormShell
      title="Record a lesson"
      subtitle="Learning includes what failed. Do not restate projected impact as achieved."
      onClose={onClose}
      submitLabel="Record lesson"
      busy={busy}
      error={error}
      wide
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            api.addLesson(decisionId, {
              summary: fields.summary,
              whatWorked: textOrNull(fields.whatWorked),
              whatDidnt: textOrNull(fields.whatDidnt),
              changes: textOrNull(fields.changes),
            }),
          "Lesson recorded.",
        );
      }}
    >
      <Field label="Summary" required full>
        <textarea className="input" rows={3} value={fields.summary} onChange={set("summary")} />
      </Field>
      <Field label="What worked" full>
        <textarea className="input" rows={2} value={fields.whatWorked} onChange={set("whatWorked")} />
      </Field>
      <Field label="What did not work" full>
        <textarea className="input" rows={2} value={fields.whatDidnt} onChange={set("whatDidnt")} />
      </Field>
      <Field label="What should change next time" full>
        <textarea className="input" rows={2} value={fields.changes} onChange={set("changes")} />
      </Field>
    </FormShell>
  );
}

export function ReviewForm({
  title,
  subtitle,
  onClose,
  onSubmit,
  onSuccess,
}: {
  title: string;
  subtitle: ReactNode;
  onClose: () => void;
  onSubmit: (status: "accepted" | "rejected", note: string | null) => Promise<unknown>;
  onSuccess: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(status: "accepted" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(status, textOrNull(note));
      onSuccess(status === "accepted" ? "Review recorded: accepted." : "Review recorded: rejected.");
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => submit("rejected")}>
            Reject
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => submit("accepted")}>
            {busy ? "Recording…" : "Accept"}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="Review note" hint="Optional but recommended, especially when rejecting." full>
        <textarea className="input" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
    </Modal>
  );
}
