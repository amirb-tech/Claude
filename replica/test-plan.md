# Test plan

Automated: `app/e2e/*.spec.ts` (Playwright, Chromium, against a production build
on a fresh temp database) and `app/tests/api.test.ts` (API + access rules).
Every e2e spec fails on console errors and 5xx responses, and runs an axe scan
(WCAG 2.1 A/AA) on each screen it visits. Selectors are roles and labels only.
Legend: [A] automated e2e, [U] API test, [M] manual, [-] not applicable.

## F01 Play something from home
- F01-H1 [A] logged out, hover a card, press its play button: player bar shows the album's first song, button says Pause, time advances
- F01-E1 [A] press the same card's button again: pauses (no restart)
- F01-E2 [A] mobile width 390: home renders, no horizontal scroll, bottom nav visible
- F01-E3 [A] refresh mid-song: last song is restored in the bar, paused (no autoplay)
- F01-N1 [U] album with no tracks → nothing to play (empty list returns 0 tracks; UI toast) — seed has none; covered by API shape

## F02 Search and play a song
- F02-H1 [A] type an artist name, results show Best match + Songs; Enter on a focused song plays it
- F02-E1 [A] no results: friendly empty state naming the query
- F02-E2 [A] wildcard characters `%_\` don't match everything [U]
- F02-E3 [A] emoji and accents in the query don't break (`café 🎧`)
- F02-E4 [A] 100+ character query is capped, no error
- F02-E5 [A] filter chips narrow to Songs / Artists / Albums
- F02-E6 [A] back button returns to the previous query

## F03 Heart a song
- F03-H1 [A] logged in: heart a song in a list; it appears in Hearted songs; count in sidebar updates
- F03-E1 [A] logged out: heart opens the "you'll need an account" dialog, nothing saved
- F03-E2 [U] double PUT is idempotent; unknown song 404
- F03-E3 [A] unheart from Hearted songs removes the row

## F04 Create a playlist and add songs
- F04-H1 [A] New playlist → empty state → Add songs search → Add → song listed with date added
- F04-H2 [A] context menu → Add to playlist → pick playlist → toast
- F04-E1 [A] adding a duplicate asks first; Cancel adds nothing
- F04-E2 [A] rename to empty is refused with a message; long name wraps
- F04-E3 [A] delete playlist asks to confirm, then it's gone from the sidebar
- F04-E4 [U] second user cannot read a private playlist or change any playlist; logged out gets 401
- F04-E5 [A] move a song down via the row menu; order persists after reload
- F04-E6 [A] remove a song via the row menu
- F04-N1 [U] deleted playlist → 404 page

## F05 Control playback
- F05-H1 [A] next / previous move through the album; previous after 3s restarts the song
- F05-E1 [A] shuffle on: current song stays, order changes; aria-pressed reflects state
- F05-E2 [A] repeat cycles off → all → one with labels
- F05-E3 [A] seek with the slider (keyboard arrows) moves playback time
- F05-E4 [A] volume slider + mute; volume remembered after reload
- F05-E5 [A] Space toggles play/pause when focus is not in a field; typing a space in search does not
- F05-E6 [A] end of album with repeat off stops on the last song
- F05-E7 [M] lock-screen / hardware media keys (Media Session) — needs a real device

## F06 Manage the queue
- F06-H1 [A] Add to queue from row menu; queue panel lists it under "Your queue"; Next plays it before the album continues
- F06-E1 [A] remove from queue; clear queue
- F06-E2 [A] queue survives starting a different album

## F07 Browse an artist then an album
- F07-H1 [A] Search tab → genre tile → artist → album → play
- F07-E1 [A] follow artist → appears in collection; unfollow removes
- F07-E2 [A] save album → appears in collection

## F08 Sign up / log in
- F08-H1 [A] sign up → home greets by name
- F08-N1 [A] wrong password → message, stays on page
- F08-N2 [A] email already used → message
- F08-E1 [A] double-click Create account creates one account (second click ignored / 409 handled)
- F08-E2 [A] keyboard only: tab through form and submit with Enter
- F08-E3 [A] expired/invalid session cookie → treated as logged out
- F08-E4 [U] password reset single-use; other sessions signed out
- F08-E5 [U] account deletion removes everything
- F08-E6 [U] rate limit: 11th login attempt in 15 min → 429 (verified manually with curl, see backend.md)
- F08-E7 [M] reset email arrives from Resend — needs your Resend key + domain

## F09 Organise the collection
- F09-H1 [A] filter chips (Playlists / Albums / Artists) and sort toggle
- F09-E1 [A] empty collection shows guidance
- F09-E2 [A] collapse the rail; state remembered after reload

## Cross-cutting
- X-1 [A] axe scan: every visited screen, zero serious/critical violations
- X-2 [A] 404 route shows the not-found screen
- X-3 [A] two tabs: hearting in one shows after reload in the other
- X-4 [M] slow 3G / offline: error states with Try again (spot-checked with DevTools throttling)
