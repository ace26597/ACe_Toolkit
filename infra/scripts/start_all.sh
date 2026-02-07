#!/bin/bash
# Master startup script for BlestLabs
# Starts both backend and frontend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$(dirname $(dirname $SCRIPT_DIR))/logs"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/startup-$(date +%Y%m%d).log"

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): BlestLabs Startup Initiated" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Wait for network to be ready (important for boot startup)
echo "$(date): Waiting for network..." | tee -a "$LOG_FILE"
sleep 10

# Start Backend
echo "$(date): Starting Backend..." | tee -a "$LOG_FILE"
bash "$SCRIPT_DIR/start_backend.sh"
sleep 5

# Start Frontend
echo "$(date): Starting Frontend..." | tee -a "$LOG_FILE"
bash "$SCRIPT_DIR/start_frontend.sh"
sleep 5

# Check Cloudflared status (macOS compatible)
echo "$(date): Checking Cloudflare Tunnel status..." | tee -a "$LOG_FILE"
if pgrep -x cloudflared > /dev/null; then
    echo "$(date): Cloudflare Tunnel is running" | tee -a "$LOG_FILE"
else
    echo "$(date): WARNING - Cloudflare Tunnel is not running!" | tee -a "$LOG_FILE"
    echo "$(date): Start it with: /opt/homebrew/bin/cloudflared tunnel run" | tee -a "$LOG_FILE"
fi

echo "========================================" | tee -a "$LOG_FILE"
echo "$(date): BlestLabs Startup Complete" | tee -a "$LOG_FILE"
echo "$(date): Backend: http://localhost:8000" | tee -a "$LOG_FILE"
echo "$(date): Frontend: http://localhost:3000" | tee -a "$LOG_FILE"
echo "$(date): Logs: $LOG_DIR" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
