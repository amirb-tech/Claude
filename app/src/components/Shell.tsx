import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Search, Library as LibIcon, Plus, Heart, ChevronLeft, ChevronRight, Shuffle, SkipBack, SkipForward, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, ListMusic, PanelRight, Play, Pause, X, ArrowUp, ArrowDown, LogOut, Settings,
} from "lucide-react";
import { api, fmtTime } from "../api";
import { player, usePlayer } from "../player";
import { useSession } from "../session";
import { BRAND } from "../brand";
import { CoverMosaic, HeartButton, Modal } from "../ui";

// ---------- Sidebar: library rail ----------
type Filter = "all" | "playlist" | "album" | "artist";
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, library, refreshLibrary, requireLogin, toast } = useSession();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"recent" | "alpha">("recent");
  const ctx = usePlayer((s) => (s.fromQueue ? null : s.context));
  const playing = usePlayer((s) => s.playing);

  const newPlaylist = () => requireLogin("Log in to make playlists.", async () => {
    try {
      const p = await api.createPlaylist();
      await refreshLibrary();
      nav(`/playlist/${p.id}`);
    } catch { toast("Couldn't make a playlist. Try again."); }
  });

  let items = (library?.items ?? []).filter((i) => filter === "all" || i.kind === filter);
  items = [...items].sort((a, b) => (sort === "alpha" ? a.name.localeCompare(b.name) : b.sortAt - a.sortAt));

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label="Navigation and collection">
      <nav className="panel sidebar__nav">
        <Link to="/" className="brand" aria-label={`${BRAND.name} home`}><span className="brand__mark" aria-hidden />{!collapsed && <span>{BRAND.name}</span>}</Link>
        <NavLink to="/" end className="navlink"><Home size={22} />{!collapsed && <span>Home</span>}</NavLink>
        <NavLink to="/search" className="navlink"><Search size={22} />{!collapsed && <span>Search</span>}</NavLink>
      </nav>
      <section className="panel sidebar__lib">
        <div className="lib__head">
          <button type="button" className="navlink lib__toggle" onClick={onToggle} aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand your collection" : "Collapse your collection"}>
            <LibIcon size={22} />{!collapsed && <span>Your collection</span>}
          </button>
          {!collapsed && <button type="button" className="icon-btn" onClick={newPlaylist} aria-label="New playlist"><Plus size={18} /></button>}
        </div>
        {!collapsed && user && (
          <div className="lib__tools">
            <div className="chips" role="group" aria-label="Filter collection">
              {(["playlist", "album", "artist"] as const).map((f) => (
                <button key={f} type="button" className={`chip ${filter === f ? "is-on" : ""}`} aria-pressed={filter === f}
                  onClick={() => setFilter(filter === f ? "all" : f)}>{f === "playlist" ? "Playlists" : f === "album" ? "Albums" : "Artists"}</button>
              ))}
            </div>
            <button type="button" className="link-btn" onClick={() => setSort(sort === "recent" ? "alpha" : "recent")}
              aria-label={`Sort: ${sort === "recent" ? "most recent" : "A to Z"}. Change sort`}>
              {sort === "recent" ? "Recent" : "A–Z"}
            </button>
          </div>
        )}
        <ul className="lib__list">
          {!user && !collapsed && (
            <li className="lib__cta">
              <p className="lib__cta-title">Start your first playlist</p>
              <p className="lib__cta-body">Gather songs you love in one place. It takes a second.</p>
              <button type="button" className="btn btn--primary btn--sm" onClick={newPlaylist}>New playlist</button>
            </li>
          )}
          {user && (
            <li>
              <NavLink to="/collection/hearted" className="lib__row">
                <span className="lib__art lib__art--hearted"><Heart size={18} fill="currentColor" /></span>
                {!collapsed && <span className="lib__text"><span className={`lib__name ${ctx?.type === "liked" ? "is-playing" : ""}`}>Hearted songs</span>
                  <span className="lib__meta">Playlist · {library?.likedCount ?? 0} {library?.likedCount === 1 ? "song" : "songs"}</span></span>}
              </NavLink>
            </li>
          )}
          {items.map((i) => {
            const href = `/${i.kind}/${i.id}`;
            const active = ctx?.type === i.kind && ctx.id === i.id;
            return (
              <li key={i.kind + i.id}>
                <NavLink to={href} className="lib__row" title={collapsed ? i.name : undefined}>
                  <span className={`lib__art ${i.kind === "artist" ? "is-round" : ""}`}>
                    {i.kind === "playlist" ? <CoverMosaic covers={i.covers} alt="" /> : <img src={i.kind === "album" ? i.coverUrl : i.imageUrl} alt="" />}
                  </span>
                  {!collapsed && (
                    <span className="lib__text">
                      <span className={`lib__name ${active ? "is-playing" : ""}`}>{i.name}</span>
                      <span className="lib__meta">{i.kind === "playlist" ? `Playlist · ${i.ownerName}` : i.kind === "album" ? `Album · ${i.artistName}` : "Artist"}</span>
                    </span>
                  )}
                  {!collapsed && active && playing && <Volume2 size={16} className="lib__now" aria-label="Playing" />}
                </NavLink>
              </li>
            );
          })}
          {user && library && items.length === 0 && !collapsed && (
            <li className="lib__cta"><p className="lib__cta-body">{filter === "all" ? "Nothing saved yet. Heart songs, save albums or follow artists and they'll live here." : "Nothing here with this filter."}</p></li>
          )}
        </ul>
      </section>
    </aside>
  );
}

// ---------- Top bar ----------
export function TopBar({ scrolled, children }: { scrolled: boolean; children?: ReactNode }) {
  const nav = useNavigate();
  const { user, setUser, toast } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <div className={`topbar ${scrolled ? "is-solid" : ""}`}>
      <div className="topbar__nav">
        <button type="button" className="round-btn" onClick={() => nav(-1)} aria-label="Go back"><ChevronLeft size={20} /></button>
        <button type="button" className="round-btn" onClick={() => nav(1)} aria-label="Go forward"><ChevronRight size={20} /></button>
      </div>
      <div className="topbar__slot">{children}</div>
      <div className="topbar__user">
        {user ? (
          <div className="usermenu">
            <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${user.displayName}`}
              onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>{user.displayName.slice(0, 1).toUpperCase()}</button>
            {open && (
              <div className="menu menu--anchored" role="menu">
                <Link role="menuitem" to="/settings" onClick={() => setOpen(false)}><Settings size={16} />Settings</Link>
                <button role="menuitem" onClick={async () => { await api.logout(); setUser(null); toast("Logged out"); nav("/"); }}><LogOut size={16} />Log out</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/signup" className="btn btn--ghost">Sign up</Link>
            <Link to="/login" className="btn btn--primary">Log in</Link>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Player bar ----------
export function PlayerBar({ panel, setPanel }: { panel: "queue" | "now" | null; setPanel: (p: "queue" | "now" | null) => void }) {
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const loading = usePlayer((s) => s.loading);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const error = usePlayer((s) => s.error);
  const ctx = usePlayer((s) => s.context);
  const disabled = !current;
  const { toast } = useSession();
  useEffect(() => { if (error) toast(error); }, [error, toast]);

  return (
    <footer className="playerbar" aria-label="Player">
      <div className="pb__now">
        {current ? (
          <>
            <button type="button" className="pb__art" onClick={() => setPanel(panel === "now" ? null : "now")} aria-label="Show now playing">
              <img src={current.coverUrl} alt="" />
            </button>
            <div className="pb__names">
              <Link to={ctx?.href ?? `/album/${current.albumId}`} className="pb__title">{current.title}</Link>
              <Link to={`/artist/${current.artistId}`} className="pb__artist">{current.artistName}</Link>
            </div>
            <HeartButton track={current} alwaysShow />
          </>
        ) : <span className="pb__idle">Pick something to play</span>}
      </div>
      <div className="pb__center">
        <div className="pb__controls">
          <button type="button" className={`icon-btn toggle ${shuffle ? "is-on" : ""}`} onClick={() => player.toggleShuffle()}
            aria-pressed={shuffle} aria-label="Shuffle" disabled={disabled}><Shuffle size={18} /></button>
          <button type="button" className="icon-btn" onClick={() => player.prev()} aria-label="Previous" disabled={disabled}><SkipBack size={20} fill="currentColor" /></button>
          <button type="button" className={`pb__play ${loading ? "is-loading" : ""}`} onClick={() => player.toggle()} disabled={disabled}
            aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
          <button type="button" className="icon-btn" onClick={() => player.next()} aria-label="Next" disabled={disabled}><SkipForward size={20} fill="currentColor" /></button>
          <button type="button" className={`icon-btn toggle ${repeat !== "off" ? "is-on" : ""}`} onClick={() => player.cycleRepeat()} disabled={disabled}
            aria-label={`Repeat: ${repeat === "off" ? "off" : repeat === "all" ? "all" : "this song"}`}>
            {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
        <SeekBar />
      </div>
      <div className="pb__right">
        <button type="button" className={`icon-btn toggle ${panel === "now" ? "is-on" : ""}`} onClick={() => setPanel(panel === "now" ? null : "now")}
          aria-pressed={panel === "now"} aria-label="Now playing view"><PanelRight size={18} /></button>
        <button type="button" className={`icon-btn toggle ${panel === "queue" ? "is-on" : ""}`} onClick={() => setPanel(panel === "queue" ? null : "queue")}
          aria-pressed={panel === "queue"} aria-label="Queue"><ListMusic size={18} /></button>
        <Volume />
      </div>
    </footer>
  );
}

function SeekBar() {
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  const has = usePlayer((s) => !!s.current);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? time;
  const pct = duration ? (shown / duration) * 100 : 0;
  return (
    <div className="seek">
      <span className="seek__t">{fmtTime(shown)}</span>
      <input type="range" className="slider" min={0} max={duration || 1} step={250} value={shown} disabled={!has}
        style={{ ["--pct" as string]: `${pct}%` }}
        aria-label="Seek" aria-valuetext={`${fmtTime(shown)} of ${fmtTime(duration)}`}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => { if (drag !== null) { player.seek(drag); setDrag(null); } }}
        onKeyUp={() => { if (drag !== null) { player.seek(drag); setDrag(null); } }} />
      <span className="seek__t">{fmtTime(duration)}</span>
    </div>
  );
}

function Volume() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? VolumeX : v < 0.5 ? Volume1 : Volume2;
  return (
    <div className="volume">
      <button type="button" className="icon-btn" onClick={() => player.toggleMute()} aria-label={muted ? "Unmute" : "Mute"}><Icon size={18} /></button>
      <input type="range" className="slider" min={0} max={1} step={0.01} value={v} aria-label="Volume"
        aria-valuetext={`${Math.round(v * 100)}%`} style={{ ["--pct" as string]: `${v * 100}%` }}
        onChange={(e) => player.setVolume(Number(e.target.value))} />
    </div>
  );
}

// ---------- Right panels ----------
export function QueuePanel({ onClose }: { onClose: () => void }) {
  const current = usePlayer((s) => s.current);
  const queue = usePlayer((s) => s.queue);
  const ctx = usePlayer((s) => s.context);
  usePlayer((s) => s.order); usePlayer((s) => s.pos);
  const upcoming = player.upcoming();
  return (
    <aside className="panel side-panel" aria-label="Queue">
      <div className="side-panel__head"><h2>Queue</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close queue"><X size={18} /></button></div>
      {!current ? <p className="muted">Nothing's lined up. Play something or add songs with "Add to queue".</p> : (
        <>
          <h3 className="side-panel__sub">Playing now</h3>
          <QRow t={current} active />
          {queue.length > 0 && (
            <>
              <div className="side-panel__row"><h3 className="side-panel__sub">Your queue</h3>
                <button type="button" className="link-btn" onClick={() => player.clearQueue()}>Clear</button></div>
              {queue.map((t, i) => (
                <QRow key={i + t.id} t={t} onPlay={() => player.playFromQueue(i)}>
                  <button type="button" className="icon-btn" disabled={i === 0} onClick={() => player.moveInQueue(i, i - 1)} aria-label={`Move ${t.title} up`}><ArrowUp size={14} /></button>
                  <button type="button" className="icon-btn" disabled={i === queue.length - 1} onClick={() => player.moveInQueue(i, i + 1)} aria-label={`Move ${t.title} down`}><ArrowDown size={14} /></button>
                  <button type="button" className="icon-btn" onClick={() => player.removeFromQueue(i)} aria-label={`Remove ${t.title} from queue`}><X size={14} /></button>
                </QRow>
              ))}
            </>
          )}
          {upcoming.length > 0 && <h3 className="side-panel__sub">Then from {ctx?.name ?? "this list"}</h3>}
          {upcoming.map(({ track, pos }) => <QRow key={pos} t={track} onPlay={() => player.playFromContext(pos)} />)}
        </>
      )}
    </aside>
  );
}

function QRow({ t, active, onPlay, children }: { t: import("../api").Track; active?: boolean; onPlay?: () => void; children?: ReactNode }) {
  return (
    <div className={`qrow ${active ? "is-current" : ""}`}>
      <button type="button" className="qrow__main" onClick={onPlay} disabled={!onPlay} aria-label={onPlay ? `Play ${t.title} now` : t.title}>
        <img src={t.coverUrl} alt="" />
        <span className="trow__names"><span className="trow__name">{t.title}</span><span className="trow__artist">{t.artistName}</span></span>
      </button>
      {children && <span className="qrow__tools">{children}</span>}
    </div>
  );
}

export function NowPanel({ onClose }: { onClose: () => void }) {
  const t = usePlayer((s) => s.current);
  const ctx = usePlayer((s) => s.context);
  return (
    <aside className="panel side-panel" aria-label="Now playing">
      <div className="side-panel__head"><h2>{ctx?.name ?? "Now playing"}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel"><X size={18} /></button></div>
      {!t ? <p className="muted">Nothing playing right now.</p> : (
        <div className="now">
          <img src={t.coverUrl} alt={`Cover of ${t.albumTitle}`} className="now__art" />
          <div className="now__row">
            <div><h3 className="now__title">{t.title}</h3><Link to={`/artist/${t.artistId}`} className="muted">{t.artistName}</Link></div>
            <HeartButton track={t} size={20} alwaysShow />
          </div>
          <p className="muted">From <Link to={`/album/${t.albumId}`}>{t.albumTitle}</Link></p>
        </div>
      )}
    </aside>
  );
}

// ---------- Mobile bottom nav ----------
export function MobileNav() {
  return (
    <nav className="mobilenav" aria-label="Main">
      <NavLink to="/" end><Home size={22} /><span>Home</span></NavLink>
      <NavLink to="/search"><Search size={22} /><span>Search</span></NavLink>
      <NavLink to="/collection"><LibIcon size={22} /><span>Collection</span></NavLink>
    </nav>
  );
}

// ---------- Sign-in prompt ----------
export function LoginPrompt() {
  const { loginPrompt, closeLoginPrompt } = useSession();
  const loc = useLocation();
  useEffect(() => { closeLoginPrompt(); }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!loginPrompt) return null;
  return (
    <Modal title="You'll need an account" onClose={closeLoginPrompt}>
      <p className="modal__body">{loginPrompt}</p>
      <div className="modal__actions">
        <Link to="/login" className="btn btn--ghost">Log in</Link>
        <Link to="/signup" className="btn btn--primary">Create a free account</Link>
      </div>
    </Modal>
  );
}
