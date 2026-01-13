# Current Setup - ACe_Toolkit on Raspberry Pi

**Status:** Backend & Frontend Auto-Start Configured ✅
**Cloudflare Domain:** Coming Soon (In Progress)

---

## ✅ What's Working Now

### 1. Auto-Start on Reboot (Crontab Method)

**Setup Command:**
```bash
crontab -e
```

**Add this line:**
```cron
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**What it does:**
- Waits 30 seconds after boot for network
- Starts Backend (FastAPI on port 8000)
- Starts Frontend (Next.js on port 3000)
- Logs everything to `/home/ace/dev/ACe_Toolkit/logs/`

**Verify crontab:**
```bash
crontab -l
```

### 2. Services Running

| Service | Port | Status | Access |
|---------|------|--------|--------|
| Backend (FastAPI) | 8000 | ✅ Running | http://localhost:8000 |
| Frontend (Next.js) | 3000 | ✅ Running | http://localhost:3000 |
| Mermaid Editor | 3000 | ✅ Running | http://localhost:3000/mermaid |
| Notes | 3000 | ✅ Running | http://localhost:3000/notes |

### 3. How to Access

**On the Pi:**
```bash
# Frontend
http://localhost:3000

# Backend API docs
http://localhost:8000/docs
```

**From other devices on same network:**
```bash
# Find Pi's IP
hostname -I | awk '{print $1}'
# Example: 192.168.1.100

# Then access:
http://192.168.1.100:3000  # Frontend
http://192.168.1.100:8000  # Backend
```

---

## 🔜 Coming Soon: Cloudflare Domain Setup

**Status:** Getting free domain from Cloudflare

Once you have the domain, we'll:
1. Create Cloudflare Tunnel
2. Map domain to local services
3. Access from anywhere via `https://yourdomain.com`

**No action needed yet** - you're working on getting the domain.

---

## 📊 Monitoring Your Services

### Check Status
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/status.sh
```

**Shows:**
- ✓ Service status (running/stopped)
- Local IP address
- Access URLs
- Recent errors
- System resources

### View Logs
```bash
# Startup log
tail -f /home/ace/dev/ACe_Toolkit/logs/startup-*.log

# Backend logs
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-*.log

# Frontend logs
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-*.log
```

### Manual Control
```bash
# Start services
./infra/scripts/start_all.sh

# Stop services
./infra/scripts/stop_all.sh

# Restart services
./infra/scripts/stop_all.sh && ./infra/scripts/start_all.sh
```

---

## 🔧 Troubleshooting

### Services Not Starting After Reboot

**Check if crontab is set:**
```bash
crontab -l
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog | tail -20
```

**Check app logs:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/logs/
cat /home/ace/dev/ACe_Toolkit/logs/startup-*.log
```

**Manual start:**
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./start_all.sh
```

### Backend Won't Start

**Check virtual environment:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/api/.venv
```

**If missing, recreate:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Won't Start

**Check if built:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/web/.next
```

**If missing, build:**
```bash
cd /home/ace/dev/ACe_Toolkit/apps/web
npm install
npm run build
```

---

## 📝 Current Architecture

```
┌─────────────────────────────────────────────┐
│           Raspberry Pi (Local)              │
├─────────────────────────────────────────────┤
│                                             │
│  Backend (FastAPI)    Frontend (Next.js)   │
│  Port: 8000          Port: 3000            │
│       ↓                    ↓                │
│  SQLite Database      React UI             │
│                                             │
└─────────────────────────────────────────────┘
         ↑
         │ Access via Local Network
         │ http://192.168.1.x:3000
         │
    ┌────┴────┐
    │ Devices │
    └─────────┘
```

**Future (with Cloudflare):**
```
    Internet
        ↓
  Cloudflare Edge
        ↓
  Cloudflare Tunnel (encrypted)
        ↓
  Raspberry Pi (localhost)
        ↓
  Backend & Frontend
```

---

## 🎯 Next Steps

### For You (In Progress)
- [ ] Get free Cloudflare domain
- [ ] Let me know when ready for Cloudflare Tunnel setup

### Already Done ✅
- [x] Backend auto-start configured
- [x] Frontend auto-start configured
- [x] Logging system in place
- [x] Status monitoring script
- [x] Documentation created

---

## 📚 Quick Reference

### Essential Files
```
/home/ace/dev/ACe_Toolkit/
├── infra/scripts/
│   ├── start_all.sh         # Start both services
│   ├── stop_all.sh          # Stop both services
│   ├── status.sh            # Check status
│   ├── start_backend.sh     # Start backend only
│   └── start_frontend.sh    # Start frontend only
├── logs/
│   ├── startup-*.log        # Master startup log
│   ├── backend-*.log        # Backend logs
│   └── frontend-*.log       # Frontend logs
└── apps/
    ├── api/                 # Backend
    └── web/                 # Frontend
```

### Crontab Entry
```cron
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

### Environment Variables
```bash
# Backend: apps/api/.env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key

# Frontend: apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

**Last Updated:** January 13, 2026
**Status:** Local setup complete, waiting for Cloudflare domain
