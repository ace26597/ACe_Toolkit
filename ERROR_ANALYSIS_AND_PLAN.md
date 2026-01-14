# Backend Error Analysis and Resolution Plan

**Generated:** 2026-01-13 19:08:00 EST
**Status:** Analysis Complete - Action Plan Ready

---

## 📊 Error Summary

| Error Type | Severity | Frequency | Impact |
|------------|----------|-----------|--------|
| MCP Session Timeout | ⚠️ Medium | Multiple | Scientific skills unavailable |
| Anthropic API Credit Error | ⚠️ Medium | 2 occurrences | Scientific chat fails |
| Address Already in Use | ⚠️ Low | During restarts | Service startup blocked |
| AsyncIO Cancel Scope | ⚠️ Low | Occasional | Background task cleanup issue |

---

## 🔴 Error #1: MCP Session Initialization Timeout

### Error Details
```
ERROR:mcp_manager:MCP session initialization timed out after 90 seconds
ERROR:mcp_manager:Failed to start MCP server: MCP session initialization timeout
Exception: MCP session initialization timeout
asyncio.exceptions.CancelledError
TimeoutError
```

### Impact
- **Affected Feature:** Scientific Skills Terminal (140+ tools)
- **User Impact:** Users cannot access MCP scientific tools (PubMed, UniProt, RDKit, etc.)
- **Severity:** Medium (non-critical feature, app still works)
- **Status:** Backend continues to run, shows warning: "⚠️ MCP server failed to start - scientific skills may not work"

### Root Cause Analysis
1. **MCP Backend Startup Delay:** The claude-skills-mcp backend takes longer than 90 seconds to initialize
2. **Network/System Resource Issues:** Backend may be downloading dependencies on first run via uvx
3. **Port Conflicts:** MCP backend uses port 8765, might have conflicts
4. **Timeout Too Aggressive:** 90-second timeout may be too short for cold starts

### Current Code Location
- **File:** `/apps/api/app/core/mcp_manager.py`
- **Function:** `start()` method with 90-second timeout

### Proposed Solutions

#### Option 1: Increase Timeout (Quick Fix) ✅ RECOMMENDED
**Priority:** HIGH
**Effort:** LOW (5 minutes)
**Impact:** Fixes issue if it's just slow startup

```python
# In mcp_manager.py
# Change timeout from 90 to 180 seconds
timeout = 180  # Increased from 90

# Add better logging
logger.info(f"Waiting for MCP initialization (timeout: {timeout}s)...")
logger.info("First run may take 2-3 minutes to download dependencies...")
```

#### Option 2: Pre-warm MCP Backend (Medium Fix)
**Priority:** MEDIUM
**Effort:** MEDIUM (1 hour)
**Impact:** Ensures MCP is ready before main app starts

```bash
# In startup script
echo "Pre-warming MCP server..."
cd /home/ace/dev/ACe_Toolkit/apps/api
source .venv/bin/activate
python -c "
from app.core.mcp_manager import mcp_manager
import asyncio
asyncio.run(mcp_manager.start())
"
```

#### Option 3: Lazy Loading (Best Fix)
**Priority:** LOW
**Effort:** HIGH (3 hours)
**Impact:** MCP starts on-demand, doesn't block app startup

- Change MCP to start only when `/scientific` or `/skills` endpoints are accessed
- Keep background startup as fallback
- Add retry mechanism with exponential backoff

#### Option 4: Make MCP Optional
**Priority:** MEDIUM
**Effort:** LOW (30 minutes)
**Impact:** App works perfectly without MCP

- Add environment variable: `ENABLE_MCP_SKILLS=false`
- Skip MCP startup if disabled
- Show friendly message in UI: "Scientific tools not enabled"

---

## 🔴 Error #2: Anthropic API Credit Balance

### Error Details
```
ERROR:scientific_chat:Error processing message: Error code: 400
anthropic.BadRequestError: 'Your credit balance is too low to access the Anthropic API.
Please go to Plans & Billing to upgrade or purchase credits.'
```

### Impact
- **Affected Feature:** Scientific Chat (when using Anthropic/Claude)
- **User Impact:** Scientific chat fails when user selects Claude models
- **Severity:** Medium (blocks Claude usage, OpenAI still works)
- **Occurrences:** 2 times (user attempted to use scientific chat)

### Root Cause
- **Anthropic API Credits:** Account has insufficient credits
- **No Fallback:** Code doesn't gracefully handle credit errors
- **Poor Error Message:** User sees generic "Error processing message" instead of actionable info

### Current Code Location
- **File:** `/apps/api/app/routers/scientific_chat.py`
- **Error Handling:** Catches exception but doesn't distinguish credit errors

### Proposed Solutions

#### Option 1: Add Credits to Anthropic Account 💰
**Priority:** LOW
**Effort:** 5 minutes
**Cost:** User decision

- Go to https://console.anthropic.com/settings/billing
- Add payment method and purchase credits
- Fixes issue immediately

#### Option 2: Better Error Handling ✅ RECOMMENDED
**Priority:** HIGH
**Effort:** MEDIUM (30 minutes)
**Impact:** Users get clear, actionable error messages

```python
# In scientific_chat.py
try:
    # ... AI call ...
except anthropic.BadRequestError as e:
    error_msg = str(e)

    # Check for specific error types
    if "credit balance" in error_msg.lower():
        await websocket.send_json({
            "type": "error",
            "error": "⚠️ Anthropic API credits depleted",
            "message": "Your Anthropic account is out of credits. Please add credits at https://console.anthropic.com/settings/billing or switch to an OpenAI model.",
            "suggestion": "Try using GPT-4o or GPT-5.1 instead"
        })
    elif "rate_limit" in error_msg.lower():
        await websocket.send_json({
            "type": "error",
            "error": "Rate limit exceeded",
            "message": "Please wait a moment before trying again."
        })
    else:
        # Generic error
        await websocket.send_json({
            "type": "error",
            "error": "Anthropic API Error",
            "message": error_msg
        })
```

#### Option 3: Model Fallback
**Priority:** LOW
**Effort:** HIGH (2 hours)
**Impact:** Auto-switches to OpenAI if Anthropic fails

- Detect credit/quota errors
- Automatically retry with OpenAI model
- Notify user: "Claude unavailable, switched to GPT-4o"

#### Option 4: Disable Anthropic Models
**Priority:** LOW
**Effort:** LOW (15 minutes)
**Impact:** Hide Claude models if API key missing or credits low

```python
# In model selector
anthropic_models = []
if settings.ANTHROPIC_API_KEY and check_anthropic_credits():
    anthropic_models = [
        {"id": "claude-sonnet-4", ...},
        {"id": "claude-opus-4.5", ...}
    ]
```

---

## 🔴 Error #3: Address Already in Use (Port 8000)

### Error Details
```
ERROR: [Errno 98] error while attempting to bind on address ('0.0.0.0', 8000): address already in use
```

### Impact
- **Affected:** Service startup/restart
- **User Impact:** Backend fails to start if port occupied
- **Severity:** Low (only during restarts, not runtime)
- **Frequency:** Occasional (when old processes not cleaned up)

### Root Cause
- **Stray Processes:** Old uvicorn processes not killed before restart
- **PID File Issues:** Multiple PID files (backend.pid, backend-prod.pid, backend-dev.pid)
- **Manual Restarts:** Direct uvicorn commands leave processes running

### Current Code Location
- **Files:** `/infra/scripts/stop_all.sh`, `/infra/scripts/start_production.sh`
- **Issue:** Not checking all PID file variants

### Proposed Solutions

#### Option 1: Improve Cleanup Script ✅ RECOMMENDED
**Priority:** HIGH
**Effort:** LOW (20 minutes)
**Impact:** Prevents port conflicts on restart

```bash
# In stop_all.sh

# Kill all uvicorn processes (not just PID file ones)
pkill -9 -f "uvicorn app.main:app" || true

# Also check for processes on port 8000
PORT_PID=$(lsof -ti:8000)
if [ -n "$PORT_PID" ]; then
    kill -9 $PORT_PID || true
fi

# Clean all PID files
rm -f /home/ace/dev/ACe_Toolkit/logs/*.pid

# Wait for port to be free
sleep 2
```

#### Option 2: Pre-Flight Check
**Priority:** MEDIUM
**Effort:** LOW (15 minutes)
**Impact:** Prevents startup if port busy

```bash
# In start_production.sh
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "ERROR: Port 8000 already in use"
    echo "Run ./infra/scripts/stop_all.sh first"
    exit 1
fi
```

#### Option 3: Auto-Kill on Startup
**Priority:** MEDIUM
**Effort:** LOW (10 minutes)
**Impact:** Always starts fresh

```bash
# In start_production.sh
echo "Cleaning up port 8000..."
fuser -k 8000/tcp 2>/dev/null || true
sleep 1
```

---

## 🔴 Error #4: AsyncIO Cancel Scope Error

### Error Details
```
RuntimeError: Attempted to exit cancel scope in a different task than it was entered in
BaseExceptionGroup: unhandled errors in a TaskGroup (1 sub-exception)
```

### Impact
- **Affected:** Background task cleanup (MCP, sandbox cleanup)
- **User Impact:** None (internal cleanup issue)
- **Severity:** Low (doesn't affect functionality)
- **Frequency:** Rare (during shutdown or MCP timeout)

### Root Cause
- **AnyIO TaskGroup Issue:** Cancel scope exited from different async task
- **MCP Cleanup:** Happens during MCP timeout/cleanup
- **Python 3.11+ Behavior:** Stricter async context management

### Current Code Location
- **File:** `/apps/api/app/core/mcp_manager.py`
- **Issue:** Cleanup logic in `stop()` method

### Proposed Solutions

#### Option 1: Proper Async Context Management
**Priority:** LOW
**Effort:** MEDIUM (1 hour)
**Impact:** Cleaner shutdowns

```python
# In mcp_manager.py
async def stop(self):
    """Stop MCP server gracefully"""
    if not self.process:
        return

    try:
        # Cancel task group properly
        if hasattr(self, 'task_group'):
            self.task_group.cancel_scope.cancel()

        # Terminate process
        self.process.terminate()

        # Wait for clean shutdown
        await asyncio.wait_for(
            self.process.wait(),
            timeout=5
        )
    except asyncio.TimeoutError:
        # Force kill if clean shutdown fails
        self.process.kill()
    except Exception as e:
        logger.warning(f"Error during MCP shutdown: {e}")
```

#### Option 2: Ignore Cleanup Errors
**Priority:** MEDIUM
**Effort:** LOW (5 minutes)
**Impact:** Suppresses harmless errors

```python
# In main.py lifespan cleanup
try:
    if mcp_manager.is_running():
        await mcp_manager.stop()
except (RuntimeError, asyncio.CancelledError):
    # Ignore cleanup errors on shutdown
    pass
```

---

## 📋 Action Plan - Prioritized

### Phase 1: Quick Wins (Today - 1 hour total)

1. **✅ Increase MCP Timeout** [15 min]
   - Change timeout from 90s to 180s
   - Add progress logging
   - Test MCP startup

2. **✅ Improve Error Messages** [30 min]
   - Add specific error handling for Anthropic credit errors
   - Show actionable messages to users
   - Suggest model alternatives

3. **✅ Fix Port Cleanup** [15 min]
   - Update `stop_all.sh` to kill all uvicorn processes
   - Add port check to cleanup script
   - Test restart workflow

### Phase 2: Medium Fixes (This Week - 3 hours total)

4. **🔄 Pre-warm MCP Backend** [1 hour]
   - Add MCP pre-start to startup script
   - Log detailed startup progress
   - Test on cold start

5. **🔄 Add MCP Health Check** [1 hour]
   - Create `/skills/health` endpoint
   - Show MCP status in UI
   - Add retry button if MCP fails

6. **🔄 Improve Async Cleanup** [1 hour]
   - Fix cancel scope issues
   - Add proper shutdown handlers
   - Test graceful shutdown

### Phase 3: Long-term Improvements (Next Week - 5 hours total)

7. **📅 MCP Lazy Loading** [3 hours]
   - Start MCP on first `/scientific` access
   - Add loading indicator in UI
   - Implement retry with exponential backoff

8. **📅 Model Health Monitoring** [2 hours]
   - Check API credits on startup
   - Disable unavailable models in UI
   - Add admin dashboard for API status

---

## 🧪 Testing Checklist

After implementing fixes:

- [ ] Backend starts without errors
- [ ] MCP server initializes successfully (or fails gracefully)
- [ ] Scientific chat shows clear error when Anthropic credits low
- [ ] Research assistant works with OpenAI models
- [ ] Port 8000 cleanup works correctly
- [ ] Multiple restarts don't cause port conflicts
- [ ] Logs show informative messages (not just tracebacks)
- [ ] Graceful shutdown without RuntimeError
- [ ] Cloudflare tunnel still working
- [ ] All services accessible via ai.ultronsolar.in

---

## 📊 Success Metrics

**Before Fixes:**
- MCP timeout: 4+ failures
- Anthropic errors: 2 occurrences
- Port conflicts: Occasional
- AsyncIO errors: Rare

**After Fixes (Target):**
- MCP timeout: 0 failures (or clear recovery)
- Anthropic errors: 0 (graceful handling)
- Port conflicts: 0 (reliable cleanup)
- AsyncIO errors: 0 (proper shutdown)

---

## 🔧 Implementation Order

**Immediate (Next 30 minutes):**
1. Increase MCP timeout to 180s
2. Add better Anthropic error messages
3. Fix port cleanup in stop_all.sh

**Today:**
4. Test all fixes
5. Commit and push improvements
6. Update SYSTEM_STATUS.md

**This Week:**
7. Implement MCP pre-warming
8. Add health checks
9. Fix async cleanup

**Next Week:**
10. Lazy loading for MCP
11. Model health monitoring
12. Admin dashboard

---

**Last Updated:** 2026-01-13 19:08:00 EST
**Next Review:** After Phase 1 implementation
