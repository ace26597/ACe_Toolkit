#!/bin/bash
set -e

echo "Starting Raspberry Pi Setup for Mermaid Monorepo..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker installed. Please re-login for group changes to take effect."
else
    echo "Docker already installed."
fi

# Install Docker Compose (V2 is part of docker cli now, but checking just in case)
docker compose version

# UFW Setup
echo "Configuring UFW..."
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
# Allow SSH (adjust port if you use a custom one)
sudo ufw allow ssh
# Docker handles its own iptables, but we generally don't want to expose other ports unless needed.
# Cloudflare tunnel handles ingress, so no open ports needed for web/api from outside.
sudo ufw --force enable
sudo ufw status verbose

echo "Setup complete! Don't forget to configure Cloudflare Tunnel."
