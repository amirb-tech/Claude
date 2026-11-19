import { useEffect, useRef, useState, type ReactNode, type MouseEvent as RME, type KeyboardEvent as RKE } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Play, Pause, Heart, MoreHorizontal, Clock, ListPlus, Plus, User as UserIcon, Disc, ListMusic, Trash2, X, ChevronRight } from "lucide-react";
import { api, ApiError, fmtTime, fmtDate, type Track, type AlbumCard, type ArtistCard, type PlaylistCard } from "./api";
import { player, usePlayer, type Context } from "./player";
import { useSession } from "./session";

// ---------- Buttons ----------
export function PlayButton({ playing, onClick, size = "md", label, className = "" }:
  { playing: boolean; onClick: (e: RME) => void; size?: "sm" | "md" | "lg"; label: string; className?: string }) {
  return (
    <button type="button" className={`play-btn play-btn--${size} ${className}`} onClick={onClick}
      aria-label={`${playing ? "Pause" : "Play"} ${label}`}>
      {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
    </button>
  );
}

export function HeartButton({ track, size = 16, alwaysShow = false }: { track: Track; size?: number; alwaysShow?: boolean }) {
  const { liked, setLiked, requireLogin } = useSession();
  const on = liked.has(track.id);
  return (
    <button type="button" className={`icon-btn heart ${on ? "is-on" : ""} ${alwaysShow || on ? "is-visible" : ""}`}
      aria-pressed={on} aria-label={on ? `Remove ${track.title} from hearted songs` : `Heart ${track.title}`}
      onClick={(e) => { e.stopPropagation(); requireLogin("Log in to heart songs and find them again later.", () => setLiked(track.id, !on)); }}>
      <Heart size={size} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** Play/pause for a whole context (album, playlist...). */
export function ContextPlayButton({ context, load, size = "lg", className }:
  { context: Context; load: () => Promise<Track[]> | Track[]; size?: "sm" | "md" | "lg"; className?: string }) {
  const active = usePlayer((s) => !s.fromQueue && s.context?.type === context.type && s.context?.id === context.id);
  const playing = usePlayer((s) => s.playing);
  const { toast } = useSession();
  return (
    <PlayButton size={size} className={className} label={context.name} playing={active && playing}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (active) return player.toggle();
        try {
          const tracks = await load();
          if (!tracks.length) return toast("Nothing to play here yet.");
          player.playContext(context, tracks, 0);
        } catch { toast("Couldn't start playback. Try again."); }
      }} />
  );
}

// ---------- Cards & shelves ----------
export function CoverMosaic({ covers, alt }: { covers: string[]; alt: string }) {
  if (covers.length >= 4) {
    return <div className="mosaic" {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}>{covers.slice(0, 4).map((c, i) => <img key={i} src={c} alt="" />)}</div>;
  }
  if (covers.length) return <img src={covers[0]} alt={alt} />;
  return alt
    ? <div className="cover-placeholder" role="img" aria-label={alt}><ListMusic aria-hidden /></div>
    : <div className="cover-placeholder" aria-hidden="true"><ListMusic /></div>;
}

export function AlbumCardView({ a }: { a: AlbumCard }) {
  return (
    <div className="card">
      <div className="card__art">
        <img src={a.coverUrl} alt="" loading="lazy" />
        <ContextPlayButton size="md" className="card__play" context={{ type: "album", id: a.id, name: a.title, href: `/album/${a.id}` }}
          load={() => api.album(a.id).then((x) => x.tracks)} />
      </div>
      <Link to={`/album/${a.id}`} className="card__title stretched">{a.title}</Link>
      <div className="card__sub">{a.releaseDate && !a.artistName ? `${a.releaseDate.slice(0, 4)} · ${a.type ?? "Album"}` : a.artistName}</div>
    </div>
  );
}

export function ArtistCardView({ a }: { a: ArtistCard }) {
  return (
    <div className="card">
      <div className="card__art card__art--round">
        <img src={a.imageUrl} alt="" loading="lazy" />
        <ContextPlayButton size="md" className="card__play" context={{ type: "artist", id: a.id, name: a.name, href: `/artist/${a.id}` }}
          load={() => api.artist(a.id).then((x) => x.popular)} />
      </div>
      <Link to={`/artist/${a.id}`} className="card__title stretched">{a.name}</Link>
      <div className="card__sub">Artist</div>
    </div>
  );
}

export function PlaylistCardView({ p }: { p: PlaylistCard }) {
  return (
    <div className="card">
      <div className="card__art">
        <CoverMosaic covers={p.covers} alt="" />
        <ContextPlayButton size="md" className="card__play" context={{ type: "playlist", id: p.id, name: p.name, href: `/playlist/${p.id}` }}
          load={() => api.playlist(p.id).then((x) => x.tracks)} />
      </div>
      <Link to={`/playlist/${p.id}`} className="card__title stretched">{p.name}</Link>
      <div className="card__sub">By {p.ownerName}</div>
    </div>
  );
}

export function Shelf({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="shelf" aria-label={title}>
      <div className="shelf__head">
        <h2>{title}</h2>
        {href && <Link to={href} className="shelf__more">See all</Link>}
      </div>
      <div className="shelf__row">{children}</div>
    </section>
  );
}

export function ShelfSkeleton() {
  return (
    <section className="shelf" aria-hidden>
      <div className="skel skel--title" />
      <div className="shelf__row">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card"><div className="skel skel--art" /><div className="skel skel--line" /></div>)}</div>
    </section>
  );
}

// ---------- Collection header ----------
export function CollectionHeader({ kind, title, art, round, meta, onTitleClick, hue }:
  { kind: string; title: string; art: ReactNode; round?: boolean; meta: ReactNode; onTitleClick?: () => void; hue?: number }) {
  return (
    <header className="col-head" style={{ ["--hue" as string]: hue ?? 220 }}>
      <div className={`col-head__art ${round ? "is-round" : ""}`}>{art}</div>
      <div className="col-head__text">
        <span className="col-head__kind">{kind}</span>
        {onTitleClick
          ? <h1><button type="button" className="title-btn" onClick={onTitleClick}>{title}</button></h1>
          : <h1>{title}</h1>}
        <div className="col-head__meta">{meta}</div>
      </div>
    </header>
  );
}
export const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

// ---------- Track list ----------
type TrackListProps = {
  tracks: Track[];
  context: Context;
  showArt?: boolean;
  showAlbum?: boolean;
  showAdded?: boolean;
  numbered?: boolean;
  onRemove?: (t: Track) => void;
  onMove?: (t: Track, dir: -1 | 1) => void;
};

export function TrackList({ tracks, context, showArt = true, showAlbum = true, showAdded = false, numbered = true, onRemove, onMove }: TrackListProps) {
  const cls = `tracklist ${showAlbum ? "has-album" : ""} ${showAdded ? "has-added" : ""}`;
  return (
    <div className={cls} role="table" aria-label={`Songs in ${context.name}`}>
      <div className="tracklist__head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">Title</span>
        {showAlbum && <span role="columnheader" className="col-album">Album</span>}
        {showAdded && <span role="columnheader" className="col-added">Added</span>}
        <span role="columnheader" className="col-dur"><Clock size={16} aria-label="Length" /></span>
      </div>
      {tracks.map((t, i) => (
        <TrackRow key={t.rowId ?? t.id + i} t={t} index={i} tracks={tracks} context={context} showArt={showArt}
          showAlbum={showAlbum} showAdded={showAdded} numbered={numbered} onRemove={onRemove} onMove={onMove} />
      ))}
    </div>
  );
}

function TrackRow({ t, index, tracks, context, showArt, showAlbum, showAdded, numbered, onRemove, onMove }:
  TrackListProps & { t: Track; index: number }) {
  const isCur = usePlayer((s) => s.current?.id === t.id && !s.fromQueue && s.context?.type === context.type && s.context?.id === context.id
    && s.order[s.pos] === index);
  const playing = usePlayer((s) => s.playing);
  const menu = useTrackMenu();
  const start = () => (isCur ? player.toggle() : player.playContext(context, tracks, index));
  const onKey = (e: RKE) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") { e.preventDefault(); start(); }
    if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") {
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menu(t, r.left + 40, r.bottom, { onRemove, onMove });
    }
  };
  return (
    <div role="row" tabIndex={0} className={`trow ${isCur ? "is-current" : ""}`} onDoubleClick={start} onKeyDown={onKey}
      onContextMenu={(e) => { e.preventDefault(); menu(t, e.clientX, e.clientY, { onRemove, onMove }); }}
      aria-label={`${t.title} by ${t.artistName}`}>
      <span role="cell" className="trow__num">
        <span className="trow__idx">{isCur && playing ? <Bars /> : numbered ? index + 1 : t.trackNumber}</span>
        <button type="button" className="icon-btn trow__play" onClick={start} aria-label={`${isCur && playing ? "Pause" : "Play"} ${t.title}`}>
          {isCur && playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
      </span>
      <span role="cell" className="trow__title">
        {showArt && <img src={t.coverUrl} alt="" />}
        <span className="trow__names">
          <span className="trow__name">{t.title}</span>
          <Link to={`/artist/${t.artistId}`} className="trow__artist" tabIndex={-1}>{t.artistName}</Link>
        </span>
      </span>
      {showAlbum && <span role="cell" className="col-album"><Link to={`/album/${t.albumId}`} tabIndex={-1}>{t.albumTitle}</Link></span>}
      {showAdded && <span role="cell" className="col-added">{t.addedAt ? fmtDate(t.addedAt) : ""}</span>}
      <span role="cell" className="col-dur">
        <HeartButton track={t} />
        <span className="trow__time">{fmtTime(t.durationMs)}</span>
        <button type="button" className="icon-btn trow__more" aria-label={`More options for ${t.title}`}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); menu(t, r.right, r.bottom, { onRemove, onMove }); }}>
          <MoreHorizontal size={16} />
        </button>
      </span>
    </div>
  );
}

export function Bars() {
  return <span className="eq" role="img" aria-label="Now playing"><i /><i /><i /></span>;
}

// ---------- Context menu (one host for the app) ----------
type MenuState = { t: Track; x: number; y: number; onRemove?: (t: Track) => void; onMove?: (t: Track, d: -1 | 1) => void } | null;
let openMenu: (m: MenuState) => void = () => undefined;
function useTrackMenu() {
  return (t: Track, x: number, y: number, extra: { onRemove?: (t: Track) => void; onMove?: (t: Track, d: -1 | 1) => void }) =>
    openMenu({ t, x, y, ...extra });
}

export function MenuHost() {
  const [m, setM] = useState<MenuState>(null);
  const [sub, setSub] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const { library, requireLogin, toast, refreshLibrary } = useSession();
  const nav = useNavigate();
  openMenu = (s) => { back.current = document.activeElement as HTMLElement; setSub(false); setM(s); };

  useEffect(() => {
    if (!m) return;
    const items = () => [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    items()[0]?.focus();
    const close = () => { setM(null); back.current?.focus?.(); };
    const onDown = (e: Event) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => {
      const list = items(); const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") { e.preventDefault(); if (sub) setSub(false); else close(); }
      if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", close); };
  }, [m, sub]);

  if (!m) return null;
  const close = () => { setM(null); back.current?.focus?.(); };
  const playlists = (library?.items ?? []).filter((i) => i.kind === "playlist");
  const add = async (pid: string, name: string) => {
    close();
    try {
      await api.addToPlaylist(pid, m.t.id);
      toast(`Added to ${name}`);
      refreshLibrary();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        confirmBox(`"${m.t.title}" is already in ${name}.`, "Add it again", async () => {
          await api.addToPlaylist(pid, m.t.id, true); toast(`Added to ${name}`); refreshLibrary();
        });
      } else toast(e instanceof ApiError ? e.message : "Couldn't add the song.");
    }
  };
  const W = 240, H = 300;
  const left = Math.min(m.x, window.innerWidth - W - 8), top = Math.min(m.y, window.innerHeight - H - 8);
  return createPortal(
    <div ref={ref} className="menu" role="menu" aria-label={`Options for ${m.t.title}`} style={{ left, top }}>
      {!sub ? (
        <>
          <button role="menuitem" onClick={() => { player.addToQueue(m.t); toast("Queued up next"); close(); }}><ListPlus size={16} />Add to queue</button>
          <button role="menuitem" onClick={() => requireLogin("Log in to build playlists.", () => setSub(true))}><Plus size={16} />Add to playlist<ChevronRight size={16} className="menu__chev" /></button>
          {m.onRemove && <button role="menuitem" onClick={() => { m.onRemove!(m.t); close(); }}><Trash2 size={16} />Remove from this playlist</button>}
          {m.onMove && <button role="menuitem" onClick={() => { m.onMove!(m.t, -1); close(); }}>Move up</button>}
          {m.onMove && <button role="menuitem" onClick={() => { m.onMove!(m.t, 1); close(); }}>Move down</button>}
          <hr />
          <button role="menuitem" onClick={() => { nav(`/artist/${m.t.artistId}`); close(); }}><UserIcon size={16} />Open artist</button>
          <button role="menuitem" onClick={() => { nav(`/album/${m.t.albumId}`); close(); }}><Disc size={16} />Open album</button>
          <button role="menuitem" onClick={async () => {
            close();
            try { await navigator.clipboard.writeText(`${location.origin}/album/${m.t.albumId}`); toast("Link copied"); }
            catch { toast("Couldn't copy the link."); }
          }}>Copy link</button>
        </>
      ) : (
        <>
          <button role="menuitem" onClick={() => setSub(false)}>← Back</button>
          <button role="menuitem" onClick={async () => {
            close();
            const p = await api.createPlaylist(m.t.title);
            await api.addToPlaylist(p.id, m.t.id);
            await refreshLibrary();
            toast(`Made "${p.name}"`);
            nav(`/playlist/${p.id}`);
          }}><Plus size={16} />New playlist</button>
          <hr />
          {playlists.length === 0 && <p className="menu__empty">No playlists yet.</p>}
          {playlists.map((p) => <button key={p.id} role="menuitem" onClick={() => add(p.id, p.name)}>{p.name}</button>)}
        </>
      )}
    </div>, document.body);
}

// ---------- Modal + confirm ----------
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, button:not(.modal__x)");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>("input, textarea, button, [href], select")].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); back?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn modal__x" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>, document.body);
}

type ConfirmState = { text: string; action: string; run: () => Promise<void> | void; danger?: boolean } | null;
let setConfirm: (c: ConfirmState) => void = () => undefined;
export const confirmBox = (text: string, action: string, run: () => Promise<void> | void, danger = false) => setConfirm({ text, action, run, danger });
export function ConfirmHost() {
  const [c, set] = useState<ConfirmState>(null);
  setConfirm = set;
  if (!c) return null;
  return (
    <Modal title="Are you sure?" onClose={() => set(null)}>
      <p className="modal__body">{c.text}</p>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={() => set(null)}>Cancel</button>
        <button type="button" className={`btn ${c.danger ? "btn--danger" : "btn--primary"}`} onClick={async () => { set(null); await c.run(); }}>{c.action}</button>
      </div>
    </Modal>
  );
}

// ---------- Misc ----------
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden>{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({ text, retry }: { text: string; retry?: () => void }) {
  return <EmptyState icon={<X size={40} />} title="That didn't load" body={text}
    action={retry && <button type="button" className="btn btn--secondary" onClick={retry}>Try again</button>} />;
}

export function Toasts() {
  const { toasts } = useSession();
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
    </div>
  );
}

/** Fetch helper with loading / error / reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ data: s.data, loading: true }));
    fn().then((data) => alive && setState({ data, loading: false }))
      .catch((e) => alive && setState({ loading: false, error: e instanceof ApiError ? e.message : "Check your connection and try again." }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1), setData: (d: T) => setState({ data: d, loading: false }) };
}
