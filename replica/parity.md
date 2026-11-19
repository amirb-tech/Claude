# Parity report

Date: 2026-11-19. Clone: `app/` at the replica-test commit.

## Scores

| measure | score |
| --- | --- |
| **Feature parity** | **95.3 / 100** (36 features counted, 19 of 19 must-haves done) |
| Layout parity | **not measured** — no reference screenshots of the original in `replica/screens/` |
| Open bugs | S1 0, S2 0 (see `bugs.md`) |

Layout was not scored because this run never loaded the original app (no
account of yours was used, and no public pages were screenshotted). To
measure it: save public-page screenshots of the original at 1440x900 as
`replica/screens/S05.png` (artist), `S06.png` (album), `S07.png` (public
playlist), then run, per screen:

```bash
python3 ~/.claude/skills/replica-diff/imgdiff.py replica/screens/S06.png replica/clone-screens/S06-album-playing.png --out replica/diffs/S06.png
```

Expect "close" rather than "matches": the layout pattern (library rail, main
view, bottom player) is the same on purpose; proportions and details are not,
also on purpose, since replica-brand changes the look before launch.

By area (weakest first): settings 0 (crossfade only), sharing 50, playlists
89, player 96, everything else 100. Full table: `diffs/parity-features.md`.

## Missing, in build order

1. [could] Autoplay similar songs when an album or playlist ends
2. [could] Collaborative playlists
3. [could] Crossfade setting
4. [could] Playlist cover image upload (has an automatic cover mosaic)
5. [could] Share links to a song or playlist (has copy link to the album)

## Behaviour differences

| flow | original does | clone does | fix or keep |
| --- | --- | --- | --- |
| F01 play from home | 1 click on a card's play button | 1 click | keep |
| F02 search and play | type, 1 click | type, 1 click (or Enter) | keep |
| F04 add song to a playlist | right-click → Add to playlist → pick (3) | same (3), plus an inline "Add songs" search on the playlist page | keep |
| F04 duplicate song | asks before adding again | asks before adding again | keep |
| F05 end of album, repeat off | keeps playing recommended songs (autoplay) | stops on the last song | build autoplay as an opt-in setting (missing #1) |
| F05 refresh | resumes the last song | resumes the last song, paused, with queue and volume | keep |
| F06 queue | persists across sessions and devices | persists in this browser only | keep for now; cross-device needs server-side queue |
| F08 forgot password | email link | email link (needs your Resend key in production) | keep |
| Account deletion | multi-step, through support pages | one form in Settings, takes effect at once | keep — better |
| Logged-out playback | public pages playable with limits / prompts to sign up | everything playable without an account; account only for saving | keep — fewer walls |
| Ads / skip limits on a free tier | yes | none | keep (no ads planned; pricing set in replica-launch) |
| Recommendations | personalised | rule-based shelves (recent, most played, new) | keep until there is listening data |

## Verdict

**Shippable** as a product slice: every must-have is done, feature score 95.3
(≥ 80), no open S1 or S2 bugs.

Not yet **better than the original**: that takes the fixes from
replica-entrepreneur. A straight copy has no reason to exist — the next step
is finding what this clone should do differently.

## Top five to build next

1. Whatever replica-entrepreneur ranks first (it outranks everything below)
2. Autoplay at the end of a list, as a setting that defaults on
3. Share links for songs and playlists (with an open-graph preview)
4. Playlist cover upload (needs the upload rules from backend.md: size/type limits, separate bucket)
5. Crossfade (Web Audio, two `<audio>` elements)
