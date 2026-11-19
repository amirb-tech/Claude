// The player engine: one <audio> element for the whole app, plus queue,
// shuffle and repeat. Plain class + useSyncExternalStore, so it survives
// route changes and keyboard shortcuts can drive it without React.
import { useSyncExternalStore } from "react";
import { api, type Track } from "./api";

export type Repeat = "off" | "all" | "one";
export type Context = { type: "album" | "playlist" | "artist" | "liked" | "search" | "queue"; id: string; name: string; href?: string };

type State = {
  context: Context | null;
  tracks: Track[];      // the context's tracks, in their own order
  order: number[];      // play order (indices into tracks); shuffled when shuffle is on
  pos: number;          // position in `order` of the context track that is current or last played
  queue: Track[];       // user queue: plays before the context continues
  current: Track | null;
  fromQueue: boolean;   // current came from the user queue
  playing: boolean;
  loading: boolean;
  shuffle: boolean;
  repeat: Repeat;
  volume: number;
  muted: boolean;
  time: number;         // ms
  duration: number;     // ms
  error: string | null;
};

const LS = "rm.player.v1";

function shuffled(n: number, first: number): number[] {
  const rest = [...Array(n).keys()].filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first >= 0 ? [first, ...rest] : rest;
}

class Player {
  private audio: HTMLAudioElement;
  private listeners = new Set<() => void>();
  private loggedFor: string | null = null;
  private loadToken = 0;
  state: State;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    let saved: Partial<State> = {};
    try { saved = JSON.parse(localStorage.getItem(LS) ?? "{}"); } catch { /* storage blocked */ }
    this.state = {
      context: saved.context ?? null, tracks: saved.tracks ?? [], order: saved.order ?? [], pos: saved.pos ?? 0,
      queue: [], current: saved.current ?? null, fromQueue: false, playing: false, loading: false,
      shuffle: saved.shuffle ?? false, repeat: saved.repeat ?? "off",
      volume: typeof saved.volume === "number" ? saved.volume : 0.8, muted: false,
      time: 0, duration: saved.current?.durationMs ?? 0, error: null,
    };
    this.audio.volume = this.state.volume;
    if (this.state.current) this.audio.src = this.state.current.audioUrl; // restored paused; never autoplay on load

    const a = this.audio;
    a.addEventListener("timeupdate", () => {
      this.set({ time: a.currentTime * 1000 });
      if (this.state.current && this.loggedFor !== this.state.current.id && a.currentTime >= 30) this.logPlay();
    });
    a.addEventListener("durationchange", () => isFinite(a.duration) && this.set({ duration: a.duration * 1000 }));
    a.addEventListener("playing", () => this.set({ playing: true, loading: false, error: null }));
    a.addEventListener("pause", () => this.set({ playing: false }));
    a.addEventListener("waiting", () => this.set({ loading: true }));
    a.addEventListener("canplay", () => this.set({ loading: false }));
    a.addEventListener("ended", () => this.onEnded());
    a.addEventListener("error", () => this.state.current && this.set({ playing: false, loading: false, error: "This song couldn't be played." }));
    this.setupMediaSession();
  }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  private set(p: Partial<State>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l());
    if ("current" in p || "volume" in p || "shuffle" in p || "repeat" in p || "pos" in p) this.persist();
  }
  private persist() {
    const { context, tracks, order, pos, current, shuffle, repeat, volume } = this.state;
    try { localStorage.setItem(LS, JSON.stringify({ context, tracks: tracks.slice(0, 500), order: order.slice(0, 500), pos, current, shuffle, repeat, volume })); } catch { /* ignore */ }
  }

  private logPlay() {
    const c = this.state.current;
    if (!c) return;
    this.loggedFor = c.id;
    const ctx = this.state.context;
    api.logPlay(c.id, this.state.fromQueue ? undefined : ctx?.type, this.state.fromQueue ? undefined : ctx?.id);
  }

  private async load(track: Track, autoplay = true) {
    const token = ++this.loadToken;
    this.loggedFor = null;
    this.set({ current: track, time: 0, duration: track.durationMs, loading: autoplay, error: null });
    this.audio.src = track.audioUrl;
    this.updateMediaSession();
    if (!autoplay) return;
    try {
      await this.audio.play();
    } catch (e) {
      // a newer load superseded this one, or the browser blocked autoplay: both are fine
      if (token === this.loadToken && (e as Error).name !== "AbortError") this.set({ playing: false, loading: false });
    }
  }

  /** Start a context (album, playlist...) at `index` (in the context's own order). */
  playContext(context: Context, tracks: Track[], index = 0) {
    if (!tracks.length) return;
    const i = Math.max(0, Math.min(index, tracks.length - 1));
    const order = this.state.shuffle ? shuffled(tracks.length, i) : [...tracks.keys()];
    const pos = order.indexOf(i);
    this.set({ context, tracks, order, pos, fromQueue: false });
    this.load(tracks[i]);
  }

  /** Is this context (and optionally this track) the one playing now? */
  isCurrent(contextType: string, contextId: string, trackId?: string) {
    const s = this.state;
    if (!s.context || s.fromQueue || s.context.type !== contextType || s.context.id !== contextId) return false;
    return trackId ? s.current?.id === trackId : true;
  }

  toggle() {
    if (!this.state.current) return;
    if (this.audio.paused) this.audio.play().catch(() => undefined);
    else this.audio.pause();
  }
  play() { if (this.state.current && this.audio.paused) this.audio.play().catch(() => undefined); }
  pause() { this.audio.pause(); }

  next(auto = false) {
    const s = this.state;
    if (s.queue.length) {
      const [head, ...rest] = s.queue;
      this.set({ queue: rest, fromQueue: true });
      return this.load(head);
    }
    if (!s.tracks.length) return;
    let pos = s.fromQueue ? s.pos + 1 : s.pos + 1;
    let order = s.order;
    if (pos >= order.length) {
      if (s.repeat === "all") {
        order = s.shuffle ? shuffled(s.tracks.length, -1) : order;
        pos = 0;
      } else {
        // end of the context with repeat off: stop on the last song, rewound
        const last = s.tracks[order[order.length - 1]];
        this.set({ pos: order.length - 1, fromQueue: false, playing: false });
        if (s.current?.id !== last.id) this.load(last, false);
        else { this.audio.pause(); this.audio.currentTime = 0; this.set({ time: 0 }); }
        void auto;
        return;
      }
    }
    this.set({ order, pos, fromQueue: false });
    this.load(s.tracks[order[pos]]);
  }

  prev() {
    const s = this.state;
    if (this.audio.currentTime > 3 || !s.tracks.length) { this.seek(0); return; }
    let pos = s.fromQueue ? s.pos : s.pos - 1;
    if (pos < 0) {
      if (s.repeat === "all") pos = s.order.length - 1;
      else { this.seek(0); return; }
    }
    this.set({ pos, fromQueue: false });
    this.load(s.tracks[s.order[pos]]);
  }

  private onEnded() {
    if (this.state.current && this.loggedFor !== this.state.current.id) this.logPlay();
    if (this.state.repeat === "one") {
      this.audio.currentTime = 0;
      this.loggedFor = null;
      this.audio.play().catch(() => undefined);
      return;
    }
    this.next(true);
  }

  seek(ms: number) {
    if (!this.state.current) return;
    const max = this.state.duration || this.state.current.durationMs;
    const t = Math.max(0, Math.min(ms, max - 50));
    this.audio.currentTime = t / 1000;
    this.set({ time: t });
  }

  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    this.audio.volume = vol;
    this.audio.muted = false;
    this.set({ volume: vol, muted: false });
  }
  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this.set({ muted: this.audio.muted });
  }

  toggleShuffle() {
    const s = this.state;
    const on = !s.shuffle;
    if (!s.tracks.length) return this.set({ shuffle: on });
    const cur = s.order[s.pos] ?? 0;
    const order = on ? shuffled(s.tracks.length, cur) : [...s.tracks.keys()];
    this.set({ shuffle: on, order, pos: order.indexOf(cur) });
  }
  cycleRepeat() {
    const r = this.state.repeat;
    this.set({ repeat: r === "off" ? "all" : r === "all" ? "one" : "off" });
  }

  addToQueue(t: Track) {
    if (!this.state.current) {
      this.set({ context: { type: "queue", id: "queue", name: "Queue" }, tracks: [t], order: [0], pos: 0 });
      return this.load(t);
    }
    this.set({ queue: [...this.state.queue, t] });
  }
  removeFromQueue(i: number) { this.set({ queue: this.state.queue.filter((_, j) => j !== i) }); }
  moveInQueue(from: number, to: number) {
    const q = [...this.state.queue];
    if (to < 0 || to >= q.length) return;
    const [x] = q.splice(from, 1);
    q.splice(to, 0, x);
    this.set({ queue: q });
  }
  clearQueue() { this.set({ queue: [] }); }
  /** Jump to a queued song now. */
  playFromQueue(i: number) {
    const q = this.state.queue;
    if (!q[i]) return;
    this.set({ queue: q.slice(i + 1), fromQueue: true });
    this.load(q[i]);
  }
  /** Jump to an upcoming context song. */
  playFromContext(posInOrder: number) {
    const s = this.state;
    if (!s.order[posInOrder] && s.order[posInOrder] !== 0) return;
    this.set({ pos: posInOrder, fromQueue: false });
    this.load(s.tracks[s.order[posInOrder]]);
  }
  upcoming(): { track: Track; pos: number }[] {
    const s = this.state;
    const start = s.fromQueue ? s.pos + 1 : s.pos + 1;
    return s.order.slice(start, start + 50).map((i, k) => ({ track: s.tracks[i], pos: start + k }));
  }

  private setupMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => this.play());
    ms.setActionHandler("pause", () => this.pause());
    ms.setActionHandler("nexttrack", () => this.next());
    ms.setActionHandler("previoustrack", () => this.prev());
    ms.setActionHandler("seekto", (d) => d.seekTime !== undefined && this.seek(d.seekTime * 1000));
  }
  private updateMediaSession() {
    const c = this.state.current;
    if (!c || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: c.title, artist: c.artistName, album: c.albumTitle,
      artwork: [{ src: new URL(c.coverUrl, location.href).href, sizes: "300x300", type: "image/svg+xml" }],
    });
  }
}

export const player = new Player();

export function usePlayer<T>(select: (s: State) => T): T {
  return useSyncExternalStore(player.subscribe, () => select(player.state));
}
