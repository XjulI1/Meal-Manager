# ---------------------------------------------------------------------------
# Base image: Node 24 (matches .nvmrc and engines.node) + pnpm 10 via corepack.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS base
ENV CI=true \
    PNPM_HOME=/root/.local/share/pnpm
RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies stage: install full deps (incl. devDeps) using a cached store.
# Postinstall (nuxt prepare) is skipped here because the app source is not
# yet available; it runs implicitly during `nuxt build` in the builder stage.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---------------------------------------------------------------------------
# Builder stage: compile the Nuxt app into a standalone `.output/` directory.
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ---------------------------------------------------------------------------
# Runtime stage: minimal image carrying only the Nuxt standalone server and
# the migration tooling (drizzle-kit + its config + generated SQL files).
# Migrations are applied by the entrypoint before the Nitro server starts.
#
# Signal forwarding & zombie reaping are delegated to the orchestrator's init
# (e.g. `init: true` in docker-compose, `shareProcessNamespace`/init in k8s).
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000

# Self-contained Nuxt/Nitro server output (bundled deps live inside .output/).
COPY --from=builder /app/.output ./.output

# Migration assets and the drizzle toolchain needed by the entrypoint.
COPY --from=builder /app/server/database/migrations ./server/database/migrations
COPY --from=builder /app/server/database/schema ./server/database/schema
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
