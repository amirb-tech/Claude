---
name: instagram-dm-replies
description: Read Kingsley's Instagram DMs through the Ootto MCP tools and reply to prospects who answered the AUTOMATE question with one specific automation idea. Load for the scheduled DM check or when asked to check Instagram messages.
version: 1.0.0
metadata:
  hermes:
    tags: [kingsley, instagram, sales, ootto]
    related_skills: [kingsley-pricing, owner-approvals]
---

# Instagram DM replies

Instagram runs through the Ootto MCP server. Account: `$OOTTO_ACCOUNT_ID` (@kingsley.brand.ai,
Kingsley's own Instagram user id 17841415782420922).

## Context

When someone comments AUTOMATE on a reel, Ootto auto-replies under the comment and sends this DM
(nothing else is sent automatically, no links):

> Hiya, Kingsley here (yes, the AI 🤖). Thanks for commenting AUTOMATE.
> To send you something actually useful, tell me two things:
> 1. What's your business?
> 2. Which job eats most of your week? Calls, bookings, quotes, invoices, chasing payments...
> Reply here and I'll send back one thing I'd automate for you, and how it would work. Free, no catch.

## Steps

1. List conversations: Ootto `social_action` with toolkit `instagram`, action
   `INSTAGRAM_LIST_ALL_CONVERSATIONS`. For each conversation updated in the last 24 hours, read it
   with action `INSTAGRAM_LIST_ALL_MESSAGES` (arguments: `conversation_id`, fields
   `id,created_time,from,to,message`; follow the cursor if needed).
2. A conversation needs a reply only if ALL of these hold:
   - the newest message is from the other person, not from Kingsley;
   - it is less than 24 hours old (Instagram blocks replies after 24 hours; list older ones as missed);
   - it has real content, not just an emoji.
3. Send ONE reply per conversation with Ootto `instagram_dm` (`account_id`, `recipient_id` = the
   other person's id, `text`). Never message anyone who has not written to Kingsley first.

## What to send

- They named their business and/or the job that eats their week: ONE specific automation idea for
  that job, in plain English. The idea in one line; how it works in 2-3 short steps; the kind of tool
  (for example an AI voice agent with their booking system, a WhatsApp agent); an honest rough
  time-saved estimate, labelled as an estimate. End with: "Want me to build it for you? Reply YES and
  I'll tell you what it would take."
- They answered only one question: your best idea from what they said, plus the missing question.
- They said YES or asked the price: quote the one matching package from `kingsley-pricing`
  (setup, monthly, notes, "ex VAT") and ask for the best email to send the proposal to. Sending the
  proposal itself is tier 2 in `owner-approvals`: message the owner.
- They gave an email or want to sign or pay: thank them, say you'll be in touch shortly, and raise it
  with the owner per `owner-approvals` (ready to sign or pay = phone call).
- Anything else: answer briefly and honestly, steer back to their business.

Rules: Kingsley's voice from SOUL.md, openly AI, no links, under 900 characters per DM. Abuse, spam,
or anything legal, medical or financial beyond an automation idea: do not reply, flag it to the owner.

## Report

End with a short summary for the owner: conversations checked, who got a reply (username + one line),
who was skipped and why, and hot leads (YES replies, emails). If nothing needed a reply, one line.
