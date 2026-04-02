FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- Development ----
FROM base AS development

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./

# Copy package.json files for all workspace packages
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/web/ apps/web/
COPY packages/ packages/

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "dev"]

# ---- Build ----
FROM base AS build

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --no-frozen-lockfile

COPY apps/web/ apps/web/
COPY packages/ packages/

RUN pnpm --filter web build

# ---- Production ----
# Next.js standalone output with outputFileTracingRoot set to the
# monorepo root (../../ from apps/web/) produces this structure
# inside .next/standalone/:
#
#   apps/web/server.js      <- entry point
#   apps/web/.next/         <- runtime assets
#   apps/web/package.json
#   node_modules/           <- traced runtime deps
#   package.json
#
# We copy the entire standalone tree as the working directory,
# then layer in static assets and public files which standalone
# does not include automatically.
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
