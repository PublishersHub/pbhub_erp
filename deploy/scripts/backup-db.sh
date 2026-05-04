#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily Postgres backup. Add to crontab:
#
#   crontab -e
#   0 2 * * * /home/ubuntu/pbhub/deploy/scripts/backup-db.sh >> /var/log/pbhub-backup.log 2>&1
#
# Writes /data/backups/db-YYYY-MM-DD-HHMM.sql.gz (kept 14 days).
# Prunes older backups so the volume doesn't fill up.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/data/backups"
RETENTION_DAYS=14
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$COMPOSE_DIR"

# Source DB creds from .env.prod
DB_USER=$(grep -E '^DB_USER=' .env.prod | cut -d= -f2-)
DB_NAME=$(grep -E '^DB_NAME=' .env.prod | cut -d= -f2-)

if [[ -z "${DB_USER:-}" || -z "${DB_NAME:-}" ]]; then
  echo "✘ DB_USER / DB_NAME missing from .env.prod"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date +%F-%H%M)
OUT="$BACKUP_DIR/db-$TS.sql.gz"

echo "▶ $(date -Iseconds) backing up $DB_NAME → $OUT"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$OUT"

# Sanity-check the file actually has content
if [[ ! -s "$OUT" ]]; then
  echo "✘ Backup is empty — failing loudly"
  rm -f "$OUT"
  exit 1
fi

# Prune old backups
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "✓ Done. Size: $(du -h "$OUT" | cut -f1). Total backups: $(ls "$BACKUP_DIR"/db-*.sql.gz | wc -l)"
