# LaunchPilot - Worker Dockerfile
# Runs the background automation worker with Playwright + Chromium

FROM node:20-bookworm

WORKDIR /app

# Install system dependencies required by Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxfixes3 \
    libatspi2.0-0 \
    libwayland-client0 \
    wget \
    xdg-utils \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libu2f-udev \
    libvulkan1 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy Prisma schema first (needed by postinstall)
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install Node.js dependencies (postinstall runs prisma generate)
RUN npm ci --include=dev

# Install Playwright browsers - this ensures the correct browser version
# matches the installed Playwright npm package
RUN npx playwright install chromium

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Copy startup script
COPY start-worker.sh ./
RUN chmod +x start-worker.sh

# Default: run the worker with migration
ENV NODE_ENV=production
ENV HEADLESS=true

CMD ["./start-worker.sh"]
