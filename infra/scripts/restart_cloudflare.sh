#!/bin/bash
# Restart Cloudflare Tunnel to apply configuration changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Cloudflare Tunnel Restart${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}ERROR: cloudflared is not installed${NC}"
    echo -e "${YELLOW}Install with: sudo apt install cloudflared${NC}"
    exit 1
fi

# Check if config exists
if [ ! -f "$HOME/.cloudflared/config.yml" ]; then
    echo -e "${RED}ERROR: Cloudflare config not found${NC}"
    echo -e "${YELLOW}Expected: $HOME/.cloudflared/config.yml${NC}"
    exit 1
fi

echo -e "${YELLOW}Current configuration:${NC}"
cat "$HOME/.cloudflared/config.yml"
echo ""

# Check if running as systemd service
if systemctl is-active --quiet cloudflared; then
    echo -e "${YELLOW}Cloudflare is running as systemd service${NC}"
    echo -e "${BLUE}Restarting cloudflared service...${NC}"
    sudo systemctl restart cloudflared
    sleep 2

    if systemctl is-active --quiet cloudflared; then
        echo -e "${GREEN}✓ Cloudflared service restarted successfully${NC}"
    else
        echo -e "${RED}✗ Failed to restart service${NC}"
        echo -e "${YELLOW}Check status: sudo systemctl status cloudflared${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Cloudflared is not running as systemd service${NC}"

    # Check if running as process
    if pgrep -x "cloudflared" > /dev/null; then
        echo -e "${BLUE}Stopping existing cloudflared process...${NC}"
        pkill -x cloudflared
        sleep 2
    fi

    echo -e "${BLUE}Starting cloudflared tunnel...${NC}"
    nohup cloudflared tunnel run > /tmp/cloudflared.log 2>&1 &
    sleep 3

    if pgrep -x "cloudflared" > /dev/null; then
        echo -e "${GREEN}✓ Cloudflared tunnel started successfully${NC}"
        echo -e "${YELLOW}Logs: tail -f /tmp/cloudflared.log${NC}"
    else
        echo -e "${RED}✗ Failed to start tunnel${NC}"
        echo -e "${YELLOW}Check logs: cat /tmp/cloudflared.log${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Cloudflare Tunnel Updated${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Testing connectivity:${NC}"
echo ""

# Test domains
echo -e "${YELLOW}Testing ai.ultronsolar.in...${NC}"
if curl -s -o /dev/null -w "%{http_code}" https://ai.ultronsolar.in | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Frontend reachable${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not responding (may still be starting)${NC}"
fi

echo -e "${YELLOW}Testing api.ultronsolar.in...${NC}"
if curl -s -o /dev/null -w "%{http_code}" https://api.ultronsolar.in | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Backend reachable${NC}"
else
    echo -e "${YELLOW}⚠ Backend not responding (may still be starting)${NC}"
fi

echo ""
echo -e "${BLUE}WebSocket Configuration Applied:${NC}"
echo -e "  - noTLSVerify: true"
echo -e "  - http2Origin: false (for API)"
echo -e "  - disableChunkedEncoding: true"
echo ""
echo -e "${YELLOW}Test WebSocket connection at:${NC}"
echo -e "  https://ai.ultronsolar.in/research"
echo ""
