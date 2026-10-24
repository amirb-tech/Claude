# Kingsley on Hermes

Kingsley as your own J.A.R.V.I.S., running on [Hermes Agent](https://github.com/NousResearch/hermes-agent)
on your computer:

- **"Hey Kingsley"**: say his name and talk, no buttons. He answers out loud in his real ElevenLabs voice.
- **Telegram is his phone app**: send him voice notes or text, he replies with voice bubbles.
- **Approvals**: routine work he does alone; proposals and posts he asks you on Telegram; anything
  about signing, paying, spending or legal, he **phones you** and acts only on a clear yes.
- **Websites**: give him a company and he builds their site in Lovable (through Claude Code) and sends you the preview.
- **Instagram**: every 4 hours he answers prospects who replied to the AUTOMATE DM (through Ootto),
  quotes from his price list, and escalates hot leads to you.

## What's in here

| File | Becomes | What it does |
|---|---|---|
| `profile/SOUL.md` | `~/.hermes/profiles/kingsley/SOUL.md` | Who he is: openly AI, British, honest, how he works with you |
| `profile/config.yaml` | `.../config.yaml` | Claude as the brain, "hey kingsley" wake phrase, his ElevenLabs voice, local speech-to-text, safety settings, Ootto connection |
| `profile/.env.example` | `.../.env` | The keys you fill in |
| `profile/skills/kingsley/kingsley-pricing` | skill | Your packages and prices (ex VAT), quoting rules |
| `profile/skills/kingsley/owner-approvals` | skill | When he acts alone, messages you, or calls you, and how a call works |
| `profile/skills/kingsley/instagram-dm-replies` | skill | The AUTOMATE DM follow-up |
| `profile/skills/kingsley/lovable-website-builder` | skill | Builds customer websites in Lovable via Claude Code |
| `install.sh` | | Creates the `kingsley` profile and copies all of the above in |
| `cron.sh` | | Creates his 3 scheduled jobs |

## What you need

- An always-on computer. An Apple Silicon Mac mini is ideal (it listens for "Hey Kingsley" and runs him).
- Hermes installed (you've downloaded the repo: run its `./setup-hermes.sh`, or
  `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`).
- Accounts and keys: Anthropic (Claude), Claude Code with Lovable connected (for websites), ElevenLabs (his voice), a Telegram account, Twilio (his phone
  number), Vapi (the phone conversation), and your Ootto MCP URL and key.
- Rough running costs: Claude API usage, ElevenLabs plan, a Twilio number (a few euros a month) plus
  per-minute call charges, Vapi per-minute charges.

## Install

From the folder that contains `kingsley-hermes/` (this repo):

**1. Run the installer**
```bash
./kingsley-hermes/install.sh
```
It creates the `kingsley` profile, copies his persona, config and skills, creates `.env`, and installs
the official telephony skill. Re-running it is safe (it backs files up and never overwrites `.env`).

**2. Fill in his keys**: open `~/.hermes/profiles/kingsley/.env` and fill in every value.

**3. Check his brain**
```bash
hermes -p kingsley model      # confirm: Anthropic, claude-sonnet-5-5 (or pick another Claude model)
hermes -p kingsley            # say hello in the terminal; he should answer as Kingsley
```

**4. Telegram**
```bash
hermes -p kingsley gateway setup
```
Or in the Hermes desktop app: Messaging > Telegram > **Create with QR**. Make sure
`TELEGRAM_ALLOWED_USERS` and `TELEGRAM_HOME_CHANNEL` are only your own Telegram user ID.
Then in Telegram, send him `/voice on` so he answers voice notes with voice.

**5. Phone calls** (Twilio number + Vapi, in his voice)
```bash
SCRIPT="$(find ~/.hermes/profiles/kingsley/skills -path '*/telephony/scripts/telephony.py' -print -quit)"
python "$SCRIPT" save-twilio <TWILIO_ACCOUNT_SID> <TWILIO_AUTH_TOKEN>
python "$SCRIPT" twilio-search --country NL --limit 5          # pick your country
python "$SCRIPT" twilio-buy "+31..." --save-env
python "$SCRIPT" save-vapi <VAPI_API_KEY> --voice-provider 11labs --voice-id HfRP3cIhYLmeNHeTvkWK
python "$SCRIPT" vapi-import-twilio --save-env
python "$SCRIPT" diagnose                                       # everything should show as ready
```
In the Vapi dashboard, connect your ElevenLabs API key so Vapi can use his voice from your library.
Some countries need address or ID documents before Twilio sells you a local number.

**6. Start him as a background service** (starts again after a reboot)
```bash
hermes -p kingsley gateway install
hermes -p kingsley gateway start
```

**7. Scheduled jobs**
```bash
./kingsley-hermes/cron.sh
```
Creates: Instagram DM replies (every 4h), a morning brief on Telegram (08:30), and an approval
follow-up (hourly: an unanswered approval for 2h+ becomes a phone call, never 21:00 to 08:00).

**8. Lovable websites** (Kingsley builds sites through Claude Code, because Lovable only lets approved
apps like Claude Code sign in)
```bash
npm install -g @anthropic-ai/claude-code      # skip if Claude Code is already installed
claude mcp add --transport http --scope user lovable https://mcp.lovable.dev
claude                                         # then type /mcp, pick lovable, sign in to Lovable
claude mcp list                                # lovable should show as connected
```
Put your Lovable workspace name in `LOVABLE_WORKSPACE` in `.env`. Then tell Kingsley, for example:
*"Build a one-page website for XYZ, a bakery in Utrecht. Their Instagram is @xyz."* He writes the brief,
has Claude Code build it in Lovable, checks it, and sends you the preview link. Starting a paid build and
publishing both need your OK first. Builds use your Lovable credits.

**9. "Hey Kingsley"**: open the Hermes desktop app on the `kingsley` profile. The wake word is already on
in his config (on-device detection; the speech engine downloads once on first use). Or from a terminal:
`hermes -p kingsley`, then `/wake status`.

## Test it before you rely on it

1. Say **"Hey Kingsley, what's on today?"** and he answers out loud.
2. Send a Telegram voice note and get a voice-bubble reply.
3. In Telegram: *"Test the approval call: phone me and ask if you can send a test proposal."*
   He should call your mobile, ask yes or no, and confirm on Telegram afterwards.
4. Run `hermes -p kingsley cron run "Instagram DM replies"` and check the summary on Telegram.
5. Comment AUTOMATE on one of his reels from another account, answer the DM, and wait for his reply.

## Not covered yet (and what to do)

- **Calling Kingsley from your phone** isn't supported by Hermes yet (it can phone you, not answer you).
  On the move, use Telegram, or "Hey Siri, send a Telegram to Kingsley: ...".
- **Ootto connection**: I couldn't test Hermes talking to Ootto. If `hermes -p kingsley mcp list` doesn't
  show Ootto's tools, check the URL and key, or switch the config to `auth: oauth` (comment in config.yaml).
- **Wake word on Intel Macs and Windows ARM**: works, via the same engine. On a noisy room, raise
  `wake_word.sensitivity` towards 0.8.

## Changing things

- His personality: edit `profile/SOUL.md`, re-run `install.sh`.
- Prices: edit `profile/skills/kingsley/kingsley-pricing/SKILL.md`, re-run `install.sh`.
- What needs your approval: edit `profile/skills/kingsley/owner-approvals/SKILL.md`, re-run `install.sh`.
- Emergency stop for everything scheduled: `hermes -p kingsley pause` (and `hermes -p kingsley resume`).
