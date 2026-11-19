import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Heart, Play } from "lucide-react";
import { api, ApiError, type Track } from "../api";
import { useSession } from "../session";
import { BRAND } from "../brand";
import { EmptyState, PlayButton, HeartButton, Shelf, TrackList, Bars } from "../ui";

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { setUser } = useSession();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  return (
    <div className="auth">
      <div className="auth__card">
        <span className="brand__mark brand__mark--lg" aria-hidden />
        <h1>{signup ? `Join ${BRAND.name}` : `Welcome back`}</h1>
        <form className="form" noValidate onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setBusy(true);
          try {
            const u = signup ? await api.signup({ email, password, displayName: name }) : await api.login({ email, password });
            setUser(u);
            nav("/");
          } catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't reach the server. Try again."); }
          finally { setBusy(false); }
        }}>
          <label className="field"><span>Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {signup && <label className="field"><span>Profile name</span>
            <input className="input" autoComplete="nickname" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label className="field"><span>Password</span>
            <input className="input" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined}
              value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={signup ? "pw-hint" : undefined} /></label>
          {signup && <p id="pw-hint" className="muted small">At least 8 characters.</p>}
          {err && <p className="form__err" role="alert">{err}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? "One moment…" : signup ? "Create account" : "Log in"}</button>
        </form>
        <p className="auth__switch">{signup ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Create a free account</Link></>}</p>
      </div>
    </div>
  );
}
export const LoginPage = () => <AuthForm mode="login" />;
export const SignupPage = () => <AuthForm mode="signup" />;

export function SettingsPage() {
  const { user } = useSession();
  return (
    <div className="page">
      <h1 className="page__title">Settings</h1>
      <section className="settings">
        <h2 className="section-title">Account</h2>
        {user ? <p>{user.displayName} · {user.email}</p> : <p className="muted">You're not logged in.</p>}
        <h2 className="section-title">Keyboard shortcuts</h2>
        <dl className="keys">
          <dt><kbd>Space</kbd></dt><dd>Play or pause</dd>
          <dt><kbd>Alt</kbd> + <kbd>→</kbd> / <kbd>←</kbd></dt><dd>Next / previous song</dd>
          <dt><kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd></dt><dd>Volume up / down</dd>
          <dt><kbd>Alt</kbd> + <kbd>S</kbd></dt><dd>Shuffle on or off</dd>
          <dt><kbd>Alt</kbd> + <kbd>R</kbd></dt><dd>Cycle repeat</dd>
          <dt><kbd>Enter</kbd> on a song</dt><dd>Play it</dd>
          <dt><kbd>Shift</kbd> + <kbd>F10</kbd> on a song</dt><dd>Open its menu</dd>
        </dl>
      </section>
    </div>
  );
}

export function NotFoundPage() {
  return <EmptyState icon={<Compass size={40} />} title="This page wandered off" body="The link may be old, or the item was removed."
    action={<Link to="/" className="btn btn--primary">Go home</Link>} />;
}

/** The design-system check page: every primitive in its states. Not linked from the app. */
export function DesignPage() {
  const t: Track = { id: "demo", title: "A very long song title that keeps going to test truncation in rows", trackNumber: 1, durationMs: 201000,
    audioUrl: "", playCount: 0, albumId: "x", albumTitle: "Demo album", coverUrl: "/media/covers/ar01al1.svg", artistId: "ar01", artistName: "Demo artist" };
  return (
    <div className="page">
      <h1 className="page__title">Design system</h1>
      <Shelf title="Buttons">
        <div className="design-row">
          <button className="btn btn--primary">Primary</button>
          <button className="btn btn--secondary">Secondary</button>
          <button className="btn btn--ghost">Ghost</button>
          <button className="btn btn--danger">Danger</button>
          <button className="btn btn--primary" disabled>Disabled</button>
          <button className="btn btn--primary btn--sm">Small</button>
        </div>
      </Shelf>
      <Shelf title="Play buttons, hearts, chips">
        <div className="design-row">
          <PlayButton playing={false} onClick={() => undefined} label="demo" size="lg" />
          <PlayButton playing onClick={() => undefined} label="demo" size="md" />
          <PlayButton playing={false} onClick={() => undefined} label="demo" size="sm" />
          <HeartButton track={t} alwaysShow /><Heart className="is-on" /><Play /><Bars />
          <button className="chip">Off</button><button className="chip is-on">On</button>
        </div>
      </Shelf>
      <Shelf title="Inputs">
        <div className="design-col">
          <label className="field"><span>Label</span><input className="input" placeholder="Placeholder" /></label>
          <label className="field"><span>Invalid</span><input className="input" aria-invalid defaultValue="bad value" /></label>
          <input type="range" className="slider" style={{ ["--pct" as string]: "40%" }} defaultValue={40} aria-label="demo slider" />
        </div>
      </Shelf>
      <h2 className="section-title">Track list</h2>
      <TrackList tracks={[t, { ...t, id: "demo2", title: "Short" }]} context={{ type: "search", id: "design", name: "Design" }} showAdded />
      <div className="skel skel--line" style={{ marginTop: 24 }} />
    </div>
  );
}
