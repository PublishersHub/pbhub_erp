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

# Use `pnpm deploy` (NOT --prod) to create a standalone deployable package
# that keeps the prisma CLI in node_modules. Then re-run prisma generate so
# the fully-resolved client (with model classes, enums, and the binary
# engine) lands in the deployed flat node_modules — pnpm deploy gives us a
# usable layout, but the .prisma/client dir under it is still the pnpm-store
# stub. Regenerating in place fixes that.
#
# Keeping devDeps adds ~50 MB to the final image; the alternative was npm
# install in the deployed dir which choked on pnpm-deploy's package layout.
RUN pnpm --filter api deploy /app/deployed && \
    cd /app/deployed && \
    pnpm exec prisma generate --schema=/app/apps/api/prisma/schema.prisma && \
    test -s /app/deployed/node_modules/.prisma/client/index.js && \
    test -f /app/deployed/node_modules/.prisma/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node

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
