#!/bin/bash
# LaunchPilot Worker Startup Script
# Applies database migrations before starting the worker

echo "╔══════════════════════════════════════════╗"
echo "║    LAUNCH PILOT WORKER - STARTING UP    ║"
echo "╚══════════════════════════════════════════╝"

# Apply database migrations using Prisma db push
echo "[Migration] Applying database schema changes..."
npx prisma db push --accept-data-loss 2>&1
MIGRATION_EXIT=$?

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "[Migration] WARNING: Migration failed (exit code $MIGRATION_EXIT). Starting worker anyway..."
else
  echo "[Migration] Database schema is up to date ✓"
fi

echo ""
echo "[Worker] Starting automation worker..."
npx tsx src/lib/queue/worker.ts
