#!/bin/bash
# LaunchPilot Worker Startup Script (v3 - Interactive VNC)
# Starts Xvfb + x11vnc + noVNC, then runs the worker

set -e  # Exit on error for setup steps (but not for the worker itself)

echo "╔══════════════════════════════════════════╗"
echo "║    LAUNCH PILOT WORKER - STARTING UP    ║"
echo "╚══════════════════════════════════════════╝"

# Set defaults
export SCREEN_WIDTH=${SCREEN_WIDTH:-1280}
export SCREEN_HEIGHT=${SCREEN_HEIGHT:-720}
export SCREEN_DEPTH=${SCREEN_DEPTH:-24}

# === Apply database migrations ===
echo "[Migration] Applying database schema changes..."
npx prisma db push --accept-data-loss 2>&1 || echo "[Migration] WARNING: Migration failed. Starting worker anyway..."

# === Start Virtual Display (Xvfb) ===
echo "[VNC] Starting virtual display (${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH})..."
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 2

# Verify Xvfb started
if ! kill -0 $XVFB_PID 2>/dev/null; then
  echo "[VNC] ERROR: Xvfb failed to start. Falling back to headless mode."
  export HEADLESS=true
  VNC_STARTED=false
else
  echo "[VNC] Xvfb started ✓ (PID: $XVFB_PID)"
  export DISPLAY=:99
  export HEADLESS=false
  VNC_STARTED=true

  # === Start Window Manager ===
  fluxbox -display :99 &
  FLUXBOX_PID=$!
  sleep 1
  echo "[VNC] Fluxbox window manager started ✓"

  # === Start VNC Server ===
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log 2>&1 || true
  sleep 2

  # Verify x11vnc is running
  if ss -tln 2>/dev/null | grep -q 5900; then
    echo "[VNC] x11vnc server started ✓ (port 5900)"
  else
    echo "[VNC] WARNING: x11vnc may not be listening on 5900, retrying..."
    x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc2.log 2>&1 || true
    sleep 2
  fi

  # === Start noVNC (WebSocket proxy) ===
  echo "[VNC] Starting noVNC websockify on port 6080..."

  # Try pip-installed websockify first
  if command -v websockify &> /dev/null; then
    echo "[VNC] Using system websockify: $(which websockify)"
    websockify --web /opt/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
  elif [ -f /usr/local/bin/websockify ]; then
    echo "[VNC] Using /usr/local/bin/websockify"
    /usr/local/bin/websockify --web /opt/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
  else
    echo "[VNC] Using python3 websockify module"
    python3 -m websockify --web /opt/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
  fi

  sleep 3

  # Verify noVNC is running
  if ss -tln 2>/dev/null | grep -q 6080; then
    echo "[VNC] noVNC started ✓ (port 6080)"
    echo "[VNC] Access browser at: http://localhost:6080/vnc.html"
  else
    echo "[VNC] WARNING: noVNC not listening on 6080. Listing processes:"
    ps aux | grep -E "websockify|novnc|python" || true
    echo "[VNC] Trying direct python3 fallback..."
    python3 -c "
import websockify
import sys
sys.argv = ['websockify', '--web', '/opt/novnc', '6080', 'localhost:5900']
websockify.websocketproxy.main()
" &
    NOVNC_PID=$!
    sleep 3
    if ss -tln 2>/dev/null | grep -q 6080; then
      echo "[VNC] noVNC started via python3 fallback ✓"
    else
      echo "[VNC] ERROR: Could not start noVNC. VNC will not be available."
      echo "[VNC] Worker will continue in headless mode."
      export HEADLESS=true
    fi
  fi
fi

# Set up cleanup traps BEFORE starting the worker
cleanup() {
  echo "[Shutdown] Cleaning up..."
  kill $XVFB_PID $FLUXBOX_PID $NOVNC_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# === Start the Worker ===
echo ""
echo "[Worker] Starting automation worker..."
echo "[Worker] HEADLESS=${HEADLESS}"
echo "[Worker] VNC_ENABLED=${VNC_ENABLED}"
echo "[Worker] DISPLAY=${DISPLAY:-not set}"
echo ""

# Use set +e so worker crashes don't prevent cleanup
set +e
npx tsx src/lib/queue/worker.ts
