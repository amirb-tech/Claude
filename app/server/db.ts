import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");
const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH ?? path.join(DATA_DIR, "app.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
// Numbered migrations in server/migrations, each applied once, in order.
db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");
{
  const dir = path.join(here, "migrations");
  const done = new Set((db.prepare("SELECT name FROM schema_migrations").all() as { name: string }[]).map((r) => r.name));
  for (const f of readdirSync(dir).filter((x) => /^\d+_.*\.sql$/.test(x)).sort()) {
    if (done.has(f)) continue;
    db.exec("BEGIN");
    try {
      db.exec(readFileSync(path.join(dir, f), "utf8"));
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(f, Date.now());
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw new Error(`migration ${f} failed: ${(e as Error).message}`);
    }
  }
}

export const now = () => Date.now();
export const uid = () => randomUUID();

type Row = Record<string, unknown>;
export const all = <T = Row>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...(p as never[])) as T[];
export const get = <T = Row>(sql: string, ...p: unknown[]) => db.prepare(sql).get(...(p as never[])) as T | undefined;
export const run = (sql: string, ...p: unknown[]) => db.prepare(sql).run(...(p as never[]));

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Track fields every list needs: the track plus its album and artist names. */
export const TRACK_COLS = `
  t.id, t.title, t.track_number AS trackNumber, t.duration_ms AS durationMs, t.audio_url AS audioUrl,
  t.play_count AS playCount, t.album_id AS albumId, al.title AS albumTitle, al.cover_url AS coverUrl,
  t.artist_id AS artistId, ar.name AS artistName`;
export const TRACK_JOIN = `JOIN albums al ON al.id = t.album_id JOIN artists ar ON ar.id = t.artist_id`;
