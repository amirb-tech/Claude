# Brand

Angle (from `fixes.md`, option A): **the player that does what you tell it.**
It plays exactly what you picked, in the order you asked for, with nothing
added and nothing in the way.

## Name

### 20 candidates

| style | candidates |
| --- | --- |
| descriptive | Playlist Plain, Asplayed, Tracksure, Honest Play |
| compound | Cueline, Keeptrack, Sidefold, Linerplay |
| invented | Verro, Quelo, Tunely-free *(cut: "-ly")*, Ordo |
| metaphor | Needle, Spindle, Liner, Setpiece |
| verb | Cue, Spin, Queue Up, Press |

### Cut to five

Filters: not confusingly similar to the original in sound, look or meaning
(no "-ify", no green-circle imagery, no "spot"); short, spellable after one
hearing; supports the angle.

| name | why it survives | concern |
| --- | --- | --- |
| **Cueline** | "cue it up, it plays the line you set": the angle in one word; invented compound, easy to say | could be heard as "queue line" — which still fits |
| Ordo | "order"; short, invented | Latin word, likely used by other companies |
| Spindle | turntable spindle; music without a gimmick | common word: many existing marks likely |
| Liner | liner notes; the music as made | generic; weak to register |
| Keeptrack | "keeps your track list as you set it" | two words run together; Keep is a Google brand in apps |

**Recommendation: Cueline**, pending the checks below.

### Checks (screening, not legal clearance)

None of these could be run from this session: no `whois` here, and the
trademark office and store sites are not reachable from this environment.
Every row is **to run**. Nothing is assumed available.

| check | Cueline | Ordo | Spindle | Liner | Keeptrack |
| --- | --- | --- | --- | --- | --- |
| US trademark (tmsearch.uspto.gov, classes 9, 41, 42) | to run | to run | to run | to run | to run |
| EU trademark (TMview / EUIPO eSearch) | to run | to run | to run | to run | to run |
| Canada (ised-isde.canada.ca) | to run | to run | to run | to run | to run |
| WIPO Global Brand Database | to run | to run | to run | to run | to run |
| domain (.com, .app, .fm) | to run | to run | to run | to run | to run |
| App Store + Google Play exact-name search | to run | to run | to run | to run | to run |
| handles (X, Instagram, TikTok, GitHub) | to run | to run | to run | to run | to run |
| web search "name + music app" | to run | to run | to run | to run | to run |

Before spending money on the name (domain, logo, store listing), have a
trademark lawyer run a proper clearance search.

## Palette

The original's family is a saturated green on near-black. This palette is a
**warm coral on a plum-tinted ink**: a different hue family (≈14° vs ≈141°)
and a different background temperature, so the colour pair doesn't read as
the original's.

| role | value | role | value |
| --- | --- | --- | --- |
| bg | `#0d0b10` | text | `#f6f2ee` |
| surface | `#17141c` | text-muted | `#b3abbd` |
| surface-2 | `#221e29` | accent | `#ff8a65` (coral) |
| surface-3 | `#2f2a38` | on-accent | `#1a0f0a` |
| border | `#3a3445` | danger | `#ff6b81` |
| border-input | `#8a8296` | success | `#8fe3b0` |

Contrast: 15 pairs, **0 AA failures** (`contrast.py design/tokens.json`).
The original's brand colours are listed in `brand.json` so the sweep catches
any that survive.

## Logo brief

- **Idea:** a cue mark. A play triangle resting on a short horizontal line:
  "this, then this, in this order". It says the product does what you set up,
  nothing more.
- **Mark type:** symbol + wordmark ("Cueline", lowercase-friendly, a rounded
  geometric sans such as Manrope ExtraBold).
- **Works at:** 16px favicon (triangle + line only, no wordmark) and 1024px
  app icon (coral mark on the ink background, generous margin).
- **Deliverables:** SVG master; iOS app icon 1024×1024 with no transparency;
  favicon set (16, 32, 180 apple-touch, SVG); social image 1200×630 (mark +
  wordmark + "Plays what you pick." on ink).
- **Must not resemble the original's mark:** no circle containing curved
  sound-wave bars, no green, no green-on-black pairing, no stacked arcs. Put
  the original's logo next to the drafts and check before using one.
- A placeholder mark following this brief is in `app/public/favicon.svg` and
  in the sidebar. Replace it with the designed version.

## Voice: plain, calm, exact

| word | means | does not mean |
| --- | --- | --- |
| plain | everyday words, short sentences | flat or robotic |
| calm | no hype, no exclamation marks, no FOMO | cold |
| exact | says what will happen, then does exactly that | legalistic |

| do | don't |
| --- | --- |
| "Plays what you pick." | "Discover your next obsession!" |
| "Added to Road trip." | "Woohoo! Great choice!" |
| "Nothing here yet. Search for a song and add it." | "Looks like it's lonely in here…" |
| "That email and password don't match." | "Oops! Something went wrong :(" |
| "Delete Road trip? This can't be undone." | "Are you SURE you want to do this?!" |

### The ten most-seen strings, rewritten

| where | before (placeholder) | after |
| --- | --- | --- |
| product name | Untitled Player | Cueline |
| tagline | Music you can own the rights to. | Plays what you pick. |
| sign up heading | Join Untitled Player | Make your Cueline account |
| sign up button | Create account | Create account (unchanged: already plain) |
| login heading | Welcome back | Log in to Cueline |
| empty playlist | This playlist is empty | Nothing here yet |
| empty playlist body | Search below, or right-click any song… | Search below and add a song, or use Add to playlist on any song. |
| idle player | Pick something to play | Pick something. It'll play just that. |
| added toast | Added to {name} | Added to {name} (unchanged: already exact) |
| generic error | That didn't load | That didn't load (unchanged) |

## Sweep

`python3 ~/.claude/skills/replica-brand/sweep.py . --config replica/brand.json`
— result recorded in the summary of this run.
