# Architecture: (name set by replica-brand) — a rebuild of Spotify's web-player listening loop

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Vite + React 18 + TypeScript + React Router | a client-side player must survive navigation; an SPA keeps one `<audio>` alive with no server-component boundaries to fight |
| styling | plain CSS with custom-property tokens from replica-design | no build plugin, tokens map 1:1 to variables |
| server | Node 22 + Express | one small process serves API, audio (with Range) and the built app |
| database | SQLite via built-in `node:sqlite` | zero services, one file, nothing to install; port to Postgres (Neon/Supabase) when there is more than one server |
| auth | email + password, scrypt hashes, httpOnly session cookie (hashed token in `sessions`) | no third-party account needed to run it; swap for Supabase Auth/Auth.js at deploy if wanted |
| payments | none in this slice (Stripe Billing planned in replica-backend notes) | the core loop has no paywall yet |
| email | none in this slice | no flow needs email until password reset |
| files | local `media/` dir (audio + covers), served with HTTP Range | swap for R2/S3 + CDN in production |
| jobs | none | play counts are written inline |
| hosting | any Node host (Fly, Render, Railway) with a persistent volume for the SQLite file | single process, single volume |

## Schema

Tables: 10 (`users, sessions, artists, albums, tracks, playlists,
playlist_tracks, saved_tracks, saved_albums, followed_artists, play_history`
— 11 with sessions). Access rules: data-layer checks, every mutating query on
a playlist filters by `owner_id = current user`. See `replica/schema.sql`.

Hard constraints: `UNIQUE(album_id, track_number)`; liked/saved/followed are
composite primary keys so double-clicks can't create duplicates;
`playlist_tracks` has its own id so the same song can appear twice (as the
original allows) and `position` is fractional so a reorder touches one row.

## API

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST /api/auth/signup | create user + session | anyone | email, password, display_name | user | F08 |
| POST /api/auth/login | start session | anyone | email, password | user | F08 |
| POST /api/auth/logout | end session | user | — | 204 | F08 |
| GET /api/me | current user or null | anyone | — | user? | F08 |
| GET /api/home | shelves: recently played, your playlists, popular, new releases, artists | anyone (personal shelves if user) | — | shelves[] | F01 |
| GET /api/search?q= | tracks, artists, albums, playlists | anyone | q | grouped results | F02 |
| GET /api/genres | browse tiles | anyone | — | genres[] | F02 |
| GET /api/genres/:g | artists + albums in genre | anyone | — | lists | F02 |
| GET /api/artists/:id | artist, popular tracks, albums, following? | anyone | — | artist | F07 |
| GET /api/albums/:id | album + tracks, saved? | anyone | — | album | F07 |
| GET /api/playlists/:id | playlist + tracks | owner, or anyone if public | — | playlist | F04 |
| POST /api/playlists | create "My Playlist #n" | user | name? | playlist | F04 |
| PATCH /api/playlists/:id | rename/describe/public | owner | name, description, is_public | playlist | F04 |
| DELETE /api/playlists/:id | delete | owner | — | 204 | F04 |
| POST /api/playlists/:id/tracks | add track (warn on duplicate unless force) | owner | track_id, force? | row / 409 duplicate | F04 |
| DELETE /api/playlists/:id/tracks/:rowId | remove a row | owner | — | 204 | F04 |
| PATCH /api/playlists/:id/tracks/:rowId | move row | owner | before_row_id / after_row_id | row | F04 |
| GET /api/me/tracks | Liked Songs | user | — | tracks | F03 |
| PUT / DELETE /api/me/tracks/:trackId | like / unlike (idempotent) | user | — | 204 | F03 |
| PUT / DELETE /api/me/albums/:albumId | save / unsave album | user | — | 204 | F09 |
| PUT / DELETE /api/me/artists/:artistId | follow / unfollow | user | — | 204 | F09 |
| GET /api/me/library | playlists, saved albums, followed artists | user | — | items | F09 |
| GET /api/me/liked-ids | set of liked track ids (for hearts) | user | — | ids[] | F03 |
| POST /api/plays | log a play (after 30s or end) | anyone; history only if user | track_id, context | 204 | F05 |
| GET /media/* | audio + images, Range supported | anyone | — | bytes | F05 |

Webhooks in/out: none. Jobs: none.

Player state (queue, context, index, shuffle order, repeat, volume, position)
lives on the client in one store, persisted to localStorage (volume, last
track) — not in the database. This is a must: the original's player is
client state with server sync only for Connect, which is out of scope.

## The parts that bite

- player semantics: "previous" restarts when >3s in; shuffle must not repeat
  until the context is exhausted and must keep the current track first;
  repeat-one vs repeat-context; the user queue plays before the context and
  survives changing context.
- races: rapid next-clicks fire overlapping `play()` promises — always await
  and ignore AbortError; like/unlike are PUT/DELETE so they are idempotent.
- audio delivery: seeking needs HTTP Range (206) or browsers can't scrub.
- autoplay policy: browsers block `play()` without a user gesture — never
  auto-start on page load; restore last track paused.
- search: SQLite `LIKE` on lowercased columns is fine for thousands of rows;
  move to FTS5 / Postgres trigram past that.
- rights: only owned audio in `media/`; seed audio is synthesised by
  `scripts/make-audio.py`, so there is nothing licensed in the repo.
- security: scrypt + timing-safe compare, httpOnly SameSite=Lax cookie,
  session tokens stored hashed, playlist mutations owner-checked, all SQL
  parameterised, JSON body size limit.
- GDPR deletion: `ON DELETE CASCADE` from users covers everything a user owns.

## Build order

1. Vertical slice: S01 shell + S06 album page + player bar; tables artists,
   albums, tracks; routes GET /api/albums/:id, /media. Press play, hear audio.
2. Must-haves: S02 home, S03/S04 search, S05 artist, S07 playlist, S08 liked,
   S12 context menu, S14 auth; player controls, queue, shuffle, repeat;
   playlist CRUD + add/remove.
3. Should-haves: S09 library filters, S10 queue reorder/remove, S11
   now-playing panel, save album/follow artist, keyboard shortcuts, mobile
   layout, Media Session, toasts, persistence.
4. Fixes from replica-entrepreneur: (filled in after that skill runs)
