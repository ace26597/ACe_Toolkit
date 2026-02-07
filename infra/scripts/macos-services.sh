#!/bin/bash
# macOS Service Management for ACe_Toolkit
# Uses launchd for proper service management

BACKEND_PLIST="uk.orpheuscore.ace-toolkit-backend"
FRONTEND_PLIST="uk.orpheuscore.ace-toolkit-frontend"
PLIST_DIR="$HOME/Library/LaunchAgents"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "ACe_Toolkit macOS Service Manager"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|load|unload|logs}"
    echo ""
    echo "Commands:"
    echo "  start    - Start both backend and frontend services"
    echo "  stop     - Stop both services"
    echo "  restart  - Restart both services"
    echo "  status   - Show service status"
    echo "  load     - Load services (enable auto-start)"
    echo "  unload   - Unload services (disable auto-start)"
    echo "  logs     - Tail service logs"
    exit 1
}

check_plist() {
    if [[ ! -f "$PLIST_DIR/$BACKEND_PLIST.plist" ]]; then
        echo -e "${RED}Error: Backend plist not found${NC}"
        echo "Expected: $PLIST_DIR/$BACKEND_PLIST.plist"
        return 1
    fi
    if [[ ! -f "$PLIST_DIR/$FRONTEND_PLIST.plist" ]]; then
        echo -e "${RED}Error: Frontend plist not found${NC}"
        echo "Expected: $PLIST_DIR/$FRONTEND_PLIST.plist"
        return 1
    fi
    return 0
}

start_services() {
    echo "Starting ACe_Toolkit services..."
    launchctl start $BACKEND_PLIST 2>/dev/null || echo -e "${YELLOW}Backend may already be running${NC}"
    launchctl start $FRONTEND_PLIST 2>/dev/null || echo -e "${YELLOW}Frontend may already be running${NC}"
    sleep 2
    show_status
}

stop_services() {
    echo "Stopping ACe_Toolkit services..."
    launchctl stop $BACKEND_PLIST 2>/dev/null
    launchctl stop $FRONTEND_PLIST 2>/dev/null
    # Also kill any orphaned processes
    lsof -ti :8000 | xargs kill 2>/dev/null
    lsof -ti :3000 | xargs kill 2>/dev/null
    echo -e "${GREEN}Services stopped${NC}"
}

restart_services() {
    stop_services
    sleep 2
    start_services
}

show_status() {
    echo ""
    echo "=== ACe_Toolkit Service Status ==="
    echo ""

    # Check backend
    if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
        BACKEND_PID=$(lsof -ti :8000)
        echo -e "Backend (port 8000):  ${GREEN}RUNNING${NC} (PID: $BACKEND_PID)"
    else
        echo -e "Backend (port 8000):  ${RED}STOPPED${NC}"
    fi

    # Check frontend
    if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
        FRONTEND_PID=$(lsof -ti :3000)
        echo -e "Frontend (port 3000): ${GREEN}RUNNING${NC} (PID: $FRONTEND_PID)"
    else
        echo -e "Frontend (port 3000): ${RED}STOPPED${NC}"
    fi

    # Check launchd status
    echo ""
    echo "Launchd status:"
    launchctl list | grep -E "orpheuscore|ace-toolkit" || echo "  (no services loaded)"
    echo ""
}

load_services() {
    check_plist || exit 1
    echo "Loading services (enabling auto-start)..."
    launchctl load "$PLIST_DIR/$BACKEND_PLIST.plist" 2>/dev/null && echo -e "  ${GREEN}Backend loaded${NC}"
    launchctl load "$PLIST_DIR/$FRONTEND_PLIST.plist" 2>/dev/null && echo -e "  ${GREEN}Frontend loaded${NC}"
    echo ""
    echo "Services will now start automatically on login."
}

unload_services() {
    echo "Unloading services (disabling auto-start)..."
    launchctl unload "$PLIST_DIR/$BACKEND_PLIST.plist" 2>/dev/null && echo -e "  ${GREEN}Backend unloaded${NC}"
    launchctl unload "$PLIST_DIR/$FRONTEND_PLIST.plist" 2>/dev/null && echo -e "  ${GREEN}Frontend unloaded${NC}"
    echo ""
    echo "Services will no longer start automatically."
}

show_logs() {
    LOG_DIR="/Users/blest/dev/ACe_Toolkit/logs"
    echo "Tailing logs (Ctrl+C to exit)..."
    echo ""
    tail -f "$LOG_DIR/backend-launchd.log" "$LOG_DIR/frontend-launchd.log" 2>/dev/null || \
        tail -f "$LOG_DIR"/*.log 2>/dev/null
}

# Main
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    load)
        load_services
        ;;
    unload)
        unload_services
        ;;
    logs)
        show_logs
        ;;
    *)
        usage
        ;;
esac
