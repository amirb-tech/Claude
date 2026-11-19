# Bugs

Only reproduced bugs. Severity: S1 data loss / security / core flow blocked,
S2 feature broken no workaround, S3 broken with workaround or visibly wrong,
S4 cosmetic.

| ID | sev | title | status |
| --- | --- | --- | --- |
| BUG-001 | S3 | Empty playlist cover is announced as an unnamed image | fixed |
| BUG-002 | S3 | "Now playing" bars use a label they aren't allowed to carry | fixed |
| BUG-003 | S3 | Queue is lost on page refresh | fixed |
| BUG-004 | S4 | "1 songs" in the sidebar | fixed (during build) |
| BUG-005 | S3 | Album/playlist header sat 16px inside the screen edge on mobile | fixed (during build) |
| BUG-006 | S2 | Hook called conditionally in the app shell (`useMatch() \|\| useMatch()`) | fixed (during build, before it could misfire) |

## BUG-001 Empty playlist cover is announced as an unnamed image
- Severity: S3 (screen-reader users hear "image" with no name; axe: role-img-alt, serious)
- Steps: log in → New playlist → run axe on the page (or the collection page)
- Expected: decorative placeholder hidden from assistive tech
- Actual: `<div role="img" aria-label="">`
- Evidence: e2e `F04-H1/E1` and `F09-E1/H1` axe failures, run 1
- Fix: `CoverMosaic` renders `aria-hidden` when it has no name (`app/src/ui.tsx`). Test kept: both specs scan with axe.

## BUG-002 "Now playing" bars use a label they aren't allowed to carry
- Severity: S3 (axe: aria-prohibited-attr, serious; the label may be ignored)
- Steps: play an album → run axe on the album page
- Expected: the playing indicator is announced as "Now playing"
- Actual: `<span aria-label="Now playing">` with no role
- Evidence: e2e `F05-H1` and design-page axe failures, run 1
- Fix: `role="img"` on the indicator.

## BUG-003 Queue is lost on page refresh
- Severity: S3 (songs you lined up vanish; workaround: queue them again)
- Steps: play an album → Add to queue on any song → refresh → open Queue
- Expected: the queued song is still there (the current song and volume already survive a refresh)
- Actual: "Your queue" is empty
- Evidence: e2e `F06-H1/E2` run 1 (it used a full reload)
- Fix: queue and its source are persisted with the rest of the player state (`app/src/player.ts`). New test `F06-E3` reproduces it and now passes.

## Test mistakes found in run 1 (not app bugs)
- `F05-E6`, `F08 settings`: the same accessible name ("Play Boss Room", "Log in") correctly appears twice on the page; selectors made specific.

## To check (not reproduced)
- Media Session controls on a real phone lock screen (F05-E7, manual)
- Reset email delivery through Resend with your domain (F08-E7, manual, needs your key)
- Slow network / offline: spot-checked the error states render with "Try again"; no throttled automated run

## Summary
API tests: 10/10. E2E: 34/34, three consecutive green runs, axe scan (WCAG 2.1 A/AA, serious+critical) on 17 screens/states.
Bugs: S1 0, S2 1 (fixed), S3 4 (fixed), S4 1 (fixed). Open: none.
