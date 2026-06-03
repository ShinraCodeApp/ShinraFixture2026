# ── Base Stage ────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ── Dependencies Stage ────────────────────────────────
FROM base AS deps
COPY package.json yarn.lock ./
COPY prisma ./prisma/
RUN yarn install --frozen-lockfile
RUN npx prisma generate

# ── Build Stage ───────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# ── Production Stage ──────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 shinra

COPY --from=builder --chown=shinra:nodejs /app/dist ./dist
COPY --from=builder --chown=shinra:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=shinra:nodejs /app/prisma ./prisma
COPY --from=builder --chown=shinra:nodejs /app/package.json ./package.json

USER shinra

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
