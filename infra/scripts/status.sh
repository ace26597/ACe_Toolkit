#!/bin/bash
# Status check script for ACe_Toolkit
# Works on both macOS and Linux

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../.. && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

# Detect OS
IS_MACOS=false
if [[ "$(uname)" == "Darwin" ]]; then
    IS_MACOS=true
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           ACe_Toolkit - System Status Dashboard            ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}📅 Date:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
if $IS_MACOS; then
    echo -e "${BOLD}🖥  Platform:${NC} macOS ($(uname -m))"
else
    echo -e "${BOLD}🖥  Platform:${NC} Linux ($(uname -m))"
fi
echo ""

# ==================== Service Status ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔧 Service Status${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend - check port 8000
if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
    BACKEND_PID=$(lsof -ti :8000 2>/dev/null | head -1)
    echo -e "Backend (FastAPI):   ${GREEN}✓ RUNNING${NC} (PID: $BACKEND_PID)"
else
    echo -e "Backend (FastAPI):   ${RED}✗ NOT RUNNING${NC}"
fi

# Frontend - check port 3000
if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
    FRONTEND_PID=$(lsof -ti :3000 2>/dev/null | head -1)
    echo -e "Frontend (Next.js):  ${GREEN}✓ RUNNING${NC} (PID: $FRONTEND_PID)"
else
    echo -e "Frontend (Next.js):  ${RED}✗ NOT RUNNING${NC}"
fi

# Cloudflare Tunnel
if $IS_MACOS; then
    # macOS: check process
    if pgrep -x cloudflared >/dev/null 2>&1; then
        echo -e "Cloudflare Tunnel:   ${GREEN}✓ RUNNING${NC}"
    else
        echo -e "Cloudflare Tunnel:   ${RED}✗ NOT RUNNING${NC}"
    fi
else
    # Linux: check systemd
    if systemctl is-active --quiet cloudflared 2>/dev/null; then
        echo -e "Cloudflare Tunnel:   ${GREEN}✓ RUNNING${NC}"
    else
        echo -e "Cloudflare Tunnel:   ${RED}✗ NOT RUNNING${NC}"
    fi
fi

echo ""

# ==================== Network Information ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🌐 Network Information${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Local IP
if $IS_MACOS; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "N/A")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "N/A")
fi
echo -e "Local IP:            ${BLUE}$LOCAL_IP${NC}"

# Public IP (if available)
PUBLIC_IP=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || echo "N/A")
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
echo -e "  Workspace:         ${BLUE}http://localhost:3000/workspace${NC}"
echo -e "  Data Studio:       ${BLUE}http://localhost:3000/data-studio${NC}"
echo ""
echo -e "${BOLD}Network Access:${NC}"
echo -e "  Backend:           ${BLUE}http://$LOCAL_IP:8000${NC}"
echo -e "  Frontend:          ${BLUE}http://$LOCAL_IP:3000${NC}"

# Cloudflare URLs
echo ""
echo -e "${BOLD}Production (Cloudflare):${NC}"
echo -e "  ${GREEN}https://orpheuscore.uk${NC}"
echo -e "  ${GREEN}https://api.orpheuscore.uk${NC}"

echo ""

# ==================== Quick Health Check ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}💊 Health Check${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend health
if curl -s --max-time 3 http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "Backend Health:      ${GREEN}✓ HEALTHY${NC}"
else
    echo -e "Backend Health:      ${RED}✗ UNHEALTHY${NC}"
fi

# Frontend health
if curl -s --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
    echo -e "Frontend Health:     ${GREEN}✓ HEALTHY${NC}"
else
    echo -e "Frontend Health:     ${RED}✗ UNHEALTHY${NC}"
fi

# Cloudflare production health
if curl -s --max-time 5 https://api.orpheuscore.uk/docs > /dev/null 2>&1; then
    echo -e "Production Health:   ${GREEN}✓ REACHABLE${NC}"
else
    echo -e "Production Health:   ${YELLOW}⚠ UNREACHABLE${NC}"
fi

echo ""

# ==================== System Resources ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}💻 System Resources${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# CPU Load
if $IS_MACOS; then
    LOAD=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2", "$3", "$4}' || uptime | awk -F'load averages:' '{print $2}')
else
    LOAD=$(uptime | awk -F'load average:' '{print $2}')
fi
echo -e "CPU Load:           $LOAD"

# Memory
if $IS_MACOS; then
    # macOS memory info
    PAGE_SIZE=$(sysctl -n hw.pagesize)
    PAGES_FREE=$(vm_stat | awk '/Pages free/ {gsub(/\./, "", $3); print $3}')
    PAGES_ACTIVE=$(vm_stat | awk '/Pages active/ {gsub(/\./, "", $3); print $3}')
    PAGES_INACTIVE=$(vm_stat | awk '/Pages inactive/ {gsub(/\./, "", $3); print $3}')
    PAGES_WIRED=$(vm_stat | awk '/Pages wired/ {gsub(/\./, "", $4); print $4}')
    TOTAL_MEM=$(sysctl -n hw.memsize)
    TOTAL_GB=$(echo "scale=1; $TOTAL_MEM / 1024 / 1024 / 1024" | bc)
    USED_PAGES=$((PAGES_ACTIVE + PAGES_WIRED))
    USED_GB=$(echo "scale=1; $USED_PAGES * $PAGE_SIZE / 1024 / 1024 / 1024" | bc)
    echo -e "Memory Usage:        ${USED_GB}GB / ${TOTAL_GB}GB"
else
    MEM=$(free -h | awk '/^Mem:/ {print $3 "/" $2}')
    echo -e "Memory Usage:        $MEM"
fi

# Disk - SSD
if $IS_MACOS; then
    if [ -d "/Volumes/T7" ]; then
        SSD_USAGE=$(df -h "/Volumes/T7" | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
        echo -e "SSD (T7):            $SSD_USAGE"
    fi
    ROOT_USAGE=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo -e "System Disk:         $ROOT_USAGE"
else
    DISK=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo -e "Disk Usage:          $DISK"
fi

# Uptime
if $IS_MACOS; then
    BOOT_TIME=$(sysctl -n kern.boottime | awk -F'sec = ' '{print $2}' | awk -F',' '{print $1}')
    NOW=$(date +%s)
    UPTIME_SECS=$((NOW - BOOT_TIME))
    UPTIME_DAYS=$((UPTIME_SECS / 86400))
    UPTIME_HOURS=$(((UPTIME_SECS % 86400) / 3600))
    UPTIME="${UPTIME_DAYS}d ${UPTIME_HOURS}h"
else
    UPTIME=$(uptime -p 2>/dev/null | sed 's/up //' || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')
fi
echo -e "System Uptime:       $UPTIME"

echo ""

# ==================== Quick Commands ====================
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🎮 Quick Commands${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if $IS_MACOS; then
    echo -e "  ${BLUE}./infra/scripts/macos-services.sh start${NC}   - Start services"
    echo -e "  ${BLUE}./infra/scripts/macos-services.sh stop${NC}    - Stop services"
    echo -e "  ${BLUE}./infra/scripts/macos-services.sh status${NC}  - Detailed status"
    echo -e "  ${BLUE}./infra/scripts/macos-services.sh logs${NC}    - Tail logs"
else
    echo -e "  ${BLUE}./infra/scripts/start_all.sh${NC}       - Start all services"
    echo -e "  ${BLUE}./infra/scripts/stop_all.sh${NC}        - Stop all services"
    echo -e "  ${BLUE}sudo systemctl restart cloudflared${NC} - Restart tunnel"
fi
echo ""

# Auto-refresh option
if [ "$1" != "--once" ]; then
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit | Auto-refresh in 30 seconds...${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    sleep 30
    exec "$0" "$@"
fi
