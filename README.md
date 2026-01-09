# Mermaid Monorepo

A hybrid personal platform for diagramming, running on Raspberry Pi (Backend) and Vercel (Frontend).

## Project Structure

- `apps/web`: Next.js 14 App Router (Frontend)
- `apps/api`: FastAPI (Backend)
- `infra`: Docker Compose and Setup Scripts
- `packages/shared`: Shared types/code

## Getting Started

### Prerequisites
- Docker (for Backend)
- Node.js 18+ (for Frontend)
- Python 3.11+ (for Backend dev)

### 1. Backend Setup (Local)
1.  Navigate to infra:
    ```bash
    cd infra
    docker-compose up -d
    ```
2.  Navigate to api:
    ```bash
    cd apps/api
    # Create virtual env
    python -m venv .venv
    .venv\Scripts\activate
    # Install deps
    pip install -r requirements.txt
    # Run dev server
    uvicorn app.main:app --reload
    ```
    API will be at `http://localhost:8000`.

### 2. Frontend Setup (Local)
**Note:** Ensure `create-next-app` has finished initializing.
1.  Navigate to web:
    ```bash
    cd apps/web
    ```
2.  Install additional dependencies (if not already installed):
    ```bash
    npm install mermaid @monaco-editor/react lucide-react axios js-cookie clsx tailwind-merge
    npm install -D @types/js-cookie @types/node @types/react @types/react-dom
    ```
3.  Run dev server:
    ```bash
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