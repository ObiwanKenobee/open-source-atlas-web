import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { FastifyInstance } from "fastify";
import { openDb } from "../db.ts";
import { ensureBaseActors } from "../actors.ts";
import { buildApp } from "../app.ts";
import { createSession, setAccount, SESSION_COOKIE } from "../auth.ts";

const GRACE = "actor-analyst-1";
const RUTH = "actor-authorizer-1";
const ORACLE = "agent-oracle";
const PASSWORD = "test-password-123";

function setup(t: TestContext) {
  const db = openDb(":memory:");
  ensureBaseActors(db);
  setAccount(db, GRACE, "grace@atlas.test", PASSWORD);
  const app = buildApp(db);
  t.after(async () => {
    await app.close();
    db.close();
  });
  return { db, app };
}

function cookieToken(response: { headers: Record<string, unknown> }): string | null {
  const header = response.headers["set-cookie"];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(value);
  return match?.[1] ?? null;
}

async function login(
  app: FastifyInstance,
  email: string,
  password: string,
  origin = "http://localhost:5173",
) {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { origin },
    payload: { email, password },
  });
}

test("record routes reject unauthenticated requests while health stays public", async (t) => {
  const { app } = setup(t);
  for (const url of ["/api/actors", "/api/decisions", "/api/auth/session"]) {
    const response = await app.inject({ method: "GET", url });
    assert.equal(response.statusCode, 401, url);
    assert.equal(response.json().error, "authentication_required");
  }
  const mutation = await app.inject({ method: "POST", url: "/api/decisions", payload: { title: "Anonymous" } });
  assert.equal(mutation.statusCode, 401);
  const health = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(health.statusCode, 200);
});

test("login issues an HttpOnly session cookie that authorizes reads and can be revoked", async (t) => {
  const { app } = setup(t);
  const response = await login(app, "Grace@Atlas.Test", PASSWORD);
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().actor.id, GRACE);
  const header = String(response.headers["set-cookie"]);
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Lax/i);
  assert.match(header, /Path=\//i);
  assert.doesNotMatch(header, /Secure/i);
  assert.equal(response.headers["cache-control"], "no-store");

  const token = cookieToken(response);
  assert.ok(token);
  const session = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
  assert.equal(session.statusCode, 200);
  assert.equal(session.json().actor.id, GRACE);
  assert.equal(session.headers["cache-control"], "no-store");

  const decisions = await app.inject({
    method: "GET",
    url: "/api/decisions",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
  assert.equal(decisions.statusCode, 200);

  const logout = await app.inject({
    method: "POST",
    url: "/api/auth/logout",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
  assert.equal(logout.statusCode, 200);

  const after = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
  assert.equal(after.statusCode, 401);
});

test("wrong passwords fail generically and repeated failures are throttled", async (t) => {
  const { db, app } = setup(t);
  setAccount(db, RUTH, "ruth-fail@atlas.test", PASSWORD);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login(app, "ruth-fail@atlas.test", "wrong-password-000");
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "invalid_credentials");
    assert.equal(response.json().message, "Email or password is incorrect.");
  }
  const blocked = await login(app, "ruth-fail@atlas.test", PASSWORD);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.json().error, "too_many_attempts");
});

test("expired sessions are rejected and removed", async (t) => {
  const { db, app } = setup(t);
  const { token } = createSession(db, GRACE, -1000);
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
  assert.equal(response.statusCode, 401);
  const remaining = db
    .prepare("SELECT COUNT(*) AS count FROM sessions WHERE actor_id = ?")
    .get(GRACE) as { count: number };
  assert.equal(remaining.count, 0);
});

test("agents cannot hold accounts or sessions", async (t) => {
  const { db } = setup(t);
  assert.throws(
    () => setAccount(db, ORACLE, "oracle@atlas.test", PASSWORD),
    (error: unknown) => (error as { code?: string }).code === "agent_account_forbidden",
  );
  assert.throws(
    () => createSession(db, ORACLE),
    (error: unknown) => (error as { code?: string }).code === "agent_session_forbidden",
  );
});

test("disabled accounts cannot sign in", async (t) => {
  const { db, app } = setup(t);
  setAccount(db, RUTH, "ruth-disabled@atlas.test", PASSWORD);
  db.prepare("UPDATE accounts SET disabled = 1 WHERE actor_id = ?").run(RUTH);
  const response = await login(app, "ruth-disabled@atlas.test", PASSWORD);
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "invalid_credentials");
});

test("cross-origin state changes are rejected", async (t) => {
  const { app } = setup(t);
  const rejected = await login(app, "grace@atlas.test", PASSWORD, "https://evil.example");
  assert.equal(rejected.statusCode, 403);
  assert.equal(rejected.json().error, "origin_rejected");

  const allowed = await login(app, "grace@atlas.test", PASSWORD, "http://localhost:5173");
  assert.equal(allowed.statusCode, 200);
});
