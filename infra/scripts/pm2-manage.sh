#!/bin/bash
# PM2 Service Manager for ACe_Toolkit
# Simple wrapper for common PM2 operations

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

PROJECT_DIR="/Users/blest/dev/ACe_Toolkit"

show_help() {
    echo -e "${BOLD}ACe_Toolkit PM2 Manager${NC}"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo "  status      Show status of all services"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Tail all logs (Ctrl+C to exit)"
    echo "  logs-be     Tail backend logs only"
    echo "  logs-fe     Tail frontend logs only"
    echo "  monit       Real-time monitoring dashboard"
    echo "  health      Check health of all services"
    echo "  save        Save current state for boot"
    echo ""
}

check_health() {
    echo -e "${BOLD}Health Check${NC}"
    echo ""

    # Backend
    if curl -s --max-time 3 http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "Backend (8000):    ${GREEN}✓ HEALTHY${NC}"
    else
        echo -e "Backend (8000):    ${RED}✗ UNHEALTHY${NC}"
    fi

    # Frontend
    if curl -s --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
        echo -e "Frontend (3000):   ${GREEN}✓ HEALTHY${NC}"
    else
        echo -e "Frontend (3000):   ${RED}✗ UNHEALTHY${NC}"
    fi

    # Production (via tunnel)
    if curl -s --max-time 5 https://api.orpheuscore.uk/docs > /dev/null 2>&1; then
        echo -e "Production:        ${GREEN}✓ REACHABLE${NC}"
    else
        echo -e "Production:        ${YELLOW}⚠ UNREACHABLE${NC}"
    fi

    echo ""
}

case "$1" in
    status|"")
        pm2 status
        echo ""
        check_health
        ;;
    start)
        pm2 start "$PROJECT_DIR/ecosystem.config.js"
        pm2 save
        ;;
    stop)
        pm2 stop all
        ;;
    restart)
        pm2 restart all
        pm2 save
        ;;
    logs)
        pm2 logs
        ;;
    logs-be)
        pm2 logs backend
        ;;
    logs-fe)
        pm2 logs frontend
        ;;
    monit)
        pm2 monit
        ;;
    health)
        check_health
        ;;
    save)
        pm2 save
        echo -e "${GREEN}State saved. Will restore on next boot.${NC}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
