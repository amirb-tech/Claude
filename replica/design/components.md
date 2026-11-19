# Component specs

Styling is plain CSS on the custom properties in `tokens.css` (the
architecture chose no Tailwind; the token names play the same role:
components use `var(--c-surface)`, never raw hex). Icons: Lucide (ISC). Font:
Manrope (OFL), self-hosted via @fontsource. No logos, icons, illustrations or
copy from the original.

```
Button
  variants  primary (pill, accent bg), secondary (pill, outline border-input), ghost, icon
  sizes     sm 32px, md 40px, lg 48px
  states    default, hover (scale 1.04 primary / text brighten ghost), active (scale .98),
            focus-visible (2px ring accent, 2px offset), disabled (opacity .4, no pointer)
  tokens    bg accent, text on-accent, radius pill, font sm/700
  a11y      real <button>, aria-label on icon-only, visible focus
  used on   all

PlayButton
  variants  lg 56px (collection headers), md 48px (cards, hover-reveal), sm 32px (player bar)
  states    play / pause icon swap, hover scale 1.04, focus ring
  tokens    bg accent, icon on-accent, radius pill, shadow card on cards
  a11y      aria-label "Play {name}" / "Pause {name}", aria-pressed not used (label changes)
  used on   S02, S04, S05, S06, S07, S08, S01

Card
  variants  album/playlist (square art, radius md), artist (round art)
  states    default, hover (surface-2 bg, PlayButton slides up 8px and fades in), focus-within same as hover, playing (PlayButton stays visible as pause)
  tokens    bg transparent -> surface-2, title sm/700 text, subtitle sm text-muted, 2-line clamp
  a11y      whole card is a link; PlayButton is a separate button (no nested interactive)
  used on   S02, S04, S05

Shelf
  layout    title lg + "Show all" link, auto-fill grid minmax(170px,1fr), one row clipped
  states    loading (6 skeleton cards), empty (hidden)
  used on   S02, S04, S05

TrackRow
  columns   # / title+artist (+art) / album / date added / heart / duration / more
  states    default, hover (surface-3 bg; # becomes play icon; heart + more appear), focus-within same,
            playing (title in accent, # becomes animated equaliser bars), liked (heart filled accent, always visible)
  tokens    height 56px, radius sm, text sm
  a11y      role="row" inside role="grid"? -> kept as list of buttons: double-click or Enter plays,
            context menu on right-click and on the "more" button and Shift+F10
  used on   S04, S05, S06, S07, S08, S10

CollectionHeader
  variants  album, playlist (owner can click title to edit), liked, artist hero (banner gradient)
  layout    232px art + type label xs + title display (clamp 32–64px) + meta line
  tokens    gradient from a per-item colour to surface
  used on   S05–S08

PlayerBar
  layout    3 columns: now playing (art 56px, title, artist, heart) | controls + seek | queue, volume
  controls  shuffle, previous, play/pause (sm PlayButton, white), next, repeat (off/all/one with dot + "1" badge)
  states    empty (disabled controls), playing, paused, loading (spinner on button)
  a11y      every control labelled; shuffle/repeat use aria-pressed / aria-label with mode
  used on   S01 (mobile: mini bar above bottom nav, tap opens S11)

Slider (seek, volume)
  states    rest (4px track, fill text-muted), hover (fill accent, 12px thumb appears), dragging
  a11y      native <input type=range> styled; aria-valuetext "1:23 of 3:45"; arrow keys 5s / 10%

Sidebar / LibraryRow
  variants  expanded 300px, collapsed 72px (art only)
  row       48px art (round for artists), name sm/700, meta xs text-muted ("Playlist · you")
  states    hover surface-3, active surface-3 + accent name if playing
  used on   S01, S09

SearchInput
  pill 48px, surface-2 bg, search icon left, clear button right when non-empty
  debounce 200ms; Enter navigates; Escape clears
  used on   S03, S04

FilterChips
  pill 32px, surface-2 bg; selected = text bg / on-text; single-select with a clear "x"
  a11y      role=radiogroup of buttons with aria-pressed
  used on   S04, S09

ContextMenu
  surface-3 bg, radius sm, shadow pop, items 40px, submenu "Add to playlist" (with "New playlist")
  keyboard  arrow keys move, Enter selects, Escape closes, focus returns to trigger
  used on   S12 (from TrackRow, Card)

Modal
  centered 520px, surface-2, radius md, shadow pop, backdrop rgba(0,0,0,.7)
  focus trapped, Escape closes, first field focused
  used on   S13, confirm delete

Toast
  bottom-center above player bar, accent-ish neutral bg (text on surface-3), 3s, aria-live polite
  used on   after like / add / create

HeartButton
  outline icon text-muted -> filled accent; aria-pressed; aria-label "Save to Liked Songs" / "Remove from Liked Songs"

EmptyState
  icon 48px, title lg, body sm text-muted, one primary action
  written copy per screen, fresh (see build)
