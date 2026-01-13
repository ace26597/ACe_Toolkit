#!/bin/bash
# Stop script for ACe_Toolkit
# Stops both backend and frontend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$(dirname $(dirname $SCRIPT_DIR))/logs"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/shutdown-$(date +%Y%m%d).log"

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): ACe_Toolkit Shutdown Initiated" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Stop Backend
if [ -f "$LOG_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$LOG_DIR/backend.pid")
    echo "$(date): Stopping Backend (PID: $BACKEND_PID)..." | tee -a "$LOG_FILE"
    kill $BACKEND_PID 2>/dev/null || echo "$(date): Backend already stopped" | tee -a "$LOG_FILE"
    rm "$LOG_DIR/backend.pid"
else
    echo "$(date): No backend PID file found" | tee -a "$LOG_FILE"
fi

# Stop Frontend
if [ -f "$LOG_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$LOG_DIR/frontend.pid")
    echo "$(date): Stopping Frontend (PID: $FRONTEND_PID)..." | tee -a "$LOG_FILE"
    kill $FRONTEND_PID 2>/dev/null || echo "$(date): Frontend already stopped" | tee -a "$LOG_FILE"
    rm "$LOG_DIR/frontend.pid"
else
    echo "$(date): No frontend PID file found" | tee -a "$LOG_FILE"
fi

# Kill any remaining uvicorn/node processes (cleanup)
echo "$(date): Cleaning up any remaining processes..." | tee -a "$LOG_FILE"
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): ACe_Toolkit Shutdown Complete" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
