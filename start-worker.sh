#!/bin/bash
# LaunchPilot Worker Startup Script (v2 - Interactive VNC)
# Starts Xvfb + x11vnc + noVNC, then runs the worker

echo "╔══════════════════════════════════════════╗"
echo "║    LAUNCH PILOT WORKER - STARTING UP    ║"
echo "╚══════════════════════════════════════════╝"

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
sleep 1

# Verify Xvfb started
if ! kill -0 $XVFB_PID 2>/dev/null; then
  echo "[VNC] ERROR: Xvfb failed to start. Falling back to headless mode."
  export HEADLESS=true
else
  echo "[VNC] Xvfb started ✓ (PID: $XVFB_PID)"

  # === Start Window Manager ===
  fluxbox -display :99 &
  FLUXBOX_PID=$!
  sleep 0.5
  echo "[VNC] Fluxbox window manager started ✓"

  # === Start VNC Server ===
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log 2>&1
  sleep 0.5
  echo "[VNC] x11vnc server started ✓ (port 5900)"

  # === Start noVNC (WebSocket proxy) ===
  websockify --web /opt/novnc 6080 localhost:5900 &
  NOVNC_PID=$!
  sleep 1
  echo "[VNC] noVNC started ✓ (port 6080)"
  echo "[VNC] 🖥️  Access browser at: http://localhost:6080/vnc.html"
fi

export DISPLAY=:99

# === Start the Worker ===
echo ""
echo "[Worker] Starting automation worker..."
echo "[Worker] HEADLESS=${HEADLESS}"
echo "[Worker] VNC_ENABLED=${VNC_ENABLED}"
echo ""

npx tsx src/lib/queue/worker.ts

# Cleanup on exit
trap "echo '[Shutdown] Cleaning up...'; kill $XVFB_PID $FLUXBOX_PID $NOVNC_PID 2>/dev/null; exit 0" SIGINT SIGTERM
