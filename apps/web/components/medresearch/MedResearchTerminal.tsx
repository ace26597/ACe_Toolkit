"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface MedResearchTerminalProps {
  sessionId: string;
  onResize?: (rows: number, cols: number) => void;
  onStatusChange?: (connected: boolean) => void;
  className?: string;
}

/**
 * MedResearch Terminal Component
 *
 * Full PTY terminal for Claude Code with:
 * - Binary WebSocket for raw ANSI passthrough
 * - Bidirectional terminal I/O
 * - Resize handling with PTY sync
 * - Tokyo Night color theme
 * - Connection status indicator
 */
export default function MedResearchTerminal({
  sessionId,
  onResize,
  onStatusChange,
  className = ''
}: MedResearchTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Update parent when connection status changes
  useEffect(() => {
    onStatusChange?.(connected);
  }, [connected, onStatusChange]);

  // Resize handler
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit();
      const { rows, cols } = xtermRef.current;

      // Send resize to server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', rows, cols }));
      }

      onResize?.(rows, cols);
    }
  }, [onResize]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance with Tokyo Night theme
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      scrollback: 10000,
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal in DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket
    const connectWebSocket = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const wsUrl = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsUrl}/medresearch/terminal/${sessionId}`);

      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        term.write('\x1b[1;32mConnected to MedResearch session\x1b[0m\r\n\r\n');

        // Send initial terminal size
        const { rows, cols } = term;
        ws.send(JSON.stringify({ type: 'resize', rows, cols }));
      };

      ws.onmessage = (event) => {
        // Handle binary data (terminal output)
        if (event.data instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data);
          term.write(data);
        } else {
          // Handle JSON messages
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'error') {
              setError(msg.error);
              term.write(`\r\n\x1b[1;31mError: ${msg.error}\x1b[0m\r\n`);
            } else if (msg.type === 'status') {
              if (msg.status === 'connected') {
                term.write(`\x1b[1;34mClaude Code started (PID: ${msg.pid})\x1b[0m\r\n`);
              } else if (msg.status === 'terminated') {
                term.write('\r\n\x1b[1;33mSession terminated\x1b[0m\r\n');
              }
            } else if (msg.type === 'pong') {
              // Heartbeat response
            }
          } catch {
            // Plain text fallback
            term.write(event.data);
          }
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        term.write('\r\n\x1b[1;31mConnection error\x1b[0m\r\n');
      };

      ws.onclose = (event) => {
        setConnected(false);

        if (event.wasClean) {
          term.write('\r\n\x1b[1;33mSession disconnected\x1b[0m\r\n');
        } else {
          term.write('\r\n\x1b[1;31mConnection lost\x1b[0m\r\n');

          // Attempt reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            term.write(`\x1b[1;33mReconnecting (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...\x1b[0m\r\n`);
            setTimeout(connectWebSocket, 2000);
          } else {
            term.write('\x1b[1;31mMax reconnection attempts reached\x1b[0m\r\n');
          }
        }
      };
    };

    connectWebSocket();

    // Handle terminal input -> WebSocket (raw bytes)
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send as raw bytes for PTY
        const encoder = new TextEncoder();
        wsRef.current.send(encoder.encode(data));
      }
    });

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Observe container resize
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [sessionId, handleResize]);

  return (
    <div className={`relative ${className}`}>
      {/* Status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-2 bg-black/70 px-3 py-1 rounded-md text-xs">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-300">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="absolute top-10 left-2 right-2 z-10 bg-red-900/90 text-red-200 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}
