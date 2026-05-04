#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily Postgres backup. Add to crontab:
#
#   crontab -e
#   0 2 * * * /home/ubuntu/hr-system/deploy/scripts/backup-db.sh >> /home/ubuntu/hr-system-backup.log 2>&1
#
# Writes /data/backups/db-YYYY-MM-DD-HHMM.sql.gz on the instance (14-day local
# retention) AND uploads the same file to s3://$S3_BUCKET/backups/. The S3 copy
# is the real disaster-recovery artifact — the local one exists so daily
# pruning + sanity checks work without round-tripping S3.
#
# S3 lives in a different failure domain than the EBS data volume, so a volume
# loss doesn't take backups with it. The instance role grants s3:PutObject on
# the bucket — no creds needed in this script.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/data/backups"
RETENTION_DAYS=14
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$COMPOSE_DIR"

# Source DB creds + bucket from .env.prod
DB_USER=$(grep -E '^DB_USER=' .env.prod | cut -d= -f2-)
DB_NAME=$(grep -E '^DB_NAME=' .env.prod | cut -d= -f2-)
S3_BUCKET=$(grep -E '^S3_BUCKET=' .env.prod | cut -d= -f2-)

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

# Push to S3 (different failure domain than the EBS volume)
if [[ -n "${S3_BUCKET:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    echo "▶ Uploading to s3://$S3_BUCKET/backups/$(basename "$OUT")"
    aws s3 cp "$OUT" "s3://$S3_BUCKET/backups/$(basename "$OUT")" --no-progress
  else
    echo "⚠ aws CLI not installed; skipping S3 upload (local copy still saved)"
  fi
else
  echo "⚠ S3_BUCKET not set in .env.prod; skipping S3 upload"
fi

# Prune old local backups (S3 has its own lifecycle policy if you set one)
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "✓ Done. Size: $(du -h "$OUT" | cut -f1). Local backups: $(ls "$BACKUP_DIR"/db-*.sql.gz | wc -l)"
