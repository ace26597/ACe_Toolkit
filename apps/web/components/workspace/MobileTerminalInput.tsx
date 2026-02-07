"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CornerDownLeft,
  ChevronRight,
  History,
  Keyboard
} from 'lucide-react';

interface MobileTerminalInputProps {
  onSendInput: (input: string) => void;
  onSendControlSequence: (sequence: string) => void;
  disabled?: boolean;
}

/**
 * Mobile-friendly terminal input with PTY escape key toolbar and text input.
 *
 * Row 1: Scrollable PTY key buttons that send escape sequences directly to the terminal.
 *         Arrow Up/Down send \x1b[A / \x1b[B for Claude Code history navigation.
 * Row 2: Text input field with send button and local command history popup.
 */
export function MobileTerminalInput({
  onSendInput,
  onSendControlSequence,
  disabled = false,
}: MobileTerminalInputProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load command history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('terminal_command_history');
    if (saved) {
      try {
        setCommandHistory(JSON.parse(saved).slice(0, 50));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Save command to history
  const saveToHistory = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c !== cmd);
      const updated = [cmd, ...filtered].slice(0, 50);
      localStorage.setItem('terminal_command_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Send the current input
  const handleSend = useCallback(() => {
    if (!input.trim() && input !== '') {
      onSendInput('\r');
      return;
    }

    saveToHistory(input);
    onSendInput(input + '\r');
    setInput('');
    inputRef.current?.focus();
  }, [input, onSendInput, saveToHistory]);

  // Handle keyboard submit (Enter only - arrow keys are handled by toolbar)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="md:hidden bg-slate-900 border-t border-slate-700 safe-area-bottom">
      {/* Command history dropdown */}
      {showHistory && commandHistory.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-b border-slate-700 bg-slate-950">
          {commandHistory.slice(0, 10).map((cmd, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(cmd);
                setShowHistory(false);
                inputRef.current?.focus();
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 truncate font-mono"
            >
              <ChevronRight className="w-3 h-3 inline-block mr-2 text-slate-500" />
              {cmd}
            </button>
          ))}
        </div>
      )}

      {/* Row 1: PTY Keys Toolbar (horizontally scrollable) */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-slate-800 overflow-x-auto scrollbar-hide">
        {/* Control keys group */}
        <PtyButton label="Esc" seq={'\x1b'} color="yellow" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="Tab" seq={'\t'} color="blue" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="^C" seq={'\x03'} color="red" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="^D" seq={'\x04'} color="orange" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="^L" seq={'\x0c'} color="cyan" disabled={disabled} onSend={onSendControlSequence} />

        {/* Divider */}
        <div className="w-px h-7 bg-slate-700 mx-0.5 flex-shrink-0" />

        {/* Arrow keys group */}
        <PtyButton label="\u25C0" seq={'\x1b[D'} color="slate" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="\u25B6" seq={'\x1b[C'} color="slate" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="\u25B2" seq={'\x1b[A'} color="slate" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="\u25BC" seq={'\x1b[B'} color="slate" disabled={disabled} onSend={onSendControlSequence} />

        {/* Spacer + History toggle */}
        <div className="flex-1" />
        <button
          onClick={() => setShowHistory(!showHistory)}
          disabled={disabled}
          className={`
            flex items-center justify-center min-w-[44px] h-[44px] px-3 rounded-lg
            transition-colors text-sm font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            ${showHistory ? 'text-green-400 bg-green-400/20' : 'text-slate-400 bg-slate-800/60 hover:bg-slate-700/60'}
          `}
          title="Command History"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Row 2: Text Input + Send */}
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type command..."
            className="
              w-full h-11 px-4 pr-10
              bg-slate-800 border border-slate-700 rounded-xl
              text-base text-white placeholder-slate-500
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              font-mono
            "
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <Keyboard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </div>

        <button
          onClick={handleSend}
          disabled={disabled}
          className="
            flex items-center justify-center
            w-11 h-11 rounded-xl
            bg-blue-600 hover:bg-blue-500 active:bg-blue-700
            text-white transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          aria-label="Send"
        >
          <CornerDownLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/** Color map for PTY button variants */
const colorMap = {
  yellow: 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/25 active:bg-yellow-400/35',
  blue:   'text-blue-400 bg-blue-400/10 hover:bg-blue-400/25 active:bg-blue-400/35',
  red:    'text-red-400 bg-red-400/10 hover:bg-red-400/25 active:bg-red-400/35',
  orange: 'text-orange-400 bg-orange-400/10 hover:bg-orange-400/25 active:bg-orange-400/35',
  cyan:   'text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/25 active:bg-cyan-400/35',
  slate:  'text-slate-200 bg-slate-700/50 hover:bg-slate-600/60 active:bg-slate-500/60',
} as const;

/** Individual PTY key button with tinted background for visibility */
function PtyButton({
  label,
  seq,
  color,
  disabled,
  onSend,
}: {
  label: string;
  seq: string;
  color: keyof typeof colorMap;
  disabled: boolean;
  onSend: (seq: string) => void;
}) {
  return (
    <button
      onClick={() => onSend(seq)}
      disabled={disabled}
      className={`
        flex items-center justify-center min-w-[44px] h-[44px] px-2.5 rounded-lg
        transition-colors text-sm font-semibold whitespace-nowrap flex-shrink-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colorMap[color]}
      `}
      title={label}
    >
      {label}
    </button>
  );
}

/**
 * Compact version for when space is limited (e.g., Video Studio)
 */
export function MobileTerminalInputCompact({
  onSendInput,
  onSendControlSequence,
  disabled = false,
}: MobileTerminalInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    onSendInput(input + '\r');
    setInput('');
    inputRef.current?.focus();
  }, [input, onSendInput]);

  return (
    <div className="md:hidden bg-slate-900 border-t border-slate-700 safe-area-bottom">
      {/* PTY Keys Row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800 overflow-x-auto scrollbar-hide">
        <PtyButton label="^C" seq={'\x03'} color="red" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="Tab" seq={'\t'} color="blue" disabled={disabled} onSend={onSendControlSequence} />
        <div className="w-px h-6 bg-slate-700 mx-0.5 flex-shrink-0" />
        <PtyButton label="\u25B2" seq={'\x1b[A'} color="slate" disabled={disabled} onSend={onSendControlSequence} />
        <PtyButton label="\u25BC" seq={'\x1b[B'} color="slate" disabled={disabled} onSend={onSendControlSequence} />
      </div>

      {/* Input Row */}
      <div className="flex items-center gap-2 p-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={disabled}
          placeholder="Command..."
          className="
            flex-1 h-10 px-3
            bg-slate-800 border border-slate-700 rounded-lg
            text-base text-white placeholder-slate-500
            focus:outline-none focus:border-blue-500
            font-mono
          "
          autoCapitalize="none"
          autoCorrect="off"
        />

        <button
          onClick={handleSend}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white"
        >
          <CornerDownLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
