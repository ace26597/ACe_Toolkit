# ACe_Toolkit

A full-stack productivity toolkit for creating, editing, and managing Mermaid diagrams and notes. Features AI-powered diagram generation using Claude (Anthropic), running on Raspberry Pi 5 with Cloudflare Tunnel for secure global access.

## 🌐 Live App

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://ai.ultronsolar.in | ✅ Live |
| **Backend API** | https://api.ultronsolar.in | ✅ Live |
| **API Docs** | https://api.ultronsolar.in/docs | ✅ Live |

> **Deployment:** Hosted on Raspberry Pi 5 (Bookworm, 8GB RAM) with Cloudflare Tunnel for secure external access. Auto-starts on boot via systemd + crontab.

---

## ✨ Features

### Core Functionality
- 📊 **Document-Based Workflow** - Upload markdown files to auto-extract and organize Mermaid charts
- 🔄 **Bidirectional Sync** - Chart edits automatically update source markdown files
- 📁 **Multi-Project Hierarchy** - Organize charts within documents or as standalone diagrams
- 📝 **Diagram Editions** - Built-in version control for diagram changes with descriptions
- 🤖 **AI-Powered Generation** - Create, repair, and enhance diagrams using Claude (Anthropic)
- 💾 **Session-Based Storage** - No authentication required for basic usage
- 📓 **Notes Application** - Markdown-enabled note-taking with auto-save and project organization
- 📤 **Export Functionality** - Export diagrams as PNG, SVG, or PDF
- 🎨 **Multiple Diagram Types** - Flowcharts, sequence, class, state, ER, Gantt, pie, journey, git graph, mindmap, timeline, quadrant, requirement diagrams

### Technical Features
- ⚡ **Real-time Auto-save** - Automatic project/chart sync every 2 seconds
- 🌙 **Monaco Editor** - VSCode-like editing experience with syntax highlighting
- 🔒 **Secure Deployment** - HTTPS via Cloudflare Tunnel, no exposed ports
- 🔄 **Auto-start on Reboot** - Services automatically restart after system reboot
- 💾 **Persistent Storage** - SQLite database survives reboots and updates

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Frontend** | Next.js (App Router) | 16.1.1 |
| | React | 19.2.3 |
| | TypeScript | 5 |
| | Tailwind CSS | 4 |
| **Backend** | FastAPI | 0.109.0 |
| | Python | 3.11+ (3.13 on Pi) |
| | SQLAlchemy | 2.0+ |
| **Code Editor** | Monaco Editor | 4.6.0 |
| **Diagrams** | Mermaid | 11.12.2 |
| | ELK.js (graph layout) | 0.11.0 |
| **Database** | SQLite (dev/prod) | - |
| **Auth** | JWT + HTTPOnly cookies | - |
| **AI** | Anthropic Claude API | Sonnet 4.5 |
| **Hosting** | Raspberry Pi 5 | Bookworm 64-bit |
| **Tunnel** | Cloudflare Tunnel | - |

---

## 📁 Project Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/                    # Next.js 16 Frontend (Turbopack)
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Home page
│   │   │   ├── mermaid/        # Mermaid diagram editor
│   │   │   └── notes/          # Notes application
│   │   ├── components/         # React components
│   │   ├── lib/                # API client & utilities
│   │   └── public/             # Static assets
│   │
│   └── api/                    # FastAPI Backend
│       ├── app/
│       │   ├── main.py         # FastAPI entry point
│       │   ├── routers/        # API endpoints
│       │   ├── models/         # SQLAlchemy models
│       │   ├── core/           # Config, database, security
│       │   └── schemas.py      # Pydantic schemas
│       └── requirements.txt
│
├── infra/
│   └── scripts/                # Deployment & setup scripts
│       ├── start_all.sh        # Start backend + frontend
│       ├── stop_all.sh         # Stop all services
│       ├── status.sh           # System status dashboard
│       └── CUSTOM_DOMAIN_SETUP.md  # Cloudflare setup guide
│
├── CLAUDE.md                   # Comprehensive dev documentation
├── DATA_PERSISTENCE.md         # Data storage & backup guide
├── DEPLOYMENT_SUMMARY.md       # Production deployment info
└── README.md                   # This file
```

---

## 🚀 Quick Start

### One-Command Setup (Raspberry Pi)

```bash
# Clone the repository
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# Run automated setup (installs dependencies)
./infra/scripts/dev_setup.sh

# Start all services
./infra/scripts/start_all.sh
```

**Access locally:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📋 Prerequisites

### Required
- **Node.js** 18+ (for Frontend)
- **Python** 3.11+ (3.13 recommended for Raspberry Pi 5)
- **npm** or **yarn** (package manager)

### Optional (for external access)
- **Cloudflare Account** (free tier works)
- **cloudflared** CLI tool
- **Custom domain** (optional, can use trycloudflare.com)

---

## 🔧 Manual Setup

### Backend Setup

```bash
cd apps/api

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend runs on:** http://localhost:8000

### Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

**Frontend runs on:** http://localhost:3000

---

## 🌍 Cloudflare Tunnel Setup (External Access)

### Quick Tunnel (Temporary URLs)

```bash
# Install cloudflared
curl -L --output /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i /tmp/cloudflared.deb

# Run quick tunnel (generates temporary URL)
cloudflared tunnel --url http://localhost:3000  # Frontend
cloudflared tunnel --url http://localhost:8000  # Backend
```

### Named Tunnel (Permanent Custom Domain)

For production with custom domain (e.g., `ai.ultronsolar.in`):

```bash
# 1. Login to Cloudflare
cloudflared tunnel login

# 2. Create tunnel
cloudflared tunnel create acetoolkit

# 3. Configure tunnel (see infra/scripts/CUSTOM_DOMAIN_SETUP.md)
nano ~/.cloudflared/config.yml

# 4. Route DNS
cloudflared tunnel route dns acetoolkit ai.ultronsolar.in

# 5. Install as service (auto-start on boot)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Full guide:** See `infra/scripts/CUSTOM_DOMAIN_SETUP.md` for complete setup instructions.

---

## ⚙️ Configuration

### Backend Environment (`apps/api/.env`)

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./app.db

# Security
SECRET_KEY=your-secure-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS - Update with your domains
ALLOWED_ORIGINS=["http://localhost:3000","https://ai.ultronsolar.in"]

# AI
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Frontend Environment (`apps/web/.env.local`)

```env
# API URL - Update based on deployment
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production with custom domain:
# NEXT_PUBLIC_API_URL=https://api.ultronsolar.in
```

---

## 📡 API Endpoints

### Projects & Charts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/` | List all projects |
| POST | `/projects/` | Create new project |
| POST | `/projects/sync` | Bulk sync projects |
| GET | `/charts/{id}` | Get specific chart |
| POST | `/charts/` | Create new chart |
| PUT | `/charts/{id}` | Update chart |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/generate` | Generate/repair diagrams using Claude |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/session-notes/projects` | List note projects |
| POST | `/session-notes/note` | Create note |
| PUT | `/session-notes/note/{id}` | Update note |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/export/` | Export diagram to image/PDF |

**Full API documentation:** Visit `/docs` endpoint on backend server

---

## 🔒 Security

### Authentication
- **JWT tokens** with HTTPOnly SameSite=Lax cookies
- **Refresh tokens** with 30-day expiration
- **Access tokens** with 15-minute expiration

### Network Security
- **Cloudflare Tunnel** - No exposed ports on router
- **HTTPS** - Automatic SSL via Cloudflare
- **CORS** - Restricted to specific domains only
- **UFW Firewall** - Only SSH port exposed

### Data Protection
- All sensitive files protected via `.gitignore`
- Database files never committed to git
- Environment variables stored locally only
- Cloudflare credentials encrypted at rest

---

## 💾 Data Persistence

### Database
- **Location:** `apps/api/mermaid.sqlite`
- **Contents:** Projects, charts, notes, user data
- **Backup:** Recommended daily backups (see `DATA_PERSISTENCE.md`)

### Auto-Save
- Projects auto-sync every 2 seconds
- Charts save on edit
- Notes save on change
- All data survives reboots

**Backup guide:** See `DATA_PERSISTENCE.md` for backup strategies

---

## 🛠️ Management Commands

### Start/Stop Services

```bash
# Start all (backend + frontend)
./infra/scripts/start_all.sh

# Stop all
./infra/scripts/stop_all.sh

# Check status
./infra/scripts/status.sh
```

### View Logs

```bash
# Backend logs
tail -f logs/backend-$(date +%Y%m%d).log

# Frontend logs
tail -f logs/frontend-$(date +%Y%m%d).log

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

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Comprehensive developer guide, API reference, conventions |
| [DATA_PERSISTENCE.md](./DATA_PERSISTENCE.md) | Data storage locations, backup strategies |
| [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) | Production deployment status, troubleshooting |
| [infra/scripts/CUSTOM_DOMAIN_SETUP.md](./infra/scripts/CUSTOM_DOMAIN_SETUP.md) | Cloudflare Tunnel setup guide |

---

## 🐛 Troubleshooting

### Frontend can't connect to backend

**Symptom:** `Failed to fetch` or `net::ERR_CONNECTION_REFUSED` errors

**Solution:**
1. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Verify backend is running: `ps aux | grep uvicorn`
3. Rebuild frontend: `cd apps/web && npm run build`

### Data not saving

**Check:**
1. Backend running: `./infra/scripts/status.sh`
2. CORS configured: Check `apps/api/.env` → `ALLOWED_ORIGINS`
3. Database writable: `ls -la apps/api/mermaid.sqlite`

### Services don't auto-start on reboot

**Check:**
1. Crontab configured: `crontab -l`
2. Cloudflared service enabled: `sudo systemctl status cloudflared`
3. Logs: `cat logs/startup-$(date +%Y%m%d).log`

**More troubleshooting:** See `DEPLOYMENT_SUMMARY.md`

---

## 🎯 Development Workflow

### Git Workflow

All feature branches must follow this pattern:
```bash
git checkout -b claude/<description>-<SESSION_ID>
```

Example: `claude/add-export-feature-ABC123`

**Commit conventions:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `chore:` Maintenance

### Running Tests

```bash
# Backend (coming soon)
cd apps/api
pytest

# Frontend linting
cd apps/web
npm run lint
```

---

## 📊 Performance

**Raspberry Pi 5 Stats:**
- CPU: ARM Cortex-A76 (4 cores @ 2.4GHz)
- RAM: 8GB LPDDR4X
- Storage: 256GB microSD
- Network: Gigabit Ethernet

**Resource Usage:**
- Backend: ~100 MB RAM
- Frontend: ~140 MB RAM
- Database: ~76 KB (grows with usage)
- Disk: ~12 GB total

**Response Times:**
- Local: 10-100 ms
- Via Cloudflare: 200-500 ms

---

## 🤝 Contributing

Contributions welcome! Please:

1. Read `CLAUDE.md` for code conventions
2. Create feature branch: `claude/your-feature-SESSION`
3. Write clear commit messages
4. Test changes locally
5. Submit pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Mermaid.js** - Diagram rendering
- **Monaco Editor** - Code editing
- **FastAPI** - Backend framework
- **Next.js** - Frontend framework
- **Anthropic Claude** - AI-powered generation
- **Cloudflare** - Secure tunneling

---

## 📞 Support

- **Documentation:** See `CLAUDE.md` for detailed guides
- **Issues:** Open an issue on GitHub
- **Deployment:** See `DEPLOYMENT_SUMMARY.md`

---

**Built with ❤️ on Raspberry Pi 5**

**Live at:** https://ai.ultronsolar.in
