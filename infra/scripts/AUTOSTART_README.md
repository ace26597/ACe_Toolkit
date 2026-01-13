# Auto-Start with Visible Terminal

This guide shows how to set up ACe_Toolkit to start on reboot **with a visible terminal** showing all services.

## Two Options

### Option 1: Visible Terminal (Desktop Environment)

**For Raspberry Pi with Desktop (GUI)**

Best if you want to **SEE** the backend, frontend, and status in a terminal window.

**Setup:**
```bash
cd /home/ace/dev/ACe_Toolkit/infra/scripts
./setup_autostart_desktop.sh
```

**What happens on reboot:**
1. Terminal window opens automatically
2. Tmux session starts with 3 panes:
   - **Left pane:** Backend (FastAPI) logs
   - **Top-right pane:** Frontend (Next.js) logs
   - **Bottom-right pane:** Status dashboard (auto-refreshes every 30 seconds)

**Tmux controls:**
- `Ctrl+b` then arrow keys - Switch panes
- `Ctrl+b` then `d` - Detach (keeps running)
- `Ctrl+b` then `[` - Scroll mode (press `q` to exit)

**To reattach later:**
```bash
tmux attach-session -t acetoolkit
```

**To disable:**
```bash
rm ~/.config/autostart/acetoolkit.desktop
```

---

### Option 2: Background (Headless/No Desktop)

**For Raspberry Pi without Desktop OR if you prefer background operation**

Services run in background, check status manually.

**Setup:**
```bash
crontab -e
# Add this line:
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**What happens on reboot:**
1. Services start in background after 30 seconds
2. No visible terminal
3. Check status anytime with: `./infra/scripts/status.sh`

**To view logs:**
```bash
tail -f /home/ace/dev/ACe_Toolkit/logs/backend-*.log
tail -f /home/ace/dev/ACe_Toolkit/logs/frontend-*.log
```

---

## Status Dashboard

Run anytime to see system status:

```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/status.sh
```

**Shows:**
- ✓ Service status (Backend, Frontend, Cloudflare Tunnel)
- 🌐 Network info (Local IP, Public IP)
- 🔗 Access URLs (Local, Network, Cloudflare)
- 💊 Health checks
- ⚠️ Recent errors
- 💻 System resources (CPU, Memory, Disk)
- 🎮 Quick commands

**Auto-refresh mode:**
```bash
./infra/scripts/status.sh  # Refreshes every 30 seconds
```

**Single run:**
```bash
./infra/scripts/status.sh --once
```

---

## Manual Tmux Session

Start tmux session manually anytime:

```bash
cd /home/ace/dev/ACe_Toolkit
./infra/scripts/start_all_tmux.sh
```

Attach to existing session:
```bash
tmux attach-session -t acetoolkit
```

Kill tmux session:
```bash
tmux kill-session -t acetoolkit
```

---

## Comparison

| Feature | Desktop (Tmux) | Background (Cron) |
|---------|---------------|-------------------|
| Visible terminal | ✅ Yes | ❌ No |
| Real-time logs | ✅ Yes | ❌ Manual check |
| Auto-start | ✅ Desktop login | ✅ Boot |
| Resource usage | ~10MB extra | Minimal |
| Requires GUI | ✅ Yes | ❌ No |
| Easy monitoring | ✅ Terminal visible | ⚠️ Run status.sh |

---

## Troubleshooting

### Terminal doesn't open on boot

**Check autostart file:**
```bash
ls -la ~/.config/autostart/acetoolkit.desktop
cat ~/.config/autostart/acetoolkit.desktop
```

**Test manually:**
```bash
./infra/scripts/start_all_tmux.sh
```

### Services not starting in tmux

**Check logs:**
```bash
tail /home/ace/dev/ACe_Toolkit/logs/backend-*.log
tail /home/ace/dev/ACe_Toolkit/logs/frontend-*.log
```

**Verify virtual environment:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/api/.venv
```

**Verify node_modules:**
```bash
ls -la /home/ace/dev/ACe_Toolkit/apps/web/node_modules
```

### Tmux session won't attach

**List sessions:**
```bash
tmux ls
```

**Kill and restart:**
```bash
tmux kill-session -t acetoolkit
./infra/scripts/start_all_tmux.sh
```

### Status script shows errors

**Run status once to see full output:**
```bash
./infra/scripts/status.sh --once
```

**Check specific service:**
```bash
curl http://localhost:8000/docs  # Backend
curl http://localhost:3000       # Frontend
sudo systemctl status cloudflared # Tunnel
```

---

## Which Option Should I Use?

**Use Desktop (Option 1) if:**
- You have a monitor connected to your Pi
- You want to **SEE** logs in real-time
- You like visual feedback
- You're comfortable with tmux

**Use Background (Option 2) if:**
- Your Pi is headless (no monitor)
- You prefer SSH access
- You want minimal resource usage
- You check status manually when needed

**Both work perfectly - choose based on your preference!**

---

**Last Updated:** January 13, 2026
