---
name: lovable-website-builder
description: Build or change a customer's website in Lovable by handing the job to Claude Code on this machine (Lovable only accepts Claude Code, not Hermes, as an MCP client). Load when asked to build, change, or publish a website for a company.
version: 1.0.0
metadata:
  hermes:
    tags: [kingsley, lovable, website, delivery]
    related_skills: [kingsley-pricing, owner-approvals]
---

# Lovable website builder

Lovable's MCP server only lets ChatGPT, Claude, Claude Code, Cursor and VS Code sign in, so Kingsley
never calls Lovable himself. He writes the brief, runs Claude Code headless on this machine (where
Lovable is already connected), and checks what comes back.

## Before you start (every time)

1. **Approval.** A build spends Lovable credits and delivers a paid package (one page €590 + €29/month,
   up to 5 pages €1,190 + €29/month, ex VAT). Only build when the customer has said yes AND the owner
   has approved this build (tier 2 in `owner-approvals`). The owner asking you directly counts as approval.
2. **Tooling check.** `claude mcp list` must show `lovable` as connected. If it doesn't, stop and tell the
   owner: "Lovable isn't connected in Claude Code: run `claude`, then `/mcp`, and sign in to Lovable."
3. **Existing project?** Check memory for this company's Lovable project. If one exists, this is a change
   to it, never a second project.

## 1. Write the brief

Collect, from the conversation, their Instagram, website or the owner (ask the owner for anything missing;
never invent facts, prices, addresses, phone numbers or reviews):

- company name, what they do, location, who their customers are
- package: one page, or up to 5 pages (which pages)
- services or products, with real prices only if the customer gave them
- contact details, opening hours, booking or contact method
- style: colours, logo, mood, any sites they like; photos they supplied
- the one action a visitor should take (call, book, WhatsApp, visit)

Save it to `~/kingsley-builds/<company-slug>/brief.md`.

## 2. Hand it to Claude Code

Create the job file `~/kingsley-builds/<company-slug>/job.md`:

```markdown
Use the Lovable MCP tools to build this website.
- Workspace: $LOVABLE_WORKSPACE (if that is empty and there is only one workspace, use it; if there are
  several, stop and say which ones exist).
- New site: create_project with the brief below as the initial message, then follow the build until it
  finishes. Existing site (project id given below): send_message to that project with the requested
  changes only.
- Do not deploy or publish. Do not connect a custom domain. Do not enable paid integrations.
- Answer at the end with JSON only: {"project_id": "...", "preview_url": "...", "editor_url": "...",
  "summary": "...", "problems": "..."}

Existing project id: <id or "none">

Brief:
<contents of brief.md>
```

Run it:

```bash
cd ~/kingsley-builds/<company-slug>
claude -p "$(cat job.md)" --allowedTools "mcp__lovable" --output-format json > result.json
```

A build can take several minutes. If it fails or times out, read `result.json`, fix what you can (once),
otherwise report the error to the owner. Never retry in a loop: every run spends credits.

## 3. Check the result

- Open `preview_url` (browser tool if available) and check it against the brief: every requested page and
  section, correct name, contact details and call to action, no placeholder text, works on mobile.
- Up to two rounds of fixes: send exact change requests through the same handoff (existing project id).
- Save to memory: company, Lovable project id, preview URL, editor URL, date. Never store the customer's
  private phone numbers in memory.

## 4. Report and publish

- Send the owner on Telegram: preview link, a 3-line summary, anything you couldn't do and why.
- Showing the preview to the customer is fine once the owner has seen it.
- **Publishing** (going live, connecting the customer's domain) is tier 2: the owner approves first,
  then publish through the same handoff with `deploy_project` explicitly requested.

## Rules

- Openly AI: never claim a human designer built it.
- Only real content from the customer. Missing photos: use tasteful placeholders and list them for the owner.
- One job per company at a time.
