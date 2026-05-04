#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run once on a fresh Ubuntu 22.04 / 24.04 EC2 instance to prepare it for
# the PbHub stack. Idempotent — safe to re-run.
#
#   curl -fsSL https://raw.githubusercontent.com/PublishersHub/pbhub_erp/refactor/multi-org-identity/deploy/scripts/bootstrap-host.sh | sudo bash
#
# Or:
#   sudo bash deploy/scripts/bootstrap-host.sh
#
# Prereqs (you do these in the AWS console):
#   - Launch t4g.medium with Ubuntu 22.04 ARM64 AMI
#   - Attach a 30 GB gp3 EBS volume as a SECOND disk (e.g. /dev/nvme1n1 or
#     /dev/xvdf) — DO NOT format the root volume
#   - Allocate an Elastic IP and attach to the instance
#   - Security group: allow 22 (your IP), 80, 443 (anywhere)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DATA_VOLUME="${DATA_VOLUME:-/dev/nvme1n1}"   # change if your second disk is /dev/xvdf
DATA_MOUNT="${DATA_MOUNT:-/data}"
SWAPFILE="${SWAPFILE:-/swapfile}"

log() { printf '\033[36m▶ %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

# ─── Install Docker + compose plugin ─────────────────────────────────────────
log "Installing Docker + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release ufw fail2ban git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker ubuntu
fi
docker --version
docker compose version

# ─── Docker daemon: log rotation ─────────────────────────────────────────────
log "Configuring Docker log rotation"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker || true

# ─── Mount the data EBS volume at /data ──────────────────────────────────────
log "Mounting data volume $DATA_VOLUME at $DATA_MOUNT"
if [[ -b "$DATA_VOLUME" ]]; then
  if ! blkid "$DATA_VOLUME" >/dev/null 2>&1; then
    mkfs.ext4 -L pbhub-data "$DATA_VOLUME"
  fi
  mkdir -p "$DATA_MOUNT"
  if ! mountpoint -q "$DATA_MOUNT"; then
    mount "$DATA_VOLUME" "$DATA_MOUNT"
  fi
  # Persist in fstab via UUID so mount survives reboots and device renames.
  UUID=$(blkid -s UUID -o value "$DATA_VOLUME")
  if ! grep -q "$UUID" /etc/fstab; then
    echo "UUID=$UUID  $DATA_MOUNT  ext4  defaults,nofail  0  2" >> /etc/fstab
  fi
else
  echo "  ! $DATA_VOLUME not present. Either attach an EBS volume there,"
  echo "  ! or set DATA_VOLUME=... before re-running this script."
  exit 1
fi

# Subdirectories used by the compose stack
mkdir -p \
  "$DATA_MOUNT/postgres" \
  "$DATA_MOUNT/redis" \
  "$DATA_MOUNT/letsencrypt" \
  "$DATA_MOUNT/certbot-www" \
  "$DATA_MOUNT/backups"
# Postgres (alpine) container runs as uid 70.
chown -R 70:70 "$DATA_MOUNT/postgres"
# Redis (alpine) runs as uid 999 in the official image but the alpine variant
# uses uid 1000. Either way: world-writable on the volume is acceptable since
# the directory is on a private EBS volume on a single host.
chmod 700 "$DATA_MOUNT/redis"

# ─── Swap file (4 GB → 2 GB swap headroom for builds) ────────────────────────
if [[ ! -f "$SWAPFILE" ]]; then
  log "Creating 2 GB swap file"
  fallocate -l 2G "$SWAPFILE"
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
  swapon "$SWAPFILE"
  echo "$SWAPFILE  none  swap  sw  0  0" >> /etc/fstab
fi

# ─── Firewall (UFW) ──────────────────────────────────────────────────────────
log "Configuring UFW (allow 22, 80, 443)"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status

# ─── Fail2ban (SSH brute-force protection) ───────────────────────────────────
log "Enabling fail2ban for SSH"
systemctl enable --now fail2ban

# ─── Done ────────────────────────────────────────────────────────────────────
log "Bootstrap complete."
echo
echo "Next steps:"
echo "  1. git clone the repo into ~/pbhub (as the ubuntu user, not root)"
echo "  2. cd ~/pbhub/deploy"
echo "  3. cp .env.prod.example .env.prod && edit"
echo "  4. ./scripts/init-letsencrypt.sh"
echo "  5. docker compose -f docker-compose.prod.yml up -d"
echo "  6. crontab -e: add the daily backup line from deploy/README.md"
