import { useCallback, useEffect, useMemo, useState } from "react";
import type { Actor, DecisionPayload, DecisionSummary } from "@shared/types";
import { api, errorMessage, setActingActor } from "./lib/api";
import { ROLE_LABEL, formatDate } from "./lib/format";
import { Button, ErrorBlock, StatusChip } from "./components/Common";
import { DecisionForm } from "./components/Forms";
import { DecisionView } from "./components/DecisionView";

export default function App() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [actingId, setActingId] = useState<string>(() => localStorage.getItem("atlas.acting") ?? "");
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payload, setPayload] = useState<DecisionPayload | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPayload, setLoadingPayload] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const humans = useMemo(() => actors.filter((actor) => !actor.isAgent), [actors]);
  const actingActor = useMemo(
    () => humans.find((actor) => actor.id === actingId) ?? humans[0] ?? null,
    [humans, actingId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [actorResult, decisionResult] = await Promise.all([api.actors(), api.decisions()]);
        if (cancelled) return;
        setActors(actorResult.actors);
        const available = actorResult.actors.filter((actor) => !actor.isAgent);
        setActingId((current) => {
          const stored = available.find((actor) => actor.id === current);
          const fallback = available.find((actor) => actor.role === "steward") ?? available[0];
          return stored?.id ?? fallback?.id ?? "";
        });
        setDecisions(decisionResult.decisions);
        setSelectedId(decisionResult.decisions[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) setBootError(errorMessage(error));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!actingId) return;
    setActingActor(actingId);
    localStorage.setItem("atlas.acting", actingId);
  }, [actingId]);

  useEffect(() => {
    if (!selectedId) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    setLoadingPayload(true);
    setPayloadError(null);
    api
      .decision(selectedId)
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((error) => {
        if (!cancelled) setPayloadError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingPayload(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, actingId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const decisionResult = await api.decisions();
      setDecisions(decisionResult.decisions);
      if (selectedId) {
        const result = await api.decision(selectedId);
        setPayload(result);
      }
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }, [selectedId]);

  function selectDecision(id: string) {
    if (id === selectedId) return;
    setPayload(null);
    setSelectedId(id);
  }

  function handleCreated(id: string) {
    setCreating(false);
    setPayload(null);
    setSelectedId(id);
    setToast("Decision opened. Record a baseline and evidence to advance.");
    api
      .decisions()
      .then((result) => setDecisions(result.decisions))
      .catch((error) => setProblem(errorMessage(error)));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">AS</span>
          <div>
            <div className="wordmark">Atlas Sanctum</div>
            <div className="tagline">Regenerative Decision Engine · prototype</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="topbar-note">Evidence before assertion</span>
          <label className="acting" title="Prototype identity switch. A production deployment requires authenticated identity and server-side authorization.">
            <span>Acting as</span>
            <select value={actingId} onChange={(event) => setActingId(event.target.value)}>
              {humans.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name} — {actor.role ? ROLE_LABEL[actor.role] : "person"}
                </option>
              ))}
            </select>
          </label>
          {actingActor && <span className="acting-org">{actingActor.organization}</span>}
        </div>
      </header>

      <div className="synthetic-strip">
        <span className="strip-dot" aria-hidden="true" />
        Synthetic demonstration data. No real findings, institutional partnerships, or financial commitments are
        represented. The identity switcher is a prototype device, not authentication.
      </div>

      <div className="frame">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="sidebar-title">
              <span className="eyebrow">Decisions</span>
              <span className="count">{decisions.length}</span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
              New decision
            </Button>
          </div>

          {loadingList ? (
            <div className="sidebar-loading">Loading decisions…</div>
          ) : decisions.length === 0 ? (
            <p className="sidebar-empty">No decisions yet. Open one to begin.</p>
          ) : (
            <ul className="decision-list">
              {decisions.map((decision) => (
                <li key={decision.id}>
                  <button
                    className={`decision-item ${decision.id === selectedId ? "active" : ""}`}
                    onClick={() => selectDecision(decision.id)}
                  >
                    <span className="dl-top">
                      <StatusChip status={decision.status} />
                      {decision.synthetic && <span className="dl-synthetic">synthetic</span>}
                    </span>
                    <span className="dl-title">{decision.title}</span>
                    <span className="dl-place">{decision.placeName ?? "Place not recorded"}</span>
                    <span className="dl-meta">
                      {decision.acceptedEvidence} accepted source{decision.acceptedEvidence === 1 ? "" : "s"} ·{" "}
                      {decision.openCorrections} open correction{decision.openCorrections === 1 ? "" : "s"} ·{" "}
                      {formatDate(decision.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="sidebar-foot">
            <p>
              A decision is the unit of intelligence: place, problem, evidence, opportunity, action, outcome — each
              recorded and auditable.
            </p>
          </div>
        </aside>

        <main className="content">
          {bootError ? (
            <ErrorBlock message={bootError} />
          ) : loadingPayload && !payload ? (
            <div className="loading-panel" aria-live="polite">
              <span className="loading-rule" />
              Loading decision record…
            </div>
          ) : payloadError && !payload ? (
            <ErrorBlock message={payloadError} />
          ) : payload && actingActor ? (
            <DecisionView
              key={payload.decision.id}
              payload={payload}
              actors={actors}
              actingActor={actingActor}
              onRefresh={refresh}
              notify={setToast}
              onError={(error) => setProblem(errorMessage(error))}
            />
          ) : (
            <div className="empty-workspace">
              <span className="eyebrow">Decision workspace</span>
              <h1>Observe reality. Decide wisely. Verify honestly.</h1>
              <p>
                Select a decision from the list, or open a new one. Each stage is gated by recorded evidence and a
                named person with the authority to act.
              </p>
              <Button variant="primary" onClick={() => setCreating(true)}>
                Open a decision
              </Button>
            </div>
          )}
        </main>
      </div>

      {creating && <DecisionForm onClose={() => setCreating(false)} onSuccess={handleCreated} />}

      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {problem && (
        <div className="toast toast-error" role="alert">
          <span>{problem}</span>
          <button onClick={() => setProblem(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
