'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import SessionSidebar from '@/components/research-assistant/SessionSidebar';
import ResearchChat from '@/components/research-assistant/ResearchChat';
import MiniTerminal, { createTerminalEntry } from '@/components/research-assistant/MiniTerminal';
import {
  researchAssistantApi,
  type ResearchAssistantSession,
  type ResearchAssistantMessage,
  type ResearchStreamEvent,
} from '@/lib/api';
import { Copy, Check, Link, X, ExternalLink } from 'lucide-react';

interface TerminalEntry {
  id: string;
  type: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error' | 'system';
  content: string;
  name?: string;
  input?: Record<string, any>;
  isError?: boolean;
  timestamp: Date;
}

function ResearchPageContent() {
  const { user } = useAuth();

  // Sessions state
  const [sessions, setSessions] = useState<ResearchAssistantSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ResearchAssistantMessage[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Terminal
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Share modal
  const [shareModal, setShareModal] = useState<{ sessionId: string; url: string } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Connect WebSocket when session changes
  useEffect(() => {
    if (activeSessionId) {
      connectWebSocket(activeSessionId);
      loadMessages(activeSessionId);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
    };
  }, [activeSessionId]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const data = await researchAssistantApi.listSessions();
      setSessions(data);

      // Auto-select most recent session if none selected
      if (!activeSessionId && data.length > 0) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await researchAssistantApi.getMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    }
  };

  const connectWebSocket = (sessionId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = researchAssistantApi.connectWebSocket(sessionId);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleNewSession = async () => {
    try {
      setIsLoadingSessions(true);
      const session = await researchAssistantApi.createSession('New Research');
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setTerminalEntries([]);
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setTerminalEntries([]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await researchAssistantApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
        setTerminalEntries([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await researchAssistantApi.updateSession(sessionId, { title: newTitle });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
      );
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  const handleShareSession = async (sessionId: string) => {
    try {
      const result = await researchAssistantApi.shareSession(sessionId);
      setShareModal({ sessionId, url: result.share_url });

      // Update session in list
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, share_id: result.share_id, shared_at: result.shared_at }
            : s
        )
      );
    } catch (err) {
      console.error('Failed to share session:', err);
    }
  };

  const handleTerminalEvent = useCallback((event: ResearchStreamEvent) => {
    const entry = createTerminalEntry(event);
    if (entry) {
      setTerminalEntries((prev) => [...prev, entry]);
    }

    // Track running state
    if (event.type === 'thinking' || event.type === 'tool_use') {
      setIsRunning(true);
    } else if (event.type === 'complete' || event.type === 'error') {
      setIsRunning(false);
    }
  }, []);

  const handleNewMessage = useCallback(() => {
    // Reload messages after completion
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId]);

  const handleClearTerminal = () => {
    setTerminalEntries([]);
  };

  const handleCopyShareUrl = async () => {
    if (shareModal) {
      await navigator.clipboard.writeText(shareModal.url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/80 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-white">Research Assistant</h1>
          <p className="text-xs text-gray-400">Claude Code Headless Mode</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {user?.name && <span>Signed in as {user.name}</span>}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session sidebar */}
        <div className="w-64 flex-shrink-0">
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onShareSession={handleShareSession}
            isLoading={isLoadingSessions}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 p-4 pr-2">
          <ResearchChat
            session={activeSession}
            messages={messages}
            onNewMessage={handleNewMessage}
            onTerminalEvent={handleTerminalEvent}
            isConnected={isConnected}
            wsRef={wsRef}
          />
        </div>

        {/* Terminal panel */}
        <div className="w-80 p-4 pl-2 flex-shrink-0">
          <MiniTerminal
            entries={terminalEntries}
            isRunning={isRunning}
            onClear={handleClearTerminal}
          />
        </div>
      </div>

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Share Session</h3>
              </div>
              <button
                onClick={() => setShareModal(null)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              Anyone with this link can view the conversation (read-only).
            </p>

            <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg">
              <input
                type="text"
                value={shareModal.url}
                readOnly
                className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
              />
              <button
                onClick={handleCopyShareUrl}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy link"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <a
                href={shareModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShareModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <ProtectedRoute>
      <ResearchPageContent />
    </ProtectedRoute>
  );
}
