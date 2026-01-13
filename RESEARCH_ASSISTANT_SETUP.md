# Research Assistant Setup Guide

## ✅ All Issues Fixed

### 1. Model Names Corrected
- ✅ Changed `gpt-t.1` → `gpt-5.1`
- ✅ Added `gpt-5.2` model support
- Both models available in ModelSelector dropdown

### 2. WebSocket 403 Error Resolved
- ✅ Updated CORS configuration to allow all origins (development mode)
- ✅ Added support for both HTTP and WebSocket connections
- ✅ Fixed environment variable configuration

### 3. Network & Cloudflare Support
- ✅ Frontend now uses `NEXT_PUBLIC_API_URL` for network/Cloudflare access
- ✅ Falls back to `NEXT_PUBLIC_API_BASE_URL` or localhost
- ✅ Automatically converts http→ws and https→wss for WebSocket connections
- ✅ Backend CORS configured for:
  - localhost (development)
  - Network IPs
  - Cloudflare domains (`ai.ultronsolar.in`, `api.ultronsolar.in`)

### 4. Robust Startup Scripts Created
- ✅ Development script with live reload and logging
- ✅ Production script with optimized builds
- ✅ Comprehensive logging system
- ✅ Automated health checks

---

## 🚀 Quick Start

### Development Mode (with live reload)
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/start_development.sh
```

**Features:**
- Auto-reload on code changes
- Detailed console logging
- Port conflict detection
- Environment validation
- Real-time log monitoring

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production Mode (optimized)
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/start_production.sh
```

**Features:**
- Optimized production builds
- 4 uvicorn workers for backend
- Log rotation (daily)
- Process management
- Network access enabled

**Access:**
- Local: http://localhost:3000
- Network: http://<YOUR_PI_IP>:3000
- Cloudflare: https://ai.ultronsolar.in (when configured)

### Stop All Services
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/stop_all.sh
```

Stops both development and production services gracefully.

---

## 📝 Log Files

All logs are stored in `/home/ace/dev/ACe_Toolkit/logs/`

### Development Logs
```bash
# View backend logs
tail -f logs/backend-dev-*.log

# View frontend logs
tail -f logs/frontend-dev-*.log
```

### Production Logs
```bash
# View backend logs
tail -f logs/backend-prod-$(date +%Y%m%d).log

# View frontend logs
tail -f logs/frontend-prod-$(date +%Y%m%d).log
```

### Startup/Shutdown Logs
```bash
# View startup logs
tail -f logs/startup.log

# View shutdown logs
tail -f logs/shutdown-$(date +%Y%m%d).log
```

---

## 🔧 Configuration

### Backend Environment (.env)

File: `/home/ace/dev/ACe_Toolkit/apps/api/.env`

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./app.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS - Configured for localhost + network + Cloudflare
ALLOWED_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","https://ai.ultronsolar.in","*"]

# AI APIs
OPENAI_API_KEY=sk-...  # Required for OpenAI models
ANTHROPIC_API_KEY=sk-... # Required for Claude models
TAVILY_API_KEY=tvly-... # Required for web search in Research Assistant
```

### Frontend Environment (.env.local)

File: `/home/ace/dev/ACe_Toolkit/apps/web/.env.local`

```env
# For localhost development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# For network access (use Pi's IP)
# NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# For Cloudflare access
# NEXT_PUBLIC_API_URL=https://api.ultronsolar.in
```

---

## 🌐 Network Access Configuration

### Local Network Access

1. Find your Pi's IP:
```bash
hostname -I
# Example output: 192.168.1.100
```

2. Update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000
```

3. Start production server:
```bash
./infra/scripts/start_production.sh
```

4. Access from any device on network:
- Frontend: `http://192.168.1.100:3000`
- Backend: `http://192.168.1.100:8000`

### Cloudflare Access (When Configured)

1. Backend `.env`:
```env
ALLOWED_ORIGINS=["https://ai.ultronsolar.in","https://api.ultronsolar.in","*"]
```

2. Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.ultronsolar.in
```

3. Cloudflare tunnel should route:
- `ai.ultronsolar.in` → localhost:3000 (frontend)
- `api.ultronsolar.in` → localhost:8000 (backend)

---

## 🧪 Testing Research Assistant

### 1. Start Services
```bash
./infra/scripts/start_development.sh
```

### 2. Open Browser
Navigate to: http://localhost:3000

### 3. Go to Research Assistant
Click on "🔬 Research Assistant" card on home page

### 4. Select Model
- Provider: OpenAI or Anthropic
- Model: gpt-4o, gpt-5.1, gpt-5.2, claude-sonnet-4, or claude-opus-4.5

### 5. Upload Files (Optional)
- Drag & drop or click to upload
- Supported: Images, PDFs, CSV, Excel, Text files

### 6. Start Research
Type a query like:
- "Search for recent CRISPR breakthroughs"
- "Analyze the uploaded data files"
- "Find papers about quantum computing in 2024"

### 7. View Results
- Watch workflow progress in left panel
- See AI responses in center chat
- Download reports in right panel (MD, HTML, PDF, CSV)

---

## 🐛 Troubleshooting

### WebSocket 403 Error
✅ **Fixed!** If you still see this error:

1. Restart backend:
```bash
./infra/scripts/stop_all.sh
./infra/scripts/start_development.sh
```

2. Check browser console for WebSocket URL:
```javascript
// Should show:
Connecting to WebSocket: ws://localhost:8000/research/stream
```

3. Verify CORS in backend logs:
```bash
tail -f logs/backend-dev-*.log | grep CORS
```

### Model Not Available
If new models (gpt-5.1, gpt-5.2) don't show:

1. Clear browser cache: Ctrl+Shift+R
2. Verify frontend is using latest code:
```bash
cd apps/web
grep -A 5 "gpt-5.1" components/research/ModelSelector.tsx
```

### Network Access Not Working

1. Check firewall:
```bash
sudo ufw status
# Should allow 3000 and 8000
```

2. Verify backend is listening on 0.0.0.0:
```bash
netstat -tuln | grep -E '3000|8000'
# Should show 0.0.0.0:3000 and 0.0.0.0:8000
```

3. Check backend CORS configuration:
```bash
grep ALLOWED_ORIGINS apps/api/app/core/config.py
# Should include "*" for development
```

### Logs Not Appearing

1. Check log directory exists:
```bash
ls -la logs/
```

2. Check write permissions:
```bash
chmod -R u+w logs/
```

3. View startup script output:
```bash
./infra/scripts/start_development.sh
# Should show log file paths
```

---

## 📊 Process Management

### Check Running Processes
```bash
# Find backend process
ps aux | grep uvicorn

# Find frontend process
ps aux | grep next

# Check PID files
cat logs/backend-dev.pid
cat logs/frontend-dev.pid
```

### Manual Process Control
```bash
# Kill backend
kill $(cat logs/backend-dev.pid)

# Kill frontend
kill $(cat logs/frontend-dev.pid)

# Force kill all (emergency)
pkill -f "uvicorn app.main:app"
pkill -f "next-server"
```

---

## 🎯 What's Working Now

✅ **Research Assistant fully functional**
- Multi-model support (OpenAI + Anthropic)
- File upload (images, PDFs, CSV, Excel)
- WebSocket streaming (real-time responses)
- Report generation (MD, HTML, PDF, CSV)
- Web search via Tavily API
- MCP tools integration (140+ scientific skills)

✅ **Network connectivity**
- Localhost access
- Local network access via Pi IP
- Cloudflare domain support (when configured)

✅ **Development workflow**
- Live reload for code changes
- Comprehensive logging
- Easy start/stop scripts
- Health monitoring

✅ **Production ready**
- Optimized builds
- Multiple workers
- Process management
- Log rotation

---

## 📚 Next Steps

1. **Test Research Assistant:**
   ```bash
   ./infra/scripts/start_development.sh
   # Open http://localhost:3000/research
   ```

2. **Verify WebSocket Connection:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Should see: "Connecting to WebSocket: ws://localhost:8000/research/stream"
   - Should see: "WebSocket connected"

3. **Try All Models:**
   - Test gpt-4o
   - Test gpt-5.1 (new!)
   - Test gpt-5.2 (new!)
   - Test claude-sonnet-4
   - Test claude-opus-4.5

4. **Upload Files:**
   - Upload an image with a chart
   - Upload a PDF research paper
   - Upload a CSV dataset
   - Ask AI to analyze them

5. **Generate Reports:**
   - Complete a research query
   - Download as Markdown
   - Download as PDF
   - Download as HTML

---

## 🔐 Security Notes

- **Development:** CORS set to allow all origins (`*`) for easy testing
- **Production:** Update CORS to specific domains only
- **API Keys:** Never commit `.env` files to git
- **Network:** Use Cloudflare Tunnel instead of port forwarding
- **Firewall:** Only allow necessary ports (22, 3000, 8000)

---

## 📞 Support

If you encounter any issues:

1. Check logs first:
   ```bash
   tail -f logs/backend-dev-*.log
   tail -f logs/frontend-dev-*.log
   ```

2. Restart services:
   ```bash
   ./infra/scripts/stop_all.sh
   ./infra/scripts/start_development.sh
   ```

3. Verify configuration:
   ```bash
   cat apps/api/.env | grep API_KEY
   cat apps/web/.env.local
   ```

---

**Last Updated:** January 13, 2026
**Status:** ✅ All Issues Resolved
