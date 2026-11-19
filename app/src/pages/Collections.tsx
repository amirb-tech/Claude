import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart, ListMusic, MoreHorizontal, Pencil, Trash2, Music, Library as LibIcon, CirclePlus, CircleCheck } from "lucide-react";
import { api, ApiError, fmtLong, type Track, type Playlist } from "../api";
import { useSession } from "../session";
import { player } from "../player";
import {
  CollectionHeader, ContextPlayButton, TrackList, Shelf, AlbumCardView, ErrorState, EmptyState, useLoad, hueOf, CoverMosaic, Modal,
  confirmBox, ShelfSkeleton,
} from "../ui";

const total = (ts: Track[]) => ts.reduce((s, t) => s + t.durationMs, 0);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Loading() {
  return <div className="page"><div className="col-head col-head--skel"><div className="skel skel--art-lg" /><div className="skel skel--title" /></div><ShelfSkeleton /></div>;
}

// S05 Artist
export function ArtistPage() {
  const { id = "" } = useParams();
  const { requireLogin, toast, refreshLibrary } = useSession();
  const { data: a, error, reload, setData } = useLoad(() => api.artist(id), [id]);
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!a) return <Loading />;
  const ctx = { type: "artist" as const, id: a.id, name: a.name, href: `/artist/${a.id}` };
  const follow = () => requireLogin("Log in to follow artists.", async () => {
    try {
      await api.setFollow(a.id, !a.following);
      setData({ ...a, following: !a.following });
      toast(a.following ? `Unfollowed ${a.name}` : `Following ${a.name}`);
      refreshLibrary();
    } catch { toast("Couldn't update. Try again."); }
  });
  return (
    <div className="page page--flush">
      <CollectionHeader kind="Artist" title={a.name} round hue={hueOf(a.name)} art={<img src={a.imageUrl} alt="" />}
        meta={<span>{a.monthlyListeners.toLocaleString()} plays · {a.genre}</span>} />
      <div className="actionbar">
        <ContextPlayButton context={ctx} load={() => a.popular} />
        <button type="button" className="btn btn--secondary" aria-pressed={a.following} onClick={follow}>{a.following ? "Following" : "Follow"}</button>
      </div>
      <div className="page__body">
        <h2 className="section-title">Most played</h2>
        <TrackList tracks={a.popular} context={ctx} showAlbum={false} />
        <Shelf title="Releases">{a.albums.map((al) => <AlbumCardView key={al.id} a={al} />)}</Shelf>
        <section className="about"><h2 className="section-title">About</h2><p>{a.bio}</p></section>
      </div>
    </div>
  );
}

// S06 Album
export function AlbumPage() {
  const { id = "" } = useParams();
  const { requireLogin, toast, refreshLibrary } = useSession();
  const { data: al, error, reload, setData } = useLoad(() => api.album(id), [id]);
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!al) return <Loading />;
  const ctx = { type: "album" as const, id: al.id, name: al.title, href: `/album/${al.id}` };
  const save = () => requireLogin("Log in to save albums to your collection.", async () => {
    try {
      await api.setSavedAlbum(al.id, !al.saved);
      setData({ ...al, saved: !al.saved });
      toast(al.saved ? "Removed from your collection" : "Saved to your collection");
      refreshLibrary();
    } catch { toast("Couldn't update. Try again."); }
  });
  return (
    <div className="page page--flush">
      <CollectionHeader kind={al.type === "ep" ? "EP" : al.type === "single" ? "Single" : "Album"} title={al.title} hue={hueOf(al.title)}
        art={<img src={al.coverUrl} alt={`Cover of ${al.title}`} />}
        meta={<><img src={al.artistImage} alt="" className="meta-avatar" /><Link to={`/artist/${al.artistId}`} className="meta-strong">{al.artistName}</Link>
          <span> · {al.releaseDate?.slice(0, 4)} · {plural(al.tracks.length, "song")}, {fmtLong(total(al.tracks))}</span></>} />
      <div className="actionbar">
        <ContextPlayButton context={ctx} load={() => al.tracks} />
        <button type="button" className={`icon-btn icon-btn--lg ${al.saved ? "is-on" : ""}`} onClick={save} aria-pressed={al.saved}
          aria-label={al.saved ? "Remove album from your collection" : "Save album to your collection"}>
          {al.saved ? <CircleCheck size={30} /> : <CirclePlus size={30} />}
        </button>
      </div>
      <div className="page__body">
        <TrackList tracks={al.tracks} context={ctx} showArt={false} showAlbum={false} numbered={false} />
        <p className="muted small release">Released {new Date(al.releaseDate + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "long" })}</p>
        {al.more.length > 0 && <Shelf title={`More from ${al.artistName}`}>{al.more.map((m) => <AlbumCardView key={m.id} a={m} />)}</Shelf>}
      </div>
    </div>
  );
}

// S07 Playlist
export function PlaylistPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { toast, refreshLibrary } = useSession();
  const { data: p, error, reload, setData } = useLoad(() => api.playlist(id), [id]);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!p) return <Loading />;
  const ctx = { type: "playlist" as const, id: p.id, name: p.name, href: `/playlist/${p.id}` };

  const remove = async (t: Track) => {
    const before = p;
    setData({ ...p, tracks: p.tracks.filter((x) => x.rowId !== t.rowId), trackCount: p.trackCount - 1 });
    try { await api.removeFromPlaylist(p.id, t.rowId!); toast(`Removed from ${p.name}`); refreshLibrary(); }
    catch { setData(before); toast("Couldn't remove the song."); }
  };
  const move = async (t: Track, dir: -1 | 1) => {
    const i = p.tracks.findIndex((x) => x.rowId === t.rowId);
    const j = i + dir;
    if (j < 0 || j >= p.tracks.length) return;
    const next = [...p.tracks];
    next.splice(i, 1);
    next.splice(j, 0, t);
    setData({ ...p, tracks: next });
    const after = j === 0 ? null : next[j - 1].rowId!;
    try { await api.movePlaylistRow(p.id, t.rowId!, after); } catch { reload(); toast("Couldn't move the song."); }
  };
  const del = () => confirmBox(`Delete "${p.name}"? This can't be undone.`, "Delete", async () => {
    try { await api.deletePlaylist(p.id); await refreshLibrary(); toast(`Deleted ${p.name}`); nav("/"); }
    catch { toast("Couldn't delete the playlist."); }
  }, true);

  return (
    <div className="page page--flush">
      <CollectionHeader kind={p.isPublic ? "Public playlist" : "Private playlist"} title={p.name} hue={hueOf(p.name)}
        onTitleClick={p.isOwner ? () => setEditing(true) : undefined}
        art={<CoverMosaic covers={p.covers} alt={`Cover of ${p.name}`} />}
        meta={<>{p.description && <p className="col-head__desc">{p.description}</p>}
          <span className="meta-strong">{p.ownerName}</span><span> · {plural(p.tracks.length, "song")}{p.tracks.length ? `, ${fmtLong(total(p.tracks))}` : ""}</span></>} />
      <div className="actionbar">
        {p.tracks.length > 0 && <ContextPlayButton context={ctx} load={() => p.tracks} />}
        {p.isOwner && (
          <div className="usermenu">
            <button type="button" className="icon-btn icon-btn--lg" aria-haspopup="menu" aria-expanded={menu} aria-label={`More options for ${p.name}`}
              onClick={() => setMenu(!menu)}><MoreHorizontal size={28} /></button>
            {menu && (
              <div className="menu menu--anchored menu--left" role="menu" onMouseLeave={() => setMenu(false)}>
                <button role="menuitem" onClick={() => { setMenu(false); setEditing(true); }}><Pencil size={16} />Edit details</button>
                <button role="menuitem" onClick={() => { setMenu(false); del(); }}><Trash2 size={16} />Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="page__body">
        {p.tracks.length > 0
          ? <TrackList tracks={p.tracks} context={ctx} showAdded onRemove={p.isOwner ? remove : undefined} onMove={p.isOwner ? move : undefined} />
          : <EmptyState icon={<ListMusic size={40} />} title="Nothing here yet"
              body={p.isOwner ? "Search below and add a song, or use Add to playlist on any song." : "The owner hasn't added songs yet."} />}
        {p.isOwner && <FindMore playlist={p} onAdded={() => { reload(); refreshLibrary(); }} />}
      </div>
      {editing && <EditDetails p={p} onClose={() => setEditing(false)} onSaved={(np) => { setData({ ...p, ...np }); refreshLibrary(); }} />}
    </div>
  );
}

function FindMore({ playlist, onAdded }: { playlist: Playlist; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const { toast } = useSession();
  const { data } = useLoad(() => (q.trim().length > 1 ? api.search(q.trim()) : Promise.resolve(null)), [q]);
  const add = async (t: Track) => {
    try { await api.addToPlaylist(playlist.id, t.id); toast(`Added to ${playlist.name}`); onAdded(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        confirmBox(`"${t.title}" is already in ${playlist.name}.`, "Add it again", async () => { await api.addToPlaylist(playlist.id, t.id, true); onAdded(); });
      } else toast("Couldn't add the song.");
    }
  };
  return (
    <section className="findmore" aria-label="Find songs to add">
      <h2 className="section-title">Add songs</h2>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for songs to add" aria-label="Search for songs to add" />
      {data?.tracks.slice(0, 8).map((t) => (
        <div key={t.id} className="findmore__row">
          <img src={t.coverUrl} alt="" />
          <span className="trow__names"><span className="trow__name">{t.title}</span><span className="trow__artist">{t.artistName}</span></span>
          <span className="muted col-album">{t.albumTitle}</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => add(t)} aria-label={`Add ${t.title}`}>Add</button>
        </div>
      ))}
    </section>
  );
}

// S13 Edit details
function EditDetails({ p, onClose, onSaved }: { p: Playlist; onClose: () => void; onSaved: (p: Partial<Playlist>) => void }) {
  const [name, setName] = useState(p.name);
  const [desc, setDesc] = useState(p.description);
  const [pub, setPub] = useState(p.isPublic);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Edit playlist" onClose={onClose}>
      <form className="form" onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return setErr("Give the playlist a name.");
        setBusy(true);
        try { const np = await api.updatePlaylist(p.id, { name, description: desc, isPublic: pub }); onSaved(np); onClose(); }
        catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't save. Try again."); }
        finally { setBusy(false); }
      }}>
        <label className="field"><span>Name</span><input className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-invalid={!!err && !name.trim()} /></label>
        <label className="field"><span>Description <small className="muted">(optional)</small></span>
          <textarea className="input" value={desc} maxLength={300} rows={3} onChange={(e) => setDesc(e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Anyone with the link can see it</label>
        {err && <p className="form__err" role="alert">{err}</p>}
        <div className="modal__actions"><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

// S08 Hearted songs
export function HeartedPage() {
  const { user, liked } = useSession();
  const { data, error, reload } = useLoad(() => (user ? api.likedTracks() : Promise.resolve([] as Track[])), [user?.id, liked.size]);
  if (!user) return <EmptyState icon={<Heart size={40} />} title="Keep the songs you love" body="Log in and tap the heart on any song to save it here."
    action={<Link to="/login" className="btn btn--primary">Log in</Link>} />;
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!data) return <Loading />;
  const tracks = data.filter((t) => liked.has(t.id));
  const ctx = { type: "liked" as const, id: "liked", name: "Hearted songs", href: "/collection/hearted" };
  return (
    <div className="page page--flush">
      <CollectionHeader kind="Playlist" title="Hearted songs" hue={260} art={<div className="hearted-art"><Heart size={72} fill="currentColor" /></div>}
        meta={<><span className="meta-strong">{user.displayName}</span><span> · {plural(tracks.length, "song")}</span></>} />
      <div className="actionbar">{tracks.length > 0 && <ContextPlayButton context={ctx} load={() => tracks} />}</div>
      <div className="page__body">
        {tracks.length ? <TrackList tracks={tracks} context={ctx} showAdded />
          : <EmptyState icon={<Music size={40} />} title="No hearted songs yet" body="Tap the heart next to any song and it lands here."
              action={<Link to="/search" className="btn btn--secondary">Find something</Link>} />}
      </div>
    </div>
  );
}

// S09 Collection (full page; the sidebar is the desktop version)
export function CollectionPage() {
  const { user, library } = useSession();
  if (!user) return <EmptyState icon={<LibIcon size={40} />} title="Your collection lives here" body="Log in to see your playlists, saved albums and artists you follow."
    action={<Link to="/login" className="btn btn--primary">Log in</Link>} />;
  return (
    <div className="page">
      <h1 className="page__title">Your collection</h1>
      <div className="libgrid">
        <Link to="/collection/hearted" className="libitem"><span className="libitem__art hearted-art"><Heart size={28} fill="currentColor" /></span>
          <span><span className="trow__name">Hearted songs</span><span className="trow__artist">{plural(library?.likedCount ?? 0, "song")}</span></span></Link>
        {library?.items.map((i) => (
          <Link key={i.kind + i.id} to={`/${i.kind}/${i.id}`} className="libitem">
            <span className={`libitem__art ${i.kind === "artist" ? "is-round" : ""}`}>
              {i.kind === "playlist" ? <CoverMosaic covers={i.covers} alt="" /> : <img src={i.kind === "album" ? i.coverUrl : i.imageUrl} alt="" />}
            </span>
            <span><span className="trow__name">{i.name}</span><span className="trow__artist">{i.kind === "playlist" ? "Playlist" : i.kind === "album" ? `Album · ${i.artistName}` : "Artist"}</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// keyboard shortcuts help lives in Settings; this is used by the app shell
export function useShortcuts() {
  return (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
    if (e.code === "Space" && !(e.target as HTMLElement)?.closest("button, a, [role=row]")) { e.preventDefault(); player.toggle(); }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); player.next(); }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); player.prev(); }
    if (e.altKey && (e.key === "s" || e.key === "ß")) { e.preventDefault(); player.toggleShuffle(); }
    if (e.altKey && (e.key === "r" || e.key === "®")) { e.preventDefault(); player.cycleRepeat(); }
    if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); player.setVolume(player.state.volume + 0.1); }
    if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); player.setVolume(player.state.volume - 0.1); }
  };
}
