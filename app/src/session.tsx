import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type Library, type User } from "./api";

type Toast = { id: number; text: string };
type Session = {
  user: User | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  liked: Set<string>;
  setLiked: (trackId: string, on: boolean) => Promise<void>;
  library: Library | null;
  refreshLibrary: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string) => void;
  /** Runs fn if logged in, otherwise shows the sign-in prompt. */
  requireLogin: (why: string, fn: () => void) => void;
  loginPrompt: string | null;
  closeLoginPrompt: () => void;
};

const Ctx = createContext<Session | null>(null);
export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("SessionProvider missing");
  return s;
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [liked, setLikedSet] = useState<Set<string>>(new Set());
  const [library, setLibrary] = useState<Library | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loginPrompt, setLoginPrompt] = useState<string | null>(null);
  const toastId = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const refreshLibrary = useCallback(async () => {
    if (!user) { setLibrary(null); return; }
    try { setLibrary(await api.library()); } catch { /* keep the old one */ }
  }, [user]);

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (!user) { setLikedSet(new Set()); setLibrary(null); return; }
    api.likedIds().then((ids) => setLikedSet(new Set(ids))).catch(() => undefined);
    refreshLibrary();
  }, [user, refreshLibrary]);

  const setLiked = useCallback(async (trackId: string, on: boolean) => {
    // optimistic, rolled back on failure
    setLikedSet((s) => { const n = new Set(s); if (on) n.add(trackId); else n.delete(trackId); return n; });
    try {
      await api.setLiked(trackId, on);
      toast(on ? "Saved to your hearted songs" : "Removed from your hearted songs");
      setLibrary((l) => (l ? { ...l, likedCount: l.likedCount + (on ? 1 : -1) } : l));
    } catch (e) {
      setLikedSet((s) => { const n = new Set(s); if (on) n.delete(trackId); else n.add(trackId); return n; });
      toast(e instanceof ApiError ? e.message : "Couldn't update. Check your connection.");
    }
  }, [toast]);

  const requireLogin = useCallback((why: string, fn: () => void) => {
    if (user) fn(); else setLoginPrompt(why);
  }, [user]);

  const value = useMemo<Session>(() => ({
    user, ready, setUser, liked, setLiked, library, refreshLibrary, toasts, toast, requireLogin,
    loginPrompt, closeLoginPrompt: () => setLoginPrompt(null),
  }), [user, ready, liked, setLiked, library, refreshLibrary, toasts, toast, requireLogin, loginPrompt]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
