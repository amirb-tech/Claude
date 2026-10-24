#!/usr/bin/env bash
# Installs Kingsley as a Hermes profile on this machine. Safe to re-run: existing files are backed up,
# and an existing .env is never overwritten.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="kingsley"
P="${HERMES_ROOT:-$HOME/.hermes}/profiles/$PROFILE"
STAMP="$(date +%Y%m%d-%H%M%S)"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes isn't installed (or isn't on your PATH)."
  echo "Install it first:  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  echo "or, from your downloaded repo:  ./setup-hermes.sh"
  echo "Then open a new terminal and run this script again."
  exit 1
fi

echo "== 1. Profile '$PROFILE'"
if hermes profile list 2>/dev/null | grep -qw "$PROFILE"; then
  echo "   already exists, updating it"
else
  hermes profile create "$PROFILE" --description "Kingsley: AI automation agency founder, openly AI"
fi
mkdir -p "$P/skills"

backup() { [ -f "$1" ] && cp "$1" "$1.bak.$STAMP" && echo "   backed up $(basename "$1") -> $(basename "$1").bak.$STAMP" || true; }

echo "== 2. Persona and config"
backup "$P/SOUL.md";     cp "$HERE/profile/SOUL.md"     "$P/SOUL.md"
backup "$P/config.yaml"; cp "$HERE/profile/config.yaml" "$P/config.yaml"

echo "== 3. Secrets file"
if [ -f "$P/.env" ]; then
  # Append only the keys that are missing, so existing values are kept.
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"
    grep -q "^${key}=" "$P/.env" || { echo "$line" >> "$P/.env"; echo "   added $key"; }
  done < "$HERE/profile/.env.example"
else
  cp "$HERE/profile/.env.example" "$P/.env"
  echo "   created $P/.env"
fi
chmod 600 "$P/.env"

echo "== 4. Kingsley's skills"
rm -rf "$P/skills/kingsley"
cp -R "$HERE/profile/skills/kingsley" "$P/skills/kingsley"
ls "$P/skills/kingsley"

echo "== 5. Official telephony skill (Twilio + Vapi calls)"
hermes -p "$PROFILE" skills install official/productivity/telephony || \
  echo "   !! telephony install failed: run 'hermes -p $PROFILE skills install official/productivity/telephony' by hand"

cat <<EOF

Done. Kingsley's files are in $P

Next (see kingsley-hermes/README.md for detail):
  1. Fill in $P/.env
  2. Telegram:        hermes -p $PROFILE gateway setup     (or the desktop app's "Create with QR")
  3. Phone calls:     README step 5 (Twilio number, Vapi, his voice)
  4. Start him:       hermes -p $PROFILE gateway install && hermes -p $PROFILE gateway start
  5. Scheduled jobs:  ./kingsley-hermes/cron.sh
  6. Voice:           open the Hermes desktop app on the '$PROFILE' profile and say "Hey Kingsley"
EOF
