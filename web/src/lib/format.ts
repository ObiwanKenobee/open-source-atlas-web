import type { Actor, DecisionStatus, HumanRole } from "@shared/types";

export const STATUS_META: Record<DecisionStatus, { label: string; description: string }> = {
  draft: { label: "Draft", description: "Frame the place, problem, affected people, and baseline." },
  understanding: { label: "Understanding", description: "Collect observations and accept evidence reviewed by a second person." },
  evaluated: { label: "Evaluated", description: "Compare feasible alternatives and record the selected option with its uncertainties." },
  authorized: { label: "Authorized", description: "A named authorizer records scope, conditions, and conflicts of interest." },
  executing: { label: "Executing", description: "Approved resources are committed and implementation is recorded." },
  verified: { label: "Verified", description: "An independent verifier measures the outcome against the baseline." },
  learned: { label: "Learned", description: "Corrections are resolved and the lesson is recorded for future decisions." },
};

export const ROLE_LABEL: Record<HumanRole, string> = {
  analyst: "Analyst",
  authorizer: "Authorizer",
  implementer: "Implementer",
  verifier: "Verifier",
  steward: "Steward",
};

export function actorLabel(actor: Actor | undefined | null): string {
  if (!actor) return "Unknown actor";
  if (actor.isAgent) return `${actor.name} (agent)`;
  return actor.role ? `${actor.name} · ${ROLE_LABEL[actor.role]}` : actor.name;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatAmount(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return "In kind";
  const code = currency && currency.length > 0 ? currency : "KES";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString("en")}`;
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

export function coordLabel(geo: { coordinates: [number, number] } | null | undefined): string | null {
  if (!geo) return null;
  const [lon, lat] = geo.coordinates;
  const latLabel = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lonLabel = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
  return `${latLabel}, ${lonLabel}`;
}

export function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
