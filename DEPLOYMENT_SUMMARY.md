# ACe_Toolkit Deployment Summary

**Last Updated:** January 28, 2026
**Status:** ✅ LIVE & OPERATIONAL

---

## 🌐 Live URLs

### Public Access (Internet)
- **Platform:** https://orpheuscore.uk
- **Backend API:** https://api.orpheuscore.uk
- **API Documentation:** https://api.orpheuscore.uk/docs

### Legacy Domains (Still Working)
- https://ai.ultronsolar.in → redirects to orpheuscore.uk
- https://api.ultronsolar.in → redirects to api.orpheuscore.uk

### Local Access
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🚀 Applications

| Application | URL | Description |
|-------------|-----|-------------|
| **C3 Researcher Workspace** | /workspace | Claude Code terminal with 145+ skills, 34 MCP servers |
| **C3 Data Studio** | /data-studio | AI-powered data analysis and dashboards |
| **Remotion Video Studio** | /video-studio | AI video creation with Claude + Remotion |

---

## ✅ System Status

### Services Running
- ✅ **Backend (FastAPI)** - Port 8000
- ✅ **Frontend (Next.js)** - Port 3000
- ✅ **Cloudflare Tunnel** - Active connections

### Health Check
```bash
curl http://localhost:8000/health  # Backend health
curl -I http://localhost:3000      # Frontend health
sudo systemctl status cloudflared  # Tunnel status
```

---

## 🔧 Configuration

### Frontend Environment
**File:** `apps/web/.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=https://api.orpheuscore.uk
```

### Backend Environment
**File:** `apps/api/.env`
```env
DATABASE_URL=sqlite+aiosqlite:///./app.db
SECRET_KEY=your-secure-key
ALLOWED_ORIGINS=["http://localhost:3000","https://orpheuscore.uk","https://api.orpheuscore.uk","https://ai.ultronsolar.in","https://api.ultronsolar.in"]
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Cloudflare Tunnel
**Config:** `/etc/cloudflared/config.yml`
```yaml
tunnel: 2a66795a-1440-4131-8bd8-e0efea713d06
credentials-file: /home/ace/.cloudflared/2a66795a-1440-4131-8bd8-e0efea713d06.json

ingress:
  - hostname: orpheuscore.uk
    service: http://localhost:3000
  - hostname: api.orpheuscore.uk
    service: http://localhost:8000
  - hostname: ai.ultronsolar.in
    service: http://localhost:3000
  - hostname: api.ultronsolar.in
    service: http://localhost:8000
  - service: http_status:404
```

---

## 🔄 Auto-Start Configuration

### On Reboot (Automatic)

**1. Cloudflare Tunnel (systemd)**
```bash
sudo systemctl status cloudflared
# Auto-starts via systemd (~5 seconds after boot)
```

**2. Backend + Frontend (crontab)**
```bash
crontab -l
# @reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**Startup Sequence:**
1. System boots
2. Systemd starts `cloudflared.service` (~5 sec)
3. Crontab waits 30 seconds (network ready)
4. `start_all.sh` starts backend (~5 sec)
5. `start_all.sh` starts frontend (~20 sec)
6. **Total:** ~60 seconds from boot to fully operational

---

## 💾 Data Persistence

### Per-User Data
**Location:** `/data/users/{user-id}/`
```
/data/users/{user-id}/
├── projects/              # Workspace projects
├── data-studio-projects/  # Data Studio projects
└── video-studio/          # Video Studio projects
```

### Database
**Location:** `/home/ace/dev/ACe_Toolkit/apps/api/app.db`
- Contains: Users, sessions, project metadata
- Persists: ✅ Survives reboots
- Protected: ✅ In .gitignore

### Logs
**Location:** `/home/ace/dev/ACe_Toolkit/logs/`
- `backend-YYYYMMDD_HHMMSS.log`
- `frontend-YYYYMMDD_HHMMSS.log`

---

## 🛠️ Management Commands

### Check Status
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/status.sh
```

### Start/Stop Services
```bash
./infra/scripts/stop_all.sh
./infra/scripts/start_all.sh
```

### View Logs
```bash
# Latest backend log
tail -f logs/backend-*.log | tail -100

# Latest frontend log
tail -f logs/frontend-*.log | tail -100

# Cloudflare tunnel logs
sudo journalctl -u cloudflared -f
```

### Rebuild Frontend
```bash
cd apps/web
npm run build
cd ../..
./infra/scripts/stop_all.sh
./infra/scripts/start_all.sh
```

---

## 🔍 Troubleshooting

### Frontend Shows Errors
```bash
# Check .env.local
cat apps/web/.env.local
# Should show: NEXT_PUBLIC_API_BASE_URL=https://api.orpheuscore.uk

# Rebuild if needed
cd apps/web && npm run build
```

### Backend Not Responding
```bash
# Check if running
lsof -i :8000

# Check logs
tail -50 logs/backend-*.log | tail -50

# Restart
fuser -k 8000/tcp
cd apps/api && source .venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```

### Cloudflare Tunnel Issues
```bash
# Check status
sudo systemctl status cloudflared

# Restart
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

---

## 📊 Resources

### Hardware
- **Platform:** Raspberry Pi 5 (8GB RAM)
- **Storage:** Samsung T7 1.8TB SSD at `/data`
- **OS:** Raspberry Pi OS (Bookworm 64-bit)

### Process Memory
```
Backend (uvicorn):   ~100-150 MB
Frontend (Next.js):  ~140-200 MB
Cloudflared:         ~30 MB
```

---

## 🔐 Security

- ✅ HTTPS via Cloudflare (automatic SSL)
- ✅ JWT authentication with HTTP-only cookies
- ✅ Per-user data isolation
- ✅ No exposed ports on router
- ✅ CORS restricted to specific domains

---

## 📚 Related Documentation

- **Main Documentation:** `CLAUDE.md`
- **Frontend Docs:** `apps/web/CLAUDE.md`
- **Backend Docs:** `apps/api/CLAUDE.md`
- **Setup Guide:** `docs/PI_SETUP_MANUAL.md`

---

**Domain:** orpheuscore.uk
**Tunnel ID:** 2a66795a-1440-4131-8bd8-e0efea713d06
**Status:** ✅ Production Ready
