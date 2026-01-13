# ACe_Toolkit

A full-stack productivity toolkit for creating, editing, and managing Mermaid diagrams and notes. Features AI-powered diagram generation using Claude, running on Raspberry Pi 5 with Cloudflare Tunnel for global access.

## Live App

| Service | URL |
|---------|-----|
| **Frontend** | https://mumbai-exempt-chess-determines.trycloudflare.com |
| **Backend API** | https://bears-valium-holmes-cheap.trycloudflare.com |
| **API Docs** | https://bears-valium-holmes-cheap.trycloudflare.com/docs |

> Note: URLs are temporary (Cloudflare Quick Tunnels). They change on restart.

## Quick Start

```bash
# One-command setup for Raspberry Pi 5
./infra/scripts/dev_setup.sh

# Then run both servers
npm run dev:api   # Terminal 1: Backend on :8000
npm run dev:web   # Terminal 2: Frontend on :3000
```

## Features

- **Document-Based Workflow**: Upload markdown files to automatically extract and organize Mermaid charts
- **Bidirectional Sync**: Edits to diagrams automatically update the source markdown file
- **Multi-Project Hierarchy**: Organize charts within documents or as standalone diagrams
- **Diagram Editions**: Version control for diagram changes with descriptions
- **AI-Powered Generation**: Create, repair, and enhance diagrams using Claude (Anthropic)
- **Session-Based Storage**: No authentication required for basic usage
- **Notes Application**: Markdown-enabled note-taking with project organization
- **Export Functionality**: Export diagrams as images/PDF
- **Multiple Diagram Types**: Flowcharts, sequence, class, state, ER, Gantt, pie, journey, git graph, mindmap, timeline, quadrant, requirement diagrams

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.13+, SQLAlchemy, Pydantic |
| Code Editor | Monaco Editor |
| Diagrams | Mermaid 11+ with ELK layout |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT with HTTPOnly cookies |
| AI | Anthropic Claude API (Sonnet 4) |
| Hosting | Raspberry Pi 5 + Cloudflare Tunnel |

## Project Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/          # Next.js 16 Frontend
│   └── api/          # FastAPI Backend
├── infra/
│   └── scripts/      # Setup and deployment scripts
├── packages/         # Shared code (future)
├── CLAUDE.md         # AI assistant documentation
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ (for Frontend)
- Python 3.11+ (3.13 recommended for Raspberry Pi 5)
- Cloudflare Tunnel (for external access)

### Raspberry Pi 5 Setup

```bash
# Clone the repo
git clone https://github.com/ace26597/ACe_Toolkit.git
cd ACe_Toolkit

# Run setup script (installs both frontend and backend)
./infra/scripts/dev_setup.sh

# Start servers
npm run dev:api   # Backend
npm run dev:web   # Frontend
```

### Manual Setup

#### Backend
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd apps/web
npm install
npm run dev
```

### External Access (Cloudflare Tunnel)

```bash
# Install cloudflared
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i /tmp/cloudflared.deb

# Quick tunnel (temporary URLs)
cloudflared tunnel --url http://localhost:3000  # Frontend
cloudflared tunnel --url http://localhost:8000  # Backend
```

## Environment Variables

### Backend (`apps/api/.env`)
```env
DATABASE_URL=sqlite+aiosqlite:///./app.db
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# For external access, use your backend tunnel URL:
# NEXT_PUBLIC_API_BASE_URL=https://your-backend.trycloudflare.com
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /ai/generate` | AI-powered diagram generation using Claude |
| `GET/POST /projects` | Project management |
| `GET/POST /charts` | Chart CRUD operations |
| `GET/POST /session-notes` | Notes management |
| `POST /export` | Export diagrams to image/PDF |
| `POST /auth/*` | Authentication endpoints |

## Security

- **JWT**: Tokens stored in HTTPOnly SameSite=Lax cookies
- **CORS**: Restricted to configured domains
- **Network**: No exposed ports; Cloudflare Tunnel handles ingress
- **Firewall**: UFW configured to allow only SSH

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive developer documentation including:
- Complete API reference
- Database schema
- Code conventions
- AI assistant guidelines

## License

MIT
