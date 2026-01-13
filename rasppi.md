Here’s a no-BS “Pi dev toolbox” for Claude Code development + remote access + sanity. I’m assuming Raspberry Pi OS (Bookworm) and you’re SSH’ing from iPad/phone.

Must-have (dev + quality of life)

Install these first:

sudo apt update
sudo apt install -y \
  git curl wget unzip zip ca-certificates gnupg \
  build-essential cmake pkg-config \
  python3 python3-venv python3-pip pipx \
  jq ripgrep fd-find fzf tree \
  htop btop iotop iftop ncdu \
  tmux neovim \
  openssh-server \
  rsync \
  sqlite3 \
  lsof net-tools

What each is for (quick):
	•	tmux: keep long-running sessions alive when iPad sleeps.
	•	ripgrep (rg), fd, fzf: insanely fast search + fuzzy find.
	•	jq: parse JSON outputs (APIs, logs).
	•	btop/htop: see what’s killing CPU/RAM.
	•	ncdu: find disk hogs fast.
	•	lsof: “what’s using this port/file?”

Claude-code / LLM dev essentials

Node + npm (use modern Node via nvm)

Pi apt Node versions can be ancient. Use nvm:

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
node -v
npm -v

Python workflow: use pipx for CLI tools

pipx ensurepath

Then install useful CLIs:

pipx install ruff
pipx install black
pipx install mypy
pipx install poetry
pipx install httpie
pipx install pre-commit

	•	ruff: fast linting/formatting
	•	pre-commit: auto-run checks before commits
	•	httpie: human-friendly curl

Remote access + file moves (actually useful on Pi)

Tailscale (remote access anywhere, safely)

This is the best “access my Pi from anywhere” move.

curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

Then you can VNC/SSH using the Tailscale IP without exposing ports.

mDNS for local discovery (so you can use raspberrypi.local)

sudo apt install -y avahi-daemon
sudo systemctl enable --now avahi-daemon

Samba (optional, easy drag-drop files from Windows/Mac)

sudo apt install -y samba

(Only if you want Pi to show as a network drive.)

Debug + networking tools (when something “mysteriously” breaks)

sudo apt install -y \
  traceroute mtr-tiny dnsutils iperf3 \
  tcpdump nmap

	•	iperf3: test Wi-Fi speed to Pi
	•	dnsutils: dig, nslookup
	•	tcpdump: last resort packet sanity

Containers (optional, but great for dev)

If you’ll run services cleanly:

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

Then:

docker run hello-world

Editor / terminal experience (choose your poison)
	•	Neovim (fast, SSH-friendly): already installed above.
	•	If you want VS Code vibes: code-server (web VS Code) is good on Pi, but heavier.

“I want this to feel like a real dev machine”

Zsh + Starship prompt (optional, but nice)

sudo apt install -y zsh
curl -fsSL https://starship.rs/install.sh | sh

(Set zsh as default if you care.)

⸻

My recommended minimal set (if you only install 10 things)

tmux, git, ripgrep, fd-find, fzf, jq, btop, ncdu, pipx, nvm (Node LTS)

⸻

If you tell me what you’re using for Claude Code on the Pi (CLI tool name / install method) and whether you prefer Python-first or Node-first, I’ll tailor an install script that’s exactly your stack and avoids bloat.
