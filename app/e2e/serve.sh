#!/usr/bin/env bash
# Fresh database for every e2e run, then the production build.
set -euo pipefail
cd "$(dirname "$0")/.."
export DATA_DIR="$(mktemp -d)" PORT="$1" DISABLE_RATE_LIMIT=1
[ -f dist/index.html ] || npx vite build >/dev/null
node --import tsx server/seed.ts
exec node --import tsx server/index.ts
