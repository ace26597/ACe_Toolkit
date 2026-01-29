"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  XCircle,
  Space,
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
 * Mobile-friendly terminal input with command history and quick actions
 * Provides easier typing on mobile devices with soft keyboards
 */
export function MobileTerminalInput({
  onSendInput,
  onSendControlSequence,
  disabled = false,
}: MobileTerminalInputProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load command history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('terminal_command_history');
    if (saved) {
      try {
        setCommandHistory(JSON.parse(saved).slice(0, 50)); // Keep last 50
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Save command to history
  const saveToHistory = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setCommandHistory(prev => {
      const filtered = prev.filter(c => c !== cmd); // Remove duplicates
      const updated = [cmd, ...filtered].slice(0, 50);
      localStorage.setItem('terminal_command_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Send the current input
  const handleSend = useCallback(() => {
    if (!input.trim() && input !== '') {
      // Just send Enter for empty input
      onSendInput('\r');
      return;
    }

    saveToHistory(input);
    onSendInput(input + '\r');
    setInput('');
    setHistoryIndex(-1);
    inputRef.current?.focus();
  }, [input, onSendInput, saveToHistory]);

  // Handle keyboard submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }, [handleSend, commandHistory, historyIndex]);

  // Navigate history
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && commandHistory.length > 0) {
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || '');
    } else if (direction === 'down') {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
    inputRef.current?.focus();
  }, [commandHistory, historyIndex]);

  // Quick action buttons configuration
  const quickActions = [
    {
      icon: <XCircle className="w-4 h-4" />,
      label: 'Ctrl+C',
      action: () => onSendControlSequence('\x03'),
      className: 'text-red-400 hover:bg-red-400/20'
    },
    {
      icon: <span className="text-xs font-mono">Tab</span>,
      label: 'Tab',
      action: () => onSendInput('\t'),
      className: 'text-blue-400 hover:bg-blue-400/20'
    },
    {
      icon: <ArrowUp className="w-4 h-4" />,
      label: 'Up',
      action: () => navigateHistory('up'),
      className: 'text-slate-400 hover:bg-slate-400/20'
    },
    {
      icon: <ArrowDown className="w-4 h-4" />,
      label: 'Down',
      action: () => navigateHistory('down'),
      className: 'text-slate-400 hover:bg-slate-400/20'
    },
    {
      icon: <History className="w-4 h-4" />,
      label: 'History',
      action: () => setShowHistory(!showHistory),
      className: showHistory ? 'text-green-400 bg-green-400/20' : 'text-slate-400 hover:bg-slate-400/20'
    },
  ];

  return (
    <div className="md:hidden bg-slate-900 border-t border-slate-700">
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

      {/* Quick action buttons */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800 overflow-x-auto">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            disabled={disabled}
            className={`
              flex items-center justify-center min-w-[44px] h-9 px-3 rounded-lg
              transition-colors text-xs font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              ${action.className}
            `}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}

        {/* Common commands quick insert */}
        <div className="flex-1" />
        <button
          onClick={() => { setInput('ls -la'); inputRef.current?.focus(); }}
          disabled={disabled}
          className="px-2 h-9 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
        >
          ls
        </button>
        <button
          onClick={() => { setInput('cd '); inputRef.current?.focus(); }}
          disabled={disabled}
          className="px-2 h-9 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
        >
          cd
        </button>
        <button
          onClick={() => { setInput('cat '); inputRef.current?.focus(); }}
          disabled={disabled}
          className="px-2 h-9 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
        >
          cat
        </button>
      </div>

      {/* Input field with send button */}
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
              text-sm text-white placeholder-slate-500
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

/**
 * Compact version for when space is limited
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
    <div className="md:hidden flex items-center gap-2 p-2 bg-slate-900 border-t border-slate-700">
      {/* Ctrl+C button */}
      <button
        onClick={() => onSendControlSequence('\x03')}
        disabled={disabled}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-400/20"
        title="Ctrl+C"
      >
        <XCircle className="w-5 h-5" />
      </button>

      {/* Input */}
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
          text-sm text-white placeholder-slate-500
          focus:outline-none focus:border-blue-500
          font-mono
        "
        autoCapitalize="none"
        autoCorrect="off"
      />

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={disabled}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white"
      >
        <CornerDownLeft className="w-5 h-5" />
      </button>
    </div>
  );
}
