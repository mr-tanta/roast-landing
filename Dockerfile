# Multi-stage build for Next.js production deployment

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Install dependencies based on the package manager
COPY package*.json pnpm-lock.yaml ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --prod --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --only=production --ignore-scripts; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Copy built Next.js app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set proper permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]