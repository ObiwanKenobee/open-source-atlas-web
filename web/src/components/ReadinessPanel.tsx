import type { Readiness } from "@shared/types";
import { STATUS_META } from "../lib/format";
import { Button } from "./Common";

export function ReadinessPanel({
  readiness,
  onAdvance,
  busy,
}: {
  readiness: Readiness;
  onAdvance: () => void;
  busy: boolean;
}) {
  const unmet = readiness.requirements.filter((r) => !r.met);
  const nextLabel = readiness.next ? STATUS_META[readiness.next].label : null;
  const disabled = !readiness.canTransition || busy || !readiness.next;

  return (
    <aside className="rail">
      <div className="rail-card">
        <span className="eyebrow">Stage gate</span>
        {readiness.next ? (
          <>
            <h3>Advance to {nextLabel}</h3>
            <p className="rail-desc">{STATUS_META[readiness.next].description}</p>

            <ul className="gate-list">
              {readiness.requirements.map((requirement) => (
                <li key={requirement.id} className={requirement.met ? "gate-met" : "gate-unmet"}>
                  <span className="gate-mark" aria-hidden="true">{requirement.met ? "✓" : "○"}</span>
                  <span>
                    {requirement.label}
                    {requirement.detail && <span className="gate-detail">{requirement.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>

            {readiness.warnings.length > 0 && (
              <div className="rail-warnings">
                <span className="eyebrow eyebrow-warn">Attention</span>
                <ul>
                  {readiness.warnings.map((warning) => (
                    <li key={warning.id}>
                      <span className="warn-dot" aria-hidden="true" />
                      <span>
                        {warning.label}
                        {warning.detail && <span className="gate-detail">{warning.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="primary"
              onClick={onAdvance}
              disabled={disabled}
              title={
                !readiness.actorCanTransition
                  ? readiness.actorBlockReason ?? undefined
                  : unmet.length > 0
                    ? `${unmet.length} requirement(s) unmet`
                    : undefined
              }
            >
              {busy ? "Recording…" : `Advance to ${nextLabel}`}
            </Button>

            {!readiness.actorCanTransition && (
              <p className="rail-block">{readiness.actorBlockReason}</p>
            )}
            {readiness.actorCanTransition && unmet.length > 0 && (
              <p className="rail-block">
                {unmet.length} requirement{unmet.length === 1 ? "" : "s"} unmet. The gate is enforced on the
                server, not just disabled here.
              </p>
            )}
            <p className="rail-foot">
              The transition is appended to the audit log with the acting identity and time.
            </p>
          </>
        ) : (
          <>
            <h3>Cycle complete</h3>
            <p className="rail-desc">
              This decision reached the learning stage. A corrected claim would require a new, linked decision in
              a production system; reopening is not implemented in this prototype.
            </p>
          </>
        )}
      </div>

      <div className="rail-card rail-legend">
        <span className="eyebrow">Record discipline</span>
        <ul>
          <li>Agents propose; people decide. Agent output changes no stage.</li>
          <li>Evidence counts only after a second person accepts it.</li>
          <li>The baseline is locked once analysis starts.</li>
          <li>Outcomes are classified; estimates are never presented as observed impact.</li>
          <li>Verification requires a verifier independent of the authorizer.</li>
        </ul>
      </div>
    </aside>
  );
}
