import express, { type Request, type Response } from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { all, get, run, now, uid, tx, ROOT, TRACK_COLS, TRACK_JOIN } from "./db.ts";
import { randomBytes, createHash } from "node:crypto";
import { hashPassword, verifyPassword, startSession, endSession, loadUser, requireUser } from "./auth.ts";
import { sendMail, resetEmail } from "./mail.ts";
import { rateLimit } from "./ratelimit.ts";

const BRAND_NAME = process.env.APP_NAME ?? "Untitled Player";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.use(express.json({ limit: "32kb" }));
app.use(loadUser);
// 10 attempts / 15 min per IP on password endpoints; 5 / hour on anything that sends email
const authLimit = rateLimit("auth", 10, 15 * 60_000);
app.use(["/api/auth/login", "/api/auth/signup", "/api/auth/reset", "/api/me/password"], (req, res, next) => (req.method === "GET" ? next() : authLimit(req, res, next)));
app.use("/api/auth/forgot", rateLimit("mail", 5, 60 * 60_000));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// ---------- helpers ----------
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (res: Response, msg: string, code = 400) => res.status(code).json({ error: msg });
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

function likedSet(userId?: string): Set<string> {
  if (!userId) return new Set();
  return new Set(all<{ track_id: string }>("SELECT track_id FROM saved_tracks WHERE user_id = ?", userId).map((r) => r.track_id));
}

type PlaylistRow = { id: string; owner_id: string; name: string; description: string; is_public: number; created_at: number; updated_at: number };

function playlistSummary(p: PlaylistRow) {
  const owner = get<{ display_name: string }>("SELECT display_name FROM users WHERE id = ?", p.owner_id);
  const covers = all<{ cover_url: string }>(
    `SELECT DISTINCT al.cover_url FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
     JOIN albums al ON al.id = t.album_id WHERE pt.playlist_id = ? ORDER BY pt.position LIMIT 4`, p.id).map((r) => r.cover_url);
  const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?", p.id)?.n ?? 0;
  return {
    id: p.id, name: p.name, description: p.description, isPublic: !!p.is_public, ownerId: p.owner_id,
    ownerName: owner?.display_name ?? "", covers, trackCount: count, updatedAt: p.updated_at,
  };
}

function canRead(p: PlaylistRow | undefined, userId?: string) {
  return !!p && (p.is_public === 1 || p.owner_id === userId);
}
function ownedPlaylist(req: Request, res: Response): PlaylistRow | undefined {
  const p = get<PlaylistRow>("SELECT * FROM playlists WHERE id = ?", req.params.id);
  if (!p || !canRead(p, req.user?.id)) { bad(res, "Playlist not found.", 404); return; }
  if (p.owner_id !== req.user!.id) { bad(res, "Only the owner can change this playlist.", 403); return; }
  return p;
}
const touch = (id: string) => run("UPDATE playlists SET updated_at = ? WHERE id = ?", now(), id);

// ---------- auth ----------
app.post("/api/auth/signup", (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const displayName = str(req.body?.displayName, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, "Enter a valid email address.");
  if (password.length < 8 || password.length > 200) return bad(res, "Use at least 8 characters for your password.");
  if (!displayName) return bad(res, "Pick a name to show on your profile.");
  if (get("SELECT 1 FROM users WHERE email = ?", email)) return bad(res, "That email already has an account. Try logging in.", 409);
  const id = uid();
  run("INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)",
    id, email, displayName, hashPassword(password), now(), now());
  startSession(res, id);
  res.status(201).json({ id, email, displayName });
});

app.post("/api/auth/login", (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const u = get<{ id: string; email: string; display_name: string; password_hash: string }>("SELECT * FROM users WHERE email = ?", email);
  // same message either way: do not reveal which emails exist
  if (!u || !verifyPassword(password, u.password_hash)) return bad(res, "That email and password don't match.", 401);
  startSession(res, u.id);
  res.json({ id: u.id, email: u.email, displayName: u.display_name });
});

app.post("/api/auth/logout", (req, res) => { endSession(req, res); res.status(204).end(); });
app.get("/api/me", (req, res) => res.json(req.user ?? null));

/** Sign out on every device: drops all sessions, then starts a fresh one here. */
app.post("/api/auth/logout-everywhere", requireUser, (req, res) => {
  run("DELETE FROM sessions WHERE user_id = ?", req.user!.id);
  startSession(res, req.user!.id);
  res.status(204).end();
});

app.post("/api/auth/forgot", async (req, res) => {
  const email = str(req.body?.email, 254).toLowerCase();
  const u = get<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  // always the same answer, so this can't be used to find out who has an account
  res.status(202).json({ ok: true });
  if (!u) return;
  const token = randomBytes(32).toString("base64url");
  run("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)", sha256(token), u.id, now() + 3600_000);
  const base = process.env.PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`;
  const mail = resetEmail(BRAND_NAME, `${base}/reset/${token}`);
  try { await sendMail({ to: email, ...mail }); } catch (e) { console.error("reset mail failed:", (e as Error).message); }
});

app.post("/api/auth/reset", (req, res) => {
  const token = str(req.body?.token, 100);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 8 || password.length > 200) return bad(res, "Use at least 8 characters for your password.");
  const r = get<{ user_id: string; expires_at: number; used_at: number | null }>("SELECT * FROM password_resets WHERE token_hash = ?", sha256(token));
  if (!r || r.used_at || r.expires_at < now()) return bad(res, "This reset link has expired or was already used. Ask for a new one.", 400);
  tx(() => {
    run("UPDATE password_resets SET used_at = ? WHERE token_hash = ?", now(), sha256(token));
    run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hashPassword(password), now(), r.user_id);
    run("DELETE FROM sessions WHERE user_id = ?", r.user_id); // a reset signs every device out
  });
  startSession(res, r.user_id);
  const u = get<{ id: string; email: string; display_name: string }>("SELECT * FROM users WHERE id = ?", r.user_id)!;
  res.json({ id: u.id, email: u.email, displayName: u.display_name });
});

app.post("/api/me/password", requireUser, (req, res) => {
  const current = typeof req.body?.current === "string" ? req.body.current : "";
  const next = typeof req.body?.next === "string" ? req.body.next : "";
  const u = get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", req.user!.id)!;
  if (!verifyPassword(current, u.password_hash)) return bad(res, "Your current password isn't right.", 403);
  if (next.length < 8 || next.length > 200) return bad(res, "Use at least 8 characters for your new password.");
  run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hashPassword(next), now(), req.user!.id);
  run("DELETE FROM sessions WHERE user_id = ?", req.user!.id);
  startSession(res, req.user!.id);
  res.status(204).end();
});

/** Deletes the account and everything it owns (cascades). Needs the password. */
app.delete("/api/me", requireUser, (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const u = get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", req.user!.id)!;
  if (!verifyPassword(password, u.password_hash)) return bad(res, "That password isn't right.", 403);
  run("DELETE FROM users WHERE id = ?", req.user!.id);
  res.clearCookie("sid", { path: "/" });
  res.status(204).end();
});

// ---------- browse ----------
app.get("/api/home", (req, res) => {
  const me = req.user?.id;
  const shelves: { id: string; title: string; kind: string; items: unknown[] }[] = [];
  if (me) {
    const recent = all(`SELECT al.id, al.title, al.cover_url AS coverUrl, ar.name AS artistName, MAX(h.played_at) AS last
      FROM play_history h JOIN tracks t ON t.id = h.track_id JOIN albums al ON al.id = t.album_id
      JOIN artists ar ON ar.id = al.artist_id WHERE h.user_id = ? GROUP BY al.id ORDER BY last DESC LIMIT 8`, me);
    if (recent.length) shelves.push({ id: "recent", title: "Pick up where you left off", kind: "album", items: recent });
    const mine = all<PlaylistRow>("SELECT * FROM playlists WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 8", me).map(playlistSummary);
    if (mine.length) shelves.push({ id: "mine", title: "Your playlists", kind: "playlist", items: mine });
  }
  shelves.push({ id: "popular", title: "Most played this week", kind: "album", items: all(
    `SELECT al.id, al.title, al.cover_url AS coverUrl, ar.name AS artistName, SUM(t.play_count) AS plays
     FROM albums al JOIN tracks t ON t.album_id = al.id JOIN artists ar ON ar.id = al.artist_id
     GROUP BY al.id ORDER BY plays DESC LIMIT 8`) });
  shelves.push({ id: "new", title: "Fresh releases", kind: "album", items: all(
    `SELECT al.id, al.title, al.cover_url AS coverUrl, ar.name AS artistName, al.release_date AS releaseDate
     FROM albums al JOIN artists ar ON ar.id = al.artist_id ORDER BY al.release_date DESC LIMIT 8`) });
  shelves.push({ id: "artists", title: "Artists to know", kind: "artist", items: all(
    "SELECT id, name, image_url AS imageUrl, genre FROM artists ORDER BY name") });
  const quick = me ? all<PlaylistRow>("SELECT * FROM playlists WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 5", me).map(playlistSummary) : [];
  res.json({ greetingName: req.user?.displayName ?? null, quick, shelves });
});

app.get("/api/genres", (_req, res) => {
  res.json(all("SELECT genre AS name, COUNT(*) AS artists, MIN(image_url) AS imageUrl FROM artists GROUP BY genre ORDER BY genre"));
});

app.get("/api/genres/:name", (req, res) => {
  const artists = all("SELECT id, name, image_url AS imageUrl, genre FROM artists WHERE genre = ? ORDER BY name", req.params.name);
  if (!artists.length) return bad(res, "Genre not found.", 404);
  const albums = all(`SELECT al.id, al.title, al.cover_url AS coverUrl, ar.name AS artistName FROM albums al
    JOIN artists ar ON ar.id = al.artist_id WHERE ar.genre = ? ORDER BY al.release_date DESC`, req.params.name);
  res.json({ name: req.params.name, artists, albums });
});

app.get("/api/search", (req, res) => {
  const q = str(req.query.q, 100);
  if (!q) return res.json({ q, tracks: [], artists: [], albums: [], playlists: [] });
  const pat = `%${likeEscape(q.toLowerCase())}%`;
  const liked = likedSet(req.user?.id);
  const tracks = all<{ id: string }>(`SELECT ${TRACK_COLS} FROM tracks t ${TRACK_JOIN}
    WHERE lower(t.title) LIKE ? ESCAPE '\\' OR lower(ar.name) LIKE ? ESCAPE '\\' OR lower(al.title) LIKE ? ESCAPE '\\'
    ORDER BY (lower(t.title) LIKE ? ESCAPE '\\') DESC, t.play_count DESC LIMIT 20`, pat, pat, pat, pat)
    .map((t) => ({ ...t, liked: liked.has(t.id) }));
  const artists = all(`SELECT id, name, image_url AS imageUrl, genre FROM artists
    WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(genre) LIKE ? ESCAPE '\\' ORDER BY name LIMIT 10`, pat, pat);
  const albums = all(`SELECT al.id, al.title, al.cover_url AS coverUrl, ar.name AS artistName, al.type FROM albums al
    JOIN artists ar ON ar.id = al.artist_id WHERE lower(al.title) LIKE ? ESCAPE '\\' OR lower(ar.name) LIKE ? ESCAPE '\\'
    ORDER BY al.release_date DESC LIMIT 10`, pat, pat);
  const playlists = all<PlaylistRow>(`SELECT * FROM playlists WHERE (is_public = 1 OR owner_id = ?)
    AND lower(name) LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 10`, req.user?.id ?? "", pat).map(playlistSummary);
  res.json({ q, tracks, artists, albums, playlists });
});

app.get("/api/artists/:id", (req, res) => {
  const a = get<Record<string, unknown>>("SELECT id, name, bio, image_url AS imageUrl, genre FROM artists WHERE id = ?", req.params.id);
  if (!a) return bad(res, "Artist not found.", 404);
  const liked = likedSet(req.user?.id);
  const popular = all<{ id: string }>(`SELECT ${TRACK_COLS} FROM tracks t ${TRACK_JOIN} WHERE t.artist_id = ?
    ORDER BY t.play_count DESC LIMIT 10`, a.id).map((t) => ({ ...t, liked: liked.has(t.id) }));
  const albums = all(`SELECT id, title, cover_url AS coverUrl, release_date AS releaseDate, type FROM albums
    WHERE artist_id = ? ORDER BY release_date DESC`, a.id);
  const listeners = get<{ n: number }>("SELECT SUM(play_count) AS n FROM tracks WHERE artist_id = ?", a.id)?.n ?? 0;
  const following = !!(req.user && get("SELECT 1 FROM followed_artists WHERE user_id = ? AND artist_id = ?", req.user.id, a.id));
  res.json({ ...a, monthlyListeners: listeners, popular, albums, following });
});

app.get("/api/albums/:id", (req, res) => {
  const al = get<Record<string, unknown>>(`SELECT al.id, al.title, al.cover_url AS coverUrl, al.release_date AS releaseDate,
    al.type, ar.id AS artistId, ar.name AS artistName, ar.image_url AS artistImage FROM albums al
    JOIN artists ar ON ar.id = al.artist_id WHERE al.id = ?`, req.params.id);
  if (!al) return bad(res, "Album not found.", 404);
  const liked = likedSet(req.user?.id);
  const tracks = all<{ id: string }>(`SELECT ${TRACK_COLS} FROM tracks t ${TRACK_JOIN} WHERE t.album_id = ?
    ORDER BY t.track_number`, al.id).map((t) => ({ ...t, liked: liked.has(t.id) }));
  const saved = !!(req.user && get("SELECT 1 FROM saved_albums WHERE user_id = ? AND album_id = ?", req.user.id, al.id));
  const more = all(`SELECT id, title, cover_url AS coverUrl, release_date AS releaseDate, type FROM albums
    WHERE artist_id = ? AND id != ? ORDER BY release_date DESC`, al.artistId, al.id);
  res.json({ ...al, tracks, saved, more });
});

// ---------- playlists ----------
app.get("/api/playlists/:id", (req, res) => {
  const p = get<PlaylistRow>("SELECT * FROM playlists WHERE id = ?", req.params.id);
  if (!canRead(p, req.user?.id)) return bad(res, "Playlist not found.", 404);
  const liked = likedSet(req.user?.id);
  const tracks = all<{ id: string }>(`SELECT ${TRACK_COLS}, pt.id AS rowId, pt.added_at AS addedAt FROM playlist_tracks pt
    JOIN tracks t ON t.id = pt.track_id ${TRACK_JOIN} WHERE pt.playlist_id = ? ORDER BY pt.position`, p!.id)
    .map((t) => ({ ...t, liked: liked.has(t.id) }));
  res.json({ ...playlistSummary(p!), isOwner: p!.owner_id === req.user?.id, tracks });
});

app.post("/api/playlists", requireUser, (req, res) => {
  const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM playlists WHERE owner_id = ?", req.user!.id)!.n;
  const name = str(req.body?.name, 100) || `Playlist no. ${count + 1}`;
  const id = uid();
  run("INSERT INTO playlists (id,owner_id,name,description,is_public,created_at,updated_at) VALUES (?,?,?,?,1,?,?)",
    id, req.user!.id, name, "", now(), now());
  res.status(201).json(playlistSummary(get<PlaylistRow>("SELECT * FROM playlists WHERE id = ?", id)!));
});

app.patch("/api/playlists/:id", requireUser, (req, res) => {
  const p = ownedPlaylist(req, res); if (!p) return;
  const name = req.body?.name !== undefined ? str(req.body.name, 100) : p.name;
  if (!name) return bad(res, "Give the playlist a name.");
  const description = req.body?.description !== undefined ? str(req.body.description, 300) : p.description;
  const isPublic = req.body?.isPublic !== undefined ? (req.body.isPublic ? 1 : 0) : p.is_public;
  run("UPDATE playlists SET name=?, description=?, is_public=?, updated_at=? WHERE id=?", name, description, isPublic, now(), p.id);
  res.json(playlistSummary(get<PlaylistRow>("SELECT * FROM playlists WHERE id = ?", p.id)!));
});

app.delete("/api/playlists/:id", requireUser, (req, res) => {
  const p = ownedPlaylist(req, res); if (!p) return;
  run("DELETE FROM playlists WHERE id = ?", p.id);
  res.status(204).end();
});

app.post("/api/playlists/:id/tracks", requireUser, (req, res) => {
  const p = ownedPlaylist(req, res); if (!p) return;
  const trackId = str(req.body?.trackId, 64);
  if (!get("SELECT 1 FROM tracks WHERE id = ?", trackId)) return bad(res, "Song not found.", 404);
  if (!req.body?.force && get("SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?", p.id, trackId))
    return bad(res, "duplicate", 409);
  const max = get<{ m: number | null }>("SELECT MAX(position) AS m FROM playlist_tracks WHERE playlist_id = ?", p.id)!.m ?? 0;
  const rowId = uid();
  run("INSERT INTO playlist_tracks (id,playlist_id,track_id,position,added_at) VALUES (?,?,?,?,?)", rowId, p.id, trackId, max + 1, now());
  touch(p.id);
  res.status(201).json({ rowId });
});

app.delete("/api/playlists/:id/tracks/:rowId", requireUser, (req, res) => {
  const p = ownedPlaylist(req, res); if (!p) return;
  const r = run("DELETE FROM playlist_tracks WHERE id = ? AND playlist_id = ?", req.params.rowId, p.id);
  if (!r.changes) return bad(res, "That song is not in this playlist.", 404);
  touch(p.id);
  res.status(204).end();
});

/** Move a row to sit right after `afterRowId` (null = top). Fractional position: one row updated. */
app.patch("/api/playlists/:id/tracks/:rowId", requireUser, (req, res) => {
  const p = ownedPlaylist(req, res); if (!p) return;
  const row = get<{ id: string }>("SELECT id FROM playlist_tracks WHERE id = ? AND playlist_id = ?", req.params.rowId, p.id);
  if (!row) return bad(res, "That song is not in this playlist.", 404);
  const after = req.body?.afterRowId ? str(req.body.afterRowId, 64) : null;
  const pos = tx(() => {
    const rows = all<{ id: string; position: number }>(
      "SELECT id, position FROM playlist_tracks WHERE playlist_id = ? AND id != ? ORDER BY position", p.id, row.id);
    const i = after ? rows.findIndex((r) => r.id === after) : -1;
    if (after && i < 0) return null;
    const lo = i >= 0 ? rows[i].position : (rows[0]?.position ?? 1) - 1;
    const hi = rows[i + 1]?.position ?? lo + 2;
    const np = (lo + hi) / 2;
    run("UPDATE playlist_tracks SET position = ? WHERE id = ?", np, row.id);
    return np;
  });
  if (pos === null) return bad(res, "Unknown position.", 400);
  touch(p.id);
  res.json({ rowId: row.id, position: pos });
});

// ---------- library ----------
app.get("/api/me/tracks", requireUser, (req, res) => {
  res.json(all(`SELECT ${TRACK_COLS}, s.saved_at AS addedAt, 1 AS liked FROM saved_tracks s JOIN tracks t ON t.id = s.track_id
    ${TRACK_JOIN} WHERE s.user_id = ? ORDER BY s.saved_at DESC`, req.user!.id).map((t) => ({ ...t, liked: true })));
});
app.get("/api/me/liked-ids", requireUser, (req, res) => res.json([...likedSet(req.user!.id)]));

function toggle(table: string, col: string, exists: string) {
  return [
    (req: Request, res: Response) => {
      if (!get(`SELECT 1 FROM ${exists} WHERE id = ?`, req.params.id)) return bad(res, "Not found.", 404);
      run(`INSERT OR IGNORE INTO ${table} (user_id, ${col}, ${table === "followed_artists" ? "followed_at" : "saved_at"}) VALUES (?,?,?)`,
        req.user!.id, req.params.id, now());
      res.status(204).end();
    },
    (req: Request, res: Response) => {
      run(`DELETE FROM ${table} WHERE user_id = ? AND ${col} = ?`, req.user!.id, req.params.id);
      res.status(204).end();
    },
  ] as const;
}
for (const [route, table, col, exists] of [
  ["tracks", "saved_tracks", "track_id", "tracks"],
  ["albums", "saved_albums", "album_id", "albums"],
  ["artists", "followed_artists", "artist_id", "artists"],
] as const) {
  const [put, del] = toggle(table, col, exists);
  app.put(`/api/me/${route}/:id`, requireUser, put);
  app.delete(`/api/me/${route}/:id`, requireUser, del);
}

app.get("/api/me/library", requireUser, (req, res) => {
  const me = req.user!.id;
  const likedCount = get<{ n: number }>("SELECT COUNT(*) AS n FROM saved_tracks WHERE user_id = ?", me)!.n;
  const playlists = all<PlaylistRow>("SELECT * FROM playlists WHERE owner_id = ? ORDER BY updated_at DESC", me)
    .map((p) => ({ kind: "playlist", ...playlistSummary(p), sortAt: p.updated_at }));
  const albums = all(`SELECT 'album' AS kind, al.id, al.title AS name, al.cover_url AS coverUrl, ar.name AS artistName,
    s.saved_at AS sortAt FROM saved_albums s JOIN albums al ON al.id = s.album_id JOIN artists ar ON ar.id = al.artist_id
    WHERE s.user_id = ?`, me);
  const artists = all(`SELECT 'artist' AS kind, ar.id, ar.name, ar.image_url AS imageUrl, f.followed_at AS sortAt
    FROM followed_artists f JOIN artists ar ON ar.id = f.artist_id WHERE f.user_id = ?`, me);
  res.json({ likedCount, items: [...playlists, ...albums, ...artists] });
});

// ---------- plays ----------
app.post("/api/plays", (req, res) => {
  const trackId = str(req.body?.trackId, 64);
  if (!get("SELECT 1 FROM tracks WHERE id = ?", trackId)) return bad(res, "Song not found.", 404);
  run("UPDATE tracks SET play_count = play_count + 1 WHERE id = ?", trackId);
  if (req.user) {
    const ctxType = ["album", "playlist", "artist", "liked", "search"].includes(req.body?.contextType) ? req.body.contextType : null;
    run("INSERT INTO play_history (user_id, track_id, context_type, context_id, played_at) VALUES (?,?,?,?,?)",
      req.user.id, trackId, ctxType, ctxType ? str(req.body?.contextId, 64) || null : null, now());
  }
  res.status(204).end();
});

app.use("/api", (_req, res) => bad(res, "Not found.", 404));

// ---------- media + app ----------
// express.static answers Range requests with 206, which the seek bar needs.
app.use("/media", express.static(path.join(ROOT, "media"), { maxAge: "7d", fallthrough: false, index: false }));
const dist = path.join(ROOT, "dist");
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`listening on http://localhost:${port}`));
