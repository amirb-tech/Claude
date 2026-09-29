# Multi-agent system: selling AI receptionists to Dutch small businesses

Goal: find Dutch MKB businesses that miss calls, prove the product on *their* business, close them, onboard them, keep them, and get better each week, with no human in the loop during normal operation.

## 0. Ground rules (apply to every agent)

**Offer (fixed, so agents don't invent one).** AI receptionist answering the business's own number via call-forwarding (after-hours, busy, or always). It speaks Dutch (and English), answers FAQs, books into the calendar, takes messages, and sends WhatsApp/e-mail summaries. Pricing is a tiered monthly fee plus a setup fee, defined in `config/offer.yaml`. Agents may discount only inside the bounds in that file.

**Target segments (start narrow):** kappers/barbers, tandartsen, fysiotherapeuten, loodgieters/installateurs, autogarages, schoonmaak, restaurants. They are phone-dependent, owner-run and often busy with their hands. Pick 2 segments first and expand only when the Analyst says a segment converts.

**Netherlands constraints (encoded in the Compliance agent, not left to each agent):**
- **Cold outreach (Telecommunicatiewet 11.7):** unsolicited e-mail/SMS/WhatsApp is only allowed to *legal entities* (BV, NV, VOF) with a clear opt-out. An *eenmanszaak* counts as a natural person and needs prior consent. The KvK legal form decides this, and the default is *block* when unknown. Cold calling businesses is allowed but must honour opt-outs. Get this confirmed by a Dutch lawyer once, and then encode it.
- **AVG/GDPR:** lawful basis is recorded per lead (legitimate interest for B2B), with a privacy notice link in the first message, deletion on request within 30 days, and EU-only data processing. Sign a DPA (verwerkersovereenkomst) with every customer, since the receptionist processes their callers' data.
- **Call recording/transcripts:** the receptionist opens every call with an AI disclosure and a recording notice (also required by EU AI Act transparency rules). No disclosure means the call config is invalid and can't deploy.
- **Language:** Dutch by default, formal *u* for tandarts/medical, informal *je* for kappers and horeca. Never machine-translate Dutch, and write it natively.
- **Money/legal identity:** invoices with BTW (21%), payment by iDEAL/SEPA via Mollie, and the KvK number and terms shown on every offer.

**Hard limits (enforced by code, not prompts):** daily outbound cap per channel and domain, a monthly spend ceiling per agent, no legal terms outside the template, no claims not in `config/claims.yaml`, and no medical/legal advice from the receptionist.

## 1. Architecture

```
                      ┌─────────────────────────────┐
                      │  Orchestrator (state machine)│
                      │  + Event log + Lead ledger   │
                      └──────────────┬──────────────┘
   ┌────────┬────────┬────────┬──────┴───┬────────┬─────────┬──────────┐
 Scout → Enricher → Gatekeeper → Qualifier → Personalizer → Outreach → Conversation
                                                                        │
                       Retention ← Onboarding ← Closer ← Demo ←─────────┘
                           │
         Guardian (errors)  ·  QA Judge (quality)  ·  Analyst/Improver (learning)
```

Shared infrastructure: a **Postgres lead ledger** (one row per lead with a `stage` field), an **append-only event log** (every agent input, output, tool call and cost), a **task queue** with idempotency keys, and a **config repo** (prompts, offer, claims, compliance rules, all versioned in git).

Every agent is a pure function: `(lead state + config) → (decision + next stage)`. The Orchestrator is the only writer of `stage`. Agents return typed JSON, validated against a schema before the Orchestrator accepts it. Invalid output counts as an error (see §3).

**Lead stages:** `discovered → enriched → cleared → qualified → personalized → contacted → engaged → demo_done → offered → won → onboarded → active` (with exits to `rejected(reason)`, `nurture`, `suppressed`, `churned`).

## 2. Agents

### A1. Orchestrator
- **Receives:** events (agent completed/failed, reply arrived, payment received, timer fired).
- **Decides:** next stage for a lead, which agent to call, when to retry or defer, and daily throughput (pull more leads only if downstream capacity and budget allow).
- **Passes on:** a task `{lead_id, agent, input_ref, idempotency_key, deadline}` to the queue.
- **Not an LLM for routing.** It's deterministic code plus a small policy table, so the backbone doesn't hallucinate. An LLM is used only to summarize the daily digest.

### A2. Scout (market + lead discovery)
- **Receives:** the active segments and cities from the Orchestrator, and the last 30 days of segment conversion stats from the Analyst.
- **Decides:** which segment/city to mine today (explore/exploit, ~80/20), and which sources to query (KvK Handelsregister open data/API, Google Places, Maps categories, vakverenigingen directories).
- **Passes on:** raw leads `{name, kvk_number, address, phone, website, source, category}`, de-duplicated by KvK number and phone.

### A3. Enricher
- **Receives:** raw leads.
- **Decides:** what can be confirmed: legal form (KvK), owner or contact name, opening hours, website content, review count, whether there's a booking system, and whether a phone number is listed prominently. It flags a lead as "unreachable" if there's no verified channel.
- **Passes on:** an enriched profile and a `data_confidence` score per field. Low-confidence fields are never used in personalization.

### A4. Compliance Gatekeeper (veto power)
- **Receives:** enriched leads and a proposed channel.
- **Decides:** which channels are lawful *for this lead* (legal form, opt-out list, prior contact, existing customer, Bel-me-niet where applicable). Outputs `allowed_channels[]`, or `suppressed`.
- **Passes on:** a cleared lead with a recorded lawful basis, or a rejection. No downstream agent can send without a valid `clearance_id`. The Outreach sender checks it at send time (not only at planning time).
- **Rules live in versioned config**, and the Improver can't edit them.

### A5. Qualifier / Scorer
- **Receives:** cleared leads, plus the historical won/lost data.
- **Decides:** a fit score (0–100) from signals such as phone-dependence of the segment, miss-rate hints (reviews saying "niet bereikbaar", short opening hours, owner-run), size (1–15 staff), and no existing receptionist/booking bot. It sets the outreach priority and rejects poor fits with a reason.
- **Passes on:** a ranked queue. It starts as a rules score and is replaced by a learned model once there are 200+ outcomes.

### A6. Personalizer (demo-first research)
- **Receives:** qualified leads.
- **Decides:** the 2–3 concrete hooks (e.g. "Zaterdag gesloten, maar 40% van jullie reviews noemt telefoon"), and builds a **draft receptionist for that business**: its FAQ from their site, hours, services and prices, in the right tone. It generates a demo phone number and a short audio sample.
- **Passes on:** a `personalization_pack {hooks, draft_kb, demo_number, sample_audio_url}`. Anything it couldn't verify is left out of the pack, and it never invents prices.

### A7. Outreach (writer + sender)
- **Receives:** the personalization pack and the allowed channels.
- **Decides:** channel (e-mail first for BVs; a phone call for those lawful to call; a postal letter as an option), send time (Dutch business hours, not Monday morning or Friday afternoon), the variant (A/B from the Improver's experiment list), and a follow-up cadence (max 3 touches over 14 days).
- **Passes on:** a sent message and a follow-up timer. Writes natively in Dutch, in under 90 words, with one call to action ("bel dit nummer en praat met jullie eigen receptionist"), the opt-out link and the sender's KvK details.
- **Deliverability:** warmed-up secondary domains, SPF/DKIM/DMARC, a bounce rate above 3% pauses the domain (see Guardian).

### A8. Conversation agent (replies)
- **Receives:** inbound replies by e-mail/WhatsApp/phone, plus the full lead history.
- **Decides:** the intent (interested, question, objection, not now, stop, wrong person, spam complaint) and the response. A **stop request means an immediate `suppressed`** with no second message. It answers questions only from `claims.yaml` and the offer. Objections are handled from a tested playbook ("we hebben al iemand", "te duur", "klanten willen geen robot").
- **Passes on:** `engaged` with a proposed demo slot, `nurture` with a revisit date, or `suppressed`.

### A9. Demo agent
- **Receives:** an engaged lead and the personalization pack.
- **Decides:** how the demo runs. The prospect calls their own demo number, or the Demo agent phones them at the agreed time (only if lawful). After the call it sends the transcript and a summary with the moments where the receptionist did well (a booked appointment, an answered FAQ).
- **Passes on:** demo result + prospect reactions. If the call was poor (QA score below threshold), it doesn't push the sale and fixes the KB first (a loop to A6).

### A10. Closer
- **Receives:** a lead that finished a demo positively, plus pricing bounds.
- **Decides:** the plan and offer (within bounds; a discount only for annual or referral), and whether to send an offer or another nudge. It sends a **self-serve checkout**: a plan summary, an e-signature of the standard terms and DPA, and Mollie iDEAL/SEPA direct debit. There's a 14-day trial with a payment mandate.
- **Passes on:** `won` on a valid mandate + signed DPA, or `nurture`/`rejected(reason)`. Nothing custom is signed. Non-standard requests go to `nurture` with reason "needs custom terms" (the only non-autonomous case, see §5).

### A11. Onboarding / Provisioning
- **Receives:** a won customer and their intake form (or the auto-scraped KB, to be confirmed by them).
- **Decides:** the configuration: greeting, opening hours, services, prices, escalation rules (spoed → SMS to owner), calendar connection (Google/Outlook/Calendly/Salonized/Treatwell), and a phone number or forwarding instructions per carrier (KPN, Odido, Vodafone, VoIP) with a step-by-step guide.
- **Passes on:** a live receptionist after **automated acceptance tests**: 20 scripted test calls (FAQ, booking, angry caller, spam, English speaker, Groningen accent) must pass QA ≥ threshold. It then verifies forwarding by placing a real call. On failure it retries the setup and, if that fails, follows §3.

### A12. Retention / Customer Success
- **Receives:** live call logs, booked appointments, missed-call stats, sentiment and billing events.
- **Decides:** weekly report content ("47 gesprekken, 12 afspraken, geschat €1.800 omzet"), when to suggest a KB improvement from unanswered questions, upsell timing, and a churn-risk score (usage drop, complaints, failed payments).
- **Passes on:** reports, suggested KB updates (auto-applied only if low-risk and confirmed by the owner in one tap), dunning flow, save offers within bounds, and referral asks after positive milestones. It feeds outcomes back to A1/A5.

### Cross-cutting agents

**Guardian (errors and safety):** watches the event log and metrics, opens incidents, triggers pauses (§3).

**QA Judge:** an independent model with a different prompt scores samples of outputs against rubrics (Dutch quality, factual grounding, tone, compliance, call outcomes). It sees inputs and outputs but never the generating agent's reasoning.

**Analyst / Improver:** the learning loop (§4).

## 3. Error handling

**Principle:** fail *closed* on anything legal or financial, fail *soft* on anything cosmetic, and never lose a lead.

| Error class | Example | Handling |
|---|---|---|
| Transient tool failure | API timeout, 429, telephony blip | Retry with exponential backoff + jitter (max 5), idempotency key so no double sends or double charges |
| Invalid agent output | JSON fails schema, missing field, unsupported claim | One automatic re-prompt with the validation error; then a stronger model; then dead-letter queue |
| Low confidence / conflicting data | Two KvK matches, no owner name | Don't guess. Drop the uncertain fields, ask a Verifier agent, or downgrade to a generic message |
| Grounding failure | The draft mentions a price not in the KB | Deterministic claim checker blocks the send. The message is regenerated without it |
| Compliance doubt | Unknown legal form, stop word in reply | Block by default, log reason. Suppression is permanent and global |
| Channel degradation | Bounce rate >3%, spam complaint, WhatsApp template rejected | Circuit breaker: pause that domain/channel, shift volume to others, alert in digest |
| Provider outage | LLM/voice/telephony provider down | Fail over to a secondary provider. For **live customer calls**, the fallback is a plain voicemail + SMS-to-owner flow, so a customer is never left with a dead line |
| Live-call failure | Receptionist loops, caller frustrated, unknown request | Graceful handoff: take name + number + reason, notify the owner immediately, flag call for QA |
| Payment failure | Mandate rejected, chargeback | Dunning sequence (3 attempts, 10 days), then pause service politely with notice, never mid-call |
| Runaway cost / loop | Agents ping-pong, token spike | Per-lead step budget (max 12 agent hops), per-agent and monthly ceilings, kill switch |
| Poison lead | Crashes an agent repeatedly | Dead-letter queue after 3 failures, quarantined, and a Guardian ticket with the trace |

**Dead-letter handling (no human needed):** the Guardian runs a *Triage agent* over the DLQ nightly. It clusters failures, classifies as data problem / prompt bug / tool bug, replays the fixable ones after a patch, and files anything code-level as a GitHub issue with the failing traces attached.

**Self-repair of the system itself:** the Guardian may auto-open a PR against the config repo (prompts, parsing rules, retry limits) for prompt/config bugs. It's merged automatically only if the replay suite passes and the change is non-legal (see §4 guardrails). Code changes are proposed, never merged automatically.

**Dead-man's switch:** if the Guardian itself stops heartbeating, the Orchestrator halts *all outbound* (customers' receptionists keep running). A daily digest (send the owner one message: leads, meetings, revenue, incidents, spend) is the only routine contact.

## 4. How it improves itself

**Loop:** *measure → hypothesize → test → promote or roll back*, run weekly by the Analyst/Improver.

1. **Measure.** Every lead carries its full path. Metrics: reply rate, positive-reply rate, demo rate, demo→win, 30/90-day retention, cost per acquired customer, QA score, and per-live-call outcomes (booked / resolved / handed off).
2. **Attribute.** The Analyst breaks results down by segment, city, hook type, message variant, send time, channel, price plan and objection type. It uses a bandit (Thompson sampling) for variant allocation, so bad variants starve quickly while ~20% traffic keeps exploring.
3. **Hypothesize.** The Improver reads winning and losing transcripts and proposes concrete changes: a new opening line, a re-ordered objection playbook, a new hook type, a segment to drop, and a KB template fix for the voice receptionist.
4. **Test safely.**
   - **Offline:** replay against a frozen eval set (200+ real replies/calls with labels, growing every week) and a Dutch-quality rubric.
   - **Shadow:** run the new version in parallel without sending and compare it with the current one via the QA Judge.
   - **Canary:** 10% of traffic, with pre-set stop conditions (complaint rate, unsubscribe rate, QA score).
5. **Promote or roll back.** A change ships if it beats the incumbent with sufficient sample size (pre-registered threshold), otherwise it's reverted. Every prompt and config is a git commit tagged with the metrics that justified it, so any regression can be traced to a change and reverted.
6. **Product learning.** Unanswered caller questions across customers are clustered. The frequent ones become segment KB templates ("tandarts: spoedgeval", "kapper: kleurbehandeling prijs"), so each new customer starts better than the last. Churn reasons feed back into the Qualifier.
7. **Model of the market.** Won-customer profiles are used to lookalike-score new leads (A5), and the Scout mines the best-converting segment/city pairs.

**Guardrails on self-improvement (the Improver cannot):**
- Edit compliance rules, the suppression list, pricing bounds, budgets, `claims.yaml` or its own evaluation set/thresholds. Those need a human commit.
- Promote on fewer than the pre-registered sample size, or promote several changes to the same stage at once (one variable at a time).
- Optimize for reply rate alone. The objective is *retained paying customers per euro spent*, with complaint and unsubscribe rates as hard constraints. That stops it from learning to be pushy.
- Use customer call content for training or examples outside that customer without anonymization and the DPA's permission.

## 5. What can't be autonomous, and doesn't pretend to be

The system runs itself day to day, but these one-time or exceptional things need a human, set up front so the loop never blocks on them:

- **One-time setup:** company registration (KvK/BTW), bank + Mollie account, business phone-number provisioning, domain/e-mail warm-up, DPA/terms drafted by a lawyer, and the API credentials. After that, nothing.
- **Legal review of the outreach rules** (esp. eenmanszaak vs. BV distinction, and the AI Act disclosure wording).
- **Custom contracts, disputes, chargebacks above a threshold, and any regulator/press contact.** The system parks these under `needs_human` and continues with everything else.
- **Changing the guardrails.** Deliberately impossible for the agents.

## 6. Suggested build order

1. Ledger, event log, queue, Orchestrator, schemas (the backbone).
2. Compliance Gatekeeper + suppression list, before anything can send.
3. Scout → Enricher → Qualifier on 1 segment, dry-run only, verify data quality by hand once.
4. Personalizer + the voice receptionist + QA Judge + acceptance-test suite (this *is* the product and the demo).
5. Outreach + Conversation on ~20 leads/day. Then Demo → Closer → Onboarding.
6. Guardian and the digest, then the Analyst/Improver once there are ~200 outcomes. Before that there's too little data, and the loop would overfit noise.
7. Retention.

## 7. Suggested first-week KPIs

Data: ≥90% of leads have a verified legal form and channel. Outreach: 0 compliance violations, ≥3% positive reply rate. Product: acceptance tests pass rate ≥95%, ≥80% of live calls resolved without a handoff. Business: demo→paid ≥20%, monthly churn <5%, payback under 3 months.
