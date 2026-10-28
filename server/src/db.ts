import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "schema.sql"), "utf8");

export const defaultDbPath = join(here, "..", "data", "atlas.db");

export type Row = Record<string, unknown>;

const BOOLEAN_KEYS = new Set(["selected", "synthetic", "isAgent", "disabled"]);

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSql(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function fromSql(key: string, value: unknown): unknown {
  if (BOOLEAN_KEYS.has(key)) return Boolean(value);
  if (key.endsWith("Json") && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function rowToObject<T>(row: Row): T {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = toCamel(key);
    out[camel] = fromSql(camel, value);
  }
  return out as T;
}

export function openDb(path: string = defaultDbPath): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(schema);
  return db;
}

export function insertRow(db: DatabaseSync, table: string, data: Row): void {
  const keys = Object.keys(data);
  const columns = keys.map(toSnake);
  const placeholders = keys.map(() => "?").join(", ");
  const values = keys.map((key) => toSql(data[key]));
  db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(...values);
}

export function updateRow(db: DatabaseSync, table: string, id: string, data: Row): void {
  const keys = Object.keys(data);
  if (keys.length === 0) return;
  const assignments = keys.map((key) => `${toSnake(key)} = ?`).join(", ");
  const values = keys.map((key) => toSql(data[key]));
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(...values, id);
}

export function allRows<T>(db: DatabaseSync, sql: string, ...params: unknown[]): T[] {
  const rows = db.prepare(sql).all(...(params as never[])) as Row[];
  return rows.map((row) => rowToObject<T>(row));
}

export function firstRow<T>(db: DatabaseSync, sql: string, ...params: unknown[]): T | null {
  const row = db.prepare(sql).get(...(params as never[])) as Row | undefined;
  return row ? rowToObject<T>(row) : null;
}

export function countRows(db: DatabaseSync, sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...(params as never[])) as { count: number } | undefined;
  return row?.count ?? 0;
}

export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly missing: string[] = [],
  ) {
    super(message);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
