#!/bin/bash
# Frontend startup script for ACe_Toolkit
# Builds and starts Next.js server in production mode

set -e

# Configuration
PROJECT_DIR="/Users/blest/dev/ACe_Toolkit"
WEB_DIR="$PROJECT_DIR/apps/web"
LOG_DIR="$PROJECT_DIR/logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file with timestamp
LOG_FILE="$LOG_DIR/frontend-$(date +%Y%m%d).log"

echo "$(date): Starting ACe_Toolkit Frontend..." | tee -a "$LOG_FILE"

# Navigate to web directory
cd "$WEB_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "$(date): node_modules not found, running npm install..." | tee -a "$LOG_FILE"
    npm install >> "$LOG_FILE" 2>&1
fi

# Build the Next.js app (if not already built or if source changed)
echo "$(date): Building Next.js application..." | tee -a "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1

# Start Next.js in production mode
echo "$(date): Starting Next.js server on port 3000..." | tee -a "$LOG_FILE"
npm start >> "$LOG_FILE" 2>&1 &

# Save PID
echo $! > "$LOG_DIR/frontend.pid"
echo "$(date): Frontend started with PID $(cat $LOG_DIR/frontend.pid)" | tee -a "$LOG_FILE"
