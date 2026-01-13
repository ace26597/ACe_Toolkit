# 🚀 Reboot Guide - ACe_Toolkit on Raspberry Pi

**Ready to reboot?** Follow this guide to ensure everything starts automatically.

---

## ✅ Pre-Reboot Checklist

Before you reboot, make sure these are configured:

### 1. Choose Your Auto-Start Method

**Option A: Desktop (With Visible Terminal)** ✨ RECOMMENDED FOR MONITORING
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./setup_autostart_desktop.sh
```

**Option B: Headless (Background Services)**
```bash
crontab -e
# Add this line:
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

### 2. Verify Cloudflare Tunnel Auto-Start

```bash
sudo systemctl is-enabled cloudflared
# Should output: enabled

# If not enabled:
sudo systemctl enable cloudflared
```

### 3. Verify Dependencies

```bash
# Check backend virtual environment
ls -la /home/ace/dev/ACe_Toolkit/apps/api/.venv

# Check frontend dependencies
ls -la /home/ace/dev/ACe_Toolkit/apps/web/node_modules

# Check if frontend is built
ls -la /home/ace/dev/ACe_Toolkit/apps/web/.next
```

If any are missing:
```bash
# Backend
cd /home/ace/dev/ACe_Toolkit/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd /home/ace/dev/ACe_Toolkit/apps/web
npm install
npm run build
```

---

## 🔄 Reboot Now

```bash
sudo reboot
```

---

## 📊 What Happens After Reboot?

### Option A: Desktop (Tmux)

**Timeline:**
1. **0-10 seconds:** System boots, network initializes
2. **10-40 seconds:** Auto-start script begins (30s sleep)
3. **40-45 seconds:** Terminal window opens with tmux
4. **45-50 seconds:** Backend starts (FastAPI)
5. **50-120 seconds:** Frontend builds and starts (Next.js)
6. **120+ seconds:** Status dashboard appears

**What You'll See:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         ACe_Toolkit                             │
├──────────────────────┬──────────────────────────────────────────┤
│                      │  ===========================            │
│  Backend (FastAPI)   │   Frontend (Next.js)                    │
│  Port: 8000          │   Port: 3000                            │
│                      │  ===========================            │
│  INFO: Started       │  Building...                            │
│  INFO: Uvicorn       │  Compiled successfully                  │
│  INFO: Application   │  Ready on http://localhost:3000         │
│  startup complete    │                                         │
│                      ├──────────────────────────────────────────┤
│                      │  ╔══════════════════════════════════════╗│
│                      │  ║  ACe_Toolkit - Status Dashboard     ║│
│                      │  ╚══════════════════════════════════════╝│
│                      │  📅 Date: 2026-01-13 10:30:00          │
│                      │                                         │
│                      │  🔧 Service Status                      │
│                      │  Backend:   ✓ RUNNING (PID: 1234)      │
│                      │  Frontend:  ✓ RUNNING (PID: 1235)      │
│                      │  Tunnel:    ✓ RUNNING                  │
│                      │                                         │
│                      │  🌐 Network Information                │
│                      │  Local IP:  192.168.1.100              │
│                      │  Public IP: 203.0.113.50               │
│                      │                                         │
│                      │  🔗 Access URLs                        │
│                      │  Local: http://localhost:3000          │
│                      │  Cloudflare: https://api.yourdomain.com│
│                      │                                         │
│                      │  Auto-refresh in 30 seconds...         │
└──────────────────────┴──────────────────────────────────────────┘
```

**Tmux Controls:**
- `Ctrl+b` then `Arrow Keys` - Switch between panes
- `Ctrl+b` then `[` - Scroll mode (press `q` to exit)
- `Ctrl+b` then `d` - Detach (keeps running in background)
- `Ctrl+b` then `:` then `kill-session` - Stop everything

**Reattach to tmux session:**
```bash
tmux attach-session -t acetoolkit
```

### Option B: Headless (Background)

**Timeline:**
1. **0-10 seconds:** System boots
2. **10-40 seconds:** Cron waits (30s sleep)
3. **40-45 seconds:** Backend starts
4. **45-120 seconds:** Frontend builds and starts

**No terminal opens automatically.**

**Check status manually:**
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/status.sh
```

---

## 🌐 Accessing Your App After Reboot

### Wait Time
- **First boot:** ~2 minutes (frontend build)
- **Subsequent boots:** ~1 minute (cached build)

### Access URLs

**Local (on the Pi):**
```
Frontend:  http://localhost:3000
Mermaid:   http://localhost:3000/mermaid
Notes:     http://localhost:3000/notes (redirects to /mermaid)
Backend:   http://localhost:8000
API Docs:  http://localhost:8000/docs
```

**Network (from other devices on same network):**
```
Frontend:  http://<PI_LOCAL_IP>:3000
Backend:   http://<PI_LOCAL_IP>:8000
```

Find your Pi's IP:
```bash
hostname -I | awk '{print $1}'
# Example: 192.168.1.100
```

**Internet (via Cloudflare Tunnel):**
```
Backend API: https://api.yourdomain.com
Frontend:    https://app.yourdomain.com (if configured)
```

---

## ✔️ Verify Everything is Running

### Quick Check (Manual)

```bash
# Check processes
ps aux | grep uvicorn          # Backend
ps aux | grep next-server      # Frontend
sudo systemctl status cloudflared  # Tunnel

# Test endpoints
curl http://localhost:8000/docs    # Backend API
curl http://localhost:3000         # Frontend
```

### Status Dashboard (Automated)

```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/status.sh
```

**Shows:**
- ✓/✗ Service status (Backend, Frontend, Tunnel)
- 🌐 Network info (Local IP, Public IP, Hostname)
- 🔗 Access URLs (Local, Network, Cloudflare)
- 💊 Health checks
- ⚠️ Recent errors from logs
- 💻 System resources (CPU, Memory, Disk, Uptime)
- 🎮 Quick commands

**Auto-refresh mode:**
```bash
./infra/scripts/status.sh
# Refreshes every 30 seconds, press Ctrl+C to exit
```

**Single run (no refresh):**
```bash
./infra/scripts/status.sh --once
```

---

## 🔍 Troubleshooting

### Services Not Starting

**Check logs:**
```bash
tail -f /home/ace/dev/ACe_Toolkit/logs/startup-*.log
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-*.log
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-*.log
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog | tail -20
```

**Manual start:**
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./start_all.sh  # Background mode
# OR
./start_all_tmux.sh  # Tmux mode
```

### Backend Not Starting

**Check virtual environment:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/api/.venv
```

**Reinstall if needed:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Test manually:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/api
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Not Starting

**Check node_modules:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/web/node_modules
```

**Check build:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/web/.next
```

**Rebuild:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/web
npm install
npm run build
```

**Test manually:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/web
npm start
```

### Cloudflare Tunnel Not Running

**Check service:**
```bash
sudo systemctl status cloudflared
```

**View logs:**
```bash
sudo journalctl -u cloudflared -n 50
```

**Restart:**
```bash
sudo systemctl restart cloudflared
```

**Check config:**
```bash
cat ~/.cloudflared/config.yml
cloudflared tunnel list
```

### Tmux Session Not Appearing (Desktop Mode)

**Check autostart file:**
```bash
ls -la ~/.config/autostart/acetoolkit.desktop
cat ~/.config/autostart/acetoolkit.desktop
```

**Check if tmux is installed:**
```bash
which tmux
# If not installed:
sudo apt install tmux
```

**Start manually:**
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./start_all_tmux.sh
```

---

## 📝 Viewing Documentation in the App

Your project documentation (.md files) can be imported into the app:

```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./import_docs.sh
```

This creates a JSON index of all markdown files that the app can display.

**Documentation files that will be imported:**
- `README.md` - Project overview
- `CLAUDE.md` - AI assistant guide
- `REBOOT_GUIDE.md` - This file
- `infra/scripts/CLOUDFLARE_GUIDE.md` - Cloudflare reference
- `infra/scripts/AUTOSTART_README.md` - Auto-start guide
- `infra/scripts/AUTO_START_SETUP.md` - Detailed setup
- `infra/scripts/QUICK_START.md` - Quick start
- `infra/scripts/run_tunnel.md` - Tunnel setup

After running the script, these will appear in your Mermaid app.

---

## 📌 Quick Reference

### Essential Commands

```bash
# Check status
./infra/scripts/status.sh

# Start services (background)
./infra/scripts/start_all.sh

# Start services (tmux)
./infra/scripts/start_all_tmux.sh

# Stop services
./infra/scripts/stop_all.sh

# Attach to tmux
tmux attach-session -t acetoolkit

# View logs
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-*.log
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-*.log
sudo journalctl -u cloudflared -f

# Restart Cloudflare Tunnel
sudo systemctl restart cloudflared
```

### Log Locations

```
/home/ace/dev/ACe_Toolkit/logs/
├── startup-YYYYMMDD.log     # Master startup log
├── backend-YYYYMMDD.log     # Backend (FastAPI) logs
├── frontend-YYYYMMDD.log    # Frontend (Next.js) logs
├── backend.pid              # Backend process ID
└── frontend.pid             # Frontend process ID
```

### Configuration Files

```
~/.cloudflared/config.yml              # Cloudflare Tunnel config
~/.cloudflared/<uuid>.json             # Tunnel credentials
/home/ace/dev/ACe_Toolkit/apps/api/.env       # Backend env vars
/home/ace/dev/ACe_Toolkit/apps/web/.env.local # Frontend env vars
~/.config/autostart/acetoolkit.desktop # Desktop autostart
```

---

## 🎯 Next Steps

1. **Reboot** - `sudo reboot`
2. **Wait 2 minutes** - For services to start
3. **Open browser** - http://localhost:3000
4. **Check status** - Run `./infra/scripts/status.sh`
5. **Test Cloudflare** - Visit your tunnel URL
6. **Import docs** - Run `./infra/scripts/import_docs.sh` (optional)

---

## 📚 Additional Resources

- **[AUTOSTART_README.md](infra/scripts/AUTOSTART_README.md)** - Compare desktop vs headless auto-start
- **[AUTO_START_SETUP.md](infra/scripts/AUTO_START_SETUP.md)** - Detailed setup instructions
- **[QUICK_START.md](infra/scripts/QUICK_START.md)** - 5-minute quick start
- **[CLOUDFLARE_GUIDE.md](infra/scripts/CLOUDFLARE_GUIDE.md)** - Complete Cloudflare reference
- **[CLAUDE.md](CLAUDE.md)** - Full codebase documentation

---

**Questions?**
- Check the troubleshooting section above
- Review logs in `/home/ace/dev/ACe_Toolkit/logs/`
- Run `./infra/scripts/status.sh` for current state

**Happy coding! 🚀**

---

**Last Updated:** January 13, 2026
