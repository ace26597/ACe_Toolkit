'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Upload,
  Paperclip,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import FormatSelector from './FormatSelector';
import type { ResearchAssistantSession, ResearchAssistantMessage, ResearchStreamEvent } from '@/lib/api';
import { researchAssistantApi } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  format: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ResearchChatProps {
  session: ResearchAssistantSession | null;
  messages: ResearchAssistantMessage[];
  onNewMessage: () => void;
  onTerminalEvent: (event: ResearchStreamEvent) => void;
  isConnected: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

// File type icons
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
}

export default function ResearchChat({
  session,
  messages: savedMessages,
  onNewMessage,
  onTerminalEvent,
  isConnected,
  wsRef,
}: ResearchChatProps) {
  const [input, setInput] = useState('');
  const [responseFormat, setResponseFormat] = useState(session?.response_format || 'markdown');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use ref to track accumulated streaming content (avoids closure issues)
  const streamingContentRef = useRef<string>('');

  // Convert saved messages to local format
  useEffect(() => {
    if (savedMessages.length > 0) {
      const converted = savedMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        format: m.response_format,
        timestamp: m.created_at,
      }));
      setLocalMessages(converted);
    } else {
      setLocalMessages([]);
    }
  }, [savedMessages]);

  // Update format when session changes
  useEffect(() => {
    if (session?.response_format) {
      setResponseFormat(session.response_format);
    }
  }, [session?.response_format]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamingMessage]);

  // Focus input when session changes
  useEffect(() => {
    if (session) {
      inputRef.current?.focus();
    }
  }, [session?.id]);

  // Handle WebSocket messages - separate from other state to prevent stale closures
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data: ResearchStreamEvent = JSON.parse(event.data);

        // Log for debugging
        console.log('WS Event:', data.type, data);

        // Forward to terminal for all events
        onTerminalEvent(data);

        switch (data.type) {
          case 'connected':
            console.log('WebSocket session connected:', data.session_id);
            break;

          case 'system':
            console.log('System event:', data);
            break;

          case 'thinking':
            // Show thinking in terminal only, mark as running
            setIsRunning(true);
            break;

          case 'tool_use':
            // Show tool use in terminal only
            setIsRunning(true);
            break;

          case 'tool_result':
            // Tool results go to terminal
            break;

          case 'text':
            // Accumulate text response
            const text = data.content || '';
            streamingContentRef.current += text;
            setStreamingMessage(streamingContentRef.current);
            break;

          case 'complete':
            // Finalize the assistant message using the complete response
            const finalContent = data.response || streamingContentRef.current;
            if (finalContent) {
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: finalContent,
                format: responseFormat,
                timestamp: new Date().toISOString(),
              };
              setLocalMessages((prev) => [...prev, assistantMessage]);
            }
            // Reset streaming state
            streamingContentRef.current = '';
            setStreamingMessage('');
            setIsRunning(false);
            onNewMessage();
            break;

          case 'error':
            setError(data.error || 'An error occurred');
            streamingContentRef.current = '';
            setStreamingMessage('');
            setIsRunning(false);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err, event.data);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [wsRef.current, onTerminalEvent, onNewMessage, responseFormat]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !session || isRunning || !wsRef.current) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      format: responseFormat,
      timestamp: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsRunning(true);
    setError(null);

    // Reset streaming refs
    streamingContentRef.current = '';
    setStreamingMessage('');

    try {
      // Upload pending files first
      if (pendingFiles.length > 0) {
        await researchAssistantApi.uploadFiles(session.id, pendingFiles);
        setPendingFiles([]);
      }

      // Send query via WebSocket
      const payload = {
        type: 'query',
        prompt: userMessage.content,
        response_format: responseFormat,
      };
      console.log('Sending WS query:', payload);
      wsRef.current.send(JSON.stringify(payload));
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setIsRunning(false);
    }
  }, [input, session, isRunning, responseFormat, pendingFiles, wsRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-center text-gray-500">
          <MessageBubbleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select or create a session</p>
          <p className="text-sm mt-1">Start researching any topic with AI assistance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
        <div>
          <h2 className="font-medium text-white">{session.title}</h2>
          <p className="text-xs text-gray-400">
            {session.turn_count} turns
            {session.uploaded_files && session.uploaded_files.length > 0 && (
              <> &bull; {session.uploaded_files.length} files</>
            )}
            {session.claude_session_id && (
              <> &bull; Resumable</>
            )}
          </p>
        </div>
        <FormatSelector
          value={responseFormat}
          onChange={setResponseFormat}
          disabled={isRunning}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 && !streamingMessage ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 max-w-md">
              <p className="text-lg font-medium mb-2">Start your research</p>
              <p className="text-sm">
                Ask questions, upload files for analysis, or explore any topic.
                I can search the web, analyze data, and provide comprehensive answers.
              </p>
            </div>
          </div>
        ) : (
          <>
            {localMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                format={msg.format}
                timestamp={msg.timestamp}
              />
            ))}
            {/* Streaming message */}
            {streamingMessage && (
              <MessageBubble
                role="assistant"
                content={streamingMessage}
                format={responseFormat}
                isStreaming={true}
              />
            )}
            {/* Show running indicator when waiting for first output */}
            {isRunning && !streamingMessage && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-lg text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Claude is thinking...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-800/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="mx-4 mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full text-sm"
            >
              {getFileIcon(file.name)}
              <span className="text-gray-300 max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removePendingFile(index)}
                className="p-0.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="p-2.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isRunning || !isConnected}
              rows={1}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none max-h-32 overflow-y-auto disabled:opacity-50"
              style={{
                minHeight: '48px',
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isRunning || !isConnected}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            {isRunning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Connection status */}
        {!isConnected && (
          <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
            Connecting...
          </p>
        )}
      </div>
    </div>
  );
}

// Placeholder icon component
function MessageBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
