# Multi-stage build for Next.js production deployment

# Stage 1: Builder (includes dev dependencies for build)
FROM node:18-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Install all dependencies (including devDependencies for build)
COPY package*.json pnpm-lock.yaml ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Copy source code
COPY . .

# Build the Next.js application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add minimal server-side environment variables for build process
# Note: NEXT_PUBLIC_* variables are excluded to allow runtime configuration
ENV STRIPE_SECRET_KEY=sk_test_placeholder_for_build
ENV OPENAI_API_KEY=sk-placeholder-for-build
ENV ANTHROPIC_API_KEY=sk-ant-placeholder-for-build
ENV GEMINI_API_KEY=placeholder-for-build
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key

RUN pnpm run build

# Stage 2: Production dependencies only
FROM node:18-alpine AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Install only production dependencies
COPY package*.json pnpm-lock.yaml ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --prod --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --only=production --ignore-scripts; \
  elif [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/public ./public

# Copy built Next.js app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set proper permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]