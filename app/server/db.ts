import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");
const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH ?? path.join(DATA_DIR, "app.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(readFileSync(path.join(here, "schema.sql"), "utf8"));

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
