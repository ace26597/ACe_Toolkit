# Cloudflare Tunnel Setup

1.  **Install `cloudflared` on Pi**:
    ```bash
    # Add Cloudflare gpg key
    sudo mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

    # Add repo
    echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

    # Install
    sudo apt-get update && sudo apt-get install cloudflared
    ```

2.  **Login**:
    ```bash
    cloudflared tunnel login
    ```

3.  **Create Tunnel**:
    ```bash
    cloudflared tunnel create mermaid-pi
    ```

4.  **Configure Ingress (`config.yml`)**:
    Create `.cloudflared/config.yml`:
    ```yaml
    tunnel: <Tunnel-UUID>
    credentials-file: /home/pi/.cloudflared/<Tunnel-UUID>.json

    ingress:
      - hostname: api.yourdomain.com
        service: http://localhost:8000
      - hostname: ssh.yourdomain.com
        service: ssh://localhost:22
      - service: http_status:404
    ```

5.  **Route DNS**:
    ```bash
    cloudflared tunnel route dns mermaid-pi api.yourdomain.com
    ```

6.  **Run as Service**:
    ```bash
    sudo cloudflared service install
    sudo systemctl start cloudflared
    ```
