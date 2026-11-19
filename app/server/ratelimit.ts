import type { Request, Response, NextFunction } from "express";

/** Fixed-window, in-memory rate limit keyed by client IP. One process only; use Redis when scaling out. */
export function rateLimit(name: string, max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  setInterval(() => {
    const t = Date.now();
    for (const [k, v] of hits) if (v.reset < t) hits.delete(k);
  }, windowMs).unref();
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === "1") return next();
    const key = `${name}:${req.ip}`;
    const t = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < t) { hits.set(key, { n: 1, reset: t + windowMs }); return next(); }
    h.n++;
    if (h.n > max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - t) / 1000));
      return res.status(429).json({ error: "Too many tries. Wait a few minutes and try again." });
    }
    next();
  };
}
