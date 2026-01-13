#!/bin/bash
# Status check script for ACe_Toolkit
# Shows running status, URLs, IPs, and recent errors

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../.. && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         ACe_Toolkit - System Status Dashboard             ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}📅 Date:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ==================== Service Status ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔧 Service Status${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    BACKEND_PID=$(pgrep -f "uvicorn app.main:app")
    echo -e "Backend (FastAPI):   ${GREEN}✓ RUNNING${NC} (PID: $BACKEND_PID)"
else
    echo -e "Backend (FastAPI):   ${RED}✗ NOT RUNNING${NC}"
fi

# Frontend
if pgrep -f "next-server" > /dev/null; then
    FRONTEND_PID=$(pgrep -f "next-server")
    echo -e "Frontend (Next.js):  ${GREEN}✓ RUNNING${NC} (PID: $FRONTEND_PID)"
else
    echo -e "Frontend (Next.js):  ${RED}✗ NOT RUNNING${NC}"
fi

# Cloudflare Tunnel
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    echo -e "Cloudflare Tunnel:   ${GREEN}✓ RUNNING${NC}"
else
    echo -e "Cloudflare Tunnel:   ${RED}✗ NOT RUNNING${NC}"
fi

echo ""

# ==================== Network Information ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🌐 Network Information${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "Local IP:            ${BLUE}$LOCAL_IP${NC}"

# Public IP (if available)
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "N/A")
echo -e "Public IP:           ${BLUE}$PUBLIC_IP${NC}"

# Hostname
HOSTNAME=$(hostname)
echo -e "Hostname:            ${BLUE}$HOSTNAME${NC}"

echo ""

# ==================== Access URLs ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔗 Access URLs${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${BOLD}Local Access:${NC}"
echo -e "  Backend:           ${BLUE}http://localhost:8000${NC}"
echo -e "  Backend API Docs:  ${BLUE}http://localhost:8000/docs${NC}"
echo -e "  Frontend:          ${BLUE}http://localhost:3000${NC}"
echo -e "  Mermaid Editor:    ${BLUE}http://localhost:3000/mermaid${NC}"
echo -e "  Notes:             ${BLUE}http://localhost:3000/notes${NC}"
echo ""
echo -e "${BOLD}Network Access:${NC}"
echo -e "  Backend:           ${BLUE}http://$LOCAL_IP:8000${NC}"
echo -e "  Frontend:          ${BLUE}http://$LOCAL_IP:3000${NC}"

# Cloudflare URLs (if configured)
if [ -f "$HOME/.cloudflared/config.yml" ]; then
    echo ""
    echo -e "${BOLD}Cloudflare Tunnel:${NC}"
    # Extract hostnames from config
    HOSTNAMES=$(grep "hostname:" "$HOME/.cloudflared/config.yml" | awk '{print $2}' | sed 's/://g')
    if [ -n "$HOSTNAMES" ]; then
        while IFS= read -r hostname; do
            echo -e "  ${GREEN}https://$hostname${NC}"
        done <<< "$HOSTNAMES"
    else
        echo -e "  ${YELLOW}No hostnames configured${NC}"
    fi
fi

echo ""

# ==================== Quick Health Check ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}💊 Health Check${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend health
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "Backend Health:      ${GREEN}✓ HEALTHY${NC}"
else
    echo -e "Backend Health:      ${RED}✗ UNHEALTHY${NC}"
fi

# Frontend health
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "Frontend Health:     ${GREEN}✓ HEALTHY${NC}"
else
    echo -e "Frontend Health:     ${RED}✗ UNHEALTHY${NC}"
fi

# Cloudflare tunnel health
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    # Check if tunnel is actually connected
    if sudo journalctl -u cloudflared -n 20 | grep -q "Connection.*registered"; then
        echo -e "Tunnel Health:       ${GREEN}✓ CONNECTED${NC}"
    else
        echo -e "Tunnel Health:       ${YELLOW}⚠ STARTING${NC}"
    fi
else
    echo -e "Tunnel Health:       ${RED}✗ NOT RUNNING${NC}"
fi

echo ""

# ==================== Recent Errors ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}⚠️  Recent Errors (Last 5)${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend errors
if [ -f "$LOG_DIR/backend-$(date +%Y%m%d).log" ]; then
    BACKEND_ERRORS=$(grep -i "error\|exception\|traceback" "$LOG_DIR/backend-$(date +%Y%m%d).log" 2>/dev/null | tail -3)
    if [ -n "$BACKEND_ERRORS" ]; then
        echo -e "${RED}Backend:${NC}"
        echo "$BACKEND_ERRORS" | sed 's/^/  /'
    else
        echo -e "${GREEN}Backend: No errors${NC}"
    fi
else
    echo -e "${YELLOW}Backend: No log file found${NC}"
fi

# Frontend errors
if [ -f "$LOG_DIR/frontend-$(date +%Y%m%d).log" ]; then
    FRONTEND_ERRORS=$(grep -i "error\|exception\|failed" "$LOG_DIR/frontend-$(date +%Y%m%d).log" 2>/dev/null | tail -3)
    if [ -n "$FRONTEND_ERRORS" ]; then
        echo -e "${RED}Frontend:${NC}"
        echo "$FRONTEND_ERRORS" | sed 's/^/  /'
    else
        echo -e "${GREEN}Frontend: No errors${NC}"
    fi
else
    echo -e "${YELLOW}Frontend: No log file found${NC}"
fi

# Cloudflare errors
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    TUNNEL_ERRORS=$(sudo journalctl -u cloudflared -n 50 --no-pager 2>/dev/null | grep -i "error\|failed" | tail -3)
    if [ -n "$TUNNEL_ERRORS" ]; then
        echo -e "${RED}Cloudflare Tunnel:${NC}"
        echo "$TUNNEL_ERRORS" | sed 's/^/  /'
    else
        echo -e "${GREEN}Cloudflare Tunnel: No errors${NC}"
    fi
fi

echo ""

# ==================== System Resources ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}💻 System Resources${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CPU Load
LOAD=$(uptime | awk -F'load average:' '{print $2}')
echo -e "CPU Load:           $LOAD"

# Memory
MEM=$(free -h | awk '/^Mem:/ {print $3 "/" $2}')
echo -e "Memory Usage:        $MEM"

# Disk
DISK=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
echo -e "Disk Usage:          $DISK"

# Uptime
UPTIME=$(uptime -p | sed 's/up //')
echo -e "System Uptime:       $UPTIME"

echo ""

# ==================== Quick Commands ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🎮 Quick Commands${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BLUE}./infra/scripts/start_all.sh${NC}       - Start all services"
echo -e "  ${BLUE}./infra/scripts/stop_all.sh${NC}        - Stop all services"
echo -e "  ${BLUE}./infra/scripts/status.sh${NC}          - Show this status"
echo -e "  ${BLUE}tmux attach -t acetoolkit${NC}          - Attach to tmux session"
echo -e "  ${BLUE}sudo systemctl restart cloudflared${NC} - Restart tunnel"
echo ""

# Auto-refresh option
if [ "$1" != "--once" ]; then
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit | Auto-refresh in 30 seconds...${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    sleep 30
    exec "$0" "$@"
fi
