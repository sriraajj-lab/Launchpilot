# Launch Pilot - Worker Dockerfile
# Runs the background automation worker with Playwright + Chromium
#
# Build: docker build -t launchpilot-worker .
# Run:   docker run --env-file .env launchpilot-worker

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Install Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Default: run the worker
ENV NODE_ENV=production
ENV HEADLESS=true

# Health check - worker writes heartbeat file
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD test -f /tmp/worker-heartbeat && find /tmp/worker-heartbeat -mmin -1 | grep -q .

CMD ["npx", "tsx", "src/lib/queue/worker.ts"]
