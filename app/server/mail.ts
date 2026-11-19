// Transactional email. Uses Resend's public HTTP API when RESEND_API_KEY and
// MAIL_FROM are set (the user's own account and domain). Without them, mail is
// written to the server log so development needs no account.
type Mail = { to: string; subject: string; text: string };

export async function sendMail(m: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.log(`[mail:dev] to=<redacted> subject="${m.subject}"\n${m.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text }),
  });
  if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
}

export function resetEmail(appName: string, link: string): { subject: string; text: string } {
  return {
    subject: `Reset your ${appName} password`,
    text: [
      "Someone asked to reset the password for this account.",
      "",
      `Choose a new password here (the link works for one hour, once): ${link}`,
      "",
      "If that wasn't you, ignore this email. Your password stays the same.",
    ].join("\n"),
  };
}
