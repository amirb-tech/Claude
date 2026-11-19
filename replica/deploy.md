# Deploy

Status: **preflight passed, not deployed.** Nothing goes live without your go,
and three items below need you first.

## Preflight results (run 2026-11-19)

| check | result |
| --- | --- |
| Production build (`tsc` + `vite build`) | pass — JS 83 kB gzipped (budget 100 kB) |
| API tests (`npm run test:api`) | **10 / 10 pass** (auth, access rules with a second user, reset, deletion, Range) |
| End-to-end (`npx playwright test`) | **37 / 37 pass**, axe WCAG 2.1 A/AA scan on every screen incl. landing, privacy, terms |
| Feature parity (`parity.py`) | **95.3**, must-haves 19 / 19 |
| Rebrand sweep (`sweep.py --config replica/brand.json`) | **clean** (exit 0) |
| Store listing (`listing.py`) | 0 errors, 0 warnings |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Open S1 / S2 bugs | none (`bugs.md`) |
| Account deletion works | yes (API test + Settings form) |
| Privacy + terms pages, listing processors | built (`/privacy`, `/terms`) — **contact email and operator not set** |
| Cookie banner | not needed: one essential session cookie, no analytics or ad cookies |
| Favicon, titles, OG image are ours | yes (`public/favicon.svg`, `public/og.png`, title "Cueline") |
| Container image | Dockerfile written; **Docker daemon unavailable here**, so the image was not built. Its runtime stage was reproduced by hand (prod deps + tsx, fresh data dir, seed + start): `/welcome`, `/api/home`, `/privacy`, `/og.png`, audio all 200 |

## Stops before going live (you)

1. **Set `supportEmail` and `operator` in `app/src/brand.ts`.** The privacy and terms pages show "[not set]" until you do. Also name your hosting provider in the privacy page.
2. **Real music.** The catalogue is 46 demo tracks synthesised by `scripts/make_media.py`. Fine for a demo deploy; the public launch needs music you own or have licensed, loaded through the same `catalog.json` shape.
3. **Name checks** in `brand.md` are all "to run" (trademark, domain, stores, handles). Run them, ideally with a trademark lawyer, before buying the domain.

## Host

The app is one Node process with a SQLite file, so it needs a host with a
**persistent volume**. Vercel (connected here) runs serverless functions with
no persistent disk, so it would mean moving the database to Postgres (Neon)
first. Recommended instead:

- **Fly.io** or **Render**, from `app/Dockerfile`, with a 1 GB volume mounted at `/data`, one instance (SQLite is single-writer).
- Env vars on the host (from `app/.env.example`): `NODE_ENV=production`, `PUBLIC_URL=https://<your domain>`, `APP_NAME=Cueline`, `DATA_DIR=/data`, `TRUST_PROXY=1`, and later `RESEND_API_KEY`, `MAIL_FROM`.
- Migrations run on every start (`server/db.ts`), not by hand. Seeding is idempotent and keeps user data.
- Backups: turn on the host's volume snapshots (daily), or add Litestream to object storage.
- Media: `media/` is baked into the image now. Move it to object storage (R2/S3) once the catalogue grows past a few hundred MB.

## Domain (after you buy it)

| record | name | value |
| --- | --- | --- |
| A / AAAA | @ | the IPs your host shows for the app (Fly: `fly ips list`; Render: its apex instructions) |
| CNAME | www | your host's target (Fly: `<app>.fly.dev`; Render: `<service>.onrender.com`) |
| TXT | as the host asks | verification value, if asked |

Canonical host: the apex (`yourdomain`), with `www` redirecting to it. HTTPS is automatic on both hosts; check the padlock after DNS settles.

Email (for password resets through Resend, your account): add the SPF TXT and DKIM records Resend shows for your domain, then DMARC:
`_dmarc  TXT  v=DMARC1; p=none; rua=mailto:<you>@<yourdomain>`. Tighten to `p=quarantine` once the reports are clean.

## Payments, OAuth

Nothing to switch: no paid tier and no OAuth in this release (see `launch/pricing.md`: launch Listener-only, Supporter as a waitlist).

## Watch it (first week)

- Error tracking: Sentry (your account) or the host's logs; alert to your email.
- Uptime checks every 5 minutes on `/welcome` and `/api/home`.
- Privacy-friendly analytics (Plausible or similar) — add it to `/privacy` when you do.
- Do the core flow on the live site (search → play → heart → playlist) on desktop, and on your phone.
- Watch: 5xx count, `/api/plays` volume, sign-up errors, 429s on login (rate limiting is per-process and in memory).

## Mobile

No native app in this release; the web player is responsive. Store listing
text is ready in `launch/listing.json` for when an Expo build exists.
