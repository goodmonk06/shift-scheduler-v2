# Multi-stage build for production deployment
# Force rebuild: 20251111-210500
FROM node:22-alpine@sha256:b2358485e3e33bc3a33114d2b1bdb18cdbe4df01bd2b257198eb51beb1f026c5 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && date

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build both client and server
# CRITICAL: Force fresh build every time
ARG CACHEBUST=20251111210500
RUN echo "=== Starting build (CACHEBUST: $CACHEBUST) ===" && \
    echo "PWD: $(pwd)" && \
    ls -la && \
    rm -rf dist build .vite node_modules/.vite && \
    echo "=== Cleaned old build dirs ===" && \
    ls -la && \
    pnpm build && \
    echo "=== Build completed ===" && \
    ls -la dist/public/assets/ | head -20

# Verify build output
RUN echo "=== Build output structure ===" && \
    ls -la dist/ && \
    echo "=== dist/public/ contents ===" && \
    ls -la dist/public/ && \
    echo "=== Checking index.html ===" && \
    cat dist/public/index.html | grep -o 'index-[^"]*\.js' | head -1

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# PORT is set by Railway automatically, do not override it

# Copy only production dependencies and built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

# Verify runtime file structure
RUN echo "=== Runtime file structure ===" && \
    pwd && \
    ls -la && \
    echo "=== dist/ contents ===" && \
    ls -la dist/ && \
    echo "=== dist/public/ contents ===" && \
    ls -la dist/public/ && \
    echo "=== dist/public/index.html exists ===" && \
    test -f dist/public/index.html && echo "YES" || echo "NO"

EXPOSE 3000

CMD ["node", "dist/index.js"]
