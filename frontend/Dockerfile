# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine as builder

WORKDIR /app

# Install build tools needed by native npm modules
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Build Next.js application (creates .next/ directory)
RUN npm run build

# ============================================================
# Stage 2: Runtime (Standalone Next.js)
# ============================================================
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies (minimal)
RUN apk add --no-cache curl

# Copy built application from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set environment for Next.js to listen on all interfaces
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose Next.js port
EXPOSE 3000

# Health check: verify Next.js is responding
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -f http://localhost:3000 || exit 1

# Run application (standalone mode doesn't need node_modules)
CMD ["node", "server.js"]

