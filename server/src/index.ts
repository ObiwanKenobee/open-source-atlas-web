import { openDb } from "./db.ts";
import { ensureBaseActors } from "./actors.ts";
import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 8787);
const db = openDb(process.env.ATLAS_DB);
ensureBaseActors(db);

const app = buildApp(db);

try {
  await app.listen({ port, host: "127.0.0.1" });
  console.log(`Atlas decision engine listening on http://127.0.0.1:${port}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
