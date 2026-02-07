# C3 Researcher — Self-Hosted AI Research Platform

<p align="center">
  <strong>Deploy Claude Code with 145+ scientific skills on any machine.<br/>
  Access your AI researcher from anywhere. Share with others. Own your data.</strong>
</p>

<p align="center">
  <a href="https://orpheuscore.uk">Live Demo</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-applications">Applications</a> &bull;
  <a href="#-openclaw--multi-agent-ai">OpenClaw</a> &bull;
  <a href="#-blog">Blog</a>
</p>

---

## What Is This?

**C3 Researcher** (Claude Code Custom Researcher) is a self-hosted AI research platform built with Next.js and FastAPI. It wraps Claude Code with scientific tooling, database access, and a web-based terminal you can use from any device.

**Three integrated applications:**

| App | What It Does |
|-----|--------------|
| **C3 Workspace** | Full Claude Code terminal with project management, notes, file browser, and 30+ database integrations |
| **C3 Data Studio** | Upload CSV/JSON/Excel/Parquet &rarr; AI analysis &rarr; auto-generated Plotly dashboards with NLP editing |
| **Remotion Video Studio** | Describe a video idea &rarr; Claude researches, scripts, builds, and renders it using Remotion |

**What's included:**
- **145+ Scientific Skills** &mdash; PubMed, ChEMBL, RDKit, clinical trials, genomics, document generation, and more
- **34 MCP Servers** &mdash; Direct programmatic access to scientific databases and utilities
- **15 Plugins** &mdash; Extended capabilities (code review, data analysis, prompt engineering, etc.)
- **Mobile Support** &mdash; Fully responsive, works on phones and tablets
- **Multi-User** &mdash; JWT auth with per-user data isolation

---

## Why Self-Host?

| Benefit | Details |
|---------|---------|
| **Cost Sharing** | One API key, multiple users. Split costs with a research group |
| **Always On** | Runs 24/7 on a Pi, old laptop, or Mac Mini |
| **Access Anywhere** | Cloudflare Tunnel gives you free HTTPS from any device |
| **Data Control** | Your research stays on your hardware |
| **Full Claude Code** | Not a wrapper &mdash; the real terminal with all capabilities |

### Hardware

| Setup | Notes |
|-------|-------|
| Raspberry Pi 5 (8GB) | ~$80. 3-5 users. Good for most research |
| Old Laptop / Mini PC | $0 if you have one. Best performance |
| Any Linux/macOS/WSL | Python 3.11+, Node.js 18+, 4GB+ RAM |

---

## Quick Start

```bash
# Clone
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# Backend
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add your ANTHROPIC_API_KEY

# Frontend
cd ../web
npm install

# Start
cd ../..
./infra/scripts/start_all.sh
# Visit http://localhost:3000
```

### Remote Access (Cloudflare Tunnel)

Free, secure, no port forwarding:

```bash
# Install cloudflared, login, create tunnel
cloudflared tunnel login
cloudflared tunnel create c3researcher

# Configure (edit with your domain)
# See docs/PI_SETUP_MANUAL.md for full guide

# Route DNS
cloudflared tunnel route dns c3researcher research.yourdomain.com
cloudflared tunnel route dns c3researcher api.yourdomain.com

# Run as service
sudo cloudflared service install
```

---

## Applications

### C3 Researcher Workspace

The core application. A full Claude Code terminal in the browser with:

- **Real PTY terminal** &mdash; not a chat wrapper, the actual Claude Code CLI
- **Project-based workspace** &mdash; notes, files, and terminal share context
- **30+ databases** &mdash; PubMed, ChEMBL, AACT (566K+ clinical trials), UniProt, ClinicalTrials.gov, ICD-10, NPI Registry, and more
- **Document generation** &mdash; PDF, DOCX, PPTX, XLSX, LaTeX
- **File browser** &mdash; upload, preview, edit files (markdown, CSV, Excel, images, code)
- **SSH mode** &mdash; optional SSH terminal access with directory selection
- **Session persistence** &mdash; resume previous Claude sessions
- **Git integration** &mdash; clone repos, manage code

### C3 Data Studio

Upload data, get AI-generated insights and dashboards:

- **Supported formats:** CSV, JSON, Excel (xlsx/xls), Parquet
- **Smart analysis:** Automatic type detection, statistical patterns, correlations
- **Auto dashboards:** 5-10 Plotly widgets generated from data characteristics
- **NLP editing:** "Add a pie chart for revenue by region" &mdash; Claude modifies the dashboard
- **Multi-file analysis:** Combined cross-file or separate per-file modes

### Remotion Video Studio

Describe a video and Claude builds it:

- **Full Remotion pipeline** &mdash; React-based video composition
- **Real terminal** &mdash; watch Claude research, plan, code, and render in real-time
- **Per-user projects** &mdash; isolated npm projects with Remotion scaffolding
- **Video gallery** &mdash; browse, play, and download rendered videos

---

## Scientific Capabilities

| Category | Examples |
|----------|----------|
| **Literature** | PubMed, bioRxiv, Semantic Scholar, arXiv, OpenAlex |
| **Drug Discovery** | ChEMBL, RDKit, DeepChem, PubChem, Open Targets |
| **Clinical Trials** | ClinicalTrials.gov, AACT (566K+ trials), CMS Coverage |
| **Genomics** | BioPython, Scanpy, UniProt, Ensembl, GEO |
| **Medical Coding** | ICD-10 (2026 codes), NPI Registry, CMS Coverage |
| **Data Science** | Pandas, Plotly, scikit-learn, PyTorch, statsmodels, SHAP |
| **Documents** | PDF, DOCX, XLSX, PPTX, LaTeX posters, scientific slides |
| **ML & AI** | HuggingFace models/datasets, transformers, PyTorch Lightning |

---

## OpenClaw & Multi-Agent AI

We experiment with **[OpenClaw](https://github.com/BandarLabs/openclaw)** for running autonomous AI agents. Our setup runs two agents 24/7:

| Agent | Role | Hardware | Model |
|-------|------|----------|-------|
| **Alfred** | Senior researcher, deep analysis, writing | Mac Mini | Claude Opus 4.5 |
| **Pip** | Fast triage, Discord/Telegram support, monitoring | Raspberry Pi 5 | GPT-5-nano + Ollama fallback |

Both agents share memory via a T7 SSD and coordinate through Discord channels. The system costs ~$35/month total (vs $150+ for a single heavy agent).

**What we've learned:**
- Multi-agent role separation reduces costs and improves response quality
- Local LLM fallback (Ollama + LLaMA 3.2) keeps Pip running even when APIs are down
- Shared context via filesystem is simpler and more reliable than vector databases for small teams
- Discord mention-based routing prevents agent chaos in shared channels

Read more in our blog posts below.

---

## Blog

Technical write-ups on AI agents, benchmarks, and research experiments:

| Post | Topic |
|------|-------|
| [OpenClaw Model Benchmark 2026](https://orpheuscore.uk/blog/openclaw-model-benchmark-2026) | 17 models, 8 tests &mdash; Claude Opus 4.6, GPT-5.2, O3, LLaMA, Gemma benchmarked for agent workloads |
| [How to Run AI Agents on Raspberry Pi](https://orpheuscore.uk/blog/openclaw-raspberry-pi-setup) | Step-by-step OpenClaw setup on Pi 5 with cost optimization and local LLM fallback |
| [Multi-Agent System: Alfred & Pip](https://orpheuscore.uk/blog/multi-agent-system-alfred-pip) | Building a two-agent system with shared memory, role specialization, and failover |
| [Discord Multi-Bot Brainstorming](https://orpheuscore.uk/blog/discord-multi-bot-brainstorm) | Running multiple AI bots in Discord with mention routing and coordination |
| [AI Agents vs ChatGPT Wrappers](https://orpheuscore.uk/blog/ai-agents-vs-wrappers) | Framework for thinking about real agents vs API wrappers, with business case analysis |
| [LangGraph: GPT-Researcher vs DeerFlow](https://orpheuscore.uk/blog/agentic-workflow-langgraph-comparison) | Architectural comparison of two multi-agent research frameworks |
| [AI Translation of Ancient Akkadian](https://orpheuscore.uk/blog/ai-ancient-akkadian-translation) | Using hybrid ML to translate 4,000-year-old Mesopotamian tablets |

We also maintain an **[Agent Diary](https://orpheuscore.uk/diary)** &mdash; daily logs from Alfred and Pip documenting what they work on, challenges they face, and what they learn.

---

## Multi-User Setup

JWT authentication with three tiers:

| Role | Access | Duration |
|------|--------|----------|
| **Trial** | Full access | 24 hours |
| **Approved** | Full access | 30 days (admin approves) |
| **Admin** | Full + user management | 30 days |

Each user gets isolated storage:
```
/data/users/{user-uuid}/
  projects/              # Workspace projects
  data-studio-projects/  # Data Studio projects
  video-studio/          # Video Studio projects
```

---

## Architecture

```
ACe_Toolkit/
  apps/
    web/          # Next.js frontend (App Router, Tailwind, xterm.js, Plotly)
    api/          # FastAPI backend (SQLAlchemy, WebSocket PTY, SSE)
    remotion/     # Remotion video template
  infra/scripts/  # Deployment and management scripts
```

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.11+, SQLAlchemy, SQLite |
| Terminal | xterm.js + WebSocket PTY |
| Charts | Plotly.js |
| Video | Remotion |
| Auth | JWT in HTTP-only cookies |
| Tunnel | Cloudflare Tunnel (free HTTPS) |
| Process Manager | PM2 |

---

## Security

- All traffic encrypted via Cloudflare Tunnel (HTTPS)
- JWT authentication with HTTP-only cookies and CSRF protection
- Per-user data isolation with path traversal prevention
- Rate limiting on auth endpoints (10 login/min, 5 register/min)
- Password policy enforcement (12+ chars, mixed case, digit, special)
- Security headers (HSTS, X-Frame-Options, CSP, X-Content-Type-Options)
- File upload validation with extension whitelist
- Secrets stored in centralized manager with 600 permissions (never in code)

> **Note:** Designed for trusted users (family, research group). Add additional hardening before public exposure.

---

## Roadmap

- [x] Full Claude Code terminal in browser
- [x] 145+ scientific skills, 34 MCP servers, 15 plugins
- [x] Data Studio with auto dashboards and NLP editing
- [x] Video Studio with Remotion
- [x] Blog and Agent Diary
- [x] Mobile responsive
- [x] Multi-user with trial system
- [ ] Docker one-liner deployment
- [ ] Team workspaces with shared projects
- [ ] Usage analytics dashboard
- [ ] Plugin marketplace

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Developer guide and full project reference |
| [apps/web/CLAUDE.md](./apps/web/CLAUDE.md) | Frontend documentation |
| [apps/api/CLAUDE.md](./apps/api/CLAUDE.md) | Backend API reference |

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and test locally
4. Submit a PR

---

## License

MIT License

---

## Built With

- [Claude Code](https://claude.ai/claude-code) by Anthropic
- [Next.js](https://nextjs.org) / [FastAPI](https://fastapi.tiangolo.com)
- [Remotion](https://remotion.dev) for video
- [OpenClaw](https://github.com/BandarLabs/openclaw) for multi-agent orchestration
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [xterm.js](https://xtermjs.org) / [Plotly.js](https://plotly.com/javascript/)
