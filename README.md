# ACe_Toolkit

A comprehensive AI-powered research platform featuring **C3 Researcher Workspace**, **C3 Data Studio**, and **Remotion Video Studio**. Built for scientists, researchers, and developers who need powerful AI tools for data analysis, literature review, and content creation.

## 🌐 Live Platform

| Service | URL | Status |
|---------|-----|--------|
| **Platform** | https://orpheuscore.uk | ✅ Live |
| **API** | https://api.orpheuscore.uk | ✅ Live |
| **API Docs** | https://api.orpheuscore.uk/docs | ✅ Live |

> **Deployment:** Self-hosted on Raspberry Pi 5 with Cloudflare Tunnel for secure global access.

---

## ✨ Applications

### 🔬 C3 Researcher Workspace

**Claude Code Custom Researcher** - A fully-featured AI research terminal with unprecedented access to scientific tools and databases.

| Feature | Details |
|---------|---------|
| **Skills** | 145+ scientific skills (PubMed, UniProt, RDKit, PyTorch, etc.) |
| **MCP Servers** | 26 active servers (11 scientific, 2 AI, 13 utility) |
| **Plugins** | 14 specialized plugins |
| **Databases** | 30+ accessible databases including AACT (566K+ clinical trials) |

**Key Features:**
- 📱 **Mobile Responsive** - Works on iPhone, Android, iPad
- 🖥️ **Full Terminal** - Claude Code with all capabilities
- 📝 **Markdown Notes** - With live preview, Mermaid diagrams
- 📁 **File Browser** - Upload, preview, manage files
- 🔄 **Session Persistence** - Resume where you left off

**Scientific Capabilities:**
- Literature search (PubMed, bioRxiv, Semantic Scholar)
- Drug discovery (ChEMBL, RDKit, DeepChem)
- Clinical trials (ClinicalTrials.gov API, AACT SQL)
- Genomics (BioPython, Scanpy, scvi-tools)
- Medical coding (ICD-10, NPI Registry, CMS Coverage)

### 📊 C3 Data Studio

**AI-Powered Data Analysis** - Upload files and get auto-generated dashboards with natural language editing.

**Workflow:**
1. Create project & upload data (CSV, JSON, Excel, Parquet)
2. AI analyzes data patterns and relationships
3. Auto-generates 5-10 interactive Plotly widgets
4. Customize with natural language ("Add a pie chart for categories")

**Features:**
- Multi-file analysis (combined or separate modes)
- Live terminal output during analysis
- NLP-based widget editing
- Stat cards, histograms, bar/line/pie charts, scatter plots

### 🎬 Remotion Video Studio

**AI Video Creation** - Real Claude Code terminal with Remotion for video production.

**Workflow:**
1. Create project (auto-scaffolds npm + Remotion)
2. Enter video idea
3. Watch Claude research, plan, build, and render
4. Download finished MP4

**Features:**
- Full PTY terminal (not headless)
- Per-user isolated npm projects
- All Claude Code capabilities available
- Video gallery sidebar

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic |
| **Terminal** | xterm.js 5.5, WebSocket PTY |
| **Charts** | Plotly.js, react-plotly.js |
| **Video** | Remotion |
| **Auth** | JWT + HTTPOnly cookies |
| **Hosting** | Raspberry Pi 5 + Cloudflare Tunnel |

---

## 📁 Project Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── app/                # App Router pages
│   │   │   ├── workspace/      # C3 Researcher Workspace
│   │   │   ├── data-studio/    # C3 Data Studio
│   │   │   ├── video-studio/   # Remotion Video Studio
│   │   │   └── ccresearch/     # Tips, use-cases, shares
│   │   ├── components/         # React components
│   │   ├── data/               # JSON data files
│   │   └── lib/                # API client
│   │
│   └── api/                    # FastAPI Backend
│       ├── app/
│       │   ├── routers/        # API endpoints
│       │   ├── core/           # Managers, config
│       │   └── models/         # SQLAlchemy models
│       └── requirements.txt
│
├── infra/scripts/              # Deployment scripts
├── logs/                       # Application logs
├── CLAUDE.md                   # Developer documentation
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# Backend setup
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your API keys

# Frontend setup
cd ../web
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local

# Start services
cd ../..
./infra/scripts/start_all.sh
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🔬 C3 Researcher Capabilities

### MCP Servers (26 Active)

**Scientific (11):**
- PubMed, bioRxiv/medRxiv, ChEMBL, ClinicalTrials.gov, AACT
- CMS Medicare Coverage, NPI Registry, ICD-10 Codes
- HuggingFace Hub, Open Targets, Medidata

**Utility (13):**
- Memory, Context7, Filesystem, Git, SQLite
- Playwright, Fetch, Time, Sequential Thinking
- MotherDuck, Cloudflare, Bitly, Mercury

### Plugins (14)

| Plugin | Description |
|--------|-------------|
| Scientific Skills | 145+ scientific tools |
| Document Skills | PDF, Excel, Word processing |
| HuggingFace Skills | Model/dataset integration |
| Feature Dev | Guided implementation |
| Code Simplifier | Refactoring tools |
| Plugin Dev | Plugin creation |
| Agent SDK Dev | Agent development |
| Frontend Design | UI/UX components |
| AI/Backend Skills | Development utilities |
| Context7 | Library documentation |
| Ralph Loop | Iterative refinement |
| AACT Clinical Trials | 566K+ trials SQL access |

### Example Prompts

```
# Literature Review
Search PubMed for CRISPR-Cas9 papers from 2024-2025. Summarize top 5.

# Drug Discovery
Search ChEMBL for EGFR inhibitors with IC50 < 100nM.

# Clinical Trials
Query AACT: Find Phase 3 oncology trials from last 5 years.

# Medical Coding
Look up ICD-10 codes for Type 2 Diabetes with complications.

# Data Analysis
Run /exploratory-data-analysis on my uploaded CSV file.
```

---

## 📱 Mobile Support

C3 Researcher Workspace is fully responsive:

- **Bottom Navigation** - Terminal, Notes, Data, Files tabs
- **Drawer Sidebar** - Project selection via hamburger menu
- **Mobile Terminal Input** - Soft keyboard support with quick actions
- **Touch Optimized** - Large tap targets, swipe gestures
- **Minimum Width** - 390px (iPhone 12+)

---

## 🔒 Authentication

| User Type | Access | Duration |
|-----------|--------|----------|
| Trial | Full access | 24 hours |
| Approved | Full access | 30 days |
| Admin | Full + user management | 30 days |

All data is isolated per user at `/data/users/{user-id}/`.

---

## 📡 API Overview

### Workspace
```
GET  /workspace/projects           # List projects
POST /workspace/projects           # Create project
GET  /workspace/projects/{name}/data  # List files
POST /workspace/projects/{name}/data  # Upload files
```

### CCResearch Terminal
```
POST /ccresearch/sessions          # Start session
WS   /ccresearch/terminal/{id}     # WebSocket PTY
GET  /ccresearch/sessions/{id}     # Session status
```

### Data Studio
```
POST /data-studio/projects         # Create project
POST /data-studio/analyze          # Run analysis
GET  /data-studio/dashboard/{id}   # Get dashboard
POST /data-studio/nlp-edit         # NLP widget edit
```

### Video Studio
```
POST /video-studio/projects        # Create project
POST /video-studio/session         # Start Claude session
WS   /video-studio/terminal/{name} # Terminal WebSocket
GET  /video-studio/videos/{name}   # List videos
```

Full API documentation at `/docs`.

---

## 🔧 Configuration

### Backend (`apps/api/.env`)
```env
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=["http://localhost:3000","https://orpheuscore.uk"]
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 📋 Management

```bash
# Start all services
./infra/scripts/start_all.sh

# Stop all services
./infra/scripts/stop_all.sh

# Check status
./infra/scripts/status.sh

# View logs
tail -f logs/backend-*.log
tail -f logs/frontend-*.log
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Developer guide, API reference |
| [apps/web/CLAUDE.md](./apps/web/CLAUDE.md) | Frontend documentation |
| [apps/api/CLAUDE.md](./apps/api/CLAUDE.md) | Backend documentation |

---

## 🤝 Contributing

1. Read `CLAUDE.md` for conventions
2. Create branch: `claude/<description>-<session-id>`
3. Make changes and test locally
4. Submit pull request

---

## 📄 License

MIT License - see LICENSE file.

---

## 🙏 Acknowledgments

- **Anthropic Claude** - AI backbone
- **Remotion** - Video rendering
- **xterm.js** - Terminal emulation
- **Plotly** - Interactive charts
- **Next.js / FastAPI** - Frameworks
- **Cloudflare** - Secure tunneling

---

**Built with ❤️ for researchers and scientists**

**Live at:** https://orpheuscore.uk
