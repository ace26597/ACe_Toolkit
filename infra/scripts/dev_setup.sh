#!/bin/bash
# Development Setup for Raspberry Pi 5 (aarch64)
# This script sets up both backend and frontend for local development
set -e

echo "ACe_Toolkit Development Setup for Raspberry Pi 5"
echo "================================================="

# Detect script location and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Project root: $PROJECT_ROOT"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Install with: sudo apt install nodejs npm"
    exit 1
fi
echo "Node.js: $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 not found. Install with: sudo apt install python3 python3-venv"
    exit 1
fi
echo "Python: $(python3 --version)"

# Frontend setup
echo ""
echo "Setting up Frontend (apps/web)..."
cd "$PROJECT_ROOT/apps/web"
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "node_modules exists, skipping npm install (run 'npm install' manually if needed)"
fi

# Backend setup
echo ""
echo "Setting up Backend (apps/api)..."
cd "$PROJECT_ROOT/apps/api"

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment and installing dependencies..."
source .venv/bin/activate

# Check if pip install is needed
if ! pip show fastapi &> /dev/null; then
    echo "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "Dependencies appear installed, run 'pip install -r requirements.txt' manually if needed"
fi

# Verify pydantic-core has prebuilt wheel (not building from source)
echo ""
echo "Verifying pydantic-core installation..."
PYDANTIC_CORE_VERSION=$(pip show pydantic-core 2>/dev/null | grep "^Version:" | cut -d' ' -f2)
if [ -n "$PYDANTIC_CORE_VERSION" ]; then
    echo "pydantic-core $PYDANTIC_CORE_VERSION installed successfully"
else
    echo "WARNING: pydantic-core not found. Run 'pip install -r requirements.txt'"
fi

# Create .env if missing
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env - please edit with your settings"
    else
        cat > .env << 'EOF'
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-this-secret-key
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your-openai-key
EOF
        echo "Created default .env - please edit with your settings"
    fi
fi

echo ""
echo "================================================="
echo "Setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1 (Backend):  cd apps/api && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "  Terminal 2 (Frontend): cd apps/web && npm run dev"
echo ""
echo "Or from project root:"
echo "  npm run dev:api   (Backend)"
echo "  npm run dev:web   (Frontend)"
echo ""
