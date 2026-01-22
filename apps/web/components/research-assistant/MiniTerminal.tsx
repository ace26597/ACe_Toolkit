'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, Wrench, Brain, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { ResearchStreamEvent } from '@/lib/api';

interface TerminalEntry {
  id: string;
  type: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error' | 'system';
  content: string;
  name?: string;
  input?: Record<string, any>;
  isError?: boolean;
  timestamp: Date;
}

interface MiniTerminalProps {
  entries: TerminalEntry[];
  isRunning: boolean;
  onClear: () => void;
}

export default function MiniTerminal({ entries, isRunning, onClear }: MiniTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getEntryIcon = (entry: TerminalEntry) => {
    switch (entry.type) {
      case 'thinking':
        return <Brain className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
      case 'tool_use':
        return <Wrench className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      case 'tool_result':
        return entry.isError ? (
          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        );
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
      case 'system':
        return <Terminal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const truncate = (str: string, maxLength: number = 100) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Live Output</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
              Running
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          title="Clear terminal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs"
      >
        {entries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Waiting for activity...</p>
            <p className="text-xs mt-1">Tool usage and thinking will appear here</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-start gap-2 p-2 rounded ${
                entry.type === 'error'
                  ? 'bg-red-900/20 border border-red-800/30'
                  : entry.type === 'thinking'
                  ? 'bg-purple-900/20 border border-purple-800/30'
                  : entry.type === 'tool_use'
                  ? 'bg-blue-900/20 border border-blue-800/30'
                  : entry.type === 'tool_result'
                  ? entry.isError
                    ? 'bg-red-900/10 border border-red-800/20'
                    : 'bg-green-900/20 border border-green-800/30'
                  : 'bg-gray-800/50'
              }`}
            >
              {getEntryIcon(entry)}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`font-semibold ${
                      entry.type === 'error'
                        ? 'text-red-400'
                        : entry.type === 'thinking'
                        ? 'text-purple-400'
                        : entry.type === 'tool_use'
                        ? 'text-blue-400'
                        : entry.type === 'tool_result'
                        ? entry.isError
                          ? 'text-red-400'
                          : 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {entry.type === 'thinking'
                      ? 'Thinking'
                      : entry.type === 'tool_use'
                      ? entry.name || 'Tool'
                      : entry.type === 'tool_result'
                      ? 'Result'
                      : entry.type === 'error'
                      ? 'Error'
                      : entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                  </span>
                  <span className="text-gray-600 text-[10px]">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {/* Content */}
                <div className="text-gray-300">
                  {entry.type === 'tool_use' && entry.input ? (
                    <div className="space-y-1">
                      {Object.entries(entry.input).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-500">{key}:</span>
                          <span className="text-gray-300 break-all">
                            {typeof value === 'string'
                              ? truncate(value, 80)
                              : truncate(JSON.stringify(value), 80)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="break-words whitespace-pre-wrap">
                      {truncate(entry.content, 300)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Running indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 text-gray-400 pl-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-[10px]">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to create terminal entries from stream events
export function createTerminalEntry(event: ResearchStreamEvent): TerminalEntry | null {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date();

  switch (event.type) {
    case 'thinking':
      return {
        id,
        type: 'thinking',
        content: event.content || '',
        timestamp,
      };
    case 'tool_use':
      return {
        id,
        type: 'tool_use',
        content: '',
        name: event.name,
        input: event.input,
        timestamp,
      };
    case 'tool_result':
      return {
        id,
        type: 'tool_result',
        content: typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
        isError: event.is_error,
        timestamp,
      };
    case 'error':
      return {
        id,
        type: 'error',
        content: event.error || 'Unknown error',
        timestamp,
      };
    case 'system':
      return {
        id,
        type: 'system',
        content: `Session: ${event.session_id || 'connected'}`,
        timestamp,
      };
    default:
      return null;
  }
}
