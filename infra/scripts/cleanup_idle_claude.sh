#!/bin/bash
# Cleanup idle Claude Code processes
# Kills Claude processes that have been idle for more than IDLE_TIMEOUT seconds
# Excludes processes attached to active terminals (pts with +)

IDLE_TIMEOUT=${1:-1800}  # Default: 30 minutes (1800 seconds)
LOG_FILE="/home/ace/dev/ACe_Toolkit/logs/claude-cleanup.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" >> "$LOG_FILE"
}

# Find Claude processes without active terminal (no + in STAT column = backgrounded/disconnected)
# STAT column: Ssl = sleeping, interruptible wait, session leader, multi-threaded
# STAT with + = foreground process group (active terminal)

killed=0
checked=0

while read -r pid stat cmd; do
    # Skip if PID is empty
    [ -z "$pid" ] && continue

    ((checked++))

    # Skip processes with + in STAT (active terminal attached)
    if [[ "$stat" == *"+"* ]]; then
        continue
    fi

    # Check process idle time using /proc/[pid]/stat
    if [ -d "/proc/$pid" ]; then
        # Get process start time and current uptime
        proc_start=$(awk '{print $22}' /proc/$pid/stat 2>/dev/null)
        uptime_ticks=$(awk '{print $1}' /proc/uptime 2>/dev/null | cut -d. -f1)
        clk_tck=$(getconf CLK_TCK)

        if [ -n "$proc_start" ] && [ -n "$uptime_ticks" ]; then
            # Calculate process age in seconds
            proc_age=$(( uptime_ticks - (proc_start / clk_tck) ))

            # Check last activity via /proc/[pid]/fd modification time
            last_activity=$(stat -c %Y /proc/$pid/fd 2>/dev/null || echo 0)
            now=$(date +%s)
            idle_time=$((now - last_activity))

            if [ "$idle_time" -gt "$IDLE_TIMEOUT" ]; then
                log "Killing idle Claude process PID=$pid (idle ${idle_time}s, STAT=$stat)"
                kill -TERM "$pid" 2>/dev/null
                ((killed++))
            fi
        fi
    fi
done < <(ps aux | grep -E '/claude|claude --' | grep -v grep | awk '{print $2, $8, $11}')

if [ "$killed" -gt 0 ]; then
    log "Cleanup complete: killed $killed of $checked Claude processes"
fi

# Also cleanup orphaned MCP servers (parent Claude process gone)
orphaned=0
while read -r pid ppid cmd; do
    [ -z "$pid" ] && continue
    # Check if parent process exists
    if [ ! -d "/proc/$ppid" ]; then
        log "Killing orphaned MCP server PID=$pid (parent $ppid gone)"
        kill -TERM "$pid" 2>/dev/null
        ((orphaned++))
    fi
done < <(ps -eo pid,ppid,cmd | grep -E 'mcp-server|/uvx' | grep -v grep | awk '{print $1, $2, $3}')

if [ "$orphaned" -gt 0 ]; then
    log "Cleaned up $orphaned orphaned MCP server processes"
fi
