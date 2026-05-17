# ValYoued valuation API — Express + Postgres. Run on Railway, Render, Fly, etc.
# Public URL (origin) → set as VITE_API_ORIGIN on your Vercel frontend (no trailing slash).
#
# Required env (examples): DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY,
# PORT (injected by most hosts), plus LLM_* / OPENAI_* / ANTHROPIC_* per .env.example

# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Install only the API workspace graph (skips valuation-app deps → smaller, faster).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY scripts ./scripts
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile --filter @workspace/api-server...

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

# Hosts like Railway set PORT; load-env defaults to 3001 if unset (local).
EXPOSE 3001

CMD ["node", "artifacts/api-server/dist/index.mjs"]
