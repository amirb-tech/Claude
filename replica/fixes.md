# What to do better than the original

## The sample, honestly

- **696 reviews, 2 sources** (after removing 4 duplicates): 496 App Store reviews (US, official review RSS feed, every rating) and 200 Hacker News comments that mention the original (official Algolia API; searches: "spotify alternative", "switched from spotify", "spotify shuffle", "spotify UI").
- **Skew 1:** the App Store feed only exposes the newest ~500 reviews, so they all date from 16–17 Nov 2026. It shows what people feel *this week*, not a trend over time.
- **Skew 2:** the Hacker News comments span 2011–2026 and come from a technical crowd. Older complaints may already be fixed.
- **Not collected:** Google Play, Reddit, Trustpilot, the original's feature-request board. Those hosts aren't reachable from this session, and Reddit's API needs your own app key. Collecting a third source would make this stronger. The skill's 3-source minimum is **not met**.
- Theme counts come from keyword matching (`themes.json`), so they include some neutral or positive mentions. The average star rating per theme is the better signal of anger. Full ranking: `feedback.md`.

## 1. What they hate

| # | problem | reviews | sources | avg ★ | evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | **Ads, and paying to escape them** | 82 (36 rated ≤3★) | 2 | 3.1 | "THE ADS." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14799911556) · "I wish there were no ads bro" [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802320493) |
| 2 | **Shuffle doesn't feel random, and turns itself on and off** | 73 | 2 | 2.3 | "This the shuffling actually sucks." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802834782) · "Shuffle also keeps turning itself on and off, which resets everything and skips the song I was listening to with no way to go back." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802712823) |
| 3 | **Can't pick the song you want on the free tier / skip limits** | 31 | 2 | 2.9 | "It would be nice if you could pick your song more often and not have to have premium" [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802700844) |
| 4 | **The app is cluttered: AI DJ, video, podcasts and audiobooks pushed on people who came for music** | 76 (mixed tone) | 2 | 4.1 | "Hate how AI controls this now." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14799794226) · "Spotify's whole UI is far too complicated and I wish they would go the Facebook route of breaking out the separate products into separate apps." [link](https://news.ycombinator.com/item?id=47385694) |
| 5 | **Redesigns made it worse** | 46 | 2 | 3.2 | "Horrible new update." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802957285) |
| 6 | **Bugs, freezing, slowness** | 28 + 16 | 2 | 1.5 / 1.3 | "insanely slow, always freezing." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14803099193) |
| 7 | **Queue disappears or misbehaves** | 14 | 2 | 2.6 | "…deletes queues randomly, and they keep adding features that bog things down with no way to toggle them off." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14799090655) |
| 8 | **Plays songs that aren't in my playlist** (recommended songs, smart shuffle) | 8 | 2 | — | "i wish spotify would just play my playlist not recommended." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14799713004) |
| 9 | **Nags for app-store reviews** (thin: one source) | 8 | 1 | 1.0 | "Won't stop forcing me to review" [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14801609680) |


## 2. What is missing

| # | ask | reviews | sources | evidence |
| --- | --- | --- | --- | --- |
| 1 | Offline that actually works | 25 | 2 | "Their offline feature has become rubbish." [link](https://news.ycombinator.com/item?id=19937956) |
| 2 | Turn things off: a way to hide recents and features you don't use | 13 | 2 | "…you can't customize some things (clean recents for example…" [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14800923165) |
| 3 | A way to filter out AI-generated music | 15 mention AI (1 asks for this filter) — thin | 2 | "I wish Spotify would have a feature to block AI generated music." [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802017704) |
| 4 | Lossless audio | 9 | 2 | (mostly HN comparisons with other services) |

## 3. What is unsolved (positioning material)

- **People who want a music player, not a media platform.** This shows up across themes 1, 4, 5 and 8: control over what plays, no pushed content, no clutter. "Control. More and more control is pushing me to a different music app" [link](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580?see-all=reviews#review-14802841925)
- **Independent artists and small labels who want to reach listeners directly** (thin: 3 reviews, 1 source) — "…this would be more like soundcloud where individuals/smaller artistes would upload and connect with fans…" [link](https://news.ycombinator.com/item?id=26165918). This matches the clone's starting premise (it streams music the operator owns), but the evidence here is too thin to bet on alone.
- **Free listeners who are made to feel punished** ("No money, no music…") — this belongs to pricing, in replica-launch.

## 4. Fix plan

Ranked by evidence × how cheaply this clone can do it. "Have" means it's already true in the build. This is a design decision, not a claim about how many people want it.

| # | fix | size | skill | evidence | status |
| --- | --- | --- | --- | --- | --- |
| 1 | **No ads, and every listener can pick any song and skip freely** — enforced as a product rule, priced in replica-launch | S | launch | hate #1, #3 (113 reviews) | have (no ads, no skip limits exist) |
| 2 | **Honest shuffle**: every song once before any repeats, current song stays, the setting persists and never changes by itself, and the queue panel shows the exact upcoming order | S | build | hate #2 (73) | have; e2e `F05-E1` proves it |
| 3 | **Your list, only your list**: never insert recommended songs into a playlist or album, and no autoplay unless you turn it on | S | build | hate #8 (8), unsolved #1 | have; diff item "autoplay" becomes **opt-in, off by default** |
| 4 | **Turn it off**: a setting to hide "Pick up where you left off" and the other personal shelves on Home | S | build | missing #2 (13) | **built now** |
| 5 | **A queue that stays put**: survives refresh (done) and later syncs across devices | S / M | build + backend | hate #7 (14) | refresh: have (BUG-003). Sync: to do |
| 6 | **Never ask for app-store reviews** inside the app | S | launch | hate #9 (8, thin) | have; written into the launch checklist |
| 7 | **Music only**: no podcasts, video or AI host in the player | S | brand | hate #4 (76, mixed) | have; a brand promise |
| 8 | **Fast and light**: the web app's JavaScript is 74 kB gzipped; keep a performance budget | S | test | hate #6 (44) | have; add a bundle-size check |

Not now: lossless (needs a lossless pipeline and storage costs; evidence is mostly HN comparisons), offline (needs native apps), AI-music filter (thin; it matters only once outside uploads exist). Note that the seed catalogue is music generated by a script, so label it as demo audio until real artists' music replaces it.

## 5. The angle

**Option A — the player that does what you tell it**
For listeners who are tired of shuffle that isn't, playlists that get "enhanced", and an app that keeps adding things they never asked for, *[name]* plays exactly what you picked, in the order you asked for, with nothing else in the way.
Evidence: shuffle (73 reviews, 2 sources, 2.3★), songs added that the user didn't choose (8, 2 sources), clutter (76, 2 sources), "control" in the hand-read low ratings.

**Option B — no ads, no walls**
For people who hate ads and skip limits, *[name]* lets everyone play any song, skip freely, and never hear an ad.
Evidence: ads (82 reviews, 2 sources), can't pick or skip songs (31, 2 sources). Risk: this is a pricing promise that depends on the business model (see replica-launch).

**Option C — music straight from the people who made it**
For independent artists and small labels, *[name]* is a clean listening home for music they own, with nothing between them and their listeners.
Evidence: thin (3 reviews, 1 source). It fits the rights reality of this clone, but the reviews don't prove demand.

**Recommendation: A.** It has the broadest evidence, it's true of the build today, it's cheap to keep true, and it's not a race on catalogue size, which a clone can't win. B works as a supporting line ("no ads, ever") once pricing is set. C describes the *supply* side (where the music comes from) and can sit underneath A without being the headline.

The original's name stays out of our product name, ads and store listing.
