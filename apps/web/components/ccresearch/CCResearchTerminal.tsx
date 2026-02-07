"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface AutomationNotification {
  type: 'automation';
  description: string;
  action: string;
  value: string;
}

// Interface for imperative handle methods
export interface CCResearchTerminalHandle {
  sendInput: (text: string) => void;
}

interface CCResearchTerminalProps {
  sessionId: string;
  onResize?: (rows: number, cols: number) => void;
  onStatusChange?: (connected: boolean) => void;
  onAutomation?: (notification: AutomationNotification) => void;
  onImagePaste?: (file: File) => Promise<string | null>; // Returns file path on success
  className?: string;
  // Ref for imperative control (e.g., mobile input)
  inputRef?: React.MutableRefObject<CCResearchTerminalHandle | null>;
}

/**
 * CCResearch Terminal Component
 *
 * Full PTY terminal for Claude Code Research Platform with:
 * - Binary WebSocket for raw ANSI passthrough
 * - Bidirectional terminal I/O
 * - Resize handling with PTY sync
 * - Tokyo Night color theme
 * - Connection status indicator
 */
export default function CCResearchTerminal({
  sessionId,
  onResize,
  onStatusChange,
  onAutomation,
  onImagePaste,
  className = '',
  inputRef
}: CCResearchTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onImagePasteRef = useRef(onImagePaste); // Ref to avoid useEffect dependency
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Keep ref in sync with prop
  useEffect(() => {
    onImagePasteRef.current = onImagePaste;
  }, [onImagePaste]);

  // Track last dimensions to avoid unnecessary resizes
  const lastDimensions = useRef<{ rows: number; cols: number } | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to send input to terminal (for mobile input component)
  const sendInput = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const encoder = new TextEncoder();
      wsRef.current.send(encoder.encode(text));
    }
  }, []);

  // Handle paste events - intercept images and upload them
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !onImagePaste) return;

    // Check for image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // Prevent default paste behavior

        const file = item.getAsFile();
        if (!file) continue;

        // Generate filename with timestamp
        const ext = file.type.split('/')[1] || 'png';
        const filename = `pasted-image-${Date.now()}.${ext}`;
        const namedFile = new File([file], filename, { type: file.type });

        setUploadingImage(true);
        xtermRef.current?.write('\r\n\x1b[1;33m📷 Uploading pasted image...\x1b[0m');

        try {
          const filePath = await onImagePaste(namedFile);
          if (filePath) {
            xtermRef.current?.write(`\r\n\x1b[1;32m✓ Image saved: ${filePath}\x1b[0m\r\n`);
            xtermRef.current?.write(`\x1b[36m💡 To analyze: "Read the image at ${filePath} and describe what you see"\x1b[0m\r\n\r\n`);
          } else {
            xtermRef.current?.write('\r\n\x1b[1;31m✗ Failed to upload image\x1b[0m\r\n');
          }
        } catch (err) {
          xtermRef.current?.write(`\r\n\x1b[1;31m✗ Upload error: ${err}\x1b[0m\r\n`);
        } finally {
          setUploadingImage(false);
        }
        return; // Only handle first image
      }
    }
  }, [onImagePaste]);

  // Expose sendInput function via inputRef
  useEffect(() => {
    if (inputRef) {
      inputRef.current = { sendInput };
    }
    return () => {
      if (inputRef) {
        inputRef.current = null;
      }
    };
  }, [inputRef, sendInput]);

  // Update parent when connection status changes
  useEffect(() => {
    onStatusChange?.(connected);
  }, [connected, onStatusChange]);

  // Debounced resize handler - prevents flickering during rapid size changes
  const handleResize = useCallback(() => {
    // Clear any pending resize
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce resize to prevent flickering
    resizeTimeoutRef.current = setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          const { rows, cols } = xtermRef.current;

          // Only send resize if dimensions actually changed
          if (!lastDimensions.current ||
              lastDimensions.current.rows !== rows ||
              lastDimensions.current.cols !== cols) {
            lastDimensions.current = { rows, cols };

            // Send resize to server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'resize', rows, cols }));
            }

            onResize?.(rows, cols);
          }
        } catch (e) {
          // Ignore fit errors during unmount
          console.debug('Fit error (likely during unmount):', e);
        }
      }
    }, 100); // 100ms debounce
  }, [onResize]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance with Tokyo Night theme
    // xterm.js renders on canvas — no iOS auto-zoom issue (that only affects native <input>)
    // Smaller font on mobile fits more columns and prevents line truncation
    const isMobileDevice = window.innerWidth < 768;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: isMobileDevice ? 12 : 14,
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
      // Smooth scrolling to reduce flickering
      smoothScrollDuration: 0,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal in DOM
    term.open(terminalRef.current);

    // Initial fit with a small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        fitAddon.fit();
        const { rows, cols } = term;
        lastDimensions.current = { rows, cols };
        // Focus terminal on mount
        term.focus();
      } catch (e) {
        console.debug('Initial fit error:', e);
      }
    }, 50);

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket
    const connectWebSocket = () => {
      // Dynamic API URL based on current hostname
      const getApiUrl = (): string => {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk') {
          return `${protocol}//api.orpheuscore.uk`;
        }
        if (hostname === 'ai.ultronsolar.in') {
          return `${protocol}//api.ultronsolar.in`;
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'http://localhost:8000';
        }
        return `${protocol}//api.${hostname}`;
      };

      const apiUrl = getApiUrl();
      const wsUrl = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsUrl}/ccresearch/terminal/${sessionId}`);

      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        term.write('\x1b[1;32mConnected to CCResearch session\x1b[0m\r\n\r\n');

        // Send initial terminal size
        const { rows, cols } = term;
        ws.send(JSON.stringify({ type: 'resize', rows, cols }));

        // Focus terminal so keyboard input goes to it
        term.focus();
      };

      ws.onmessage = (event) => {
        // Handle binary data (terminal output)
        if (event.data instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data);
          term.write(data);
          // Always scroll to bottom on new output
          term.scrollToBottom();
        } else {
          // Handle JSON messages
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'error') {
              setError(msg.error);
              term.write(`\r\n\x1b[1;31mError: ${msg.error}\x1b[0m\r\n`);
              term.scrollToBottom();
            } else if (msg.type === 'status') {
              if (msg.status === 'connected') {
                term.write(`\x1b[1;34mClaude Code started (PID: ${msg.pid})\x1b[0m\r\n`);
                term.scrollToBottom();
              } else if (msg.status === 'terminated') {
                term.write('\r\n\x1b[1;33mSession terminated\x1b[0m\r\n');
                term.scrollToBottom();
              }
            } else if (msg.type === 'pong') {
              // Heartbeat response
            } else if (msg.type === 'automation') {
              // Automation rule triggered - notify parent component
              onAutomation?.(msg as AutomationNotification);
            }
          } catch {
            // Plain text fallback
            term.write(event.data);
            term.scrollToBottom();
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

    // Intercept Ctrl+V to check for images in clipboard
    term.attachCustomKeyEventHandler((event) => {
      // Check for Ctrl+V or Cmd+V (paste)
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && event.type === 'keydown') {
        // Use the Clipboard API to check for images
        navigator.clipboard.read().then(async (items) => {
          for (const item of items) {
            // Check if clipboard has image
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
              try {
                const blob = await item.getType(imageType);
                const ext = imageType.split('/')[1] || 'png';
                const filename = `pasted-image-${Date.now()}.${ext}`;
                const file = new File([blob], filename, { type: imageType });

                // Call the image paste handler
                if (onImagePasteRef.current) {
                  setUploadingImage(true);
                  term.write('\r\n\x1b[1;33m📷 Uploading pasted image...\x1b[0m');

                  const filePath = await onImagePasteRef.current(file);
                  if (filePath) {
                    term.write(`\r\n\x1b[1;32m✓ Image saved: ${filePath}\x1b[0m\r\n`);
                    term.write(`\x1b[36m💡 To analyze: "Read the image at ${filePath} and describe what you see"\x1b[0m\r\n\r\n`);
                  } else {
                    term.write('\r\n\x1b[1;31m✗ Failed to upload image\x1b[0m\r\n');
                  }
                  setUploadingImage(false);
                }
              } catch (err) {
                // Failed to read image from clipboard - silently handled
              }
              return; // Don't process further - we handled the image
            }
          }
        }).catch((err) => {
          // Clipboard API failed (permissions or not supported)
          // Let the default paste behavior happen for text
          console.debug('Clipboard read failed, using default paste:', err);
        });

        // Return true to let xterm handle the paste (for text content)
        return true;
      }
      return true; // Let all other keys through
    });

    // Handle window resize with debouncing
    window.addEventListener('resize', handleResize);

    // Observe container resize - use a flag to ignore scroll-triggered resizes
    let isResizing = false;
    const resizeObserver = new ResizeObserver((entries) => {
      // Only trigger resize if the actual container size changed significantly
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        // Ignore very small changes (likely from scroll bars appearing/disappearing)
        if (!isResizing && width > 0 && height > 0) {
          isResizing = true;
          handleResize();
          // Reset flag after debounce period
          setTimeout(() => { isResizing = false; }, 150);
        }
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      clearInterval(pingInterval);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [sessionId, handleResize]);

  return (
    <div className={`relative h-full ${className}`}>
      {/* Status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-2 bg-black/70 px-3 py-1 rounded-md text-xs">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-slate-300">
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

      {/* Image upload indicator */}
      {uploadingImage && (
        <div className="absolute top-10 left-2 right-2 z-10 bg-amber-900/90 text-amber-200 px-3 py-2 rounded-md text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
          Uploading image...
        </div>
      )}

      {/* Terminal container - click to focus, prevent scroll issues */}
      <div
        ref={terminalRef}
        className="w-full h-full overflow-hidden"
        onClick={() => xtermRef.current?.focus()}
        onPaste={handlePaste}
        onWheel={(e) => {
          // Prevent wheel events from bubbling to parent (browser scroll)
          e.stopPropagation();
        }}
      />
    </div>
  );
}
