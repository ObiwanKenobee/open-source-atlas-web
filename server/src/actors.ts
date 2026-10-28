import type { DatabaseSync } from "node:sqlite";
import type { Actor } from "../../shared/types.ts";
import { allRows, firstRow, insertRow, nowIso } from "./db.ts";

export const BASE_ACTORS: Actor[] = [
  {
    id: "actor-analyst-1",
    name: "Grace Wambui",
    organization: "Nakuru Community Water Trust (fictional)",
    role: "analyst",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "actor-analyst-2",
    name: "Peter Otieno",
    organization: "County Water Office (fictional)",
    role: "analyst",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "actor-authorizer-1",
    name: "Ruth Kamau",
    organization: "Example Foundation (fictional)",
    role: "authorizer",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "actor-implementer-1",
    name: "Samuel Kipchoge",
    organization: "Maji Field Services (fictional)",
    role: "implementer",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "actor-verifier-1",
    name: "Esther Njeri",
    organization: "Independent Verification Lab (fictional)",
    role: "verifier",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "actor-steward-1",
    name: "Daniel Mwangi",
    organization: "Atlas Sanctum (fictional)",
    role: "steward",
    isAgent: false,
    agentRole: null,
  },
  {
    id: "agent-oracle",
    name: "Oracle",
    organization: "Atlas Sanctum agent council (bounded assistant)",
    role: null,
    isAgent: true,
    agentRole: "oracle",
  },
];

export function ensureBaseActors(db: DatabaseSync): void {
  for (const actor of BASE_ACTORS) {
    const existing = firstRow<Actor>(db, "SELECT * FROM actors WHERE id = ?", actor.id);
    if (!existing) {
      insertRow(db, "actors", { ...actor, createdAt: nowIso() });
    }
  }
}

export function listActors(db: DatabaseSync): Actor[] {
  return allRows<Actor>(db, "SELECT * FROM actors ORDER BY is_agent ASC, role ASC, name ASC");
}

export function getActor(db: DatabaseSync, id: string): Actor | null {
  return firstRow<Actor>(db, "SELECT * FROM actors WHERE id = ?", id);
}
