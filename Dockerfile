# LaunchPilot - Worker Dockerfile (v3 - Interactive VNC)
# Runs the background automation worker with Playwright + Chromium
# Includes Xvfb + x11vnc + noVNC for interactive browser access

FROM node:20-bookworm

WORKDIR /app

# Install system dependencies required by Playwright Chromium + VNC
RUN apt-get update && apt-get install -y \
    # Playwright Chromium dependencies
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
    # VNC dependencies
    xvfb \
    x11vnc \
    fluxbox \
    # noVNC / Python dependencies
    python3 \
    python3-pip \
    python3-numpy \
    netcat-openbsd \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install websockify via pip (more reliable than from source)
RUN pip3 install --break-system-packages websockify 2>/dev/null || pip3 install websockify 2>/dev/null || true

# Install noVNC
RUN mkdir -p /opt/novnc \
    && wget -qO- https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz | tar xz --strip 1 -C /opt/novnc \
    && ls -la /opt/novnc/ \
    && ls -la /opt/novnc/vnc.html \
    && echo "noVNC installed successfully"

# Verify websockify is available
RUN which websockify && websockify --version || echo "websockify not in PATH, will use python3 fallback"

# Copy Prisma schema first (needed by postinstall)
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install Node.js dependencies (postinstall runs prisma generate)
RUN npm ci --include=dev

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Copy startup script
COPY start-worker.sh ./
RUN chmod +x start-worker.sh

# Expose noVNC port
EXPOSE 6080

# Default environment
ENV NODE_ENV=production
ENV HEADLESS=false
ENV DISPLAY=:99
ENV VNC_ENABLED=true
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=720
ENV SCREEN_DEPTH=24

CMD ["./start-worker.sh"]
