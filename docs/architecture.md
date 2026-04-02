# PbHub HRMS — Architecture

## Overview

Modular monolith HRMS built with:
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Cache/Jobs:** Redis
- **Monorepo:** pnpm workspaces + Turborepo

## Structure

```
apps/web     → Next.js frontend (port 3000)
apps/api     → NestJS backend  (port 3001)
packages/    → Shared types, config, UI components
```

## Key Principles

1. **Multi-tenant ready** — `organization_id` on all business tables, queries scoped by org
2. **Users ≠ Employees** — auth identity separated from HR profile
3. **Thin controllers** — business logic lives in services
4. **Audit everything** — sensitive actions logged with before/after state
5. **Modular monolith** — strict module boundaries, no microservices
