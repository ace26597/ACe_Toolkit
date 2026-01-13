#!/bin/bash
# Tmux-based startup script for ACe_Toolkit
# Creates a visible tmux session with separate panes for backend, frontend, and logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname $(dirname $SCRIPT_DIR))"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

SESSION_NAME="acetoolkit"

# Check if tmux session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists. Attaching..."
    tmux attach-session -t $SESSION_NAME
    exit 0
fi

echo "Creating tmux session '$SESSION_NAME'..."

# Wait for network
sleep 10

# Create new tmux session with backend
tmux new-session -d -s $SESSION_NAME -n "ACe_Toolkit"

# Split window into 3 panes
tmux split-window -h -t $SESSION_NAME:0
tmux split-window -v -t $SESSION_NAME:0.1

# Pane 0 (left): Backend
tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_DIR/apps/api" C-m
tmux send-keys -t $SESSION_NAME:0.0 "source .venv/bin/activate" C-m
tmux send-keys -t $SESSION_NAME:0.0 "clear" C-m
tmux send-keys -t $SESSION_NAME:0.0 "echo '==================================='" C-m
tmux send-keys -t $SESSION_NAME:0.0 "echo '  ACe_Toolkit Backend (FastAPI)'" C-m
tmux send-keys -t $SESSION_NAME:0.0 "echo '  Port: 8000'" C-m
tmux send-keys -t $SESSION_NAME:0.0 "echo '==================================='" C-m
tmux send-keys -t $SESSION_NAME:0.0 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:0.0 "uvicorn app.main:app --host 0.0.0.0 --port 8000" C-m

# Pane 1 (top right): Frontend
tmux send-keys -t $SESSION_NAME:0.1 "cd $PROJECT_DIR/apps/web" C-m
tmux send-keys -t $SESSION_NAME:0.1 "clear" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo '==================================='" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo '  ACe_Toolkit Frontend (Next.js)'" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo '  Port: 3000'" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo '==================================='" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:0.1 "echo 'Building application...'" C-m
tmux send-keys -t $SESSION_NAME:0.1 "npm run build && npm start" C-m

# Pane 2 (bottom right): Status & Logs
tmux send-keys -t $SESSION_NAME:0.2 "cd $PROJECT_DIR" C-m
tmux send-keys -t $SESSION_NAME:0.2 "clear" C-m
tmux send-keys -t $SESSION_NAME:0.2 "sleep 5" C-m
tmux send-keys -t $SESSION_NAME:0.2 "./infra/scripts/status.sh" C-m

# Set pane titles
tmux select-pane -t $SESSION_NAME:0.0 -T "Backend"
tmux select-pane -t $SESSION_NAME:0.1 -T "Frontend"
tmux select-pane -t $SESSION_NAME:0.2 -T "Status"

# Select the status pane by default
tmux select-pane -t $SESSION_NAME:0.2

echo "Tmux session created successfully!"
echo "Attach with: tmux attach-session -t $SESSION_NAME"
echo ""
echo "Tmux commands:"
echo "  Ctrl+b, arrow keys - Switch panes"
echo "  Ctrl+b, d - Detach (keeps running)"
echo "  Ctrl+b, [ - Scroll mode (q to exit)"
echo "  Ctrl+b, : - Command mode"
