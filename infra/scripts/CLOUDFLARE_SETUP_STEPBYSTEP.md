# Cloudflare Tunnel Setup - Step by Step

**Your Goal:** Get a permanent domain like `blest-orpheus-cs-chess.trycloudflare.com`

---

## 🤔 What Happened Yesterday

**You had:** `https://mumbai-exempt-chess-determines.trycloudflare.com/`

**How you got it:** You probably ran a **Quick Tunnel** command like:
```bash
cloudflared tunnel --url localhost:3000
```

**What is a Quick Tunnel?**
- ✅ Super easy (one command)
- ✅ Works instantly
- ❌ **Temporary** (random domain each time)
- ❌ **Doesn't persist** (stops when you close terminal)
- ❌ **Random name** (can't choose like "blest-orpheus-cs-chess")

**Domain format:** `<random-words>.trycloudflare.com`

---

## 🎯 What You Want: Named Tunnel (Permanent)

**Named Tunnel:**
- ✅ **Permanent** (same domain every time)
- ✅ **Auto-starts** on reboot
- ✅ **Custom name** (you choose: `blest-orpheus-cs-chess`)
- ✅ **Persistent** (runs as system service)
- ⚠️ Domain includes UUID: `<your-name>-<uuid>.trycloudflare.com`

**Example domain:** `blest-orpheus-cs-chess-a1b2c3d4.trycloudflare.com`

**Or with Cloudflare Workers:** `blest-orpheus-cs-chess.workers.dev` (fully custom!)

---

## 📋 Two Options for Custom Domain

### Option 1: Named Tunnel (trycloudflare.com)

**Domain format:** `<tunnel-name>-<uuid-short>.trycloudflare.com`

**Example:** `blest-orpheus-cs-chess-e5f6.trycloudflare.com`

**Pros:**
- Free
- Easy setup
- Works instantly
- No domain purchase needed

**Cons:**
- Includes random UUID in domain
- Must use `.trycloudflare.com`

### Option 2: Cloudflare Workers (workers.dev)

**Domain format:** `<your-custom-name>.workers.dev`

**Example:** `blest-orpheus-cs-chess.workers.dev` (EXACTLY what you want!)

**Pros:**
- ✅ Fully custom name (no UUID!)
- ✅ Free
- ✅ Professional looking
- ✅ Short and clean

**Cons:**
- Requires Cloudflare Workers setup
- Slightly more complex

---

## 🚀 Let's Setup: Choose Your Option

### 🎯 RECOMMENDED: Option 2 (workers.dev - Fully Custom)

This gives you EXACTLY: `blest-orpheus-cs-chess.workers.dev`

**Steps:**
1. Login to Cloudflare Dashboard
2. Get a free Workers subdomain
3. Create named tunnel
4. Link tunnel to your subdomain
5. Auto-start on reboot

**Time:** 10 minutes

### Option 1: Quick Named Tunnel (includes UUID)

Gives you: `blest-orpheus-cs-chess-<uuid>.trycloudflare.com`

**Steps:**
1. Run `cloudflared tunnel login`
2. Create tunnel
3. Configure
4. Auto-start

**Time:** 5 minutes

---

## 📝 Step-by-Step: Option 2 (Workers.dev - Recommended)

### Step 1: Login to Cloudflare

**Command:**
```bash
cloudflared tunnel login
```

**What happens:**
- Browser opens
- You login to Cloudflare account
- Grant permissions
- Creates `~/.cloudflared/cert.pem`

**Verify:**
```bash
ls -la ~/.cloudflared/cert.pem
```

---

### Step 2: Get Free Workers Subdomain

**In browser:**
1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages** (left sidebar)
3. Click **Get Started** or **Create Application**
4. It will ask you to **register a subdomain**
5. Enter: `blest-orpheus-cs-chess` (or your choice)
6. Check availability
7. Register (free!)

**You'll get:** `blest-orpheus-cs-chess.workers.dev`

---

### Step 3: Create Named Tunnel

**Command:**
```bash
cloudflared tunnel create blest-orpheus-cs-chess
```

**What happens:**
- Creates tunnel with your chosen name
- Generates UUID (used internally, not in domain!)
- Creates credentials file: `~/.cloudflared/<UUID>.json`

**Output will show:**
```
Tunnel credentials written to /home/ace/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json
```

**Copy the UUID!** You'll need it for config.

---

### Step 4: Create Configuration File

**Create file:**
```bash
nano ~/.cloudflared/config.yml
```

**Add this content:**
```yaml
tunnel: <YOUR-TUNNEL-UUID-FROM-STEP-3>
credentials-file: /home/ace/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: blest-orpheus-cs-chess.workers.dev
    service: http://localhost:3000
  - hostname: api-blest-orpheus.workers.dev  # Optional: separate backend access
    service: http://localhost:8000
  - service: http_status:404
```

**Important:**
- Replace `<YOUR-TUNNEL-UUID-FROM-STEP-3>` with your actual UUID
- Replace `blest-orpheus-cs-chess.workers.dev` with YOUR workers domain
- The last line (`http_status:404`) is a catch-all (required)

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Step 5: Route DNS

**For Workers domain:**
```bash
cloudflared tunnel route dns blest-orpheus-cs-chess blest-orpheus-cs-chess.workers.dev
```

**If you want separate API access:**
```bash
cloudflared tunnel route dns blest-orpheus-cs-chess api-blest-orpheus.workers.dev
```

**What this does:**
- Creates DNS CNAME records
- Points your domain to the tunnel
- You can now access via `https://blest-orpheus-cs-chess.workers.dev`

---

### Step 6: Test the Tunnel

**Run manually first (to test):**
```bash
cloudflared tunnel run blest-orpheus-cs-chess
```

**What happens:**
- Tunnel starts
- Connects to Cloudflare
- Your domain becomes active!

**Test in browser:**
```
https://blest-orpheus-cs-chess.workers.dev
```

**You should see your frontend!**

**Stop the test:** `Ctrl+C`

---

### Step 7: Install as Service (Auto-Start)

**Install systemd service:**
```bash
sudo cloudflared service install
```

**Enable auto-start:**
```bash
sudo systemctl enable cloudflared
```

**Start service:**
```bash
sudo systemctl start cloudflared
```

**Check status:**
```bash
sudo systemctl status cloudflared
```

**View logs:**
```bash
sudo journalctl -u cloudflared -f
```

---

### Step 8: Verify Everything

**Check tunnel:**
```bash
cloudflared tunnel list
```

**Should show:**
```
ID                                   NAME                    CREATED
12345678-abcd-1234-efgh-123456789abc blest-orpheus-cs-chess  2026-01-13T...
```

**Check service:**
```bash
sudo systemctl status cloudflared
```

**Should show:** `active (running)`

**Test domain:**
```bash
curl https://blest-orpheus-cs-chess.workers.dev
```

**Test in browser:**
```
https://blest-orpheus-cs-chess.workers.dev
```

---

## 🎉 Success Checklist

After setup, verify:

- [ ] `cloudflared tunnel list` shows your tunnel
- [ ] `sudo systemctl status cloudflared` shows `active (running)`
- [ ] `https://blest-orpheus-cs-chess.workers.dev` loads your app
- [ ] Backend API accessible (if configured)
- [ ] Tunnel survives reboot (test with `sudo reboot`)

---

## 📝 Alternative: Quick Setup (Option 1)

If you just want a quick domain (with UUID):

```bash
# 1. Login
cloudflared tunnel login

# 2. Create tunnel
cloudflared tunnel create blest-orpheus-cs-chess

# 3. Note the UUID, create config
nano ~/.cloudflared/config.yml

# Add:
# tunnel: <UUID>
# credentials-file: /home/ace/.cloudflared/<UUID>.json
# ingress:
#   - service: http://localhost:3000

# 4. Install service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# 5. Your domain will be:
# https://<UUID>.trycloudflare.com
```

**Domain will be:** `https://12345678-abcd-1234.trycloudflare.com`

**Not customizable** but works instantly.

---

## 🔧 Troubleshooting

### "Cannot determine default origin certificate path"

**Solution:**
```bash
cloudflared tunnel login
```

This creates `~/.cloudflared/cert.pem`

### "Tunnel not found"

**Check tunnel exists:**
```bash
cloudflared tunnel list
```

**If empty, create it:**
```bash
cloudflared tunnel create blest-orpheus-cs-chess
```

### "Workers subdomain already taken"

**Choose different name:**
- `blest-orpheus-cs-chess2`
- `ace-blest-orpheus`
- `blest-orpheus-ace`
- `orpheus-cs-chess`

### Service won't start

**Check config syntax:**
```bash
cat ~/.cloudflared/config.yml
```

**Validate ingress:**
```bash
cloudflared tunnel ingress validate
```

**Check logs:**
```bash
sudo journalctl -u cloudflared -n 50
```

### Domain doesn't work

**Wait 1-2 minutes** for DNS propagation

**Check DNS:**
```bash
dig blest-orpheus-cs-chess.workers.dev
```

**Restart tunnel:**
```bash
sudo systemctl restart cloudflared
```

---

## 📚 Summary

**What you're getting:**

**Permanent domain:** `https://blest-orpheus-cs-chess.workers.dev`

**Auto-starts:** Yes (systemd service)

**Persists reboots:** Yes

**Access from anywhere:** Yes

**Cost:** FREE

**Custom name:** Yes (no random UUID in domain!)

---

## 🎮 Commands Reference

```bash
# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create <name>

# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete <name>

# Route DNS
cloudflared tunnel route dns <tunnel-name> <hostname>

# Run manually (testing)
cloudflared tunnel run <name>

# Install as service
sudo cloudflared service install

# Service management
sudo systemctl status cloudflared
sudo systemctl start cloudflared
sudo systemctl stop cloudflared
sudo systemctl restart cloudflared
sudo systemctl enable cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

---

**Last Updated:** January 13, 2026
