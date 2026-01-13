# Cloudflare Tunnel Setup for Custom Domain (ai.ultronsolar.in)

**Your Domain:** ai.ultronsolar.in (registered at your registrar)
**Goal:** Expose ACe_Toolkit to the internet via Cloudflare Tunnel
**Auto-Start:** Yes (survives reboots without re-authentication)

---

## Prerequisites

✅ Domain registered: `ultronsolar.in`
✅ Cloudflared installed: `/usr/local/bin/cloudflared`
✅ Cloudflare account created
⏳ Domain added to Cloudflare dashboard (you'll do this in Step 1)

---

## Important: One-Time Setup vs Auto-Start

**One-Time Setup (do once):**
- Login to Cloudflare → creates `~/.cloudflared/cert.pem`
- Create tunnel → creates `~/.cloudflared/<UUID>.json`
- Configure tunnel → creates `~/.cloudflared/config.yml`
- Install service → systemd manages auto-start

**After Reboot (automatic):**
- Cloudflared service auto-starts using stored credentials
- NO re-authentication needed
- NO manual commands needed
- Tunnel reconnects automatically

---

## Step 1: Add Domain to Cloudflare

### Option A: Full Domain Management (Recommended)

1. **Login to Cloudflare Dashboard:**
   - Go to https://dash.cloudflare.com
   - Login with your account

2. **Add Site:**
   - Click **Add a Site**
   - Enter: `ultronsolar.in`
   - Select **Free** plan
   - Click **Continue**

3. **Update Nameservers at Your Registrar:**
   - Cloudflare will show you 2 nameservers:
     ```
     kip.ns.cloudflare.com
     uma.ns.cloudflare.com
     ```
   - Go to your domain registrar (where you bought ultronsolar.in)
   - Update nameservers to Cloudflare's nameservers
   - Wait 5-60 minutes for propagation

4. **Verify:**
   - Cloudflare dashboard will show "Active" status when ready

### Option B: Subdomain Only (Faster)

If you don't want to move your entire domain to Cloudflare:

1. **In Cloudflare Dashboard:**
   - Add site: `ultronsolar.in`
   - Or just add DNS records (see Step 4)

2. **At Your Registrar:**
   - Add CNAME record:
     ```
     Name: ai
     Type: CNAME
     Value: <will get this after tunnel creation>
     ```

---

## Step 2: Login to Cloudflare (One-Time)

**Command:**
```bash
cloudflared tunnel login
```

**What happens:**
- Browser opens automatically
- Login to your Cloudflare account
- Select domain: `ultronsolar.in`
- Grant permissions
- Creates `~/.cloudflared/cert.pem` (stored permanently)

**Verify:**
```bash
ls -la ~/.cloudflared/cert.pem
```

**Expected output:**
```
-rw------- 1 ace ace 2484 Jan 13 10:00 /home/ace/.cloudflared/cert.pem
```

✅ **This file persists across reboots - you never need to login again!**

---

## Step 3: Create Named Tunnel (One-Time)

**Command:**
```bash
cloudflared tunnel create acetoolkit
```

**What happens:**
- Creates tunnel named "acetoolkit"
- Generates UUID (used internally)
- Creates credentials: `~/.cloudflared/<UUID>.json`

**Output example:**
```
Tunnel credentials written to /home/ace/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json

Created tunnel acetoolkit with id 12345678-abcd-1234-efgh-123456789abc
```

**IMPORTANT: Copy the UUID!** You'll need it for config.

**Verify:**
```bash
cloudflared tunnel list
```

**Expected output:**
```
ID                                   NAME         CREATED
12345678-abcd-1234-efgh-123456789abc acetoolkit   2026-01-13T...
```

✅ **Tunnel credentials are stored permanently - persist across reboots!**

---

## Step 4: Configure Tunnel (One-Time)

**Create config file:**
```bash
nano ~/.cloudflared/config.yml
```

**Add this content:**
```yaml
# Replace <YOUR-TUNNEL-UUID> with the UUID from Step 3
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/ace/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  # Main frontend
  - hostname: ai.ultronsolar.in
    service: http://localhost:3000

  # API backend (optional - separate subdomain)
  - hostname: api.ultronsolar.in
    service: http://localhost:8000

  # Catch-all (required)
  - service: http_status:404
```

**Example (with actual UUID):**
```yaml
tunnel: 12345678-abcd-1234-efgh-123456789abc
credentials-file: /home/ace/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json

ingress:
  - hostname: ai.ultronsolar.in
    service: http://localhost:3000
  - hostname: api.ultronsolar.in
    service: http://localhost:8000
  - service: http_status:404
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Validate config:**
```bash
cloudflared tunnel ingress validate
```

**Expected output:**
```
Validating ingress rules...
OK
```

✅ **Config file is stored permanently!**

---

## Step 5: Route DNS (One-Time)

**Option A: Using Cloudflare CLI (Recommended)**

```bash
# Route main subdomain
cloudflared tunnel route dns acetoolkit ai.ultronsolar.in

# Route API subdomain (if you want separate API access)
cloudflared tunnel route dns acetoolkit api.ultronsolar.in
```

**What this does:**
- Creates CNAME records in Cloudflare DNS
- Points your domain to the tunnel
- Automatic DNS management

**Option B: Manual DNS in Dashboard**

1. Go to Cloudflare Dashboard → DNS
2. Add record:
   ```
   Type: CNAME
   Name: ai
   Target: <YOUR-TUNNEL-UUID>.cfargotunnel.com
   Proxy: Enabled (orange cloud)
   ```
3. Add another record for API:
   ```
   Type: CNAME
   Name: api
   Target: <YOUR-TUNNEL-UUID>.cfargotunnel.com
   Proxy: Enabled (orange cloud)
   ```

**Verify DNS:**
```bash
cloudflared tunnel route list
```

✅ **DNS routes are stored in Cloudflare - persist automatically!**

---

## Step 6: Test Tunnel (Before Auto-Start)

**Run manually to test:**
```bash
cloudflared tunnel run acetoolkit
```

**Expected output:**
```
2026-01-13T10:00:00Z INF Starting tunnel tunnelID=12345678-abcd-1234-efgh-123456789abc
2026-01-13T10:00:01Z INF Connection established location=SJC
2026-01-13T10:00:02Z INF Connection established location=LAX
```

**Test in browser:**
```
https://ai.ultronsolar.in
```

**You should see your frontend!** ✅

**Stop test:** `Ctrl+C`

---

## Step 7: Install as System Service (Auto-Start)

**Install systemd service:**
```bash
sudo cloudflared service install
```

**What this does:**
- Creates `/etc/systemd/system/cloudflared.service`
- Configures service to read `~/.cloudflared/config.yml`
- Sets up auto-start on boot

**Enable auto-start on boot:**
```bash
sudo systemctl enable cloudflared
```

**Start service now:**
```bash
sudo systemctl start cloudflared
```

**Check status:**
```bash
sudo systemctl status cloudflared
```

**Expected output:**
```
● cloudflared.service - Cloudflare Tunnel
     Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
     Active: active (running) since Mon 2026-01-13 10:00:00 EST
```

**View live logs:**
```bash
sudo journalctl -u cloudflared -f
```

✅ **Service will auto-start on every reboot - NO manual intervention needed!**

---

## Step 8: Update Crontab (NOT NEEDED!)

**Question:** Do we need to add Cloudflare tunnel to crontab?

**Answer:** ❌ **NO!**

**Why:**
- Cloudflared runs as a **systemd service**
- Systemd automatically starts it before user login
- No crontab entry needed
- More reliable than crontab

**Current crontab (stays as is):**
```bash
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**Service startup order (automatic):**
1. System boots
2. Systemd starts `cloudflared.service` (managed by systemd)
3. 30 seconds later, crontab runs `start_all.sh` (starts backend + frontend)
4. Everything is ready! ✅

---

## Verification Checklist

After setup, verify everything works:

```bash
# 1. Check tunnel exists
cloudflared tunnel list
# Should show: acetoolkit

# 2. Check routes
cloudflared tunnel route list
# Should show: ai.ultronsolar.in → acetoolkit

# 3. Check service
sudo systemctl status cloudflared
# Should show: active (running)

# 4. Check backend/frontend
ps aux | grep -E "(uvicorn|next)"
# Should show both processes running

# 5. Test in browser
# https://ai.ultronsolar.in → Should load frontend
# https://api.ultronsolar.in → Should show API docs
```

---

## Reboot Test

**Test auto-start:**
```bash
sudo reboot
```

**After reboot (wait 60 seconds):**
```bash
# Check all services
./infra/scripts/status.sh

# Should show:
# ✅ Cloudflare tunnel: active
# ✅ Backend: running
# ✅ Frontend: running
```

**Test in browser:**
```
https://ai.ultronsolar.in
```

**Should work immediately!** ✅

---

## Important Files (Stored Permanently)

These files persist across reboots and contain your credentials:

```bash
~/.cloudflared/cert.pem              # Cloudflare authentication (DO NOT DELETE)
~/.cloudflared/<UUID>.json           # Tunnel credentials (DO NOT DELETE)
~/.cloudflared/config.yml            # Tunnel configuration (DO NOT DELETE)
/etc/systemd/system/cloudflared.service  # Systemd service file
```

**⚠️ IMPORTANT:**
- These files should be backed up
- Never commit them to git (contains secrets!)
- If you delete them, you'll need to re-run setup

---

## Troubleshooting

### After Reboot: Tunnel Not Working

**Check service:**
```bash
sudo systemctl status cloudflared
```

**If not running:**
```bash
sudo systemctl start cloudflared
sudo journalctl -u cloudflared -n 50
```

### "Cannot determine default origin certificate path"

**Solution:**
```bash
# Re-run login (one-time)
cloudflared tunnel login
```

### Domain Not Accessible

**Wait 2-5 minutes** for DNS propagation

**Check DNS:**
```bash
dig ai.ultronsolar.in
```

**Should show CNAME record** pointing to `<UUID>.cfargotunnel.com`

### Backend/Frontend Not Running

**Check processes:**
```bash
./infra/scripts/status.sh
```

**Restart if needed:**
```bash
./infra/scripts/stop_all.sh
./infra/scripts/start_all.sh
```

---

## Summary

✅ **One-time setup:** ~15 minutes
✅ **Auto-starts on reboot:** YES (systemd service)
✅ **Re-authentication needed:** NO (credentials stored)
✅ **Crontab entry needed:** NO (systemd handles it)
✅ **Domain:** https://ai.ultronsolar.in
✅ **API:** https://api.ultronsolar.in (optional)
✅ **Cost:** FREE

---

## Quick Reference Commands

```bash
# Check tunnel
cloudflared tunnel list
cloudflared tunnel route list

# Service management
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -f

# Backend/Frontend status
./infra/scripts/status.sh
./infra/scripts/start_all.sh
./infra/scripts/stop_all.sh

# Test domain
curl https://ai.ultronsolar.in
```

---

**Last Updated:** January 13, 2026
**Domain:** ai.ultronsolar.in
**Status:** Ready for setup
