# Multi-stage build for production deployment
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
RUN echo "=== Starting build ===" && \
    pnpm build && \
    echo "=== Build completed ==="

# Verify build output
RUN echo "=== Build output structure ===" && \
    ls -laR dist/

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# PORT is set by Railway automatically, do not override it

# Copy only production dependencies and built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build ./dist/public
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
