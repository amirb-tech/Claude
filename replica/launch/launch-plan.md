# Launch plan

## Before launch
- [ ] Replace the demo catalogue with real music the operator owns or has licensed (the whole product depends on this)
- [ ] Run the name checks in `../brand.md` and get a trademark search before buying the domain
- [ ] Waitlist: a "Get notified" field on `/welcome` (needs an email list provider you choose; not built)
- [ ] Error tracking (e.g. Sentry, your account) and privacy-friendly analytics (e.g. Plausible) live, listed in the privacy policy
- [ ] Privacy policy, terms, support email (replica-deploy preflight)
- [ ] 5–10 beta listeners, asked by name, with permission to quote them later

## Where the unhappy listeners talk
From the research (`../fixes.md`): Hacker News threads about alternatives and
shuffle, and the App Store reviews themselves (not a channel — don't reply to
a competitor's reviews). Reddit wasn't collected in this run; search it by
hand for "music app without ads", "shuffle not random", "stop adding songs to
my playlist". Join the conversation as yourself, answer the question asked,
and link only when it fits.

## Launch posts (lead with the fix, not the copy)
- **Show HN:** "Show HN: Cueline – a music player that plays exactly what you pick." Body: the fair-shuffle rule (every song once, current song first), why nothing is ever inserted, the 74 kB bundle, SQLite, and how the demo music was synthesised. Be there to answer for the first two hours
- **Product Hunt:** tagline "Plays what you pick." Gallery: the playlist page, the queue panel showing the shuffle order, the settings toggle

## The first 10 users, by hand
Write to each beta listener personally: what did they expect to happen that
didn't? Track answers in a sheet. Ten conversations before any paid tier.

## Don'ts
- No reviewer quotes from the research on the site, in ads or posts
- No "better than [the original]" claims, and the original's name stays out of ads and keywords
- No fake counts, ratings or "trusted by" logos
- No in-app prompts asking for store reviews (that's fix #6)
