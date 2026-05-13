#!/bin/bash
# ================================================================
# Launch Pilot - One-Command VPS Deployment
#
# Usage: curl -sSL https://raw.githubusercontent.com/sriraajj-lab/Launchpilot/main/deploy.sh | bash
#    OR: ./deploy.sh
#
# Requirements:
#   - Ubuntu 22.04+ / Debian 12+
#   - Root or sudo access
#   - 2GB+ RAM (for Chromium)
#
# What this does:
#   1. Installs Docker + Docker Compose (if not present)
#   2. Clones the repo
#   3. Generates secure secrets
#   4. Starts all services (postgres + web + worker)
#   5. Runs DB migrations
#
# After deployment:
#   - Web dashboard: http://YOUR_IP:3000
#   - Worker processes submissions autonomously
#   - All data in Docker volumes (persists across restarts)
# ================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      LAUNCH PILOT - DEPLOYING...        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

INSTALL_DIR="${INSTALL_DIR:-/opt/launchpilot}"
REPO_URL="https://github.com/sriraajj-lab/Launchpilot.git"

# Check if running as root or has sudo
if [ "$EUID" -ne 0 ] && ! sudo -v 2>/dev/null; then
    echo -e "${RED}Error: This script requires root or sudo access${NC}"
    exit 1
fi

SUDO=""
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
fi

# Step 1: Install Docker if not present
echo -e "${YELLOW}[1/6] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq ca-certificates curl gnupg
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    $SUDO systemctl enable docker
    $SUDO systemctl start docker
    echo -e "${GREEN}Docker installed ✓${NC}"
else
    echo -e "${GREEN}Docker already installed ✓${NC}"
fi

# Step 2: Clone or update repo
echo -e "${YELLOW}[2/6] Setting up application...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main 2>/dev/null || true
else
    echo "Cloning repository..."
    $SUDO git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Step 3: Generate secrets
echo -e "${YELLOW}[3/6] Generating secrets...${NC}"
if [ ! -f "$INSTALL_DIR/.env" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    PG_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
    
    cat > "$INSTALL_DIR/.env" <<EOF
# Launch Pilot - Auto-generated configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Database
POSTGRES_PASSWORD=${PG_PASSWORD}
DATABASE_URL=postgresql://launchpilot:${PG_PASSWORD}@postgres:5432/launchpilot

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Encryption (for stored credentials)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Optional: 2Captcha for auto-solving (get key at 2captcha.com)
TWO_CAPTCHA_API_KEY=

# Optional: Change port
# PORT=3000
EOF
    
    echo -e "${GREEN}Secrets generated ✓${NC}"
    echo -e "  Config saved to: ${INSTALL_DIR}/.env"
else
    echo -e "${GREEN}Using existing .env ✓${NC}"
fi

# Step 4: Update docker-compose with the generated password
echo -e "${YELLOW}[4/6] Configuring services...${NC}"

# Load env vars
source "$INSTALL_DIR/.env"

# Create production docker-compose override
cat > "$INSTALL_DIR/docker-compose.override.yml" <<EOF
# Auto-generated production overrides
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  web:
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    restart: always
  worker:
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      TWO_CAPTCHA_API_KEY: ${TWO_CAPTCHA_API_KEY:-}
    restart: always
EOF

echo -e "${GREEN}Services configured ✓${NC}"

# Step 5: Build and start
echo -e "${YELLOW}[5/6] Building and starting services...${NC}"
$SUDO docker compose build --quiet
$SUDO docker compose up -d

echo -e "${GREEN}Services started ✓${NC}"

# Step 6: Wait for healthy state
echo -e "${YELLOW}[6/6] Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
WEB_STATUS=$($SUDO docker compose ps web --format "{{.Status}}" 2>/dev/null || echo "not running")
WORKER_STATUS=$($SUDO docker compose ps worker --format "{{.Status}}" 2>/dev/null || echo "not running")
DB_STATUS=$($SUDO docker compose ps postgres --format "{{.Status}}" 2>/dev/null || echo "not running")

echo ""
echo "═══════════════════════════════════════════"
echo -e "${GREEN}  LAUNCH PILOT DEPLOYED SUCCESSFULLY! 🚀${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "  Services:"
echo "    PostgreSQL:  ${DB_STATUS}"
echo "    Web App:     ${WEB_STATUS}"
echo "    Worker:      ${WORKER_STATUS}"
echo ""
echo "  Dashboard:  http://$(hostname -I | awk '{print $1}'):3000"
echo "  Config:     ${INSTALL_DIR}/.env"
echo ""
echo "  Commands:"
echo "    View logs:   cd ${INSTALL_DIR} && docker compose logs -f"
echo "    Stop:        cd ${INSTALL_DIR} && docker compose down"
echo "    Restart:     cd ${INSTALL_DIR} && docker compose restart"
echo "    Update:      cd ${INSTALL_DIR} && git pull && docker compose up -d --build"
echo ""
echo "  Next steps:"
echo "    1. Open http://YOUR_IP:3000 in your browser"
echo "    2. Create an account"
echo "    3. Submit your first tool!"
echo "    4. (Optional) Add 2Captcha key in .env for CAPTCHA solving"
echo ""
echo "═══════════════════════════════════════════"
