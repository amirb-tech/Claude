import { Link } from "react-router-dom";
import { BRAND } from "../brand";

const contact = BRAND.supportEmail || "[support email not set]";
const who = BRAND.operator || "[operator not set]";

export function PrivacyPage() {
  return (
    <div className="page legal">
      <h1 className="page__title">Privacy</h1>
      <p className="muted">Plain-language summary. Have a lawyer review it for your country before launch.</p>
      <h2 className="section-title">What we keep</h2>
      <ul>
        <li>Your account: email, the profile name you choose, and a one-way hash of your password (never the password itself).</li>
        <li>What you make: playlists, hearted songs, saved albums and followed artists.</li>
        <li>What you play: which songs you played and when, to show "pick up where you left off" and count plays.</li>
      </ul>
      <h2 className="section-title">What we don't do</h2>
      <ul>
        <li>No ads, so no advertising profile and no ad networks.</li>
        <li>No selling or sharing your data.</li>
        <li>No tracking cookies. One essential cookie keeps you logged in. Player settings (volume, queue) stay in your browser.</li>
      </ul>
      <h2 className="section-title">Who processes it for us</h2>
      <ul>
        <li>Our hosting provider, which runs the server and stores the database.</li>
        <li>Our email provider (Resend), only to send password-reset emails, if enabled.</li>
      </ul>
      <p className="muted">The operator must name the actual hosting provider here before launch.</p>
      <h2 className="section-title">Your controls</h2>
      <ul>
        <li>Delete your account in <Link to="/settings">Settings</Link>. Everything above is removed at once.</li>
        <li>Sign out of every device in Settings.</li>
        <li>Questions or a copy of your data: {contact}.</li>
      </ul>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="page legal">
      <h1 className="page__title">Terms</h1>
      <p className="muted">Plain-language summary. Have a lawyer review it for your country before launch.</p>
      <ul>
        <li>{BRAND.name} is run by {who}.</li>
        <li>The music is published by the artists and labels who own it. Listen for your own use; don't copy or redistribute it.</li>
        <li>Your playlists are yours. Public playlists can be seen by anyone with the link.</li>
        <li>Don't abuse the service (automated scraping, attacking it, impersonating others). We can close accounts that do.</li>
        <li>The free plan has no ads and no skip limits. If paid plans arrive, prices are shown before you pay, you can cancel in one click, and access lasts to the end of the period.</li>
        <li>The service is provided as is. We'll tell you before changes that affect you.</li>
        <li>Contact: {contact}.</li>
      </ul>
    </div>
  );
}
