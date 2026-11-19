# Pricing

## The market (to fill: not read in this session)

The pricing pages below were **not reachable from this session** (network
policy), so no prices are written here from memory. Fill each row from the
live page and write the date you read it. Prices change.

| service | plan(s) | monthly | annual | free tier limits | URL | date read |
| --- | --- | --- | --- | --- | --- | --- |
| the original | individual / duo / family / student | to fill | to fill | to fill (ads, skips, on-demand) | its public premium page | to fill |
| alternative 1 (a major streamer) | | to fill | to fill | to fill | | to fill |
| alternative 2 (an artist-direct platform) | | to fill | to fill | to fill | | to fill |

## What reviewers said about price and billing (from `../feedback.md`)

- Price and paywalls: 110 matches across 2 sources (mixed tone, avg 3.5★).
- Ads: 82 across 2 sources (avg 3.1★). Can't pick songs or skip on the free tier: 31 across 2 sources.
- Billing, cancelling and refunds: 11 across 2 sources, avg **1.0★**. Few reviews, all angry.

Read: people resent paying *to remove punishment* (ads, locked songs, skip
limits) more than they resent paying at all. Nobody asked for a cheaper copy.

## The model

**The free plan is the full player.** It's the angle, so it can't sit behind a
paywall: no ads, no skip limits, every song on demand. Money comes from
supporters who pay *for the music to exist*, and from the operators who host
their catalogue on Cueline.

| tier | for | price (proposal) | what's in it |
| --- | --- | --- | --- |
| **Listener** | anyone | free | Everything in the player. No ads, no skip limits, any song on demand, playlists, hearts, honest shuffle |
| **Supporter** | listeners who want the artists paid | $4 / month or $40 / year (2 months free) | Same player, plus: a fixed share of your payment split between the artists you actually played that month (shown to you); queue sync across devices *(when built, see fixes #5)*. Nothing is taken away from free listeners to make this worth it |
| **Label** | an indie label, collective or community hosting its own music | $29 / month flat per catalogue, up to 2,000 tracks | Upload and manage the catalogue *(needs the upload pipeline: not built)*, play stats per track, your own Cueline page. Flat price: no per-listener or per-seat jumps |

Proposals, not decisions. Check them against the market table once it's
filled, and against what a supporter share per artist actually comes to.

**Not launch-ready:** Supporter's sync and everything in Label depend on
features that aren't built. Launch with **Listener only**, and open a
Supporter waitlist with one honest line: "Pay the artists you play. Opening
soon." Charge only when the paid features exist.

## Billing, done the way reviewers wish it were

- One-click cancel in Settings. No retention maze. Access lasts to the end of the period
- Renewal email 7 days before an annual renewal, with the amount and a cancel link
- No auto-upgrades, no surprise price jumps. A price change gives 30 days' notice and needs a click to accept
- Receipts by email. Refunds within 14 days of a renewal, no questions asked

## Stripe setup (you create these in test mode first)

- Product **Cueline Supporter**: prices `supporter_monthly` $4/mo and `supporter_annual` $40/yr
- Product **Cueline Label**: price `label_monthly` $29/mo
- Customer Portal: allow cancel (end of period), payment-method update and invoice history; disallow plan "downgrade traps"
- Webhook endpoint `/api/stripe/webhook` with the events in `../backend.md`. The code isn't written yet; it lands with the first paid tier
