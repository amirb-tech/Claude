# Backend

Server: `app/server/` (Express on Node 22, SQLite via `node:sqlite`).
Env vars: `app/.env.example` (names only; no values committed).
Tests: `npm run test:api` — 10 tests on a temp database, including second-user access checks.

## Auth

- [x] Email + password sign up / log in, scrypt hashes, timing-safe compare
- [x] Session: random 256-bit token in an httpOnly, SameSite=Lax cookie (Secure in production); only the SHA-256 of the token is stored
- [x] Same error for unknown email and wrong password (no account enumeration); "forgot" always answers 202
- [x] Password reset: single-use token, 1 hour, hashed at rest; reset and password change sign out every other session
- [x] Sign out of all other devices
- [x] Account deletion that deletes (password required; `ON DELETE CASCADE` removes playlists, hearts, saves, follows, history, sessions, reset tokens)
- [ ] Email verification on sign up — not built. Low risk for a listening app (no email is sent to the address except resets), but add before any paid plan
- [ ] OAuth (Google/Apple) — not built; needs the user's own developer apps
- Roles: none in this slice (a playlist has one owner). Authorisation is `ownedPlaylist()` / `canRead()` in `server/index.ts`, called on every playlist read and write

## Database

- [x] Numbered migrations in `server/migrations/`, applied once each, in order, inside a transaction, tracked in `schema_migrations`
- [x] Access rules: data-layer checks on every query that touches user data; tested with a second user and with no user (`tests/api.test.ts`)
- [x] Seed: `npm run seed` loads the generated catalogue (invented artists, no real people)
- [ ] Backups: SQLite file on a persistent volume — enable the host's volume snapshots at deploy (replica-deploy), or run Litestream to object storage

## Payments

Not built, on purpose. There is no paid feature until replica-launch sets the
pricing. When it does: Stripe Checkout + Customer Portal (no card forms),
webhook with signature check, event-id table for idempotency, handlers for
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`, subscription status
stored in our DB, one-click cancel. Keys go in `STRIPE_SECRET_KEY` /
`STRIPE_WEBHOOK_SECRET`, created by you in Stripe test mode.

## Email and jobs

- [x] Password reset email via Resend's public API when `RESEND_API_KEY` + `MAIL_FROM` are set (your account, your domain). Without them the link prints to the server log for development — the address is not logged
- Templates written fresh (`server/mail.ts`)
- Jobs: none needed yet. Expired sessions/reset tokens are rejected on read; a nightly cleanup can be added when volume warrants it

## Integrations

None in this slice. Audio and art are self-hosted files the operator owns.
Candidate later integrations and what they need: object storage (R2/S3) for
uploads — bucket + keys, signed upload URLs, size/type limits.

## Security checklist

- [x] secrets only in env vars, `.env*` in `.gitignore`, nothing in client bundles
- [x] input validated on the server on every route (type, length, format, existence; hand-written checks rather than zod)
- [x] authorisation checked on every read and write, tested with a second user
- [x] rate limits: 10 / 15 min per IP on login, sign up, reset, change password; 5 / hour on forgot-password (in-memory: one process; use Redis if scaled out). Verified: 11th login attempt gets 429
- [n/a] webhooks verify signatures — no webhooks yet
- [n/a] uploads — none yet; media is served read-only from `media/`
- [x] no user data in URLs or logs (ids only; reset mail logs redact the address)
- [x] dependencies audited: `npm audit --omit=dev` → 0 vulnerabilities (fixed body-parser, path-to-regexp, qs; upgraded react-router-dom 6 → 7.18.6 for an open-redirect advisory). Remaining: esbuild in the Vite **dev server** only (moderate; fix is Vite 8, a major) — not shipped to production
- [ ] privacy policy listing processors (host, Resend) — replica-deploy preflight
- [x] headers: X-Content-Type-Options nosniff, Referrer-Policy same-origin, x-powered-by off; JSON body limit 32 kB; SQL fully parameterised; LIKE wildcards escaped
