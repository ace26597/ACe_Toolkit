#!/bin/bash
# Development startup script for ACe_Toolkit
# Starts both backend and frontend with live reload and detailed logging

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

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log files with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKEND_LOG="$LOG_DIR/backend-dev-$TIMESTAMP.log"
FRONTEND_LOG="$LOG_DIR/frontend-dev-$TIMESTAMP.log"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ACe_Toolkit Development Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid
        sleep 2
    fi
}

# Check and clean ports
echo -e "${YELLOW}Checking ports...${NC}"
if check_port 8000; then
    echo -e "${YELLOW}Port 8000 is in use${NC}"
    kill_port 8000
fi

if check_port 3000; then
    echo -e "${YELLOW}Port 3000 is in use${NC}"
    kill_port 3000
fi

echo ""

# Start Backend
echo -e "${BLUE}[1/2] Starting Backend (FastAPI)${NC}"
echo -e "      Log file: $BACKEND_LOG"

cd "$API_DIR"

# Check virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}ERROR: Virtual environment not found at $VENV_PATH${NC}"
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source "$VENV_PATH/bin/activate"
fi

# Add uv/uvx to PATH for scientific skills
export PATH="$HOME/.local/bin:$PATH"

# Check environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"
if [ -f "$API_DIR/.env" ]; then
    if grep -q "OPENAI_API_KEY" "$API_DIR/.env"; then
        echo -e "${GREEN}✓ OPENAI_API_KEY configured${NC}"
    else
        echo -e "${YELLOW}⚠ OPENAI_API_KEY not set in .env${NC}"
    fi

    if grep -q "ANTHROPIC_API_KEY" "$API_DIR/.env"; then
        echo -e "${GREEN}✓ ANTHROPIC_API_KEY configured${NC}"
    else
        echo -e "${YELLOW}⚠ ANTHROPIC_API_KEY not set in .env${NC}"
    fi

    if grep -q "TAVILY_API_KEY" "$API_DIR/.env"; then
        echo -e "${GREEN}✓ TAVILY_API_KEY configured${NC}"
    else
        echo -e "${YELLOW}⚠ TAVILY_API_KEY not set in .env (Research Assistant features may be limited)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No .env file found. Copy .env.example to .env and configure API keys${NC}"
fi

echo ""
echo -e "${GREEN}Starting uvicorn on port 8000 with auto-reload...${NC}"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend-dev.pid"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend started successfully (PID: $BACKEND_PID)${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}✗ Backend failed to start. Check logs: tail -f $BACKEND_LOG${NC}"
        exit 1
    fi
    sleep 1
    echo -n "."
done

echo ""
echo ""

# Start Frontend
echo -e "${BLUE}[2/2] Starting Frontend (Next.js)${NC}"
echo -e "      Log file: $FRONTEND_LOG"

cd "$WEB_DIR"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found, running npm install...${NC}"
    npm install
fi

# Check environment variables
if [ -f "$WEB_DIR/.env.local" ]; then
    echo -e "${GREEN}✓ Frontend environment configured${NC}"
else
    echo -e "${YELLOW}⚠ No .env.local file found${NC}"
fi

echo ""
echo -e "${GREEN}Starting Next.js dev server on port 3000...${NC}"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend-dev.pid"

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Frontend failed to start. Check logs: tail -f $FRONTEND_LOG${NC}"
        kill $BACKEND_PID
        exit 1
    fi
    sleep 1
    echo -n "."
done

echo ""
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ ACe_Toolkit Started Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:8000"
echo -e "  ${GREEN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo -e "${BLUE}Process IDs:${NC}"
echo -e "  Backend: $BACKEND_PID"
echo -e "  Frontend: $FRONTEND_PID"
echo ""
echo -e "${BLUE}Log Files:${NC}"
echo -e "  Backend: $BACKEND_LOG"
echo -e "  Frontend: $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}To view logs in real-time:${NC}"
echo -e "  Backend:  tail -f $BACKEND_LOG"
echo -e "  Frontend: tail -f $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}To stop services:${NC}"
echo -e "  Kill backend:  kill $BACKEND_PID"
echo -e "  Kill frontend: kill $FRONTEND_PID"
echo -e "  Or run: $PROJECT_DIR/infra/scripts/stop_all.sh"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop monitoring (services will continue running)${NC}"
echo ""

# Monitor logs in the foreground
tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
