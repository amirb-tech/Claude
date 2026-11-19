import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { get, run, now } from "./db.ts";

export type User = { id: string; email: string; displayName: string };
declare module "express-serve-static-core" {
  interface Request { user?: User }
}

const COOKIE = "sid";
const SESSION_MS = 30 * 24 * 3600 * 1000;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(pw, Buffer.from(saltB64, "base64"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = now() + SESSION_MS;
  run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)", sha(token), userId, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    maxAge: SESSION_MS,
    path: "/",
  });
}

export function endSession(req: Request, res: Response) {
  const token = readCookie(req);
  if (token) run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
  res.clearCookie(COOKIE, { path: "/" });
}

function readCookie(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
}

/** Attaches req.user when the session cookie is valid. Never rejects. */
export function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = readCookie(req);
  if (token) {
    const row = get<{ id: string; email: string; display_name: string; expires_at: number }>(
      `SELECT u.id, u.email, u.display_name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`, sha(token));
    if (row && row.expires_at > now()) req.user = { id: row.id, email: row.email, displayName: row.display_name };
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Log in to do that." });
  next();
}
