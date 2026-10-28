import { useCallback, useEffect, useState } from "react";
import type { Actor, DecisionPayload, DecisionSummary } from "@shared/types";
import { api, ApiError, errorMessage } from "./lib/api";
import { ROLE_LABEL, formatDate } from "./lib/format";
import { Button, ErrorBlock, StatusChip } from "./components/Common";
import { DecisionForm } from "./components/Forms";
import { DecisionView } from "./components/DecisionView";
import { Login } from "./components/Login";

export default function App() {
  const [session, setSession] = useState<Actor | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((result) => {
        if (!cancelled) setSession(result.actor);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
        } else {
          setSessionError(errorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setSession(null);
    window.addEventListener("atlas:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("atlas:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!session) {
      setActors([]);
      setDecisions([]);
      setSelectedId(null);
      setPayload(null);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    setBootError(null);
    Promise.all([api.actors(), api.decisions()])
      .then(([actorResult, decisionResult]) => {
        if (cancelled) return;
        setActors(actorResult.actors);
        setDecisions(decisionResult.decisions);
        setSelectedId((current) =>
          current && decisionResult.decisions.some((decision) => decision.id === current)
            ? current
            : (decisionResult.decisions[0]?.id ?? null),
        );
      })
      .catch((error) => {
        if (!cancelled) setBootError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!selectedId || !session) {
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
  }, [selectedId, session]);

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

  function handleLogin(actor: Actor) {
    setSessionError(null);
    setBootError(null);
    setSession(actor);
    setToast(`Signed in as ${actor.name}.`);
  }

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // The local session is cleared even if the server is unreachable.
    }
    setSession(null);
    setDecisions([]);
    setSelectedId(null);
    setPayload(null);
  }

  if (session === undefined) {
    return (
      <div className="login-screen">
        <div className="loading-panel" aria-live="polite">
          <span className="loading-rule" />
          Restoring session…
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="login-screen">
        <div className="login-error">
          <ErrorBlock message={sessionError} />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={handleLogin} />;
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
          <div className="user-block">
            <span className="user-name">{session.name}</span>
            <span className="user-meta">
              {session.role ? ROLE_LABEL[session.role] : "agent"} · {session.organization}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="synthetic-strip">
        <span className="strip-dot" aria-hidden="true" />
        Synthetic demonstration data. No real findings, institutional partnerships, or financial commitments are
        represented. Sessions are development authentication, not an institutional identity provider.
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
          ) : payload ? (
            <DecisionView
              key={payload.decision.id}
              payload={payload}
              actors={actors}
              actingActor={session}
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
