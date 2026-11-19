import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Compass, Heart, Play } from "lucide-react";
import { api, ApiError, type Track } from "../api";
import { useSession } from "../session";
import { BRAND } from "../brand";
import { Mark } from "../components/Mark";
import { EmptyState, PlayButton, HeartButton, Shelf, TrackList, Bars } from "../ui";
import { HIDE_PERSONAL_KEY, readHidePersonal } from "./Browse";

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
        <Mark className="brand__mark brand__mark--lg" />
        <h1>{signup ? `Make your ${BRAND.name} account` : `Log in to ${BRAND.name}`}</h1>
        <p className="muted auth__tag">{BRAND.tagline}</p>
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
        {!signup && <p className="auth__switch"><Link to="/forgot">Forgot your password?</Link></p>}
        <p className="auth__switch">{signup ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Create a free account</Link></>}</p>
      </div>
    </div>
  );
}
export const LoginPage = () => <AuthForm mode="login" />;

export function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="auth"><div className="auth__card">
      <Mark className="brand__mark brand__mark--lg" />
      <h1>Reset your password</h1>
      {sent ? <p className="muted" role="status">If an account uses that email, a reset link is on its way. It works for one hour.</p> : (
        <form className="form" onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          try { await api.forgot(email); setSent(true); } catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't reach the server."); }
        }}>
          <label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {err && <p className="form__err" role="alert">{err}</p>}
          <button type="submit" className="btn btn--primary btn--block">Send reset link</button>
        </form>
      )}
      <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
    </div></div>
  );
}

export function ResetPage() {
  const { token = "" } = useParams();
  const { setUser } = useSession();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="auth"><div className="auth__card">
      <Mark className="brand__mark brand__mark--lg" />
      <h1>Choose a new password</h1>
      <form className="form" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        try { setUser(await api.reset(token, pw)); nav("/"); } catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't reach the server."); }
      }}>
        <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <p className="muted small">At least 8 characters. You'll be signed out on other devices.</p>
        {err && <p className="form__err" role="alert">{err}</p>}
        <button type="submit" className="btn btn--primary btn--block">Save and log in</button>
      </form>
    </div></div>
  );
}

function AccountSettings() {
  const { user, setUser, toast } = useSession();
  const nav = useNavigate();
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [pwErr, setPwErr] = useState("");
  const [del, setDel] = useState(""); const [delErr, setDelErr] = useState("");
  if (!user) return <p className="muted">You're not logged in. <Link to="/login">Log in</Link></p>;
  return (
    <>
      <p>{user.displayName} · {user.email}</p>
      <h3 className="section-title">Change password</h3>
      <form className="form settings__form" onSubmit={async (e) => {
        e.preventDefault(); setPwErr("");
        try { await api.changePassword(cur, next); setCur(""); setNext(""); toast("Password changed. Other devices were signed out."); }
        catch (x) { setPwErr(x instanceof ApiError ? x.message : "Couldn't save."); }
      }}>
        <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} /></label>
        {pwErr && <p className="form__err" role="alert">{pwErr}</p>}
        <div><button type="submit" className="btn btn--secondary">Change password</button></div>
      </form>
      <h3 className="section-title">Devices</h3>
      <button type="button" className="btn btn--secondary" onClick={async () => { await api.logoutEverywhere(); toast("Signed out everywhere else"); }}>Sign out of all other devices</button>
      <h3 className="section-title">Delete account</h3>
      <p className="muted">This removes your account, playlists, hearted songs and history for good. It can't be undone.</p>
      <form className="form settings__form" onSubmit={async (e) => {
        e.preventDefault(); setDelErr("");
        try { await api.deleteAccount(del); setUser(null); toast("Your account was deleted"); nav("/"); }
        catch (x) { setDelErr(x instanceof ApiError ? x.message : "Couldn't delete the account."); }
      }}>
        <label className="field"><span>Type your password to confirm</span><input className="input" type="password" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} /></label>
        {delErr && <p className="form__err" role="alert">{delErr}</p>}
        <div><button type="submit" className="btn btn--danger" disabled={!del}>Delete my account</button></div>
      </form>
    </>
  );
}
export const SignupPage = () => <AuthForm mode="signup" />;

function HomeSettings() {
  const [hide, setHide] = useState(readHidePersonal);
  return (
    <>
      <h2 className="section-title">Home</h2>
      <label className="check">
        <input type="checkbox" checked={hide} onChange={(e) => {
          setHide(e.target.checked);
          try { localStorage.setItem(HIDE_PERSONAL_KEY, e.target.checked ? "1" : "0"); } catch { /* storage blocked */ }
        }} />
        Hide my recent listening and playlists on Home
      </label>
      <h2 className="section-title">Playback</h2>
      <p className="muted">Playlists and albums play exactly what's in them. Nothing is added, and shuffle plays every song once before any repeats.</p>
    </>
  );
}

export function SettingsPage() {
  return (
    <div className="page">
      <h1 className="page__title">Settings</h1>
      <section className="settings">
        <HomeSettings />
        <h2 className="section-title">Account</h2>
        <AccountSettings />
        <p className="muted small"><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
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
