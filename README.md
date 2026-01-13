# Mermaid Monorepo

A hybrid personal platform for diagramming, running on Raspberry Pi (Backend) and Vercel (Frontend).

## Quick Start

Run both Backend and Frontend from the root directory:

```bash
# Terminal 1: Backend
npm run dev:api

# Terminal 2: Frontend
npm run dev:web
```

> [!NOTE]
> Docker is currently not required for local development and is intended for future production/Raspberry Pi deployment.

## Features

- **Document-Based Workflow**: Upload markdown files to automatically extract and organize Mermaid charts.
- **Bidirectional Sync**: Edits to diagrams automatically update the source markdown file.
- **Hierarchy**: Organize charts within documents or as standalone diagrams.
- **AI-Powered**: Repair and generate diagrams using AI.


---

## Project Structure

- `apps/web`: Next.js 14 App Router (Frontend)
- `apps/api`: FastAPI (Backend)
- `infra`: Docker Compose and Setup Scripts
- `packages/shared`: Shared types/code

## Getting Started

### Prerequisites
- Node.js 18+ (for Frontend)
- Python 3.11+ (for Backend)
- Docker (Optional: only for production deployment)


### 1. Backend Setup (Local)

1.  Navigate to the API directory:
    ```bash
    cd apps/api
    ```
2.  Create and activate a virtual environment:
    ```bash
    # Windows
    cd apps/api
    python -m venv .venv
    .venv\Scripts\activate
    uvicorn app.main:app --reload

    
    # macOS/Linux
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the dev server:
    ```bash
    uvicorn app.main:app --reload
    ```
    API will be at `http://localhost:8000`.

### 2. Frontend Setup (Local)

1.  Navigate to the web directory:
    ```bash
    cd apps/web
    npm install
    npm run dev
    ```
    Frontend will be at `http://localhost:3000`.


### 3. Raspberry Pi Deployment
1.  Copy `infra`, `apps/api` to the Pi.
2.  Run `infra/scripts/pi_setup.sh`.
3.  Run `docker-compose up -d --build` in `infra`.
4.  Setup Cloudflare Tunnel using `infra/scripts/run_tunnel.md`.

### Security Notes
- **JWT**: Tokens are stored in HTTPOnly SameSite=Lax cookies.
- **CORS**: Restricted to frontend domain only.
- **Network**: Pi exposes no ports locally; use Tunnel.