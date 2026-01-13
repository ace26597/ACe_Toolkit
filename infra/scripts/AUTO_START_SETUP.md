# Auto-Start Setup for Raspberry Pi

This guide configures ACe_Toolkit to automatically start on Raspberry Pi reboot.

## Overview

The auto-start system includes:
- **Backend (FastAPI)**: Runs on port 8000
- **Frontend (Next.js)**: Runs on port 3000
- **Cloudflare Tunnel**: Runs as systemd service (auto-starts)

## Setup Instructions

### 1. Make Scripts Executable

```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
chmod +x start_backend.sh
chmod +x start_frontend.sh
chmod +x start_all.sh
chmod +x stop_all.sh
```

### 2. Test Scripts Manually

Before setting up auto-start, verify the scripts work:

```bash
# Start everything
./start_all.sh

# Check logs
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-$(date +%Y%m%d).log
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-$(date +%Y%m%d).log

# Verify services are running
curl http://localhost:8000/docs    # Backend API docs
curl http://localhost:3000         # Frontend

# Stop everything
./stop_all.sh
```

### 3. Configure Crontab for Auto-Start

Edit the crontab:

```bash
crontab -e
```

Add this line at the end:

```cron
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**Explanation:**
- `@reboot`: Runs command at system startup
- `sleep 30`: Waits 30 seconds for system services to initialize
- Full path to script ensures it runs correctly

### 4. Verify Cloudflare Tunnel Auto-Start

Check that cloudflared is configured as a systemd service:

```bash
# Check if service is enabled
sudo systemctl is-enabled cloudflared

# Should output: enabled
```

If not enabled, enable it:

```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Verify it's running:

```bash
sudo systemctl status cloudflared
```

### 5. Test Auto-Start

Reboot the Pi and verify everything starts:

```bash
sudo reboot
```

After reboot (wait ~2 minutes), check:

```bash
# Check processes
ps aux | grep uvicorn
ps aux | grep next-server

# Check logs
tail /home/ace/dev/ACe_Toolkit/logs/startup-*.log

# Test services
curl http://localhost:8000/docs
curl http://localhost:3000
sudo systemctl status cloudflared
```

## Troubleshooting

### Services Not Starting

Check crontab logs:
```bash
grep CRON /var/log/syslog
```

Check application logs:
```bash
ls -la /home/ace/dev/ACe_Toolkit/logs/
cat /home/ace/dev/ACe_Toolkit/logs/startup-*.log
```

### Backend Fails to Start

- Ensure virtual environment exists: `ls apps/api/.venv`
- Check dependencies: `cd apps/api && source .venv/bin/activate && pip list`
- Verify database: `ls apps/api/app.db`

### Frontend Fails to Start

- Ensure built: `ls apps/web/.next`
- Check dependencies: `cd apps/web && npm list`
- Try rebuilding: `cd apps/web && npm run build`

### Cloudflare Tunnel Not Running

```bash
# Restart tunnel
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

## Manual Control

### Start Services
```bash
/home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

### Stop Services
```bash
/home/ace/dev/ACe_Toolkit/infra/scripts/stop_all.sh
```

### Check Status
```bash
# Backend
curl http://localhost:8000/docs

# Frontend
curl http://localhost:3000

# Cloudflare Tunnel
sudo systemctl status cloudflared

# View PIDs
cat /home/ace/dev/ACe_Toolkit/logs/backend.pid
cat /home/ace/dev/ACe_Toolkit/logs/frontend.pid
```

## Log Files

All logs are stored in `/home/ace/dev/ACe_Toolkit/logs/`:

- `startup-YYYYMMDD.log`: Master startup log
- `backend-YYYYMMDD.log`: Backend (FastAPI) logs
- `frontend-YYYYMMDD.log`: Frontend (Next.js) logs
- `backend.pid`: Backend process ID
- `frontend.pid`: Frontend process ID

## Crontab Reference

View current crontab:
```bash
crontab -l
```

Edit crontab:
```bash
crontab -e
```

Remove crontab:
```bash
crontab -r
```

## Environment Variables

Ensure environment files exist before auto-start:

**Backend** (`apps/api/.env`):
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Security Notes

- Scripts run with your user permissions (not root)
- Cloudflare Tunnel runs as systemd service (may use root)
- Logs may contain sensitive information - secure appropriately
- PID files allow tracking and stopping processes

## Additional Configuration

### Change Ports

Edit the startup scripts to use different ports:

**Backend** (`infra/scripts/start_backend.sh`):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000  # Change 8000
```

**Frontend**: Edit `apps/web/package.json`:
```json
{
  "scripts": {
    "start": "next start -p 3000"  // Change 3000
  }
}
```

### Increase Startup Delay

If services fail to start, increase the sleep time:

```cron
@reboot sleep 60 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

---

**Last Updated:** January 13, 2026
