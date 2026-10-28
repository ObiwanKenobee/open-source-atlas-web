import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Actor } from "../../shared/types.ts";
import { countRows, DomainError, firstRow, insertRow, nowIso } from "./db.ts";
import { getActor } from "./actors.ts";

export const SESSION_COOKIE = "atlas_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

interface AccountRow {
  actorId: string;
  email: string;
  passwordHash: string;
  disabled: boolean;
  createdAt: string;
}

interface SessionRow {
  tokenHash: string;
  actorId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Session {
  actor: Actor;
  expiresAt: string;
}

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export function verifyPassword(password: string, encoded: string): boolean {
  try {
    const parts = encoded.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    if (Number(parts[1]) !== SCRYPT_N || Number(parts[2]) !== SCRYPT_R || Number(parts[3]) !== SCRYPT_P) {
      return false;
    }
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    const actual = scryptSync(password, salt, expected.length, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Verified against when no account exists so unknown emails do not answer faster.
const DUMMY_HASH = hashPassword("atlas-timing-equalizer-not-a-credential");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function setAccount(
  db: DatabaseSync,
  actorId: string,
  email: string,
  password: string,
): void {
  const actor = getActor(db, actorId);
  if (!actor) throw new DomainError(404, "actor_not_found", "Actor not found.");
  if (actor.isAgent) {
    throw new DomainError(403, "agent_account_forbidden", "AI agents do not hold human credentials.");
  }
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new DomainError(400, "invalid_email", "Provide a valid email address.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(
      400,
      "weak_password",
      `Use at least ${MIN_PASSWORD_LENGTH} characters for a development password.`,
    );
  }
  const existingActor = firstRow<AccountRow>(db, "SELECT * FROM accounts WHERE actor_id = ?", actorId);
  if (existingActor) throw new DomainError(409, "account_exists", "This actor already has an account.");
  const existingEmail = firstRow<AccountRow>(
    db,
    "SELECT * FROM accounts WHERE email = ? COLLATE NOCASE",
    normalized,
  );
  if (existingEmail) throw new DomainError(409, "email_in_use", "That email address is already registered.");
  insertRow(db, "accounts", {
    actorId,
    email: normalized,
    passwordHash: hashPassword(password),
    disabled: 0,
    createdAt: nowIso(),
  });
}

export function authenticate(db: DatabaseSync, email: string, password: string): Actor | null {
  const account = firstRow<AccountRow>(
    db,
    "SELECT * FROM accounts WHERE email = ? COLLATE NOCASE",
    normalizeEmail(email),
  );
  const valid = verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !valid || account.disabled) return null;
  const actor = getActor(db, account.actorId);
  if (!actor || actor.isAgent) return null;
  return actor;
}

export function createSession(
  db: DatabaseSync,
  actorId: string,
  ttlMs: number = SESSION_TTL_MS,
): { token: string; expiresAt: string } {
  const actor = getActor(db, actorId);
  if (!actor) throw new DomainError(404, "actor_not_found", "Actor not found.");
  if (actor.isAgent) {
    throw new DomainError(403, "agent_session_forbidden", "AI agents cannot hold interactive sessions.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  insertRow(db, "sessions", {
    tokenHash: digest(token),
    actorId,
    createdAt: nowIso(),
    expiresAt,
  });
  return { token, expiresAt };
}

export function resolveSession(db: DatabaseSync, token: string): Session | null {
  const tokenHash = digest(token);
  const row = firstRow<SessionRow>(db, "SELECT * FROM sessions WHERE token_hash = ?", tokenHash);
  if (!row) return null;
  if (Date.parse(row.expiresAt) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  const actor = getActor(db, row.actorId);
  if (!actor || actor.isAgent) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { actor, expiresAt: row.expiresAt };
}

export function revokeSession(db: DatabaseSync, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
}

export function deleteExpiredSessions(db: DatabaseSync): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}

export function countAccounts(db: DatabaseSync): number {
  return countRows(db, "SELECT COUNT(*) AS count FROM accounts");
}
