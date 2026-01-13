# MCP (Model Context Protocol) Setup Status

**Date:** January 13, 2026
**Package:** claude-skills-mcp
**Repository:** https://github.com/K-Dense-AI/claude-skills-mcp
**Status:** ⚠️ Partially Working

---

## Installation Status

### ✅ Components Installed

1. **uvx/uv Tool Manager**
   - Location: `/home/ace/.local/bin/uvx`
   - Version: Latest (via uv)
   - Status: ✅ Installed and working

2. **claude-skills-mcp Package**
   - Installed via: `uvx claude-skills-mcp`
   - Status: ✅ Available and runnable
   - Backend process: Running (PID varies)

3. **MCP Python Dependencies**
   - `fastmcp>=0.4.0` ✅
   - `mcp>=0.9.0` ✅
   - `psutil>=5.9.0` ✅

---

## Current Configuration

### Backend Integration

**File:** `apps/api/app/main.py`

```python
# Start MCP server for scientific skills in background (non-blocking)
from app.core.mcp_manager import mcp_manager
import logging
import asyncio
logger = logging.getLogger("main")

async def start_mcp_in_background():
    """Start MCP in background without blocking server startup"""
    logger.info("Starting MCP server for scientific skills in background...")
    try:
        started = await mcp_manager.start()
        if started:
            logger.info(f"✅ MCP server started successfully with {len(mcp_manager.available_skills)} skills")
        else:
            logger.warning("⚠️ MCP server failed to start - scientific skills may not work")
    except Exception as e:
        logger.warning(f"⚠️ MCP server startup failed: {e}")
        logger.info("Continuing without MCP - AI diagram features will still work")

# Start MCP in background task (doesn't block startup)
asyncio.create_task(start_mcp_in_background())
```

**Key Features:**
- ✅ Non-blocking startup (runs in background task)
- ✅ Graceful failure (backend continues even if MCP fails)
- ✅ 90-second initialization timeout (increased from 30s)
- ✅ Full PATH configuration for uvx

### MCP Manager Configuration

**File:** `apps/api/app/core/mcp_manager.py`

**Updates Made:**
1. ✅ Full path to uvx: `/home/ace/.local/bin/uvx`
2. ✅ PATH environment variable includes `~/.local/bin`
3. ✅ Increased timeout from 30s to 90s
4. ✅ Better error messages and logging

---

## Current Status

### ✅ What's Working

1. **Backend Startup**
   - ✅ Backend starts successfully (no blocking)
   - ✅ Backend responds to health checks
   - ✅ AI diagram features fully functional (using OpenAI)
   - Port: 8000
   - Status: Running

2. **MCP Process**
   - ✅ MCP backend process spawns successfully
   - ✅ Process running: `claude-skills-mcp-backend`
   - ✅ PID: Active (varies)
   - ✅ Memory usage: ~50MB (normal)

3. **MCP Status Endpoint**
   ```bash
   curl http://localhost:8000/skills/status
   ```

   **Response:**
   ```json
   {
     "running": true,
     "pid": 55985,
     "uptime_seconds": 0,
     "skills_count": 0,
     "execution_count": 0,
     "memory_mb": 49.4
   }
   ```

### ⚠️ Known Issues

1. **Skills Discovery Not Completing**
   - Status: `skills_count: 0`
   - Expected: ~140+ scientific skills
   - Possible causes:
     - Skills discovery timing out silently
     - MCP session not fully initialized
     - Backend communication issue

2. **No MCP Logs Appearing**
   - MCP background task logs not appearing in backend logs
   - May need to configure logging for background tasks

3. **Uptime Always Zero**
   - `uptime_seconds: 0` suggests timing issue
   - May be a bug in uptime calculation

### ❓ Not Yet Tested

- [ ] Executing individual skills via MCP
- [ ] Skills browser in frontend
- [ ] Scientific computation features in UI

---

## API Endpoints

### MCP Status
```bash
GET /skills/status
```

**Response:**
```json
{
  "running": boolean,
  "pid": number | null,
  "uptime_seconds": number,
  "skills_count": number,
  "execution_count": number,
  "memory_mb": number
}
```

### List Skills
```bash
GET /skills/list
```

**Current Response:** `[]` (empty - skills not discovered)

**Expected Response:**
```json
[
  {
    "name": "pubmed_search",
    "category": "databases",
    "description": "Search PubMed for scientific articles",
    "parameters": {...}
  },
  ...
]
```

### Execute Skill
```bash
POST /skills/execute
Content-Type: application/json

{
  "skill_name": "rdkit_molecule_from_smiles",
  "params": {"smiles": "CCO"},
  "session_id": "user-session-123"
}
```

---

## Testing MCP

### 1. Check MCP Status
```bash
curl http://localhost:8000/skills/status | python3 -m json.tool
```

**Expected:** `running: true`

### 2. List Available Skills
```bash
curl http://localhost:8000/skills/list | python3 -m json.tool
```

**Expected:** Array of 140+ skills (currently returns `[]`)

### 3. Check MCP Process
```bash
ps aux | grep claude-skills-mcp
```

**Expected:** Running process

### 4. Test AI Features (Unaffected by MCP)
```bash
curl -X POST http://localhost:8000/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a flowchart","current_code":""}'
```

**Expected:** ✅ Working perfectly (uses OpenAI, not MCP)

---

## Troubleshooting

### If Skills Don't Appear

1. **Check Backend Logs:**
   ```bash
   tail -f logs/backend-$(date +%Y%m%d).log | grep -i mcp
   ```

2. **Restart Backend:**
   ```bash
   bash infra/scripts/start_backend.sh
   ```

3. **Manually Test MCP:**
   ```bash
   uvx claude-skills-mcp --help
   ```

4. **Check MCP Process:**
   ```bash
   ps aux | grep claude-skills
   ```

5. **Test Direct Connection:**
   ```bash
   # In Python
   import asyncio
   from mcp.client.stdio import stdio_client, StdioServerParameters

   async def test_mcp():
       params = StdioServerParameters(
           command="/home/ace/.local/bin/uvx",
           args=["claude-skills-mcp"]
       )
       async with stdio_client(params) as (read, write):
           print("MCP connected successfully!")

   asyncio.run(test_mcp())
   ```

### If Backend Won't Start

1. **Check for Port Conflicts:**
   ```bash
   lsof -i :8000
   ```

2. **Kill Old Processes:**
   ```bash
   pkill -f "uvicorn app.main:app"
   ```

3. **Check Logs:**
   ```bash
   tail -f logs/backend-$(date +%Y%m%d).log
   ```

---

## Next Steps

### Immediate (Optional)

1. **Investigate Skills Discovery:**
   - Add more detailed logging to MCP background task
   - Test MCP session initialization directly
   - Check if skills discovery needs manual trigger

2. **Test Scientific Features:**
   - Once skills appear, test executing a simple skill
   - Verify skills browser in frontend (`/scientific`)

### Future Improvements

1. **Better Logging:**
   - Configure background task logging
   - Add MCP event stream logging
   - Monitor skill execution

2. **Performance:**
   - Cache skills list after first discovery
   - Add health check for MCP process
   - Auto-restart on failure

3. **Frontend Integration:**
   - Skills browser UI
   - Skill execution terminal
   - Execution history viewer

---

## Summary

### ✅ Success
- MCP installed and accessible via uvx
- MCP backend process running
- Backend starts without blocking
- AI features fully functional (OpenAI)
- Non-blocking MCP startup prevents issues

### ⚠️ Partial Success
- MCP process running but skills not discovered
- Status endpoint works but shows 0 skills
- Background task executing but not logging

### ❌ Not Working
- Skills discovery (returns empty array)
- Scientific computation features (depends on skills)

### 🎯 Impact
**Low Impact:** The main AI diagram features work perfectly via OpenAI. MCP is a bonus feature for scientific computing that can be debugged later without affecting core functionality.

---

## Configuration Files

**Modified Files:**
1. ✅ `apps/api/app/main.py` - Background MCP startup
2. ✅ `apps/api/app/core/mcp_manager.py` - Timeout and PATH fixes
3. ✅ `apps/api/requirements.txt` - MCP dependencies

**Environment:**
- uvx location: `/home/ace/.local/bin/uvx`
- Backend virtualenv: `/home/ace/dev/ACe_Toolkit/apps/api/.venv`
- Python version: 3.13

---

## Support & Resources

**Documentation:**
- MCP Docs: https://code.claude.com/docs/en/mcp
- claude-skills-mcp: https://github.com/K-Dense-AI/claude-skills-mcp
- MCP Protocol: https://github.com/anthropics/mcp

**Logs:**
- Backend: `/home/ace/dev/ACe_Toolkit/logs/backend-YYYYMMDD.log`
- Frontend: `/home/ace/dev/ACe_Toolkit/logs/frontend-YYYYMMDD.log`

---

**Last Updated:** January 13, 2026 15:25 EST
**Status:** MCP installed, running in background, skills discovery pending investigation
**Priority:** Low (AI features work without MCP)
