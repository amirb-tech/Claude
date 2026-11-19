export type Track = {
  id: string; title: string; trackNumber: number; durationMs: number; audioUrl: string; playCount: number;
  albumId: string; albumTitle: string; coverUrl: string; artistId: string; artistName: string;
  liked?: boolean; rowId?: string; addedAt?: number;
};
export type User = { id: string; email: string; displayName: string };
export type AlbumCard = { id: string; title: string; coverUrl: string; artistName?: string; releaseDate?: string; type?: string };
export type ArtistCard = { id: string; name: string; imageUrl: string; genre: string };
export type PlaylistCard = {
  id: string; name: string; description: string; isPublic: boolean; ownerId: string; ownerName: string;
  covers: string[]; trackCount: number; updatedAt: number;
};
export type Shelf =
  | { id: string; title: string; kind: "album"; items: AlbumCard[] }
  | { id: string; title: string; kind: "artist"; items: ArtistCard[] }
  | { id: string; title: string; kind: "playlist"; items: PlaylistCard[] };
export type Home = { greetingName: string | null; quick: PlaylistCard[]; shelves: Shelf[] };
export type Album = AlbumCard & { artistId: string; artistName: string; artistImage: string; tracks: Track[]; saved: boolean; more: AlbumCard[] };
export type Artist = ArtistCard & { bio: string; monthlyListeners: number; popular: Track[]; albums: AlbumCard[]; following: boolean };
export type Playlist = PlaylistCard & { isOwner: boolean; tracks: Track[] };
export type SearchResult = { q: string; tracks: Track[]; artists: ArtistCard[]; albums: AlbumCard[]; playlists: PlaylistCard[] };
export type LibraryItem =
  | ({ kind: "playlist"; sortAt: number } & PlaylistCard)
  | { kind: "album"; id: string; name: string; coverUrl: string; artistName: string; sortAt: number }
  | { kind: "artist"; id: string; name: string; imageUrl: string; sortAt: number };
export type Library = { likedCount: number; items: LibraryItem[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Something went wrong. Try again.");
  return data as T;
}

const enc = encodeURIComponent;
export const api = {
  me: () => req<User | null>("GET", "/api/me"),
  signup: (b: { email: string; password: string; displayName: string }) => req<User>("POST", "/api/auth/signup", b),
  login: (b: { email: string; password: string }) => req<User>("POST", "/api/auth/login", b),
  logout: () => req<void>("POST", "/api/auth/logout"),
  home: () => req<Home>("GET", "/api/home"),
  genres: () => req<{ name: string; artists: number; imageUrl: string }[]>("GET", "/api/genres"),
  genre: (name: string) => req<{ name: string; artists: ArtistCard[]; albums: AlbumCard[] }>("GET", `/api/genres/${enc(name)}`),
  search: (q: string) => req<SearchResult>("GET", `/api/search?q=${enc(q)}`),
  artist: (id: string) => req<Artist>("GET", `/api/artists/${enc(id)}`),
  album: (id: string) => req<Album>("GET", `/api/albums/${enc(id)}`),
  playlist: (id: string) => req<Playlist>("GET", `/api/playlists/${enc(id)}`),
  createPlaylist: (name?: string) => req<PlaylistCard>("POST", "/api/playlists", { name }),
  updatePlaylist: (id: string, b: Partial<{ name: string; description: string; isPublic: boolean }>) =>
    req<PlaylistCard>("PATCH", `/api/playlists/${enc(id)}`, b),
  deletePlaylist: (id: string) => req<void>("DELETE", `/api/playlists/${enc(id)}`),
  addToPlaylist: (id: string, trackId: string, force = false) => req<{ rowId: string }>("POST", `/api/playlists/${enc(id)}/tracks`, { trackId, force }),
  removeFromPlaylist: (id: string, rowId: string) => req<void>("DELETE", `/api/playlists/${enc(id)}/tracks/${enc(rowId)}`),
  movePlaylistRow: (id: string, rowId: string, afterRowId: string | null) =>
    req<unknown>("PATCH", `/api/playlists/${enc(id)}/tracks/${enc(rowId)}`, { afterRowId }),
  likedTracks: () => req<Track[]>("GET", "/api/me/tracks"),
  likedIds: () => req<string[]>("GET", "/api/me/liked-ids"),
  setLiked: (trackId: string, on: boolean) => req<void>(on ? "PUT" : "DELETE", `/api/me/tracks/${enc(trackId)}`),
  setSavedAlbum: (id: string, on: boolean) => req<void>(on ? "PUT" : "DELETE", `/api/me/albums/${enc(id)}`),
  setFollow: (id: string, on: boolean) => req<void>(on ? "PUT" : "DELETE", `/api/me/artists/${enc(id)}`),
  library: () => req<Library>("GET", "/api/me/library"),
  logPlay: (trackId: string, contextType?: string, contextId?: string) =>
    req<void>("POST", "/api/plays", { trackId, contextType, contextId }).catch(() => undefined),
};

export function fmtTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function fmtLong(ms: number): string {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
}
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
