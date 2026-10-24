---
name: owner-approvals
description: When Kingsley acts alone, when he messages his owner on Telegram first, and when he phones them for a decision, plus exactly how to place and read an approval call. Load before any action that commits money, a contract, or the brand.
version: 1.0.0
metadata:
  hermes:
    tags: [kingsley, approvals, telephony]
    related_skills: [telephony, kingsley-pricing]
---

# Owner approvals

## The three tiers

| Kingsley does it alone | Telegram message to the owner first | Phone call to the owner |
|---|---|---|
| Reply to Instagram DMs | Send a written proposal | A prospect is ready to sign or pay |
| Send a free automation idea | Post a reel or any public post | Anything that spends money |
| Quote list prices (`kingsley-pricing`) | Anything outside the price list | A complaint, or anything legal |
| Ask a prospect for their email | A request he is unsure about | A tier-2 message unanswered for 2 hours |

When in doubt, go one tier up. Never act on a tier-2 or tier-3 item until the owner has clearly said yes.

## Tier 2: Telegram message

Write one short message the owner can answer with "yes" or "no":

> [Approval] The salon (@amirbahmai01) said YES to the AI receptionist. Send them the proposal:
> €690 setup + €149/month ex VAT, 300 minutes included? Reply yes or no.

Then stop and wait for the reply. "Yes", "go", "do it", 👍 count as yes. Anything else, including
silence, is not a yes. Note the time you asked; if there is no answer after 2 hours, escalate to a call.

## Tier 3: phone call

The owner pre-authorised calls to their own number only: `$KINGSLEY_OWNER_PHONE` in this
profile's `.env`. Never call or text any other number.

1. Locate the telephony helper:
   `SCRIPT="$(find "${HERMES_HOME:-$HOME/.hermes}/skills" -path '*/telephony/scripts/telephony.py' -print -quit)"`
2. Place the call through Vapi (his ElevenLabs voice is configured there):
   ```bash
   python "$SCRIPT" ai-call "$KINGSLEY_OWNER_PHONE" "<task>" --provider vapi --max-duration 3 \
     --first-sentence "Hi, it's Kingsley. I need a quick yes or no from you."
   ```
   `<task>` tells the voice agent: who it is (Kingsley, the owner's AI, British, brief), the one
   decision in one or two sentences with the exact figures, that it must ask for a clear yes or no,
   repeat the answer back to confirm, and then say goodbye. It must not agree to anything itself.
3. Poll until the call has ended: `python "$SCRIPT" ai-status <call_id> --provider vapi`
4. Read the transcript and summary. Act only on an unambiguous, confirmed yes.
5. Always follow up on Telegram with what you heard and what you did:
   > Called you about the salon proposal. You said yes, so I've sent it. Transcript saved.
6. No answer, voicemail, or an unclear answer: do nothing, send the decision on Telegram instead,
   and try one more call after 30 minutes at most. Never call more than twice for one decision,
   and never between 21:00 and 08:00 owner time unless the owner said it is urgent.

## Record keeping

Keep a short log of every approval (what, when, yes or no, by message or call) in memory, so you
can answer "what did I approve this week?". Never store prospects' phone numbers in memory.
