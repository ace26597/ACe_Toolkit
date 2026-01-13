#!/bin/bash
# Install recommended development tools for ACe_Toolkit
# Based on rasppi.md analysis

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ACe_Toolkit - Development Tools Installation          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Warning: This script is designed for Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Installing recommended development tools..."
echo ""

# Update package list
echo "📦 Updating package list..."
sudo apt update -qq

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing Core Development Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Core tools
CORE_TOOLS="ripgrep fd-find fzf jq btop"
for tool in $CORE_TOOLS; do
    if dpkg -l | grep -q "^ii  $tool "; then
        echo "✓ $tool already installed"
    else
        echo "⬇ Installing $tool..."
        sudo apt install -y $tool >/dev/null 2>&1
        echo "✓ $tool installed"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing Python Tools Manager (pipx)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install pipx
if command -v pipx &> /dev/null; then
    echo "✓ pipx already installed"
else
    echo "⬇ Installing pipx..."
    sudo apt install -y pipx >/dev/null 2>&1
    pipx ensurepath >/dev/null 2>&1
    echo "✓ pipx installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing Python Development Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Python tools
if pipx list 2>/dev/null | grep -q "ruff"; then
    echo "✓ ruff already installed"
else
    echo "⬇ Installing ruff (Python linter)..."
    pipx install ruff >/dev/null 2>&1
    echo "✓ ruff installed"
fi

if pipx list 2>/dev/null | grep -q "httpie"; then
    echo "✓ httpie already installed"
else
    echo "⬇ Installing httpie (API testing tool)..."
    pipx install httpie >/dev/null 2>&1
    echo "✓ httpie installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Installed tools:"
echo ""
echo "  Core Tools:"
echo "    • ripgrep (rg)     - Fast code search"
echo "    • fd-find (fd)     - Fast file finder"
echo "    • fzf              - Fuzzy finder"
echo "    • jq               - JSON parser"
echo "    • btop             - System monitor"
echo ""
echo "  Python Tools:"
echo "    • ruff             - Python linter"
echo "    • httpie (http)    - API testing"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quick Usage Examples"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Search code:       rg \"TODO\" apps/"
echo "  Find files:        fd .tsx"
echo "  Fuzzy search:      history | fzf"
echo "  Parse JSON:        curl localhost:8000 | jq"
echo "  Test API:          http localhost:8000/docs"
echo "  Monitor system:    btop"
echo "  Lint Python:       ruff check apps/api/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Reload your shell to use pipx tools:"
echo "    source ~/.bashrc"
echo ""
echo "See SETUP_ANALYSIS.md for detailed usage examples!"
echo ""
