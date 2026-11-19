# Recon map: Spotify (web player, open.spotify.com)

Scope: the listening loop of the web player: home/browse, search, artist, album
and playlist pages, the persistent player (play/pause, seek, volume, shuffle,
repeat, queue), Your Library, Liked Songs, and creating/editing playlists.
For: an operator who streams music they own or have licensed (indie label,
community radio, creators uploading their own work). Not a catalogue clone.
Date: 2026-11-19

Method note: built from public knowledge of the public web player, help
center and marketing pages. No login to anyone's account, no bundles read, no
network calls logged, no screenshots saved (replica/screens/ is empty). The
help-center URLs below are the public entry points; verify specifics there
before relying on a detail.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | help center | https://support.spotify.com/ | playlists, library, queue, playback settings |
| 2 | pricing page | https://www.spotify.com/premium/ | what is gated: ad-free, on-demand order, offline, quality |
| 3 | public web player | https://open.spotify.com/ | public pages (artist, album, playlist) viewable logged out |
| 4 | marketing / newsroom | https://newsroom.spotify.com/ | recent features, positioning |
| 5 | app store listing | https://apps.apple.com/app/spotify-music-and-podcasts/id324684580 | key screen screenshots, ratings |
| 6 | public Web API docs | https://developer.spotify.com/documentation/web-api | the data model: tracks, albums, artists, playlists, saved tracks, player/queue |

## Core loop

Find something to listen to (home, search), press play, keep listening
(queue/autoplay), and save what you like (Liked Songs, playlists).

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | App shell | every route | left library rail, top bar, main view, bottom now-playing bar | Sidebar, TopBar, PlayerBar | collapsed rail, mobile (bottom tab bar) |
| S02 | Home | `/` | shelves of recommendations and recently played | Shelf, Card, Greeting grid | logged-out, empty (new user), filled, loading skeleton |
| S03 | Search (browse) | `/search` | genre/mood tiles before typing | SearchInput, CategoryTile | filled |
| S04 | Search results | `/search/:q` | top result, songs, artists, albums, playlists | TopResultCard, TrackRow, Shelf, FilterChips | no results, loading, filled |
| S05 | Artist page | `/artist/:id` | hero, popular tracks, discography | Hero, PlayButton, TrackList, Shelf, FollowButton | filled, followed / not |
| S06 | Album page | `/album/:id` | tracklist of a release | CollectionHeader, TrackList, release meta | filled |
| S07 | Playlist page | `/playlist/:id` | tracklist with added-date; owner can edit | CollectionHeader, TrackList, "find more" search, EditDetailsModal | empty (new playlist), filled, owner vs not owner |
| S08 | Liked Songs | `/collection/tracks` | all saved tracks | CollectionHeader, TrackList | empty, filled |
| S09 | Your Library (rail + full) | sidebar / `/collection` | playlists, albums, artists you saved; filter + sort | FilterChips, SortMenu, LibraryRow | empty, filled, collapsed |
| S10 | Queue panel | queue button in player bar | now playing, next in queue, next from context | TrackRow, panel | empty queue, filled |
| S11 | Now-playing view | right panel / full screen | large art, track + artist info | Artwork, credits | playing, paused |
| S12 | Context menu | right-click / "..." on a track | add to queue, add to playlist, save, go to artist/album, share | Menu, Submenu | n/a |
| S13 | Edit playlist details | playlist header click | rename, description, image | Modal, Input, Textarea | saving, validation |
| S14 | Sign up / Log in | `/signup`, `/login` | account | Form, Input, Button | error, loading |
| S15 | Account / settings | `/preferences` | playback prefs (crossfade, autoplay, normalisation), language | Toggle, Select | n/a |
| S16 | 404 / not found | bad id | error | EmptyState | error |

## Flows

```
F01 Play something from home
    S02 -> (hover card, click play)
    happy path clicks: 1
    edge: logged out (prompt to sign up), item has no playable tracks

F02 Search and play a song
    S03 -> type -> S04 -> click play on track row
    happy path clicks: 2 (+ typing)
    edge: no results, typo, very long query

F03 Like a song
    any TrackRow or PlayerBar -> heart
    happy path clicks: 1
    edge: logged out, unlike from Liked Songs removes the row

F04 Create a playlist and add songs
    S09 "+" -> S07 (new, empty) -> "find more" search -> add
      or S12 context menu -> Add to playlist -> pick
    happy path clicks: 3
    edge: duplicate track (warn), rename to empty name, delete playlist

F05 Control playback
    PlayerBar: play/pause, next, previous (restart if >3s in), seek, volume,
    mute, shuffle, repeat (off -> context -> track)
    edge: end of context with repeat off (stop or autoplay), seek past end

F06 Manage the queue
    S12 Add to queue -> S10 reorder/remove -> plays before context
    edge: clear queue, queue survives changing context

F07 Browse an artist then an album
    S04/S05 -> S06 -> play
    happy path clicks: 3

F08 Sign up / log in
    S14 -> S02
    edge: email taken, wrong password, session expired

F09 Organise the library
    S09 filter (playlists/albums/artists), sort (recent, alphabetical, creator)
    edge: empty library
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary (pill), secondary (outline), ghost, icon | default, hover, active, focus, disabled | all |
| PlayButton | large round (headers), small round (cards) | play, pause, hover-reveal on cards | S02, S05-S08 |
| Card | album, playlist, artist (round image) | default, hover (shows PlayButton), playing | S02, S04, S05 |
| Shelf | horizontal row of cards with "show all" | loading skeleton, filled | S02, S04, S05 |
| TrackRow | numbered, with art, with album+added date | default, hover (play icon), playing (animated bars), liked | S04-S08, S10 |
| CollectionHeader | album, playlist, liked, artist hero | owner-editable | S05-S08 |
| PlayerBar | full, mobile mini | playing, paused, empty | S01 |
| Slider | seek, volume | drag, hover shows thumb | S01 |
| Sidebar / LibraryRow | expanded, collapsed | active | S01, S09 |
| SearchInput | top bar | empty, typing, clear | S03, S04 |
| FilterChips | single-select | selected | S04, S09 |
| ContextMenu | with submenu | n/a | S12 |
| Modal | edit details, confirm delete | open, saving | S07, S13 |
| Toast | info | appear, dismiss | after add/save |
| HeartButton | small, large | liked, not | S04-S08, S01 |
| EmptyState | per screen | n/a | S07-S09, S04, S16 |

## Inferred data model

```
User      id, email, display_name, password_hash, created_at
          evidence: S14, Web API "users"   confidence: high
Artist    id, name, image_url, bio, monthly_listeners(derived)
          evidence: S05, Web API "artists"   confidence: high
Album     id, title, artist_id, cover_url, release_date, type (album|single|ep)
          evidence: S06, Web API "albums"   confidence: high
Track     id, title, album_id, artist_id, track_number, duration_ms, audio_url, play_count
          evidence: S06 tracklist, Web API "tracks"   confidence: high
Playlist  id, owner_id, name, description, cover_url, is_public, created_at
          evidence: S07, S13, Web API "playlists"   confidence: high
PlaylistTrack  playlist_id, track_id, position, added_at, added_by
          evidence: S07 "date added" column   confidence: high
SavedTrack     user_id, track_id, saved_at          (Liked Songs)  confidence: high
SavedAlbum     user_id, album_id, saved_at          confidence: high
FollowedArtist user_id, artist_id, followed_at      confidence: high
PlayHistory    user_id, track_id, played_at, context(type,id)  evidence: "recently played"  confidence: high
PlaybackState  (client) queue[], context, index, shuffle, repeat, position, volume  confidence: high
```

Relationships: Artist 1-n Album 1-n Track; User 1-n Playlist n-n Track
(through PlaylistTrack); User n-n Track (SavedTrack); User n-n Album; User n-n
Artist (follow); User 1-n PlayHistory.

## Feature matrix

See `features.csv`. Must: 19, should: 11, could: 6, skip: 7.

## Out of scope (cannot or should not be cloned)

- The music catalogue and label licences. The clone plays only audio its
  operator owns; this build ships original, procedurally generated tracks.
- Personalised recommendations trained on hundreds of millions of users
  (we do simple "recently played / most played / new" shelves).
- Podcasts, audiobooks, video, lyrics (lyrics are licensed text).
- DRM, offline downloads, Connect (cross-device control), social graph, Wrapped.
- The brand: name, logo, the green, the fonts, all copy.

## Size

Screens 16, flows 9, entities 11. Hard parts: gapless/stateful global player
(queue + shuffle + repeat semantics that survive navigation), content rights
(owned audio + upload pipeline), recommendations without a big user base.
Size: M for this slice (a few weeks for production polish; a working MVP is
the target of this run).
