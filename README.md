# PbHub HRMS

Modular Human Resource Management System.

## Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Frontend  | Next.js, React, TypeScript     |
| Backend   | NestJS, TypeScript, Prisma ORM |
| Database  | PostgreSQL                     |
| Cache     | Redis                          |
| Monorepo  | pnpm workspaces, Turborepo     |
| Container | Docker Compose                 |

## Quick Start

```bash
# 1. Clone and install
pnpm install

# 2. Copy env
cp .env.example .env

# 3. Start all services
docker compose up --build

# 4. Run migrations (in a separate terminal)
docker compose exec api pnpm exec prisma migrate dev

# 5. Access
# Web:     http://localhost:3000
# API:     http://localhost:3001
# Swagger: http://localhost:3001/api/docs
# Health:  http://localhost:3001/api/health
```

## Project Structure

```
apps/
  web/          → Next.js frontend
  api/          → NestJS backend
packages/
  types/        → Shared TypeScript types
  config/       → Shared configuration
  ui/           → Shared UI components
infrastructure/
  docker/       → Docker-related configs
docs/           → Architecture docs
```

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `pnpm dev`        | Start all apps in dev mode       |
| `pnpm build`      | Build all apps                   |
| `pnpm lint`       | Lint all apps                    |
| `pnpm format`     | Format all files with Prettier   |
| `pnpm db:migrate` | Run Prisma migrations            |
| `pnpm db:seed`    | Seed the database                |
| `pnpm db:studio`  | Open Prisma Studio               |
