#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Redeploy the running stack from the latest git.
#
# Run from the deploy/ directory:
#   ./scripts/redeploy.sh
#
# What it does:
#   1. Pulls latest from the current branch
#   2. Rebuilds images (with build cache for speed)
#   3. Recreates containers in the right order (migrate runs, then api+web)
#   4. Tails logs for 20 seconds so you can spot startup errors
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(cd .. && pwd)"

echo "▶ git pull"
( cd "$PROJECT_ROOT" && git pull --ff-only )

echo "▶ Building images"
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo "▶ Recreating containers"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "▶ Pruning dangling images (keeps disk happy)"
docker image prune -f >/dev/null

echo "▶ Tailing logs for 20s — Ctrl-C to leave early"
timeout 20 docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=50 || true

echo "✓ Done. Smoke-check:"
echo "    curl -sI https://$(grep -E '^DOMAIN=' .env.prod | cut -d= -f2-) | head -1"
