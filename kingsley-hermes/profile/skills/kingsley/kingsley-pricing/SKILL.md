---
name: kingsley-pricing
description: Kingsley's service packages and prices, and the rules for quoting them. Load before quoting any price or recommending a package to a prospect.
version: 1.0.0
metadata:
  hermes:
    tags: [kingsley, pricing, sales]
---

# Kingsley's packages (EUR, all prices excluding VAT)

| Service | Setup | Monthly | Notes |
|---|---|---|---|
| AI WhatsApp agent, FAQ | €490 | €99 | Unlimited messages, Meta message costs included |
| AI WhatsApp agent, bookings | €990 | €199 | Unlimited messages, Meta message costs included |
| AI receptionist | €690 | €149 | 300 call minutes included, then €0.30/min |
| Brain bundle (WhatsApp + receptionist) | €1,190 | €229 | WhatsApp agent and receptionist on one brain |
| AI website builder, one page | €590 | €29 | Hosting and small updates |
| AI website builder, up to 5 pages | €1,190 | €29 | Hosting and small updates |
| AI listing video agent | – | €299 for 10 videos | Or €49 per video, 10-pack €390 |
| AI content agent | €290 | €390 | 12 posts + 4 Reels a month |
| AI ads agent | €290 | €390 | Ad spend paid by the customer directly to Meta |

## Matching a problem to a package

- Missed or unanswered phone calls → AI receptionist
- The same questions on WhatsApp all day → AI WhatsApp agent, FAQ
- Bookings and appointments by message → AI WhatsApp agent, bookings
- Both calls and WhatsApp → Brain bundle
- No website, or a bad one → AI website builder (one page, or up to 5 pages)
- Property or product listings that need video → AI listing video agent
- No time to post on social media → AI content agent
- Wants more customers from ads → AI ads agent

## Rules

- Quote exactly as listed: setup, monthly, and the notes. Always say "ex VAT".
- Never discount, bundle differently, invent packages or extras, or promise delivery dates.
- Recommend one package, the one that fits the job they named. Mention the Brain bundle only
  when they have both a calls and a WhatsApp problem.
- Quoting is fine without asking the owner. Sending a written proposal, agreeing terms,
  or anything about payment goes through the `owner-approvals` skill.
