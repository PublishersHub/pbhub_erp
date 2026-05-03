# PbHub Infrastructure

AWS CDK (TypeScript) for the PbHub HRMS deployment.

## Layout

```
infra/
├── bin/pbhub.ts                  # CDK app entry — wires stacks per env
├── lib/
│   ├── config/env-config.ts      # per-env settings (region, origins, etc.)
│   └── stacks/
│       ├── storage-stack.ts      # S3 bucket (active)
│       ├── network-stack.ts      # VPC (TODO)
│       ├── data-stack.ts         # RDS + Redis (TODO)
│       ├── compute-stack.ts      # ECS Fargate (TODO)
│       ├── cdn-stack.ts          # CloudFront (TODO)
│       ├── dns-stack.ts          # Route53 + ACM (TODO)
│       └── monitoring-stack.ts   # CloudWatch (TODO)
└── test/                         # CDK assertions
```

Region: `us-east-1`. CLI profile: `pb.hub`.

## First-time setup

```bash
cd infra
pnpm install                                         # or npm install
npx cdk bootstrap --profile pb.hub aws://<acct>/us-east-1
```

You only run `cdk bootstrap` once per account/region.

## Deploy storage (the only stack with real resources today)

```bash
# Synth a single env
cdk synth --context env=dev

# Diff before deploying
cdk diff PbHub-Storage-dev --profile pb.hub --context env=dev

# Deploy
cdk deploy PbHub-Storage-dev --profile pb.hub --context env=dev
```

After deploy, copy outputs into `apps/api/.env`:

```
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=pbhub-dev
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=...   # create from the IAM user the stack creates
STORAGE_S3_SECRET_KEY=...
```

(Create access keys for the `pbhub-app-dev` IAM user in the AWS console after deploy.
For production, switch to a task role on ECS instead of long-lived keys.)

## Bucket layout

Single bucket `pbhub-{env}`, prefix-separated:

```
private/
  receipts/{orgId}/{employeeId}/{claimId}/{filename}
  employee-docs/{orgId}/{employeeId}/{filename}
  onboarding-docs/{orgId}/{instanceId}/{taskId}/{filename}
public/
  branding/{orgId}/logo.png  favicon.ico  login-bg.jpg
cache/
  payslips/{orgId}/{cycleId}/{employeeId}.pdf
```

- `private/*` — only reachable via presigned URLs the API generates.
- `public/*` — anyone with the URL can read. Use for branding assets shown on the login screen.
- `cache/*` — auto-expires after 30 days.

## Tests

```bash
pnpm test
```

CDK assertions verify the bucket name, public-read prefix policy, CORS, and lifecycle rules.

## Tearing down dev

```bash
cdk destroy PbHub-Storage-dev --profile pb.hub --context env=dev
```

(Prod has `removalPolicy: retain` and `bucketVersioning: true`, so `cdk destroy` won't actually delete the bucket — you'd need to empty it manually first.)

## Open TODOs

- Pin AWS account IDs in `env-config.ts` once accounts are bootstrapped
- Implement the empty stacks when we move off Docker Compose
- Switch from IAM user → task role once compute lives in ECS
- Add CloudFront in `cdn-stack.ts` once branding traffic justifies it
