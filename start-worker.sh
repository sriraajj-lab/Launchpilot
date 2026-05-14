#!/bin/bash
# LaunchPilot Worker Startup Script (v2 - Interactive VNC)
# Starts Xvfb + x11vnc + noVNC, then runs the worker

echo "╔══════════════════════════════════════════╗"
echo "║    LAUNCH PILOT WORKER - STARTING UP    ║"
echo "╚══════════════════════════════════════════╝"

# Set defaults
export SCREEN_WIDTH=${SCREEN_WIDTH:-1280}
export SCREEN_HEIGHT=${SCREEN_HEIGHT:-720}
export SCREEN_DEPTH=${SCREEN_DEPTH:-24}

# === Apply database migrations ===
echo "[Migration] Applying database schema changes..."
npx prisma db push --accept-data-loss 2>&1
MIGRATION_EXIT=$?

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "[Migration] WARNING: Migration failed (exit code $MIGRATION_EXIT). Starting worker anyway..."
else
  echo "[Migration] Database schema is up to date ✓"
fi

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
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log 2>&1
  sleep 1

  # Verify x11vnc is running
  if netstat -tln 2>/dev/null | grep -q 5900 || ss -tln 2>/dev/null | grep -q 5900; then
    echo "[VNC] x11vnc server started ✓ (port 5900)"
  else
    echo "[VNC] WARNING: x11vnc may not be listening on port 5900. Checking..."
    sleep 1
  fi

  # === Start noVNC (WebSocket proxy) ===
  # Try multiple websockify paths
  WEBSOCKIFY_CMD=""
  if command -v websockify &> /dev/null; then
    WEBSOCKIFY_CMD="websockify"
  elif [ -f /opt/novnc/utils/websockify/run ]; then
    WEBSOCKIFY_CMD="/opt/novnc/utils/websockify/run"
  elif [ -f /usr/local/bin/websockify ]; then
    WEBSOCKIFY_CMD="/usr/local/bin/websockify"
  fi

  if [ -n "$WEBSOCKIFY_CMD" ]; then
    $WEBSOCKIFY_CMD --web /opt/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
    sleep 2

    # Verify noVNC is running
    if netstat -tln 2>/dev/null | grep -q 6080 || ss -tln 2>/dev/null | grep -q 6080; then
      echo "[VNC] noVNC started ✓ (port 6080)"
      echo "[VNC] Access browser at: http://localhost:6080/vnc.html"
    else
      echo "[VNC] WARNING: noVNC may not be running. Retrying with python3 websockify..."
      # Fallback: use python3 to run websockify from the novnc directory
      python3 /opt/novnc/utils/websockify/websockify.py --web /opt/novnc 6080 localhost:5900 &
      NOVNC_PID=$!
      sleep 2
      echo "[VNC] noVNC retry attempted (port 6080)"
    fi
  else
    echo "[VNC] WARNING: websockify not found. Trying python3 fallback..."
    python3 -m websockify --web /opt/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
    sleep 2
    echo "[VNC] noVNC started via python3 (port 6080)"
  fi

  # Create a simple HTTP health endpoint for the worker
  mkdir -p /app/public
  echo '<!DOCTYPE html><html><head><title>LaunchPilot Worker</title></head><body><h1>LaunchPilot Worker - VNC Ready</h1><p>VNC is available. <a href="/vnc.html">Open VNC</a></p></body></html>' > /app/public/index.html
fi

# Set up cleanup traps BEFORE starting the worker
cleanup() {
  echo "[Shutdown] Cleaning up..."
  kill $XVFB_PID $FLUXBOX_PID $NOVNC_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# === Start the Worker ===
echo ""
echo "[Worker] Starting automation worker..."
echo "[Worker] HEADLESS=${HEADLESS}"
echo "[Worker] VNC_ENABLED=${VNC_ENABLED}"
echo "[Worker] DISPLAY=${DISPLAY}"
echo ""

npx tsx src/lib/queue/worker.ts
