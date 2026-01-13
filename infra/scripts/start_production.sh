#!/bin/bash
# Production startup script for ACe_Toolkit
# Starts both backend and frontend in production mode with robust logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ace/dev/ACe_Toolkit"
API_DIR="$PROJECT_DIR/apps/api"
WEB_DIR="$PROJECT_DIR/apps/web"
LOG_DIR="$PROJECT_DIR/logs"
VENV_PATH="$API_DIR/.venv"

# Create log directory
mkdir -p "$LOG_DIR"

# Log files with date (rotated daily)
DATE=$(date +%Y%m%d)
BACKEND_LOG="$LOG_DIR/backend-prod-$DATE.log"
FRONTEND_LOG="$LOG_DIR/frontend-prod-$DATE.log"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ACe_Toolkit Production Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_DIR/startup.log"
}

# Check if services are already running
if [ -f "$LOG_DIR/backend-prod.pid" ]; then
    PID=$(cat "$LOG_DIR/backend-prod.pid")
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Backend is already running (PID: $PID)${NC}"
        echo -e "${YELLOW}Stop it first with: kill $PID${NC}"
        exit 1
    fi
fi

if [ -f "$LOG_DIR/frontend-prod.pid" ]; then
    PID=$(cat "$LOG_DIR/frontend-prod.pid")
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Frontend is already running (PID: $PID)${NC}"
        echo -e "${YELLOW}Stop it first with: kill $PID${NC}"
        exit 1
    fi
fi

# Start Backend
log "Starting Backend (FastAPI - Production Mode)"
echo -e "${BLUE}[1/2] Starting Backend${NC}"
echo -e "      Log: $BACKEND_LOG"

cd "$API_DIR"

# Verify virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}ERROR: Virtual environment not found${NC}"
    echo -e "${YELLOW}Please run setup first:${NC}"
    echo "  cd $API_DIR"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

source "$VENV_PATH/bin/activate"

# Add uv/uvx to PATH
export PATH="$HOME/.local/bin:$PATH"

# Verify environment
if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${RED}ERROR: .env file not found${NC}"
    echo -e "${YELLOW}Copy .env.example to .env and configure API keys${NC}"
    exit 1
fi

# Start uvicorn (production mode - no reload)
log "Starting uvicorn on 0.0.0.0:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend-prod.pid"

# Wait for backend
echo -e "${YELLOW}Waiting for backend...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        log "Backend started successfully (PID: $BACKEND_PID)"
        echo -e "${GREEN}✓ Backend running${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        log "ERROR: Backend failed to start"
        echo -e "${RED}✗ Backend failed. Check: tail -f $BACKEND_LOG${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Start Frontend
log "Starting Frontend (Next.js - Production Mode)"
echo -e "${BLUE}[2/2] Starting Frontend${NC}"
echo -e "      Log: $FRONTEND_LOG"

cd "$WEB_DIR"

# Verify node_modules
if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies"
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build if needed
if [ ! -d ".next" ]; then
    log "Building Next.js application"
    echo -e "${YELLOW}Building application...${NC}"
    npm run build
fi

# Start Next.js production server
log "Starting Next.js on 0.0.0.0:3000"
npm start >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend-prod.pid"

# Wait for frontend
echo -e "${YELLOW}Waiting for frontend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        log "Frontend started successfully (PID: $FRONTEND_PID)"
        echo -e "${GREEN}✓ Frontend running${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        log "ERROR: Frontend failed to start"
        echo -e "${RED}✗ Frontend failed. Check: tail -f $FRONTEND_LOG${NC}"
        kill $BACKEND_PID
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Production Services Running${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo -e "  Local:    http://localhost:3000"
echo -e "  Network:  http://$(hostname -I | awk '{print $1}'):3000"
echo -e "  API:      http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "${BLUE}Process IDs:${NC}"
echo -e "  Backend:  $BACKEND_PID (saved to $LOG_DIR/backend-prod.pid)"
echo -e "  Frontend: $FRONTEND_PID (saved to $LOG_DIR/frontend-prod.pid)"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend:  tail -f $BACKEND_LOG"
echo -e "  Frontend: tail -f $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}To stop:${NC}"
echo -e "  $PROJECT_DIR/infra/scripts/stop_all.sh"
echo ""

log "All services started successfully"
