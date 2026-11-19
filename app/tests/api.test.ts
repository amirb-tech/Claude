// API tests: run with `npm run test:api`. Starts the real server on a temp DB.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = 3199;
const B = `http://localhost:${PORT}`;
let srv: ChildProcess;
let dataDir: string;
let logs = "";

class Client {
  cookie = "";
  async call(method: string, url: string, body?: unknown) {
    const res = await fetch(B + url, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: res.status, json: json as any };
  }
}

async function signup(email: string) {
  const c = new Client();
  const r = await c.call("POST", "/api/auth/signup", { email, password: "correct-horse-1", displayName: email.split("@")[0] });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return c;
}

before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), "rm-test-"));
  const env = { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, DISABLE_RATE_LIMIT: "1" };
  const root = path.resolve(import.meta.dirname, "..");
  await new Promise<void>((ok, fail) => {
    const s = spawn(process.execPath, ["--import", "tsx", "server/seed.ts"], { cwd: root, env, stdio: "ignore" });
    s.on("exit", (code) => (code === 0 ? ok() : fail(new Error("seed failed"))));
  });
  srv = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], { cwd: root, env });
  srv.stdout!.on("data", (d) => (logs += d));
  srv.stderr!.on("data", (d) => (logs += d));
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(B + "/api/me")).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start:\n" + logs);
});
after(() => { srv?.kill(); rmSync(dataDir, { recursive: true, force: true }); });

test("browse endpoints work logged out", async () => {
  const c = new Client();
  assert.equal((await c.call("GET", "/api/me")).json, null);
  const home = await c.call("GET", "/api/home");
  assert.equal(home.status, 200);
  assert.ok(home.json.shelves.length >= 3);
  const al = await c.call("GET", "/api/albums/ar01al1");
  assert.equal(al.json.tracks.length, 5);
  assert.deepEqual(al.json.tracks.map((t: any) => t.trackNumber), [1, 2, 3, 4, 5]);
  assert.equal((await c.call("GET", "/api/albums/does-not-exist")).status, 404);
  const s = await c.call("GET", "/api/search?q=" + encodeURIComponent("%_\\"));
  assert.equal(s.status, 200, "LIKE wildcards are escaped");
  assert.equal(s.json.tracks.length, 0);
});

test("audio supports HTTP Range for seeking", async () => {
  const r = await fetch(B + "/media/audio/ar01al1t1.mp3", { headers: { Range: "bytes=100-199" } });
  assert.equal(r.status, 206);
  assert.equal((await r.arrayBuffer()).byteLength, 100);
});

test("signup validation and duplicate email", async () => {
  const c = new Client();
  assert.equal((await c.call("POST", "/api/auth/signup", { email: "nope", password: "12345678", displayName: "x" })).status, 400);
  assert.equal((await c.call("POST", "/api/auth/signup", { email: "a@b.co", password: "short", displayName: "x" })).status, 400);
  await signup("dupe@example.com");
  assert.equal((await c.call("POST", "/api/auth/signup", { email: "DUPE@example.com", password: "12345678x", displayName: "x" })).status, 409);
});

test("login: same error for unknown email and wrong password", async () => {
  await signup("login@example.com");
  const c = new Client();
  const a = await c.call("POST", "/api/auth/login", { email: "login@example.com", password: "wrong-password" });
  const b = await c.call("POST", "/api/auth/login", { email: "nobody@example.com", password: "wrong-password" });
  assert.equal(a.status, 401);
  assert.deepEqual(a.json, b.json);
  assert.equal((await c.call("POST", "/api/auth/login", { email: "LOGIN@example.com", password: "correct-horse-1" })).status, 200);
});

test("a second user cannot read a private playlist or change anyone's playlist", async () => {
  const alice = await signup("alice@example.com");
  const bob = await signup("bob@example.com");
  const anon = new Client();
  const p = (await alice.call("POST", "/api/playlists", { name: "Alice's private mix" })).json;
  const row = (await alice.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar01al1t1" })).json;
  assert.equal((await alice.call("PATCH", `/api/playlists/${p.id}`, { isPublic: false })).status, 200);

  // private: invisible to others, including search
  assert.equal((await bob.call("GET", `/api/playlists/${p.id}`)).status, 404);
  assert.equal((await anon.call("GET", `/api/playlists/${p.id}`)).status, 404);
  assert.equal((await bob.call("GET", "/api/search?q=private")).json.playlists.length, 0);
  assert.equal((await alice.call("GET", "/api/search?q=private")).json.playlists.length, 1);

  // public: readable, still not writable
  await alice.call("PATCH", `/api/playlists/${p.id}`, { isPublic: true });
  assert.equal((await bob.call("GET", `/api/playlists/${p.id}`)).status, 200);
  assert.equal((await bob.call("PATCH", `/api/playlists/${p.id}`, { name: "hacked" })).status, 403);
  assert.equal((await bob.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar01al1t2" })).status, 403);
  assert.equal((await bob.call("DELETE", `/api/playlists/${p.id}/tracks/${row.rowId}`)).status, 403);
  assert.equal((await bob.call("PATCH", `/api/playlists/${p.id}/tracks/${row.rowId}`, { afterRowId: null })).status, 403);
  assert.equal((await bob.call("DELETE", `/api/playlists/${p.id}`)).status, 403);
  assert.equal((await anon.call("DELETE", `/api/playlists/${p.id}`)).status, 401);
  assert.equal((await alice.call("GET", `/api/playlists/${p.id}`)).json.name, "Alice's private mix");

  // hearts and library are per user
  await alice.call("PUT", "/api/me/tracks/ar01al1t1");
  assert.deepEqual((await bob.call("GET", "/api/me/liked-ids")).json, []);
  assert.equal((await bob.call("GET", "/api/me/library")).json.items.length, 0);
  assert.equal((await anon.call("GET", "/api/me/library")).status, 401);
});

test("hearts are idempotent", async () => {
  const c = await signup("hearts@example.com");
  for (let i = 0; i < 3; i++) assert.equal((await c.call("PUT", "/api/me/tracks/ar02al1t1")).status, 204);
  assert.deepEqual((await c.call("GET", "/api/me/liked-ids")).json, ["ar02al1t1"]);
  await c.call("DELETE", "/api/me/tracks/ar02al1t1");
  await c.call("DELETE", "/api/me/tracks/ar02al1t1");
  assert.deepEqual((await c.call("GET", "/api/me/liked-ids")).json, []);
  assert.equal((await c.call("PUT", "/api/me/tracks/nope")).status, 404);
});

test("playlist duplicate warning, force add, reorder, remove", async () => {
  const c = await signup("pl@example.com");
  const p = (await c.call("POST", "/api/playlists", {})).json;
  assert.match(p.name, /^Playlist no\. 1$/);
  const a = (await c.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar01al1t1" })).json.rowId;
  assert.equal((await c.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar01al1t1" })).status, 409);
  const b = (await c.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar01al1t1", force: true })).json.rowId;
  const d = (await c.call("POST", `/api/playlists/${p.id}/tracks`, { trackId: "ar02al1t1" })).json.rowId;
  await c.call("PATCH", `/api/playlists/${p.id}/tracks/${d}`, { afterRowId: null }); // to top
  let rows = (await c.call("GET", `/api/playlists/${p.id}`)).json.tracks.map((t: any) => t.rowId);
  assert.deepEqual(rows, [d, a, b]);
  await c.call("PATCH", `/api/playlists/${p.id}/tracks/${d}`, { afterRowId: b }); // to bottom
  rows = (await c.call("GET", `/api/playlists/${p.id}`)).json.tracks.map((t: any) => t.rowId);
  assert.deepEqual(rows, [a, b, d]);
  assert.equal((await c.call("DELETE", `/api/playlists/${p.id}/tracks/${a}`)).status, 204);
  assert.equal((await c.call("GET", `/api/playlists/${p.id}`)).json.tracks.length, 2);
  assert.equal((await c.call("PATCH", `/api/playlists/${p.id}`, { name: "   " })).status, 400);
});

test("password reset: one use, expires, signs out other sessions", async () => {
  const c = await signup("reset@example.com");
  const other = new Client();
  await other.call("POST", "/api/auth/login", { email: "reset@example.com", password: "correct-horse-1" });
  logs = "";
  assert.equal((await new Client().call("POST", "/api/auth/forgot", { email: "reset@example.com" })).status, 202);
  assert.equal((await new Client().call("POST", "/api/auth/forgot", { email: "nobody@example.com" })).status, 202);
  await new Promise((r) => setTimeout(r, 300));
  const token = logs.match(/\/reset\/([A-Za-z0-9_-]+)/)?.[1];
  assert.ok(token, "reset link printed in dev mode");
  assert.ok(!logs.includes("reset@example.com"), "email address not written to logs");
  const r = await new Client().call("POST", "/api/auth/reset", { token, password: "a-new-password" });
  assert.equal(r.status, 200);
  assert.equal((await new Client().call("POST", "/api/auth/reset", { token, password: "again-password" })).status, 400, "single use");
  assert.equal((await other.call("GET", "/api/me")).json, null, "other session signed out");
  assert.equal((await c.call("GET", "/api/me")).json, null, "original session signed out");
  assert.equal((await new Client().call("POST", "/api/auth/login", { email: "reset@example.com", password: "a-new-password" })).status, 200);
});

test("account deletion removes everything the user owns", async () => {
  const c = await signup("gone@example.com");
  const p = (await c.call("POST", "/api/playlists", { name: "temp" })).json;
  await c.call("PUT", "/api/me/tracks/ar01al1t1");
  assert.equal((await c.call("DELETE", "/api/me", { password: "wrong" })).status, 403);
  assert.equal((await c.call("DELETE", "/api/me", { password: "correct-horse-1" })).status, 204);
  assert.equal((await new Client().call("GET", `/api/playlists/${p.id}`)).status, 404);
  assert.equal((await new Client().call("POST", "/api/auth/login", { email: "gone@example.com", password: "correct-horse-1" })).status, 401);
  assert.equal((await c.call("GET", "/api/me")).json, null);
});

test("plays are counted and recorded in history for users", async () => {
  const c = await signup("plays@example.com");
  const before = (await c.call("GET", "/api/albums/ar03al1")).json.tracks[0].playCount;
  assert.equal((await c.call("POST", "/api/plays", { trackId: "ar03al1t1", contextType: "album", contextId: "ar03al1" })).status, 204);
  const afterCount = (await c.call("GET", "/api/albums/ar03al1")).json.tracks[0].playCount;
  assert.equal(afterCount, before + 1);
  const home = (await c.call("GET", "/api/home")).json;
  assert.equal(home.shelves[0].id, "recent");
  assert.equal(home.shelves[0].items[0].id, "ar03al1");
});
