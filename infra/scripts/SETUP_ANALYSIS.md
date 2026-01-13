# Pi Setup Analysis - rasppi.md Recommendations

**Date:** January 13, 2026

---

## ✅ What You Already Have

Based on your current setup:

| Tool | Status | Version | Notes |
|------|--------|---------|-------|
| **tmux** | ✅ Installed | - | Already using in auto-start! |
| **htop** | ✅ Installed | - | System monitoring |
| **ncdu** | ✅ Installed | - | Disk usage analyzer |
| **docker** | ✅ Installed | - | From pi_setup.sh |
| **Node.js** | ✅ Installed | v20.19.6 | Recent LTS, good! |
| **npm** | ✅ Installed | 10.8.2 | Recent version |
| **Python** | ✅ Installed | 3.13.5 | Very new! |

---

## 🎯 Recommended Additions (Worth Installing)

### High Priority - Very Useful for Your Workflow

```bash
sudo apt install -y \
  ripgrep \      # Fast code search (10x faster than grep)
  fd-find \      # Fast file finder (better than find)
  fzf \          # Fuzzy finder (amazing for CLI)
  jq \           # JSON parser (useful for API testing)
  btop           # Better htop with modern UI
```

**Why these?**
- **ripgrep (`rg`)**: Lightning-fast code search. When debugging or finding code, this is essential.
- **fd**: Find files fast. Better syntax than `find`.
- **fzf**: Fuzzy search everything. Great for command history, file navigation.
- **jq**: Parse JSON. Perfect for testing your FastAPI responses.
- **btop**: Beautiful system monitor. Better visualization than htop.

### Medium Priority - Nice to Have

```bash
# Python CLI tools isolation
sudo apt install -y pipx
pipx ensurepath

# Install Python dev tools via pipx
pipx install ruff        # Fast Python linter
pipx install httpie      # Better curl for APIs
```

**Why?**
- **pipx**: Isolates Python CLI tools (like npm -g but better)
- **ruff**: Super fast Python linting (useful for your FastAPI code)
- **httpie**: Human-friendly API testing (prettier than curl)

### Low Priority - Optional

```bash
# Debug tools (only if you need them)
sudo apt install -y \
  traceroute \
  dnsutils \      # dig, nslookup
  net-tools       # ifconfig (legacy but useful)
```

---

## 🚫 What NOT to Install (From rasppi.md)

### ❌ nvm (Node Version Manager)

**You don't need this!**
- You already have Node v20.19.6 (recent LTS)
- System Node works fine for your use case
- nvm adds complexity for minimal benefit

**Skip unless:** You need to switch Node versions frequently

### ❌ Tailscale

**You already have Cloudflare Tunnel!**

**Tailscale vs Cloudflare Tunnel:**
| Feature | Tailscale | Cloudflare Tunnel |
|---------|-----------|-------------------|
| Purpose | Private VPN mesh | Public web access |
| Use case | Personal access (SSH, VNC) | Share web apps publicly |
| Setup | Easy | Easy |
| Security | Peer-to-peer encryption | Cloudflare edge security |
| Cost | Free (personal) | Free |
| Best for | You + trusted users | Public or shared access |

**Recommendation:** Stick with Cloudflare Tunnel. Only add Tailscale if you need secure SSH from anywhere without going through Cloudflare.

### ❌ Samba

**Don't need this unless:** You want to drag-drop files from Windows/Mac to Pi as a network drive.

**You have Git** - that's better for code.

### ❌ code-server (Web VS Code)

**Don't need this!**
- You're using Claude Code CLI
- code-server is heavy for Pi
- SSH + tmux + your status dashboard is better

---

## 🔄 Cloudflare Tunnel vs nginx - Should You Switch?

### Short Answer: **NO! Keep Cloudflare Tunnel**

**Cloudflare Tunnel:**
- ✅ No port forwarding needed
- ✅ Works through NAT/CGNAT
- ✅ Free DDoS protection
- ✅ Automatic SSL/TLS
- ✅ IP changes don't matter
- ✅ Secure by default (no exposed ports)

**nginx:**
- ⚠️ Requires open ports (80/443)
- ⚠️ Need port forwarding on router
- ⚠️ Doesn't work with CGNAT
- ⚠️ Need to manage SSL certificates
- ⚠️ Public IP must be accessible
- ✅ Good as local reverse proxy

### Best Setup: Use BOTH

```
Internet → Cloudflare Tunnel → nginx (local) → Backend/Frontend
```

**Why both?**
- **Cloudflare**: Secure external access
- **nginx**: Local reverse proxy, URL routing, caching

**For now:** Stick with just Cloudflare Tunnel. You don't need nginx yet.

**Add nginx when:**
- You have multiple services to route
- You need advanced caching
- You want local load balancing

---

## 📦 Recommended Installation Script

I'll create a script to install the useful tools:

```bash
#!/bin/bash
# Install recommended dev tools for ACe_Toolkit

set -e

echo "Installing recommended development tools..."

# High priority tools
sudo apt update
sudo apt install -y \
  ripgrep \
  fd-find \
  fzf \
  jq \
  btop

# Python tools isolation
sudo apt install -y pipx
pipx ensurepath

# Python dev tools
pipx install ruff
pipx install httpie

echo "✓ Installation complete!"
echo ""
echo "New tools available:"
echo "  rg <pattern>           - Fast code search"
echo "  fd <filename>          - Fast file find"
echo "  fzf                    - Fuzzy finder"
echo "  jq                     - JSON parser"
echo "  btop                   - System monitor"
echo "  http                   - API testing (httpie)"
echo "  ruff                   - Python linter"
```

---

## 🎯 Final Recommendations

### Install These (5 minutes):
1. **ripgrep, fd, fzf, jq, btop** - Core dev tools
2. **pipx** - Python CLI tools manager
3. **httpie, ruff** - API testing + linting

### Keep These:
1. ✅ **Cloudflare Tunnel** - Perfect for your use case
2. ✅ **tmux** - Already using for auto-start
3. ✅ **Current Node/Python** - Versions are great

### Skip These:
1. ❌ **nvm** - System Node is fine
2. ❌ **Tailscale** - Cloudflare Tunnel is better for web apps
3. ❌ **nginx** - Not needed yet (can add later)
4. ❌ **Samba** - Use Git instead
5. ❌ **code-server** - Claude Code CLI is better

---

## 🚀 Quick Start

Want to install the recommended tools now?

```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./install_dev_tools.sh
```

This will install:
- ripgrep, fd, fzf, jq, btop
- pipx + httpie + ruff

**Time:** ~5 minutes
**Disk:** ~50MB

---

## 📝 Tool Usage Examples

### ripgrep (rg) - Fast Code Search
```bash
# Find all TODO comments
rg "TODO" apps/

# Find API calls
rg "axios\." apps/web/

# Search with context
rg -C 3 "FastAPI"
```

### fd - Fast File Find
```bash
# Find all TypeScript files
fd .tsx

# Find config files
fd config

# Find and execute
fd .py -x python3
```

### fzf - Fuzzy Finder
```bash
# Search command history
history | fzf

# Find and edit file
vim $(fd | fzf)

# Search processes
ps aux | fzf
```

### jq - JSON Parser
```bash
# Test your API and parse response
curl http://localhost:8000/ | jq

# Pretty print JSON
echo '{"status":"ok"}' | jq

# Extract field
curl http://localhost:8000/ | jq '.message'
```

### httpie - Better API Testing
```bash
# GET request
http localhost:8000

# POST with JSON
http POST localhost:8000/api/endpoint name=test

# With headers
http localhost:8000/docs User-Agent:MyApp
```

### btop - System Monitor
```bash
# Just run it
btop

# Shows CPU, RAM, Disk, Network in beautiful UI
# Press 'q' to quit
```

---

## 🔗 Related Docs

- [REBOOT_GUIDE.md](../REBOOT_GUIDE.md) - Auto-start setup
- [CLOUDFLARE_GUIDE.md](./CLOUDFLARE_GUIDE.md) - Cloudflare reference
- [pi_setup.sh](./pi_setup.sh) - Current Pi setup script

---

**Last Updated:** January 13, 2026
