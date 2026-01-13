# Quick Start Guide - Auto-Start on Raspberry Pi

## One-Time Setup (5 minutes)

### Step 1: Make Scripts Executable
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
chmod +x *.sh
```

### Step 2: Test Manually
```bash
# Start everything
./start_all.sh

# Wait 30 seconds, then verify
curl http://localhost:8000/docs    # Backend
curl http://localhost:3000         # Frontend

# Stop everything
./stop_all.sh
```

### Step 3: Setup Auto-Start
```bash
# Edit crontab
crontab -e

# Add this line at the end:
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh

# Save and exit (Ctrl+O, Enter, Ctrl+X for nano)
```

### Step 4: Enable Cloudflare Tunnel Auto-Start
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Step 5: Reboot and Verify
```bash
sudo reboot
```

After reboot (wait 2 minutes):
```bash
# Check everything is running
ps aux | grep uvicorn         # Backend
ps aux | grep next-server     # Frontend
sudo systemctl status cloudflared  # Tunnel

# Check logs
tail /home/ace/dev/ACe_Toolkit/logs/startup-*.log
```

## Done!

Your Raspberry Pi will now automatically start:
- Backend (FastAPI) on port 8000
- Frontend (Next.js) on port 3000
- Cloudflare Tunnel (systemd service)

## Manual Control

**Start:** `./infra/scripts/start_all.sh`
**Stop:** `./infra/scripts/stop_all.sh`
**Logs:** `/home/ace/dev/ACe_Toolkit/logs/`

For detailed troubleshooting, see [AUTO_START_SETUP.md](./AUTO_START_SETUP.md)
