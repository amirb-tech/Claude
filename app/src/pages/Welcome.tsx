import { Link } from "react-router-dom";
import { ListChecks, Shuffle, BellOff, EyeOff, ListOrdered, Music2 } from "lucide-react";
import { BRAND } from "../brand";
import { Mark } from "../components/Mark";

const FIXES = [
  { icon: ListChecks, title: "Your list, only your list", body: "Nothing gets added to an album or playlist. Autoplay stays off unless you switch it on." },
  { icon: Shuffle, title: "Shuffle that's fair", body: "Every song plays once before any repeats. The song you're on stays put, and the queue shows what's next." },
  { icon: BellOff, title: "No ads, no skip limits", body: "Every song on demand, as many skips as you like, on the free plan." },
  { icon: EyeOff, title: "Turn things off", body: "Hide your listening history from Home with one switch in Settings." },
  { icon: ListOrdered, title: "A queue that stays put", body: "Line songs up, reorder them, close the tab. They're still there when you come back." },
  { icon: Music2, title: "Music only", body: "No podcasts, video or AI host in your music. No pop-ups asking for reviews." },
];

const FAQ = [
  ["Is it really free with no ads?", "Yes. The free plan is the whole player. Money will come from supporters and from labels who host their music here."],
  ["Can I bring my playlists from another app?", "Not yet. There's no importer, so we won't pretend there is one."],
  ["Whose music is on here?", "Music published by the artists and labels who own it. The demo catalogue on this build was made by a script, to test the player."],
  ["Is there an app?", "The web player works on phones. Native apps come later."],
  ["Can I delete my account?", "Yes, in Settings. It's gone at once, with everything in it."],
];

export function WelcomePage() {
  return (
    <div className="welcome">
      <header className="welcome__nav">
        <Link to="/welcome" className="brand"><Mark /><span>{BRAND.name}</span></Link>
        <nav aria-label="Account"><Link to="/login" className="btn btn--ghost">Log in</Link></nav>
      </header>

      <main>
        <section className="welcome__hero" aria-labelledby="hero-title">
          <h1 id="hero-title">{BRAND.tagline}</h1>
          <p className="welcome__lede">{BRAND.name} is a music player that plays exactly the album or playlist you chose, in your order. No ads, no slipped-in songs, no skip limits.</p>
          <Link to="/" className="btn btn--primary btn--lg">Start listening</Link>
          <p className="muted small">No account needed to listen.</p>
          <img src="/landing/player.png" alt={`The ${BRAND.name} player with an album playing`} className="welcome__shot" width={1440} height={900} />
        </section>

        <section className="welcome__section" aria-labelledby="problem-title">
          <h2 id="problem-title">Sound familiar?</h2>
          <ul className="welcome__problems">
            <li>You asked for your playlist. You got your playlist, plus songs someone else chose.</li>
            <li>Shuffle keeps landing on the same few songs, and sometimes turns itself back on.</li>
            <li>And every few songs, an ad.</li>
          </ul>
        </section>

        <section className="welcome__section" aria-labelledby="how-title">
          <h2 id="how-title">How it works</h2>
          <ol className="welcome__steps">
            <li><strong>Find</strong> an album, an artist or a song.</li>
            <li><strong>Play</strong> it, or build a playlist with Add to playlist.</li>
            <li><strong>That's what plays.</strong> Change the queue whenever you like.</li>
          </ol>
        </section>

        <section className="welcome__section" aria-labelledby="diff-title">
          <h2 id="diff-title">What's different</h2>
          <div className="welcome__grid">
            {FIXES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="welcome__card">
                <Icon aria-hidden className="welcome__icon" />
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <p className="muted">Plus what you'd expect: hearts, playlists, a collection, keyboard shortcuts and a layout that works on your phone.</p>
        </section>

        <section className="welcome__section" aria-labelledby="price-title">
          <h2 id="price-title">Pricing</h2>
          <div className="welcome__prices">
            <div className="welcome__card welcome__card--on">
              <h3>Listener</h3>
              <p className="welcome__price">Free</p>
              <p>The whole player. No ads, no skip limits, every song on demand.</p>
              <Link to="/" className="btn btn--primary">Start listening</Link>
            </div>
            <div className="welcome__card">
              <h3>Supporter</h3>
              <p className="welcome__price">Opening soon</p>
              <p>Pay the artists you actually play. Nothing is taken away from free listeners to make this worth it.</p>
            </div>
          </div>
        </section>

        <section className="welcome__section" aria-labelledby="faq-title">
          <h2 id="faq-title">Questions</h2>
          <div className="welcome__faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="welcome__cta" aria-labelledby="cta-title">
          <h2 id="cta-title">Pick something. It'll play just that.</h2>
          <Link to="/" className="btn btn--primary btn--lg">Start listening</Link>
        </section>
      </main>
      <footer className="welcome__foot muted small">
        <span>{BRAND.name}</span> · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
      </footer>
    </div>
  );
}
