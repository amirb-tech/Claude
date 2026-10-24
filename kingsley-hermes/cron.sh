#!/usr/bin/env bash
# Kingsley's scheduled jobs. Run once, after the gateway is set up and running (cron fires from the gateway).
# Each job's final answer is delivered to your Telegram (TELEGRAM_HOME_CHANNEL in the profile's .env).
set -euo pipefail
K="hermes -p kingsley"

$K cron create "every 4h" \
  "Check Kingsley's Instagram DMs and reply to everyone who answered the AUTOMATE question, following the skill exactly. Escalate hot leads per owner-approvals. Finish with the summary for the owner." \
  --skill instagram-dm-replies --skill kingsley-pricing --skill owner-approvals \
  --name "Instagram DM replies" --deliver telegram

$K cron create "every 1d at 08:30" \
  "Morning brief for the owner, under 120 words: yesterday's Instagram DMs and hot leads, approvals still waiting for an answer, and the one thing you plan to do today. Real numbers only." \
  --skill instagram-dm-replies --skill owner-approvals \
  --name "Morning brief" --deliver telegram

$K cron create "every 1h" \
  "Check the approval log in memory. If a Telegram approval request has had no answer for over 2 hours, phone the owner about it per owner-approvals (respect the 21:00-08:00 quiet hours). If nothing is pending, reply with only: nothing pending." \
  --skill owner-approvals --skill telephony \
  --name "Approval follow-up" --deliver telegram

$K cron list
