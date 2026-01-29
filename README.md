# 🧪 C3 Researcher — Turn Any Device Into Your Personal AI Research Lab

<p align="center">
  <strong>Deploy Claude Code with 145+ scientific skills on a Raspberry Pi or old laptop.<br/>
  Access your AI researcher from anywhere. Share with family. Pay pennies.</strong>
</p>

<p align="center">
  <a href="https://orpheuscore.uk">Live Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-why-self-host">Why Self-Host?</a> •
  <a href="#-hardware-guide">Hardware Guide</a>
</p>

---

## 🎯 What Is This?

**C3 Researcher** (Claude Code Custom Researcher) is a self-hosted AI research platform that gives you:

- **Full Claude Code Terminal** — Not a wrapper, the real thing with all capabilities
- **145+ Scientific Skills** — PubMed, ChEMBL, RDKit, PyTorch, clinical trials, and more
- **34 MCP Servers** — Direct access to scientific databases and utilities
- **Access From Anywhere** — Cloudflare Tunnel = free HTTPS, no port forwarding
- **Mobile Support** — Works on iPhone, Android, tablets
- **Multi-User** — Share with family/friends, everyone gets isolated storage

### The Problem It Solves

Claude Code is powerful, but:
- Running it locally ties up your main machine
- API costs add up fast for heavy research use
- No easy way to share access with others
- Mobile access is limited

### The Solution

Run C3 Researcher on a **$80 Raspberry Pi** (or any old laptop):
- 24/7 availability without tying up your computer
- Share a single Anthropic API key across trusted users
- Access from any device, anywhere
- All the Claude Code skills, pre-configured

---

## 💡 Why Self-Host?

| Benefit | Details |
|---------|---------|
| **Cost Sharing** | One API key, multiple users. Split costs with family/research group |
| **Always On** | Pi runs 24/7 for ~$5/year electricity. Your laptop stays free |
| **Access Anywhere** | Cloudflare Tunnel gives you free HTTPS from any device |
| **Data Control** | Your research stays on your hardware, not in the cloud |
| **No Rate Limits** | Use your own API key at your own pace |
| **Mobile Research** | Full terminal access from your phone |

### Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Raspberry Pi 5 (8GB) | ~$80 | Or use an old laptop for $0 |
| MicroSD / SSD | ~$20 | 128GB+ recommended |
| Power + Case | ~$15 | Optional but recommended |
| Cloudflare Tunnel | **Free** | No monthly fees |
| Domain (optional) | ~$10/year | Or use free .tk/.ml domains |
| Electricity | ~$5/year | Pi uses 5-15W |
| **Total** | **~$115** | One-time cost (or $0 with old laptop) |

Then just share your Anthropic API key costs across users.

---

## 🚀 Quick Start

### Option 1: Raspberry Pi (Recommended)

```bash
# 1. Flash Raspberry Pi OS (64-bit) to SD card
# 2. Enable SSH, connect to network

# 3. SSH into your Pi
ssh pi@raspberrypi.local

# 4. Clone and setup
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# 5. Run the installer (sets up Python, Node, deps)
./infra/scripts/setup.sh

# 6. Configure API keys
cp apps/api/.env.example apps/api/.env
nano apps/api/.env  # Add your ANTHROPIC_API_KEY

# 7. Start services
./infra/scripts/start_all.sh

# 8. Access locally
# http://raspberrypi.local:3000
```

### Option 2: Old Laptop / Desktop

```bash
# Works on any Linux/macOS/WSL machine with:
# - Python 3.11+
# - Node.js 18+
# - 4GB+ RAM

git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# Backend
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys

# Frontend
cd ../web
npm install

# Start
cd ../..
./infra/scripts/start_all.sh
```

### Option 3: Docker (Coming Soon)

```bash
# One-liner deployment
docker-compose up -d
```

---

## 🌐 Access From Anywhere (Cloudflare Tunnel)

**Free, secure, no port forwarding required.**

```bash
# 1. Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 2. Login (opens browser)
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create c3researcher

# 4. Configure (edit with your domain)
cat > ~/.cloudflared/config.yml << EOF
tunnel: YOUR-TUNNEL-ID
credentials-file: /home/pi/.cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: research.yourdomain.com
    service: http://localhost:3000
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# 5. Route DNS
cloudflared tunnel route dns c3researcher research.yourdomain.com
cloudflared tunnel route dns c3researcher api.yourdomain.com

# 6. Run as service (auto-starts on boot)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Result:** `https://research.yourdomain.com` works from anywhere!

---

## 🔬 What's Included

### Scientific Skills (145+)

| Category | Examples |
|----------|----------|
| **Literature** | PubMed, bioRxiv, Semantic Scholar, arXiv |
| **Drug Discovery** | ChEMBL, RDKit, DeepChem, PubChem |
| **Clinical Trials** | ClinicalTrials.gov, AACT (566K+ trials) |
| **Genomics** | BioPython, Scanpy, UniProt, Ensembl |
| **Medical Coding** | ICD-10, NPI Registry, CMS Coverage |
| **Data Science** | Pandas, Plotly, scikit-learn, PyTorch |
| **Document Generation** | PDF, DOCX, XLSX, PPTX, LaTeX |

### MCP Servers (26)

- **Scientific:** PubMed, bioRxiv, ChEMBL, ClinicalTrials.gov, AACT, CMS Coverage, NPI Registry, ICD-10, HuggingFace
- **Utility:** Memory, Filesystem, Git, SQLite, Playwright, Sequential Thinking

### Applications

| App | Description |
|-----|-------------|
| **C3 Researcher Workspace** | Full Claude Code terminal with notes, files, and project management |
| **C3 Data Studio** | Upload data → AI analysis → Auto-generated dashboards |
| **Remotion Video Studio** | Describe a video → Claude builds and renders it |

---

## 📱 Mobile Support

C3 Researcher is fully responsive:

- Bottom navigation for easy thumb access
- Mobile keyboard input for terminal
- Touch-optimized file browser
- Works on iPhone 12+ / Android

---

## 👥 Multi-User Setup

Each user gets isolated storage:

```
/data/users/
├── user-1-uuid/
│   └── projects/
├── user-2-uuid/
│   └── projects/
└── user-3-uuid/
    └── projects/
```

**User types:**
- **Trial** — 24-hour full access (for testing)
- **Approved** — Full access (admin approves)
- **Admin** — Full access + user management

---

## 🛠️ Installing Skills

Skills are pre-configured in `.claude/skills/`. To add new ones:

```bash
# 1. Browse community skills
# https://github.com/anthropics/claude-code-skills

# 2. Clone skill to your installation
cd ~/.claude/skills
git clone https://github.com/someone/new-skill.git

# 3. Restart terminal session
# Skill is now available
```

### Creating Custom Skills

```bash
mkdir -p .claude/skills/my-skill
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
# My Custom Skill

Description of what this skill does.

## Commands

- `/my-command` - Does something useful

## Usage

```
/my-command arg1 arg2
```
EOF
```

---

## 📊 Hardware Recommendations

### Minimum (Raspberry Pi 4, 4GB)
- Works for 1-2 users
- Slower cold starts
- Fine for light research

### Recommended (Raspberry Pi 5, 8GB)
- Fast, responsive
- 3-5 concurrent users
- Good for heavy research
- **This is what we run**

### Power User (Old Laptop/Mini PC)
- 16GB+ RAM
- SSD storage
- Best performance
- Many concurrent users

### Storage

- **128GB minimum** — OS + apps + some projects
- **512GB+ recommended** — Large datasets, video projects
- **External SSD** — Expand anytime via USB

---

## 🔒 Security Notes

- All traffic encrypted via Cloudflare Tunnel (HTTPS)
- JWT authentication with HTTP-only cookies
- Per-user data isolation
- No data leaves your hardware (except API calls to Anthropic)

**Important:** This is designed for trusted users (family, close colleagues). Don't expose to the public internet without additional hardening.

---

## 🗺️ Roadmap

### Now (Free)
- [x] Full Claude Code terminal
- [x] 145+ scientific skills
- [x] Multi-user support
- [x] Mobile responsive
- [x] Data Studio dashboards
- [x] Video Studio

### Coming Soon
- [ ] Docker one-liner deployment
- [ ] Team workspaces
- [ ] Usage analytics
- [ ] Plugin marketplace
- [ ] Hosted option (for those who don't want to self-host)

### Future (Pro Tier)
- [ ] Priority support
- [ ] Custom skill development
- [ ] Enterprise features
- [ ] SLA guarantees

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Developer guide, full API reference |
| [apps/web/CLAUDE.md](./apps/web/CLAUDE.md) | Frontend documentation |
| [apps/api/CLAUDE.md](./apps/api/CLAUDE.md) | Backend documentation |
| [docs/PI_SETUP_MANUAL.md](./docs/PI_SETUP_MANUAL.md) | Detailed Pi setup guide |

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-thing`
3. Make changes
4. Test locally
5. Submit PR

---

## 📄 License

MIT License — Use it however you want.

---

## 🙏 Built With

- [Claude Code](https://claude.ai/claude-code) by Anthropic
- [Next.js](https://nextjs.org) / [FastAPI](https://fastapi.tiangolo.com)
- [Remotion](https://remotion.dev) for video
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [xterm.js](https://xtermjs.org)

---

<p align="center">
  <strong>Turn your old hardware into an AI research powerhouse.</strong><br/>
  <a href="https://orpheuscore.uk">Try the Demo</a> •
  <a href="https://github.com/ace26597/ACe_Toolkit">Star on GitHub</a>
</p>
