import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, useMatch } from "react-router-dom";
import { SessionProvider } from "./session";
import { Sidebar, TopBar, PlayerBar, QueuePanel, NowPanel, MobileNav, LoginPrompt } from "./components/Shell";
import { HomePage, SearchPage, SearchBox, GenrePage } from "./pages/Browse";
import { ArtistPage, AlbumPage, PlaylistPage, HeartedPage, CollectionPage, useShortcuts } from "./pages/Collections";
import { LoginPage, SignupPage, SettingsPage, NotFoundPage, DesignPage } from "./pages/Account";
import { MenuHost, ConfirmHost, Toasts } from "./ui";
import { BRAND } from "./brand";

function Layout() {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("rm.rail") === "1"; } catch { return false; } });
  const [panel, setPanel] = useState<"queue" | "now" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const main = useRef<HTMLElement>(null);
  const loc = useLocation();
  const onSearch = useMatch("/search/*");
  const onLogin = useMatch("/login");
  const onSignup = useMatch("/signup");
  const authPage = onLogin || onSignup;
  const shortcuts = useShortcuts();

  useEffect(() => { try { localStorage.setItem("rm.rail", collapsed ? "1" : "0"); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { main.current?.scrollTo(0, 0); setScrolled(false); }, [loc.pathname]);
  useEffect(() => { document.addEventListener("keydown", shortcuts); return () => document.removeEventListener("keydown", shortcuts); }, [shortcuts]);
  useEffect(() => { document.title = BRAND.name; }, [loc.pathname]);

  if (authPage) {
    return <main className="auth-shell"><Routes><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /></Routes><Toasts /></main>;
  }
  return (
    <div className={`app ${panel ? "has-panel" : ""} ${collapsed ? "rail-collapsed" : ""}`}>
      <a href="#main" className="skip">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main id="main" ref={main} className="panel main" tabIndex={-1} onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 40)}>
        <TopBar scrolled={scrolled}>{onSearch && <SearchBox />}</TopBar>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/search/:q" element={<SearchPage />} />
          <Route path="/genre/:name" element={<GenrePage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/collection/hearted" element={<HeartedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/design" element={<DesignPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {panel === "queue" && <QueuePanel onClose={() => setPanel(null)} />}
      {panel === "now" && <NowPanel onClose={() => setPanel(null)} />}
      <PlayerBar panel={panel} setPanel={setPanel} />
      <MobileNav />
      <MenuHost />
      <ConfirmHost />
      <LoginPrompt />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Layout />
      </SessionProvider>
    </BrowserRouter>
  );
}
