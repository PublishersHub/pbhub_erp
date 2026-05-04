# Production deployment

Single EC2 host, Docker Compose for everything (Postgres + Redis + API + Web + Nginx + Certbot), S3 for user uploads, EBS for the database, Let's Encrypt for SSL.

```
hr.cloudxbloom.com   ──→  Elastic IP  ──→  EC2 (t4g.medium)  ──→  docker compose
                                                                    ├─ nginx :80/:443
                                                                    ├─ web   :3000 (internal)
                                                                    ├─ api   :3001 (internal)
                                                                    ├─ postgres (internal)
                                                                    ├─ redis (internal)
                                                                    └─ certbot (renewal loop)
```

---

## Layout

```
deploy/
├── docker-compose.prod.yml
├── .env.prod.example          # copy to .env.prod, fill in
├── .env.prod                  # ← gitignored, lives only on the server
├── nginx/
│   └── conf.d/hr-system.conf
└── scripts/
    ├── bootstrap-host.sh      # one-time host setup (Docker, EBS, swap, UFW)
    ├── init-letsencrypt.sh    # one-time SSL bootstrap
    ├── backup-db.sh           # daily pg_dump (cron)
    └── redeploy.sh            # `git pull && rebuild` for code updates
```

---

## First deploy — step by step

### 1. AWS console: provision the EC2 + EBS + Elastic IP

- **Instance type:** `t4g.medium` (ARM, ~$24/mo) — same architecture as the EC2's CPU
- **AMI:** Ubuntu Server 24.04 LTS (arm64)
- **Storage at launch:** keep the default 8 GB root volume
- **Add a second EBS volume:** 30 GB **gp3**, attach as `/dev/sdf` (Linux will see it as `/dev/nvme1n1`)
- **Security group:** allow inbound 22 from your IP, 80 + 443 from anywhere
- **Key pair:** use an existing one or create new
- **Allocate Elastic IP** → associate with the instance (so the IP doesn't change on stop/start)

### 2. Route 53: point the subdomain at the Elastic IP

- Hosted zone: `cloudxbloom.com`
- Add A record:
  - Name: `hr`
  - Type: `A`
  - Value: `<your Elastic IP>`
  - TTL: 300
- Wait for propagation: `dig hr.cloudxbloom.com +short` should print the EIP within a minute or two

### 3. SSH in + run the host bootstrap

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@hr.cloudxbloom.com

# Clone the repo (use a deploy key or PAT for private repo access)
git clone -b refactor/multi-org-identity git@github.com:PublishersHub/pbhub_erp.git ~/hr-system
cd ~/hr-system

# One-time host setup: Docker, EBS mount at /data, swap, UFW, fail2ban
sudo bash deploy/scripts/bootstrap-host.sh

# Log out and back in so the docker group membership takes effect for ubuntu
exit
ssh -i ~/.ssh/your-key.pem ubuntu@hr.cloudxbloom.com
docker --version    # sanity check, no sudo needed
```

### 4. Set up secrets

```bash
cd ~/hr-system/deploy
cp .env.prod.example .env.prod
nano .env.prod   # fill in every CHANGE_ME line
```

What you need to fill in:

- `DB_PASSWORD` — `openssl rand -base64 32`
- `DATABASE_URL` — paste the same password in
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — `openssl rand -base64 48` each (different values!)
- `S3_BUCKET` — should be `hr-system-prod` if you've deployed the CDK storage stack
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` — create in IAM console: Users → `hr-system-app-prod` → Security credentials → Create access key
- `MAIL_SMTP_USER` / `MAIL_SMTP_PASSWORD` — Gmail address + [App Password](https://myaccount.google.com/apppasswords)

### 5. Issue the SSL cert + bring up the stack

```bash
cd ~/hr-system/deploy
./scripts/init-letsencrypt.sh
```

This script:
1. Creates a dummy self-signed cert (so nginx can boot)
2. Builds the api/web images and starts the stack
3. Replaces the dummy with a real Let's Encrypt cert
4. Reloads nginx

If it succeeds:

```bash
curl -sI https://hr.cloudxbloom.com | head -1
# → HTTP/2 200
```

### 6. Seed the database (first time only)

The `migrate` service runs `prisma migrate deploy` on every `up`, which creates the schema. To populate seed data once:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
  sh -c "cd /app && node -e 'console.log(require.resolve(\"prisma\"))'"

# If that fails (prisma not in prod image), seed using a one-off in the build image:
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
  --entrypoint "" migrate sh -c "cd /app/apps/api && pnpm exec prisma db seed"
```

### 7. Schedule the daily backup

```bash
crontab -e
```

Add:

```
# Daily Postgres backup at 02:00 UTC
0 2 * * * /home/ubuntu/hr-system/deploy/scripts/backup-db.sh >> /home/ubuntu/hr-system-backup.log 2>&1
```

### 8. Open https://hr.cloudxbloom.com

You should land on the login screen. Log in as `admin@pbhub.com` / `admin123` (change this immediately).

---

## Redeploying after a code change

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@hr.cloudxbloom.com
cd ~/hr-system/deploy
./scripts/redeploy.sh
```

That `git pull`s, rebuilds, restarts containers in the right order, and tails logs for 20 seconds.

---

## Common operations

| Task | Command |
|---|---|
| View live logs | `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f` |
| View one service's logs | `... logs -f api` |
| Restart one service | `... restart api` |
| Open a Postgres shell | `... exec postgres psql -U hrms -d hrms_db` |
| Run a one-off prisma migration | `... run --rm --entrypoint "" migrate sh -c "cd /app/apps/api && pnpm exec prisma migrate deploy"` |
| Manual backup | `./scripts/backup-db.sh` |
| Restore backup | `gunzip -c /data/backups/db-YYYY-MM-DD-HHMM.sql.gz \| docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres psql -U hrms -d hrms_db` |
| Force cert renewal | `... run --rm --entrypoint "" certbot certbot renew --force-renewal && ... exec nginx nginx -s reload` |
| Stop everything | `... down` (data is on /data and survives) |

---

## Backup & disaster recovery

- **Daily** — `pg_dump` runs at 02:00 UTC via cron, gzipped to `/data/backups/`. Retention: 14 days.
- **EBS snapshots** — set up a [Data Lifecycle Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/snapshot-lifecycle.html) policy in the AWS console: every 24h, retain 7. Costs ~$1.50/mo. This catches everything (DB + uploads + certs) including OS-level state.
- **S3 versioning** — already on for the prod bucket via CDK. An accidental file overwrite is recoverable for 90 days.

To restore the EC2 from scratch:

1. Launch a fresh t4g.medium with the same Ubuntu AMI
2. Detach the data EBS from the dead instance, attach to the new one
3. Run `sudo bash deploy/scripts/bootstrap-host.sh` — it sees the existing volume, skips formatting
4. Restore `.env.prod` (you saved it somewhere safe, right?)
5. `./scripts/redeploy.sh`

---

## Things that DON'T live in this stack

- **CloudFront/CDN** — branding assets are served straight from S3 today. Add CloudFront if egress costs grow past ~$30/mo.
- **CloudWatch metrics** — instance metrics go to EC2 Monitoring tab; app metrics aren't exported. If you need alerting, install the CloudWatch agent or sign up for Sentry.
- **Multiple instances / autoscaling** — single host is by design. When you outgrow it, the path is: move Postgres to RDS, switch to ECS Fargate using the storage bucket as-is.

---

## Troubleshooting

### `init-letsencrypt.sh` fails with "Connection refused"
The DNS A record hasn't propagated yet, OR security group is blocking 80. `dig hr.cloudxbloom.com +short` and confirm the SG inbound rule.

### `init-letsencrypt.sh` says "rate limit exceeded"
Let's Encrypt allows 5 cert issuances per domain per week. If you've been retrying, wait or use the staging server (add `--staging` to the certbot command).

### nginx says `cannot load certificate "/etc/letsencrypt/live/hr.cloudxbloom.com/fullchain.pem"`
The cert wasn't issued (yet). Run `./scripts/init-letsencrypt.sh` again, or check `/data/letsencrypt/live/`.

### `migrate` service stays in `Restarting` forever
Probably a Prisma migration error. `docker compose ... logs migrate` will show the SQL error. Often a manual `pg_dump` + restore is needed if a previous migration partially applied.

### Disk filling up
Likely Docker images. `docker system prune -af --volumes` (be careful with `--volumes`!) or `docker image prune -af`.

### S3 uploads return 403
The IAM access keys in `.env.prod` are wrong, or the user policy doesn't grant put/get on the bucket. Verify in the AWS console: IAM → Users → `hr-system-app-prod` → Permissions.
