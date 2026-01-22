#!/bin/bash
# Stop script for BlestLabs
# Stops both backend and frontend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$(dirname $(dirname $SCRIPT_DIR))/logs"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/shutdown-$(date +%Y%m%d).log"

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): BlestLabs Shutdown Initiated" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Stop Backend (check both dev and prod PID files)
STOPPED_BACKEND=false
for PID_FILE in "$LOG_DIR/backend.pid" "$LOG_DIR/backend-dev.pid" "$LOG_DIR/backend-prod.pid"; do
    if [ -f "$PID_FILE" ]; then
        BACKEND_PID=$(cat "$PID_FILE")
        echo "$(date): Stopping Backend (PID: $BACKEND_PID from $PID_FILE)..." | tee -a "$LOG_FILE"
        kill $BACKEND_PID 2>/dev/null || echo "$(date): Process already stopped" | tee -a "$LOG_FILE"
        rm "$PID_FILE"
        STOPPED_BACKEND=true
    fi
done
if [ "$STOPPED_BACKEND" = false ]; then
    echo "$(date): No backend PID files found" | tee -a "$LOG_FILE"
fi

# Stop Frontend (check both dev and prod PID files)
STOPPED_FRONTEND=false
for PID_FILE in "$LOG_DIR/frontend.pid" "$LOG_DIR/frontend-dev.pid" "$LOG_DIR/frontend-prod.pid"; do
    if [ -f "$PID_FILE" ]; then
        FRONTEND_PID=$(cat "$PID_FILE")
        echo "$(date): Stopping Frontend (PID: $FRONTEND_PID from $PID_FILE)..." | tee -a "$LOG_FILE"
        kill $FRONTEND_PID 2>/dev/null || echo "$(date): Process already stopped" | tee -a "$LOG_FILE"
        rm "$PID_FILE"
        STOPPED_FRONTEND=true
    fi
done
if [ "$STOPPED_FRONTEND" = false ]; then
    echo "$(date): No frontend PID files found" | tee -a "$LOG_FILE"
fi

# Kill any remaining uvicorn/node processes (cleanup)
echo "$(date): Cleaning up any remaining processes..." | tee -a "$LOG_FILE"
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): BlestLabs Shutdown Complete" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
