import type {
  Actor,
  DecisionPayload,
  DecisionSummary,
} from "@shared/types";

let actingActorId: string | null = null;

export function setActingActor(id: string): void {
  actingActorId = id;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
    public readonly missing: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, actorOverride?: string): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const actor = actorOverride ?? actingActorId;
  if (actor) headers["x-actor-id"] = actor;
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const body = (data ?? {}) as { message?: string; error?: string; missing?: string[] };
    throw new ApiError(
      body.message ?? response.statusText,
      response.status,
      body.error ?? null,
      body.missing ?? [],
    );
  }
  return data as T;
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

const patch = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const api = {
  actors: () => request<{ actors: Actor[] }>("/actors"),
  decisions: () => request<{ decisions: DecisionSummary[] }>("/decisions"),
  decision: (id: string) => request<DecisionPayload>(`/decisions/${id}`),
  createDecision: (body: unknown) => post<{ id: string }>("/decisions", body),
  updateDecision: (id: string, body: unknown) => patch<{ ok: boolean }>(`/decisions/${id}`, body),
  addObservation: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/observations`, body),
  addEvidence: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/evidence`, body),
  reviewEvidence: (id: string, body: unknown) => patch<{ ok: boolean }>(`/evidence/${id}`, body),
  addAlternative: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/alternatives`, body),
  updateAlternative: (id: string, body: unknown) => patch<{ ok: boolean }>(`/alternatives/${id}`, body),
  addAuthorization: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/authorizations`, body),
  addResource: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/resources`, body),
  addExecution: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/executions`, body),
  updateExecution: (id: string, body: unknown) => patch<{ ok: boolean }>(`/executions/${id}`, body),
  addOutcome: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/outcomes`, body),
  addCorrection: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/corrections`, body),
  resolveCorrection: (id: string, body: unknown) => patch<{ ok: boolean }>(`/corrections/${id}`, body),
  addLesson: (id: string, body: unknown) => post<{ id: string }>(`/decisions/${id}/lessons`, body),
  transition: (id: string, to: string) => post<unknown>(`/decisions/${id}/transitions`, { to }),
  runOracle: (id: string) =>
    request<{ id: string }>(`/decisions/${id}/oracle-scan`, { method: "POST", body: "{}" }, "agent-oracle"),
  reviewContribution: (id: string, body: unknown) => patch<{ ok: boolean }>(`/contributions/${id}`, body),
  exportUrl: (id: string) => `/api/decisions/${id}/export`,
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.missing.length > 0
      ? `${error.message} Missing: ${error.missing.join("; ")}.`
      : error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}
