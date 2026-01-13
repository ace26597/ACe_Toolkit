#!/bin/bash
# Setup desktop autostart for ACe_Toolkit
# This creates an autostart entry to open terminal with tmux on boot

set -e

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/acetoolkit.desktop"

echo "Setting up ACe_Toolkit desktop autostart..."

# Create autostart directory if it doesn't exist
mkdir -p "$AUTOSTART_DIR"

# Create desktop entry
cat > "$DESKTOP_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=ACe_Toolkit
Comment=Start ACe_Toolkit with visible terminal
Exec=/usr/bin/lxterminal -e "bash -c 'cd /home/ace/dev/ACe_Toolkit && ./infra/scripts/start_all_tmux.sh && tmux attach-session -t acetoolkit; exec bash'"
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
EOF

# Make it executable
chmod +x "$DESKTOP_FILE"

echo "✓ Desktop autostart created at: $DESKTOP_FILE"
echo ""
echo "On next reboot, a terminal will automatically open with:"
echo "  - Backend (FastAPI) in left pane"
echo "  - Frontend (Next.js) in top-right pane"
echo "  - Status dashboard in bottom-right pane"
echo ""
echo "Tmux commands:"
echo "  Ctrl+b, arrow keys - Switch between panes"
echo "  Ctrl+b, d - Detach (keeps running in background)"
echo "  Ctrl+b, [ - Scroll mode (q to exit)"
echo ""
echo "To disable autostart, delete: $DESKTOP_FILE"
