import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search as SearchIcon, X, SearchX } from "lucide-react";
import { api, type Home as HomeT } from "../api";
import { useSession } from "../session";
import {
  AlbumCardView, ArtistCardView, PlaylistCardView, Shelf, ShelfSkeleton, TrackList, ErrorState, EmptyState, useLoad,
  CoverMosaic, ContextPlayButton, hueOf,
} from "../ui";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Up late" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

// S02 Home
export const HIDE_PERSONAL_KEY = "rm.home.hidePersonal";
export function readHidePersonal() { try { return localStorage.getItem(HIDE_PERSONAL_KEY) === "1"; } catch { return false; } }

export function HomePage() {
  const { user } = useSession();
  const { data, error, loading, reload } = useLoad<HomeT>(() => api.home(), [user?.id]);
  const hidePersonal = readHidePersonal();
  if (error) return <ErrorState text={error} retry={reload} />;
  return (
    <div className="page page--home">
      <h1 className="page__title">{greeting()}{data?.greetingName ? `, ${data.greetingName}` : ""}</h1>
      {data && !hidePersonal && data.quick.length > 0 && (
        <div className="quickgrid">
          {data.quick.map((p) => (
            <div key={p.id} className="quick">
              <span className="quick__art"><CoverMosaic covers={p.covers} alt="" /></span>
              <Link to={`/playlist/${p.id}`} className="quick__name stretched">{p.name}</Link>
              <ContextPlayButton size="sm" className="quick__play" context={{ type: "playlist", id: p.id, name: p.name, href: `/playlist/${p.id}` }}
                load={() => api.playlist(p.id).then((x) => x.tracks)} />
            </div>
          ))}
        </div>
      )}
      {loading && !data && <><ShelfSkeleton /><ShelfSkeleton /></>}
      {data?.shelves.filter((s) => !(hidePersonal && (s.id === "recent" || s.id === "mine"))).map((s) => (
        <Shelf key={s.id} title={s.title} href={s.kind === "artist" ? "/search" : undefined}>
          {s.kind === "album" && s.items.map((a) => <AlbumCardView key={a.id} a={a} />)}
          {s.kind === "artist" && s.items.map((a) => <ArtistCardView key={a.id} a={a} />)}
          {s.kind === "playlist" && s.items.map((p) => <PlaylistCardView key={p.id} p={p} />)}
        </Shelf>
      ))}
    </div>
  );
}

// S03 / S04 Search
export function SearchBox() {
  const { q = "" } = useParams();
  const nav = useNavigate();
  const [v, setV] = useState(q);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setV(q), [q]);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (v.trim() === q.trim()) return;
    const id = setTimeout(() => nav(v.trim() ? `/search/${encodeURIComponent(v.trim())}` : "/search", { replace: true }), 250);
    return () => clearTimeout(id);
  }, [v, q, nav]);
  return (
    <form role="search" className="searchbox" onSubmit={(e) => { e.preventDefault(); if (v.trim()) nav(`/search/${encodeURIComponent(v.trim())}`); }}>
      <SearchIcon size={20} aria-hidden />
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)} placeholder="Songs, artists, albums or playlists"
        aria-label="Search" maxLength={100} onKeyDown={(e) => e.key === "Escape" && setV("")} />
      {v && <button type="button" className="icon-btn" onClick={() => { setV(""); ref.current?.focus(); }} aria-label="Clear search"><X size={18} /></button>}
    </form>
  );
}

export function SearchPage() {
  const { q } = useParams();
  return q ? <SearchResults q={q} /> : <BrowseGenres />;
}

function BrowseGenres() {
  const { data, error, reload } = useLoad(() => api.genres(), []);
  if (error) return <ErrorState text={error} retry={reload} />;
  return (
    <div className="page">
      <h1 className="page__title">Explore by sound</h1>
      <div className="tiles">
        {data?.map((g) => (
          <Link key={g.name} to={`/genre/${encodeURIComponent(g.name)}`} className="tile" style={{ ["--hue" as string]: hueOf(g.name) }}>
            <span className="tile__name">{g.name}</span>
            <img src={g.imageUrl} alt="" className="tile__img" />
          </Link>
        ))}
      </div>
    </div>
  );
}

type Filter = "all" | "songs" | "artists" | "albums" | "playlists";
function SearchResults({ q }: { q: string }) {
  const [f, setF] = useState<Filter>("all");
  const { data, error, loading, reload } = useLoad(() => api.search(q), [q]);
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!data) return loading ? <div className="page"><ShelfSkeleton /></div> : null;
  const none = !data.tracks.length && !data.artists.length && !data.albums.length && !data.playlists.length;
  if (none) return <EmptyState icon={<SearchX size={40} />} title={`Nothing matches "${q}"`} body="Check the spelling, use fewer words, or try an artist's name." />;
  const top = data.artists[0] ? { kind: "artist" as const, a: data.artists[0] } : data.albums[0] ? { kind: "album" as const, a: data.albums[0] } : null;
  const ctx = { type: "search" as const, id: q, name: `Results for "${q}"`, href: `/search/${encodeURIComponent(q)}` };
  return (
    <div className="page">
      <div className="chips chips--page" role="group" aria-label="Filter results">
        {(["all", "songs", "artists", "albums", "playlists"] as const).map((x) => (
          <button key={x} type="button" className={`chip ${f === x ? "is-on" : ""}`} aria-pressed={f === x} onClick={() => setF(x)}>
            {x === "all" ? "Everything" : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
      {f === "all" && (
        <div className="search-top">
          {top && (
            <section className="topresult" aria-label="Best match">
              <h2>Best match</h2>
              <div className="topresult__card">
                <img src={top.kind === "artist" ? top.a.imageUrl : top.a.coverUrl} alt="" className={top.kind === "artist" ? "is-round" : ""} />
                <Link to={`/${top.kind}/${top.a.id}`} className="topresult__name stretched">{top.kind === "artist" ? top.a.name : top.a.title}</Link>
                <span className="muted">{top.kind === "artist" ? "Artist" : `Album · ${top.a.artistName}`}</span>
                <ContextPlayButton size="md" className="topresult__play"
                  context={{ type: top.kind, id: top.a.id, name: top.kind === "artist" ? top.a.name : top.a.title, href: `/${top.kind}/${top.a.id}` }}
                  load={() => (top.kind === "artist" ? api.artist(top.a.id).then((x) => x.popular) : api.album(top.a.id).then((x) => x.tracks))} />
              </div>
            </section>
          )}
          {data.tracks.length > 0 && (
            <section className="search-songs" aria-label="Songs">
              <h2>Songs</h2>
              <TrackList tracks={data.tracks.slice(0, 4)} context={ctx} showAlbum={false} />
            </section>
          )}
        </div>
      )}
      {f === "songs" && (data.tracks.length ? <TrackList tracks={data.tracks} context={ctx} /> : <p className="muted">No songs match.</p>)}
      {(f === "all" || f === "artists") && data.artists.length > 0 && <Shelf title="Artists">{data.artists.map((a) => <ArtistCardView key={a.id} a={a} />)}</Shelf>}
      {(f === "all" || f === "albums") && data.albums.length > 0 && <Shelf title="Albums">{data.albums.map((a) => <AlbumCardView key={a.id} a={a} />)}</Shelf>}
      {(f === "all" || f === "playlists") && data.playlists.length > 0 && <Shelf title="Playlists">{data.playlists.map((p) => <PlaylistCardView key={p.id} p={p} />)}</Shelf>}
      {f !== "all" && f !== "songs" && !(f === "artists" ? data.artists : f === "albums" ? data.albums : data.playlists).length && <p className="muted">No {f} match.</p>}
    </div>
  );
}

export function GenrePage() {
  const { name = "" } = useParams();
  const { data, error, reload } = useLoad(() => api.genre(name), [name]);
  if (error) return <ErrorState text={error} retry={reload} />;
  if (!data) return <div className="page"><ShelfSkeleton /></div>;
  return (
    <div className="page">
      <h1 className="page__title page__title--xl">{data.name}</h1>
      <Shelf title="Artists">{data.artists.map((a) => <ArtistCardView key={a.id} a={a} />)}</Shelf>
      <Shelf title="Releases">{data.albums.map((a) => <AlbumCardView key={a.id} a={a} />)}</Shelf>
    </div>
  );
}
