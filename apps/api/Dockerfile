FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- Development ----
FROM base AS development

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./

# Copy package.json files for all workspace packages
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

# Install all dependencies (dev + prod)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/api/ apps/api/
COPY packages/ packages/

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate

EXPOSE 3001

CMD ["pnpm", "--filter", "api", "start:dev"]

# ---- Build ----
FROM base AS build

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --no-frozen-lockfile

COPY apps/api/ apps/api/
COPY packages/ packages/

RUN cd apps/api && pnpm exec prisma generate
RUN pnpm --filter api build

# Use `pnpm deploy` to create a standalone production package.
# This outputs a flat node_modules (no pnpm symlink store) with
# only production dependencies, including @prisma/client.
RUN pnpm --filter api deploy --prod /app/deployed

# The generated Prisma query engine (.prisma/client/) is created by
# `prisma generate` and lives in the pnpm virtual store during build.
# @prisma/client at runtime does require('.prisma/client') which
# resolves to node_modules/.prisma/client/. The pnpm store has multiple
# .prisma/client dirs; we must follow symlinks (-L) and pick the one
# that actually contains index.js (i.e. the fully-generated client, not
# a half-resolved virtual-store stub).
RUN set -e; \
    SRC=$(for d in $(find /app -path '*/.prisma/client' -type d 2>/dev/null); do \
            if [ -f "$d/index.js" ]; then echo "$d"; break; fi; \
          done); \
    if [ -z "$SRC" ]; then echo "ERR: no fully-generated .prisma/client found" >&2; exit 1; fi; \
    echo "Copying Prisma client from $SRC"; \
    mkdir -p /app/deployed/node_modules/.prisma; \
    cp -rL "$SRC" /app/deployed/node_modules/.prisma/client; \
    test -f /app/deployed/node_modules/.prisma/client/index.js

# ---- Production ----
# Minimal image: flat node_modules from deploy + compiled dist.
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Production node_modules (flat, no pnpm needed at runtime)
COPY --from=build /app/deployed/node_modules ./node_modules
COPY --from=build /app/deployed/package.json ./package.json

# Compiled NestJS application
COPY --from=build /app/apps/api/dist ./dist

# Prisma schema (available for runtime migrations if needed)
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main.js"]
