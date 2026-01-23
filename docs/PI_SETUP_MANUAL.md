# Raspberry Pi 5 Setup Manual - ACe_Toolkit

**Last Updated:** 2026-01-23
**Machine:** Raspberry Pi 5 8GB (hostname: blest)
**OS:** Raspberry Pi OS (Linux 6.12.62+rpt-rpi-2712)

---

## Table of Contents

1. [Hardware Setup](#hardware-setup)
2. [Storage Configuration](#storage-configuration)
3. [ACe_Toolkit Application](#ace_toolkit-application)
4. [Cloudflare Tunnel](#cloudflare-tunnel)
5. [Claude Code Setup](#claude-code-setup)
6. [Service Management](#service-management)
7. [Troubleshooting](#troubleshooting)
8. [Migration to New Machine](#migration-to-new-machine)

---

## Hardware Setup

### Raspberry Pi 5 Configuration

**EEPROM Settings (as of 2026-01-23):**
```bash
# View current config
sudo rpi-eeprom-config

# Current settings:
# [all]
# BOOT_UART=1
# BOOT_ORDER=0xf461
# NET_INSTALL_AT_POWER_ON=1
# SDRAM_BANKLOW=1  (10-20% RAM performance boost)
```

**To update EEPROM:**
```bash
# Check for updates
sudo rpi-eeprom-update

# Apply update
sudo rpi-eeprom-update -a

# Edit config
cat << 'EOF' > /tmp/eeprom_config.txt
[all]
BOOT_UART=1
BOOT_ORDER=0xf461
NET_INSTALL_AT_POWER_ON=1
SDRAM_BANKLOW=1
EOF
sudo rpi-eeprom-config --apply /tmp/eeprom_config.txt
```

---

## Storage Configuration

### Samsung T7 SSD (1.8TB)

**Mount Point:** `/data` → `/media/ace/T7/dev`

**Auto-mount (fstab entry):**
```bash
# Check current mount
df -h | grep T7

# The SSD should be mounted at /media/ace/T7
# Symlink: /data -> /media/ace/T7/dev
```

**Directory Structure:**
```
/data/
├── users/                      # Per-user isolated data
│   └── {user-uuid}/
│       ├── projects/           # Workspace projects
│       │   └── {project-name}/
│       │       ├── .project.json
│       │       ├── data/
│       │       ├── notes/
│       │       ├── output/
│       │       └── .claude/
│       ├── data-studio-projects/  # Data Studio projects
│       └── video-factory/
├── ccresearch-logs/            # Terminal session logs
└── claude-workspaces/          # Legacy (deprecated)
```

---

## ACe_Toolkit Application

### Overview

| Component | Port | Technology |
|-----------|------|------------|
| Frontend | 3000 | Next.js 16 |
| Backend | 8000 | FastAPI |

**Repository:** `/home/ace/dev/ACe_Toolkit`
**GitHub:** https://github.com/ace26597/ACe_Toolkit

### Manual Start (Without Scripts)

#### 1. Start Backend

```bash
cd /home/ace/dev/ACe_Toolkit/apps/api

# Activate virtual environment
source .venv/bin/activate

# Start uvicorn (foreground for debugging)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# OR start in background
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /home/ace/dev/ACe_Toolkit/logs/backend-$(date +%Y%m%d).log 2>&1 &
```

#### 2. Start Frontend

```bash
cd /home/ace/dev/ACe_Toolkit/apps/web

# Start Next.js (foreground for debugging)
npm run start

# OR start in background
nohup npm run start > /home/ace/dev/ACe_Toolkit/logs/frontend-$(date +%Y%m%d).log 2>&1 &
```

#### 3. Using the Scripts

```bash
cd /home/ace/dev/ACe_Toolkit

# Start all services
./infra/scripts/start_all.sh

# Stop all services
./infra/scripts/stop_all.sh

# Check status
./infra/scripts/status.sh
```

### Kill Services Manually

```bash
# Kill by port
fuser -k 3000/tcp  # Frontend
fuser -k 8000/tcp  # Backend

# Or find and kill processes
lsof -i :3000 -i :8000
kill <PID>
```

### Rebuild Frontend

```bash
cd /home/ace/dev/ACe_Toolkit/apps/web
npm run build
```

### Environment Variables

**Backend:** `/home/ace/dev/ACe_Toolkit/apps/api/.env`
```env
DATABASE_URL=sqlite+aiosqlite:///./app.db
SECRET_KEY=<your-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
DISCORD_WEBHOOK_URL=<webhook-url>
```

**Frontend:** `/home/ace/dev/ACe_Toolkit/apps/web/.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Production: https://api.orpheuscore.uk
```

### Database

**Location:** `/home/ace/dev/ACe_Toolkit/apps/api/app.db` (SQLite)

**Backup:**
```bash
cp /home/ace/dev/ACe_Toolkit/apps/api/app.db /data/backups/app-$(date +%Y%m%d).db
```

### Auto-Start on Boot

**Crontab entry:**
```bash
crontab -e
# Add:
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

---

## Cloudflare Tunnel

### Overview

Cloudflare Tunnel exposes the local services to the internet without port forwarding.

**Tunnel ID:** `2a66795a-1440-4131-8bd8-e0efea713d06`

### Configuration Files

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

**Credentials:** `/home/ace/.cloudflared/2a66795a-1440-4131-8bd8-e0efea713d06.json`

### Service Management

```bash
# Status
sudo systemctl status cloudflared

# Restart
sudo systemctl restart cloudflared

# View logs
journalctl -u cloudflared -f

# Enable on boot
sudo systemctl enable cloudflared
```

### DNS Records (Cloudflare Dashboard)

| Hostname | Type | Target |
|----------|------|--------|
| orpheuscore.uk | CNAME | 2a66795a-1440-4131-8bd8-e0efea713d06.cfargotunnel.com |
| api.orpheuscore.uk | CNAME | 2a66795a-1440-4131-8bd8-e0efea713d06.cfargotunnel.com |
| ai.ultronsolar.in | CNAME | 2a66795a-1440-4131-8bd8-e0efea713d06.cfargotunnel.com |
| api.ultronsolar.in | CNAME | 2a66795a-1440-4131-8bd8-e0efea713d06.cfargotunnel.com |

### Manual Tunnel Start (if systemd fails)

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml run
```

---

## Claude Code Setup

### Installation

```bash
# Install via npm (global)
npm install -g @anthropic-ai/claude-code

# Or update
npm update -g @anthropic-ai/claude-code
```

### Configuration Directory

**Location:** `~/.claude/`

```
~/.claude/
├── CLAUDE.md              # Global instructions
├── settings.json          # User settings
├── settings.local.json    # Local overrides
├── projects/              # Project-specific data
├── plugins/               # Installed plugins
│   └── plugin-dev/
├── skills/                # Custom skills
│   ├── data-studio-analyst/
│   │   └── SKILL.md
│   └── ... (145+ skills)
└── todos/                 # Todo storage
```

### Skills Directory

**Location:** `~/.claude/skills/`

Each skill has a `SKILL.md` file with instructions for Claude.

**Key skills for Data Studio:**
- `data-studio-analyst/SKILL.md` - Data analysis and dashboard generation

### MCP Servers

**Config:** `~/.claude/settings.json` or project `.claude/settings.local.json`

Current MCP servers (26 total):
- biorxiv, chembl, clinical-trials, cms-coverage
- icd-10-codes, npi-registry, hugging-face
- filesystem, memory, git, sqlite, playwright
- pubmed, scholar-gateway, aact, fetch, time
- context7, sequential-thinking

### Plugins

**Location:** `~/.claude/plugins/`

Current plugins (14 total):
- plugin-dev, agent-sdk-dev, feature-dev
- ralph-loop, claude-md-management
- frontend-design, scientific-skills
- huggingface-skills, prompt-engineer

### CCResearch Security

**Email Whitelist:** `~/.ccresearch_allowed_emails.json`
```json
{
  "allowed_emails": ["your@email.com"],
  "access_key": "optional-ssh-key",
  "updated_at": "2026-01-23"
}
```

---

## Service Management

### Quick Commands

```bash
# Check what's running
lsof -i :3000 -i :8000

# Check all services
./infra/scripts/status.sh

# Full restart
fuser -k 3000/tcp 8000/tcp
sleep 2
cd /home/ace/dev/ACe_Toolkit/apps/api && source .venv/bin/activate && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > logs/backend-$(date +%Y%m%d).log 2>&1 &
cd /home/ace/dev/ACe_Toolkit/apps/web && nohup npm run start > logs/frontend-$(date +%Y%m%d).log 2>&1 &
sudo systemctl restart cloudflared
```

### View Logs

```bash
# Backend
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-*.log

# Frontend
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-*.log

# Cloudflare
journalctl -u cloudflared -f
```

---

## Troubleshooting

### Frontend Won't Start

```bash
# Check if port is in use
lsof -i :3000

# Kill and retry
fuser -k 3000/tcp
cd /home/ace/dev/ACe_Toolkit/apps/web
npm run build  # Rebuild if needed
npm run start
```

### Backend Won't Start

```bash
# Check if port is in use
lsof -i :8000

# Check Python environment
cd /home/ace/dev/ACe_Toolkit/apps/api
source .venv/bin/activate
pip list  # Verify packages

# Try running directly to see errors
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### CORS Errors

Check that the frontend URL is in the backend's CORS allowed origins:
- File: `apps/api/app/main.py`
- Allowed: orpheuscore.uk, api.orpheuscore.uk, localhost:3000

### Cloudflare Tunnel Not Working

```bash
# Check tunnel status
cloudflared tunnel info 2a66795a-1440-4131-8bd8-e0efea713d06

# Verify credentials exist
ls -la ~/.cloudflared/

# Check config
cat /etc/cloudflared/config.yml

# Restart
sudo systemctl restart cloudflared
```

### Database Issues

```bash
# Check database exists
ls -la /home/ace/dev/ACe_Toolkit/apps/api/app.db

# If corrupted, restore from backup
cp /data/backups/app-YYYYMMDD.db /home/ace/dev/ACe_Toolkit/apps/api/app.db
```

---

## Migration to New Machine

### Prerequisites on New Machine

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# Install git
sudo apt install -y git

# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### Step 1: Clone Repository

```bash
mkdir -p ~/dev
cd ~/dev
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit
```

### Step 2: Setup Backend

```bash
cd apps/api

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (edit with your keys)
cp .env.example .env
nano .env
```

### Step 3: Setup Frontend

```bash
cd ../web

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
nano .env.local

# Build
npm run build
```

### Step 4: Copy Data from Old Machine

```bash
# On old machine, create archive
tar -czvf ace_data_backup.tar.gz \
  /data/users \
  /home/ace/.claude \
  /home/ace/.credentials \
  /home/ace/.ccresearch_allowed_emails.json \
  /home/ace/dev/ACe_Toolkit/apps/api/app.db \
  /home/ace/dev/ACe_Toolkit/apps/api/.env \
  /home/ace/dev/ACe_Toolkit/apps/web/.env.local

# Transfer to new machine
scp ace_data_backup.tar.gz newuser@newmachine:~/

# On new machine, extract
cd /
sudo tar -xzvf ~/ace_data_backup.tar.gz
```

### Step 5: Setup Cloudflare Tunnel

```bash
# Copy credentials from old machine
mkdir -p ~/.cloudflared
scp olduser@oldmachine:~/.cloudflared/*.json ~/.cloudflared/

# Copy config
sudo mkdir -p /etc/cloudflared
sudo cp /path/to/config.yml /etc/cloudflared/

# Install as service
sudo cloudflared service install

# Start
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 6: Setup Claude Code

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# The ~/.claude directory should already be copied from backup
# Verify skills are present
ls ~/.claude/skills/

# Set API key
export ANTHROPIC_API_KEY=sk-ant-...
```

### Step 7: Setup SSD Mount (if using external SSD)

```bash
# Find device
lsblk

# Create mount point
sudo mkdir -p /media/ace/T7

# Mount (adjust device name)
sudo mount /dev/sda1 /media/ace/T7

# Create symlink
sudo ln -s /media/ace/T7/dev /data

# Add to fstab for auto-mount
echo "UUID=<your-uuid> /media/ace/T7 exfat defaults,nofail 0 0" | sudo tee -a /etc/fstab
```

### Step 8: Setup Auto-Start

```bash
crontab -e
# Add:
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

### Step 9: Verify Everything

```bash
# Start services
./infra/scripts/start_all.sh

# Check status
./infra/scripts/status.sh

# Test locally
curl http://localhost:3000
curl http://localhost:8000/docs

# Test via tunnel
curl https://orpheuscore.uk
curl https://api.orpheuscore.uk/docs
```

---

## Important Files Summary

| File | Purpose |
|------|---------|
| `/home/ace/dev/ACe_Toolkit/` | Main application |
| `/home/ace/dev/ACe_Toolkit/apps/api/.env` | Backend secrets |
| `/home/ace/dev/ACe_Toolkit/apps/web/.env.local` | Frontend config |
| `/home/ace/dev/ACe_Toolkit/apps/api/app.db` | SQLite database |
| `/home/ace/.claude/` | Claude Code config & skills |
| `/home/ace/.credentials/credentials.json` | Centralized API keys |
| `/home/ace/.ccresearch_allowed_emails.json` | CCResearch whitelist |
| `/home/ace/.cloudflared/` | Tunnel credentials |
| `/etc/cloudflared/config.yml` | Tunnel config |
| `/data/users/` | User data storage |

---

## Contacts & Resources

- **GitHub:** https://github.com/ace26597/ACe_Toolkit
- **Production:** https://orpheuscore.uk
- **API Docs:** https://api.orpheuscore.uk/docs
- **Cloudflare Dashboard:** https://dash.cloudflare.com

---

*This document should be updated whenever significant changes are made to the setup.*
