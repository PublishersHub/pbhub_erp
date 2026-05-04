#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-shot Let's Encrypt cert issuance.
#
# 1. Generates a temporary self-signed cert (so nginx can start with the HTTPS
#    server block before a real cert exists).
# 2. Brings up nginx + certbot.
# 3. Deletes the dummy cert.
# 4. Runs certbot in the certbot container to fetch the real cert via the
#    HTTP-01 challenge.
# 5. Reloads nginx.
#
# Run from the deploy/ directory:
#   ./scripts/init-letsencrypt.sh
#
# Pre-reqs:
#   - .env.prod is filled in (DOMAIN + LETSENCRYPT_EMAIL must be set)
#   - DNS A record for $DOMAIN points at this server's public IP, propagated
#   - bootstrap-host.sh has been run (Docker installed, /data mounted)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Locate compose project root (the deploy/ directory).
cd "$(dirname "$0")/.."

if [[ ! -f .env.prod ]]; then
  echo "✘ .env.prod is missing. Copy .env.prod.example and fill it in."
  exit 1
fi

# Load env without exporting everything globally
DOMAIN=$(grep -E '^DOMAIN=' .env.prod | cut -d= -f2-)
LETSENCRYPT_EMAIL=$(grep -E '^LETSENCRYPT_EMAIL=' .env.prod | cut -d= -f2-)

if [[ -z "${DOMAIN:-}" || -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "✘ DOMAIN and LETSENCRYPT_EMAIL must be set in .env.prod"
  exit 1
fi

echo "▶ Issuing certificate for $DOMAIN (notify $LETSENCRYPT_EMAIL)"

CERT_PATH="/data/letsencrypt/live/$DOMAIN"

# 1. Dummy cert so nginx can boot
if [[ ! -f "$CERT_PATH/fullchain.pem" ]]; then
  echo "▶ Creating dummy self-signed cert (nginx needs SOMETHING at boot)"
  sudo mkdir -p "$CERT_PATH"
  sudo openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem" \
    -subj "/CN=$DOMAIN" >/dev/null 2>&1
fi

# 2. Start nginx (and the rest of the stack — api/web build the first time)
echo "▶ Building images and starting stack"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Wait a few seconds for nginx to be reachable
sleep 5

# 3. Delete dummy
echo "▶ Removing dummy cert"
sudo rm -rf "$CERT_PATH"

# 4. Real cert via certbot in webroot mode
echo "▶ Requesting real cert from Let's Encrypt"
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm --entrypoint "" certbot \
  certbot certonly --webroot -w /var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# 5. Reload nginx so it serves the real cert
echo "▶ Reloading nginx with real cert"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -s reload

echo "✓ Done. Visit https://$DOMAIN"
