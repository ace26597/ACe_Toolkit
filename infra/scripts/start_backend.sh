#!/bin/bash
# Backend startup script for ACe_Toolkit
# Starts FastAPI server in production mode

set -e

# Configuration
PROJECT_DIR="/Users/blest/dev/ACe_Toolkit"
API_DIR="$PROJECT_DIR/apps/api"
LOG_DIR="$PROJECT_DIR/logs"
VENV_PATH="$API_DIR/.venv"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log file with timestamp
LOG_FILE="$LOG_DIR/backend-$(date +%Y%m%d).log"

echo "$(date): Starting ACe_Toolkit Backend..." | tee -a "$LOG_FILE"

# Navigate to API directory
cd "$API_DIR"

# Check if virtual environment exists
if [ ! -d "$VENV_PATH" ]; then
    echo "$(date): ERROR - Virtual environment not found at $VENV_PATH" | tee -a "$LOG_FILE"
    echo "$(date): Please run: cd $API_DIR && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" | tee -a "$LOG_FILE"
    exit 1
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Add uv/uvx to PATH for scientific skills MCP server
export PATH="$HOME/.local/bin:$PATH"

# Start uvicorn in production mode (no --reload)
echo "$(date): Starting uvicorn on port 8000..." | tee -a "$LOG_FILE"
uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "$LOG_FILE" 2>&1 &

# Save PID
echo $! > "$LOG_DIR/backend.pid"
echo "$(date): Backend started with PID $(cat $LOG_DIR/backend.pid)" | tee -a "$LOG_FILE"
