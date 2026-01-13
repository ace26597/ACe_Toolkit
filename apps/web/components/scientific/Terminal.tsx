"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  websocketUrl: string;
  className?: string;
}

/**
 * Terminal component using xterm.js
 *
 * Features:
 * - WebSocket connection to skills backend
 * - Auto-fit to container
 * - Link detection
 * - Copy/paste support
 * - Command history (up/down arrows)
 */
export default function Terminal({ websocketUrl, className = '' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentLineRef = useRef('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
      scrollback: 1000,
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
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.write('\r\n\x1b[1;31mWebSocket connection error\x1b[0m\r\n');
    };

    ws.onclose = () => {
      setConnected(false);
      term.write('\r\n\x1b[1;33mConnection closed\x1b[0m\r\n');
    };

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle special keys
      if (code === 13) {
        // Enter key
        const command = currentLineRef.current.trim();

        if (command) {
          // Add to history
          setCommandHistory((prev) => [...prev, command]);
          setHistoryIndex(-1);

          // Send to WebSocket
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(command);
          }
        }

        currentLineRef.current = '';
        term.write('\r\n');

      } else if (code === 127) {
        // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }

      } else if (code === 27) {
        // Escape sequences (arrow keys, etc.)
        // Up arrow: \x1b[A
        // Down arrow: \x1b[B

        if (data === '\x1b[A') {
          // Up arrow - previous command
          if (commandHistory.length > 0) {
            const newIndex = historyIndex === -1
              ? commandHistory.length - 1
              : Math.max(0, historyIndex - 1);

            setHistoryIndex(newIndex);

            // Clear current line
            term.write('\r\x1b[K');

            // Write command from history
            const cmd = commandHistory[newIndex];
            currentLineRef.current = cmd;
            term.write(cmd);
          }

        } else if (data === '\x1b[B') {
          // Down arrow - next command
          if (historyIndex !== -1) {
            const newIndex = historyIndex + 1;

            if (newIndex >= commandHistory.length) {
              setHistoryIndex(-1);
              term.write('\r\x1b[K');
              currentLineRef.current = '';
            } else {
              setHistoryIndex(newIndex);
              term.write('\r\x1b[K');
              const cmd = commandHistory[newIndex];
              currentLineRef.current = cmd;
              term.write(cmd);
            }
          }
        }

      } else if (code < 32) {
        // Control characters (ignore most)
        // Ctrl+C: code 3
        if (code === 3) {
          term.write('^C\r\n');
          currentLineRef.current = '';
        }

      } else {
        // Normal character
        currentLineRef.current += data;
        term.write(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [websocketUrl, commandHistory, historyIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-md text-xs">
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-gray-300">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
