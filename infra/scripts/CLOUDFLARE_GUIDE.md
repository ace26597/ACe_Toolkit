# Cloudflare Tunnel - Complete Guide

**Last Updated:** January 13, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [How Cloudflare Tunnel Works](#how-cloudflare-tunnel-works)
3. [Your Cloudflare Setup](#your-cloudflare-setup)
4. [Login and Access](#login-and-access)
5. [Managing Your Tunnel](#managing-your-tunnel)
6. [Changing IP Address](#changing-ip-address)
7. [DNS Management](#dns-management)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)

---

## Overview

Cloudflare Tunnel (formerly Argo Tunnel) creates a secure, outbound-only connection from your Raspberry Pi to Cloudflare's edge network. This means:

- **No open ports**: Your Pi doesn't need any inbound firewall rules
- **No static IP needed**: Works with dynamic IPs, NAT, CGNAT
- **Free tier available**: Zero Trust includes free tunnel usage
- **Secure**: Encrypted connection, no exposed services
- **Easy**: Auto-reconnects, handles network changes

---

## How Cloudflare Tunnel Works

```
User Request
     ↓
Cloudflare Edge (api.yourdomain.com)
     ↓
Cloudflare Tunnel (encrypted outbound connection)
     ↓
Your Raspberry Pi (localhost:8000)
     ↓
ACe_Toolkit Backend
```

### Key Concepts

1. **Tunnel**: A persistent, encrypted connection from your Pi to Cloudflare
2. **Connector**: The `cloudflared` daemon running on your Pi
3. **Ingress Rules**: Configuration mapping hostnames to local services
4. **Credentials**: JSON file with tunnel authentication token
5. **DNS Records**: CNAME records pointing your domain to the tunnel

### Why It's Better Than Port Forwarding

| Feature | Cloudflare Tunnel | Port Forwarding |
|---------|-------------------|-----------------|
| Security | ✅ No exposed ports | ❌ Ports open to internet |
| Dynamic IP | ✅ Works seamlessly | ❌ Requires DDNS |
| NAT/CGNAT | ✅ Works through NAT | ❌ May not work |
| DDoS Protection | ✅ Cloudflare's network | ❌ Your bandwidth |
| SSL/TLS | ✅ Free, automatic | ❌ Manual setup |
| Configuration | ✅ Simple config file | ❌ Router settings |

---

## Your Cloudflare Setup

### Current Configuration

Based on your setup, you should have:

**Tunnel Name:** `mermaid-pi` (or your chosen name)

**Credentials Location:** `~/.cloudflared/<tunnel-uuid>.json`

**Config Location:** `~/.cloudflared/config.yml`

**Systemd Service:** `cloudflared.service`

### Viewing Your Tunnel UUID

```bash
# List all tunnels
cloudflared tunnel list

# Example output:
# ID                                   NAME        CREATED
# 12345678-abcd-1234-efgh-123456789abc mermaid-pi  2024-01-12
```

### Viewing Your Configuration

```bash
# View config file
cat ~/.cloudflared/config.yml
```

**Example config.yml:**
```yaml
tunnel: 12345678-abcd-1234-efgh-123456789abc
credentials-file: /home/ace/.cloudflared/12345678-abcd-1234-efgh-123456789abc.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - hostname: ssh.yourdomain.com
    service: ssh://localhost:22
  - service: http_status:404  # Catch-all
```

---

## Login and Access

### Cloudflare Dashboard Login

**URL:** https://dash.cloudflare.com

**Login Steps:**
1. Go to https://dash.cloudflare.com
2. Use your Cloudflare account credentials
3. Navigate to **Zero Trust** (left sidebar)
4. Go to **Access** → **Tunnels**

**What You'll Find:**
- List of all your tunnels
- Tunnel status (Healthy/Down)
- Traffic analytics
- Configuration options
- Connector status

### Finding Your Tunnel in Dashboard

1. **Dashboard** → **Zero Trust** → **Networks** → **Tunnels**
2. You should see your tunnel (e.g., `mermaid-pi`)
3. Click on it to view:
   - Connectors (running instances)
   - Public hostnames
   - Private networks
   - Traffic metrics

### Command-Line Login

```bash
# Login from your Pi (opens browser for authentication)
cloudflared tunnel login

# This creates a cert.pem file at ~/.cloudflared/cert.pem
# You only need to do this once per machine
```

---

## Managing Your Tunnel

### Starting/Stopping the Tunnel

```bash
# Check status
sudo systemctl status cloudflared

# Start tunnel
sudo systemctl start cloudflared

# Stop tunnel
sudo systemctl stop cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# Enable auto-start on boot
sudo systemctl enable cloudflared

# Disable auto-start
sudo systemctl disable cloudflared
```

### Viewing Tunnel Logs

```bash
# Real-time logs
sudo journalctl -u cloudflared -f

# Last 100 lines
sudo journalctl -u cloudflared -n 100

# Logs from today
sudo journalctl -u cloudflared --since today

# Logs with specific time range
sudo journalctl -u cloudflared --since "2024-01-13 10:00" --until "2024-01-13 12:00"
```

### Testing Tunnel Connectivity

```bash
# Check if tunnel is connected
cloudflared tunnel info <tunnel-name-or-uuid>

# Example:
cloudflared tunnel info mermaid-pi

# Test route resolution
cloudflared tunnel route ip show

# Manual tunnel run (for debugging)
cloudflared tunnel run mermaid-pi
```

---

## Changing IP Address

### The Good News: You Don't Need To!

**Cloudflare Tunnel is IP-agnostic.** You can:
- Change your Pi's local IP
- Move your Pi to a different network
- Use mobile hotspot
- Switch ISPs
- Travel with your Pi

**No configuration changes needed!**

### Why It Works

1. The tunnel creates an **outbound** connection from your Pi to Cloudflare
2. Cloudflare doesn't care what your IP is
3. The connection is identified by your **tunnel credentials**, not IP
4. DNS points to Cloudflare's network, not your IP

### Example Scenarios

**Scenario 1: Changing Local IP**
```bash
# Old IP: 192.168.1.100
# New IP: 192.168.1.200

# No action required! Tunnel keeps working.
```

**Scenario 2: Moving to Different Network**
```bash
# Home network: 192.168.1.x
# Office network: 10.0.0.x

# No action required! Just connect to wifi.
```

**Scenario 3: ISP Change**
```bash
# Old public IP: 203.0.113.50
# New public IP: 198.51.100.75

# No action required! Tunnel reconnects automatically.
```

### What If You Move Your Pi?

**Steps:**
1. Power off Pi
2. Move to new location
3. Connect to new network (wifi/ethernet)
4. Power on Pi
5. Wait ~30 seconds for auto-start
6. Tunnel reconnects automatically

**Verify:**
```bash
sudo systemctl status cloudflared
# Should show "active (running)"
```

---

## DNS Management

### Understanding Your DNS Setup

When you run `cloudflared tunnel route dns`, Cloudflare creates a **CNAME** record:

```
api.yourdomain.com → <tunnel-uuid>.cfargotunnel.com
```

This means:
- Traffic to `api.yourdomain.com` goes to Cloudflare
- Cloudflare routes it through your tunnel
- No IP address is exposed or configured

### Adding New Hostnames

#### Method 1: Command Line

```bash
# Add new hostname
cloudflared tunnel route dns mermaid-pi app.yourdomain.com

# Add multiple hostnames
cloudflared tunnel route dns mermaid-pi web.yourdomain.com
cloudflared tunnel route dns mermaid-pi admin.yourdomain.com
```

#### Method 2: Cloudflare Dashboard

1. **Dashboard** → **Zero Trust** → **Networks** → **Tunnels**
2. Click your tunnel → **Public Hostnames** tab
3. Click **Add a public hostname**
4. Fill in:
   - **Subdomain:** e.g., `api`
   - **Domain:** e.g., `yourdomain.com`
   - **Service:** e.g., `http://localhost:8000`
5. Click **Save hostname**

#### Method 3: Manual DNS (Cloudflare DNS)

1. **Dashboard** → **Websites** → Your domain → **DNS** → **Records**
2. Click **Add record**
3. Type: **CNAME**
4. Name: Your subdomain (e.g., `api`)
5. Target: `<tunnel-uuid>.cfargotunnel.com`
6. Proxy status: **Proxied** (orange cloud)
7. Click **Save**

### Updating Ingress Rules

After adding hostnames via DNS, update your config:

```bash
# Edit config
nano ~/.cloudflared/config.yml
```

**Add new hostname:**
```yaml
tunnel: <tunnel-uuid>
credentials-file: /home/ace/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - hostname: web.yourdomain.com      # NEW
    service: http://localhost:3000    # NEW
  - hostname: ssh.yourdomain.com
    service: ssh://localhost:22
  - service: http_status:404
```

**Restart tunnel:**
```bash
sudo systemctl restart cloudflared
```

### Removing Hostnames

```bash
# Delete DNS route
cloudflared tunnel route dns delete mermaid-pi app.yourdomain.com

# Or via dashboard:
# Zero Trust → Tunnels → Your tunnel → Public Hostnames → Delete
```

---

## Common Tasks

### Adding a New Service

**Example: Expose frontend on `app.yourdomain.com`**

1. **Add DNS route:**
```bash
cloudflared tunnel route dns mermaid-pi app.yourdomain.com
```

2. **Update config:**
```bash
nano ~/.cloudflared/config.yml
```

Add:
```yaml
  - hostname: app.yourdomain.com
    service: http://localhost:3000
```

3. **Restart:**
```bash
sudo systemctl restart cloudflared
```

4. **Verify:**
```bash
curl https://app.yourdomain.com
```

### Changing Backend Port

**Example: Change backend from port 8000 to 9000**

1. **Update config:**
```bash
nano ~/.cloudflared/config.yml
```

Change:
```yaml
  - hostname: api.yourdomain.com
    service: http://localhost:9000  # Changed from 8000
```

2. **Restart tunnel:**
```bash
sudo systemctl restart cloudflared
```

3. **Update backend startup:**
```bash
nano /home/ace/dev/ACe_Toolkit/infra/scripts/start_backend.sh
```

Change uvicorn port:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 9000
```

### Enabling SSH Access

Your config already includes SSH. Access via:

```bash
# From your laptop (after installing cloudflared)
ssh ace@ssh.yourdomain.com
```

**Setup on client:**
```bash
# Install cloudflared on your laptop
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: Same as Pi installation steps

# Add to ~/.ssh/config
Host ssh.yourdomain.com
  ProxyCommand cloudflared access ssh --hostname %h
```

### Monitoring Tunnel Health

**Dashboard:**
1. **Zero Trust** → **Networks** → **Tunnels**
2. Check status indicator (Healthy/Down)
3. View connector uptime
4. Check traffic metrics

**Command Line:**
```bash
# Check service
sudo systemctl status cloudflared

# Check logs for errors
sudo journalctl -u cloudflared -n 50 | grep -i error

# Check connectivity
cloudflared tunnel info mermaid-pi
```

### Creating Multiple Tunnels

You can create separate tunnels for different purposes:

```bash
# Create second tunnel
cloudflared tunnel create backup-pi

# List all tunnels
cloudflared tunnel list

# Use different config files
# /home/ace/.cloudflared/config-main.yml
# /home/ace/.cloudflared/config-backup.yml
```

---

## Troubleshooting

### Tunnel Shows as "Down"

**Check systemd service:**
```bash
sudo systemctl status cloudflared
```

**If not running:**
```bash
sudo systemctl start cloudflared
sudo journalctl -u cloudflared -f
```

**Common causes:**
- Network connectivity issues
- Invalid credentials
- Misconfigured config.yml

### "Unable to Reach Endpoint" Error

**Check:**
1. Is the backend service running?
```bash
ps aux | grep uvicorn
curl http://localhost:8000/docs
```

2. Is the port correct in config.yml?
```bash
cat ~/.cloudflared/config.yml | grep service
```

3. Is the tunnel running?
```bash
sudo systemctl status cloudflared
```

### DNS Not Resolving

**Check DNS propagation:**
```bash
# Check if DNS is set correctly
dig api.yourdomain.com

# Should show CNAME to *.cfargotunnel.com
```

**If not set:**
```bash
# Re-add DNS route
cloudflared tunnel route dns mermaid-pi api.yourdomain.com
```

### "Certificate Not Found" Error

**Re-login:**
```bash
cloudflared tunnel login
```

This creates `~/.cloudflared/cert.pem`

### Tunnel Keeps Disconnecting

**Check logs:**
```bash
sudo journalctl -u cloudflared -n 200
```

**Possible causes:**
- Network instability
- Firewall blocking outbound 443/7844
- Credentials expired (rare)

**Solutions:**
- Ensure outbound HTTPS allowed
- Check router/firewall settings
- Restart tunnel

### Config Changes Not Taking Effect

**Always restart after config changes:**
```bash
sudo systemctl restart cloudflared
```

**Verify config syntax:**
```bash
cloudflared tunnel ingress validate
```

---

## Security Best Practices

### 1. Protect Credentials

```bash
# Secure permissions
chmod 600 ~/.cloudflared/*.json
chmod 600 ~/.cloudflared/config.yml

# Only your user should read these files
ls -la ~/.cloudflared/
```

### 2. Use Access Policies (Optional)

Add authentication to your tunnel:

1. **Dashboard** → **Zero Trust** → **Access** → **Applications**
2. **Add an application**
3. Choose **Self-hosted**
4. Set subdomain: `api.yourdomain.com`
5. Add policies (email domain, IP ranges, etc.)
6. Now users must authenticate before accessing

### 3. Limit Ingress Rules

Only expose what you need:

```yaml
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  # Don't add services you don't need
  - service: http_status:404  # Deny everything else
```

### 4. Monitor Access Logs

**Dashboard:**
- **Zero Trust** → **Logs** → **Access**
- View all requests to your tunnel
- Set up alerts for suspicious activity

### 5. Rotate Tunnel Credentials

If compromised:

```bash
# Delete old tunnel
cloudflared tunnel delete mermaid-pi

# Create new one
cloudflared tunnel create mermaid-pi-new

# Update config with new UUID and credentials
# Restart service
```

### 6. Use Specific Service URLs

Instead of `http://localhost:8000`, be specific:

```yaml
service: http://127.0.0.1:8000
```

This prevents accidental exposure of other services on your Pi.

### 7. Keep cloudflared Updated

```bash
# Check version
cloudflared --version

# Update (Debian/Ubuntu)
sudo apt update && sudo apt upgrade cloudflared
```

---

## Quick Reference

### Essential Commands

```bash
# Tunnel Management
cloudflared tunnel list                  # List tunnels
cloudflared tunnel info <name>           # Tunnel info
cloudflared tunnel delete <name>         # Delete tunnel

# DNS Routing
cloudflared tunnel route dns <tunnel> <hostname>     # Add DNS
cloudflared tunnel route dns delete <tunnel> <hostname>  # Remove DNS

# Service Management
sudo systemctl status cloudflared        # Check status
sudo systemctl restart cloudflared       # Restart
sudo journalctl -u cloudflared -f        # View logs

# Testing
cloudflared tunnel ingress validate      # Validate config
cloudflared tunnel run <name>            # Manual run (debug)
```

### Configuration Files

| File | Purpose |
|------|---------|
| `~/.cloudflared/cert.pem` | Authentication certificate |
| `~/.cloudflared/<uuid>.json` | Tunnel credentials |
| `~/.cloudflared/config.yml` | Ingress rules and settings |
| `/etc/systemd/system/cloudflared.service` | Systemd service file |

### Useful URLs

- **Dashboard:** https://dash.cloudflare.com
- **Zero Trust:** https://one.dash.cloudflare.com
- **Documentation:** https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- **Status:** https://www.cloudflarestatus.com

---

## Additional Resources

### Cloudflare Tunnel Documentation
- [Official Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Ingress Rules](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/ingress/)
- [Access Policies](https://developers.cloudflare.com/cloudflare-one/policies/access/)

### Community
- [Cloudflare Community](https://community.cloudflare.com/)
- [r/cloudflare](https://reddit.com/r/cloudflare)

---

**Note:** This guide is specific to ACe_Toolkit deployment. Adjust hostnames, ports, and paths according to your setup.

**Last Updated:** January 13, 2026
