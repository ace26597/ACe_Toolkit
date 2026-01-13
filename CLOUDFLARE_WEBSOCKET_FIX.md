# Cloudflare WebSocket Fix - Complete Guide

## ✅ What Was Fixed

### 1. Cloudflare Tunnel Configuration
Updated `~/.cloudflared/config.yml` with WebSocket support:
- ✅ Added `noTLSVerify: true` (allows self-signed certs)
- ✅ Added `http2Origin: false` for API (required for WebSocket)
- ✅ Added `disableChunkedEncoding: true` (better WebSocket compatibility)

### 2. Backend Logging
Enhanced WebSocket endpoint logging to debug connection issues:
- Logs origin, host, and Cloudflare ray ID
- Helps identify where connections are being blocked

### 3. Restart Script
Created `restart_cloudflare.sh` for easy tunnel restart

---

## 🚀 Apply the Fix (3 Steps)

### Step 1: Restart Cloudflare Tunnel
```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/restart_cloudflare.sh
```

This will:
- Apply the new WebSocket configuration
- Restart the tunnel service
- Test connectivity to both domains

### Step 2: Restart Backend (to apply new logging)
```bash
./infra/scripts/stop_all.sh
./infra/scripts/start_production.sh
```

### Step 3: Test WebSocket Connection
1. Open browser: https://ai.ultronsolar.in/research
2. Open DevTools (F12) → Console
3. Select a model and send a message
4. Check for WebSocket connection in console

---

## 🔍 Debugging WebSocket Issues

### Check Backend Logs
```bash
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-prod-$(date +%Y%m%d).log
```

Look for:
```
WebSocket connection attempt from origin=https://ai.ultronsolar.in, host=api.ultronsolar.in, cf-ray=...
WebSocket connection established successfully from https://ai.ultronsolar.in
```

### Check Cloudflare Tunnel Logs
```bash
# If running as systemd service
sudo journalctl -u cloudflared -f

# If running as process
tail -f /tmp/cloudflared.log
```

Look for WebSocket upgrade requests:
```
Registered tunnel connection
Serving HTTP requests
```

### Browser Console
Should see:
```
Connecting to WebSocket: wss://api.ultronsolar.in/research/stream
WebSocket connected
```

If error occurs:
```
WebSocket connection failed: Error during WebSocket handshake: Unexpected response code: 403
```

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Still Getting 403 Error

**Cause:** Cloudflare tunnel config not applied or service not restarted

**Fix:**
```bash
# Check if cloudflared is running
systemctl status cloudflared
# OR
ps aux | grep cloudflared

# Restart tunnel
./infra/scripts/restart_cloudflare.sh

# Verify config is loaded
cat ~/.cloudflared/config.yml
```

### Issue 2: Cloudflare Service Not Running

**Cause:** Service crashed or not enabled

**Fix:**
```bash
# Check service status
sudo systemctl status cloudflared

# If inactive, start it
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared
```

### Issue 3: WebSocket Connects Then Disconnects

**Cause:** Backend not responding or crashing

**Fix:**
```bash
# Check backend logs for errors
tail -f logs/backend-prod-*.log

# Restart backend
./infra/scripts/stop_all.sh
./infra/scripts/start_production.sh
```

### Issue 4: Connection Timeout

**Cause:** Backend not running or firewall blocking

**Fix:**
```bash
# Verify backend is running
curl http://localhost:8000/
# Should return: {"message":"Mermaid API is running"}

# Check if port 8000 is listening
netstat -tuln | grep 8000

# Start backend if not running
./infra/scripts/start_production.sh
```

### Issue 5: CORS Error in Browser

**Cause:** CORS configuration not allowing Cloudflare domain

**Fix:**
```bash
# Check CORS config
grep ALLOWED_ORIGINS apps/api/app/core/config.py

# Should include:
# "*" or "https://ai.ultronsolar.in"

# Restart backend after changes
./infra/scripts/stop_all.sh
./infra/scripts/start_production.sh
```

---

## 📋 Verification Checklist

Run through this checklist to ensure everything is configured:

### Cloudflare Tunnel
- [ ] Config file exists: `~/.cloudflared/config.yml`
- [ ] Contains `originRequest` section for both domains
- [ ] `http2Origin: false` is set for API domain
- [ ] `noTLSVerify: true` is set
- [ ] Tunnel service is running: `systemctl status cloudflared`

### Backend
- [ ] Backend is running: `curl http://localhost:8000/`
- [ ] CORS allows Cloudflare domain: Check `apps/api/app/core/config.py`
- [ ] Logs show WebSocket attempts: `tail -f logs/backend-prod-*.log`

### Frontend
- [ ] Can access: https://ai.ultronsolar.in
- [ ] Research page loads: https://ai.ultronsolar.in/research
- [ ] Browser console shows WebSocket connection attempt

---

## 🧪 Manual WebSocket Test

Test WebSocket connection directly using `websocat` or browser console:

### Using Browser Console
1. Open https://ai.ultronsolar.in
2. Press F12 → Console tab
3. Run:
```javascript
const ws = new WebSocket('wss://api.ultronsolar.in/research/stream');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onmessage = (m) => console.log('Message:', m.data);
```

If it says "Connected!" - WebSocket works! ✅

If you get 403 error - Cloudflare tunnel needs restart

### Using curl (HTTP endpoint test)
```bash
# Test API is reachable
curl https://api.ultronsolar.in/

# Should return:
# {"message":"Mermaid API is running"}
```

---

## 🔐 Understanding the Fix

### Why `http2Origin: false`?
- HTTP/2 multiplexes requests, which conflicts with WebSocket's full-duplex nature
- Disabling HTTP/2 for the API backend allows proper WebSocket upgrade

### Why `noTLSVerify: true`?
- Allows Cloudflare to connect to localhost backend without SSL cert validation
- Safe because connection is within the same machine

### Why `disableChunkedEncoding: true`?
- WebSocket frames should not be chunked
- Improves compatibility with real-time streaming

---

## 🎯 Expected Behavior After Fix

1. **Navigate to:** https://ai.ultronsolar.in/research

2. **Select model:** gpt-4o, gpt-5.1, or claude-sonnet-4

3. **Send message:** "Test WebSocket connection"

4. **Expected in Console:**
   ```
   Connecting to WebSocket: wss://api.ultronsolar.in/research/stream
   WebSocket connected
   ```

5. **Expected in Backend Logs:**
   ```
   WebSocket connection attempt from origin=https://ai.ultronsolar.in, host=api.ultronsolar.in, cf-ray=...
   WebSocket connection established successfully from https://ai.ultronsolar.in
   Received message: Test WebSocket connection
   ```

6. **Expected in Browser:**
   - AI response streams in real-time
   - Workflow visualizer updates
   - No errors in console

---

## 📞 If Still Not Working

If WebSocket still returns 403 after following all steps:

1. **Check Cloudflare Dashboard**
   - Go to Cloudflare Zero Trust dashboard
   - Verify tunnel is active and connected

2. **Try Local Access First**
   ```bash
   # Stop Cloudflare temporarily
   sudo systemctl stop cloudflared

   # Test locally
   # Open: http://localhost:3000/research
   # Should work without 403 error

   # This confirms backend is working correctly
   ```

3. **Check Cloudflare Tunnel Logs**
   ```bash
   sudo journalctl -u cloudflared -n 100
   # Look for WebSocket upgrade errors
   ```

4. **Alternative: Use Cloudflare Spectrum**
   - Cloudflare Spectrum supports raw TCP/WebSocket
   - Requires paid Cloudflare plan
   - More reliable for WebSocket applications

5. **Alternative: Use nginx Reverse Proxy**
   - Install nginx on Pi
   - Proxy WebSocket connections
   - Cloudflare tunnel → nginx → backend

---

## 📝 Configuration Summary

### Files Modified
1. `~/.cloudflared/config.yml` - Added WebSocket support
2. `apps/api/app/routers/research_chat.py` - Enhanced logging
3. `apps/api/app/core/config.py` - CORS for Cloudflare (already done)
4. `apps/web/.env.local` - API URL for Cloudflare (already done)

### Scripts Created
1. `infra/scripts/restart_cloudflare.sh` - Restart tunnel
2. `infra/scripts/start_production.sh` - Start services (already exists)
3. `infra/scripts/stop_all.sh` - Stop services (already exists)

---

## ✅ Success Criteria

WebSocket is working when:
- [ ] No 403 error in browser console
- [ ] "WebSocket connected" appears in console
- [ ] Backend logs show "WebSocket connection established"
- [ ] AI responses stream in real-time
- [ ] Workflow visualizer updates during research

---

**Last Updated:** January 13, 2026
**Status:** Configuration Applied - Ready for Testing
