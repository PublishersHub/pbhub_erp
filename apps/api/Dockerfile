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

# Verify the generated client made it into apps/api/node_modules/.prisma
# (resolved through pnpm's hoisting). If this fails, the pnpm layout changed
# and we need to re-investigate.
RUN test -s /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/index.js

# ---- Production ----
# Preserve the full pnpm workspace tree so symlinks resolve correctly at
# runtime. We tried `pnpm deploy --prod` + manual prisma copy earlier; both
# variants ended up with stub Prisma clients because the generated client
# lives in the pnpm virtual store, which gets pruned away by deploy.
#
# Image is ~50 MB larger than a deduplicated prod tree but it just works.
FROM node:20-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Workspace layout — root node_modules has the .pnpm virtual store with the
# generated Prisma client + binary engine. apps/api/node_modules holds the
# symlinks into that store.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main.js"]
