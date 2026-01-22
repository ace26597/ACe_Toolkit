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
import {
  Copy, Check, Link, X, ExternalLink,
  FolderOpen, FileText, Image as ImageIcon, File, RefreshCw,
  ChevronRight, Download
} from 'lucide-react';

interface TerminalEntry {
  id: string;
  type: 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'error' | 'system';
  content: string;
  name?: string;
  input?: Record<string, any>;
  isError?: boolean;
  timestamp: Date;
}

interface WorkspaceFile {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_at: string;
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

  // Files panel
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(true);

  // Share modal
  const [shareModal, setShareModal] = useState<{ sessionId: string; url: string } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Connect WebSocket and load data when session changes
  useEffect(() => {
    if (activeSessionId) {
      connectWebSocket(activeSessionId);
      loadMessages(activeSessionId);
      loadFiles(activeSessionId);
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

      // Restore terminal entries from past messages (tool calls and thinking)
      const entries: TerminalEntry[] = [];
      for (const msg of data) {
        if (msg.role === 'assistant') {
          // Restore thinking blocks
          if (msg.thinking_json) {
            try {
              const thinking = JSON.parse(msg.thinking_json);
              for (const t of thinking) {
                entries.push({
                  id: `thinking-${msg.id}-${entries.length}`,
                  type: 'thinking',
                  content: t,
                  timestamp: new Date(msg.created_at),
                });
              }
            } catch {}
          }
          // Restore tool calls
          if (msg.tool_calls_json) {
            try {
              const tools = JSON.parse(msg.tool_calls_json);
              for (const tool of tools) {
                entries.push({
                  id: `tool-${msg.id}-${tool.id || entries.length}`,
                  type: 'tool_use',
                  content: '',
                  name: tool.name,
                  input: tool.input,
                  timestamp: new Date(msg.created_at),
                });
              }
            } catch {}
          }
        }
      }
      setTerminalEntries(entries);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
      setTerminalEntries([]);
    }
  };

  const loadFiles = async (sessionId: string) => {
    try {
      setIsLoadingFiles(true);
      const data = await researchAssistantApi.listFiles(sessionId);
      setFiles(data.files || []);
    } catch (err) {
      console.error('Failed to load files:', err);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
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
      setFiles([]);
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    // Terminal entries will be restored in loadMessages
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
        setFiles([]);
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
      // Refresh files after completion
      if (activeSessionId) {
        loadFiles(activeSessionId);
      }
    }
  }, [activeSessionId]);

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

  const handleDownloadFile = async (filePath: string) => {
    if (!activeSessionId) return;
    try {
      const blob = await researchAssistantApi.downloadFile(activeSessionId, filePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  const getFileIcon = (filename: string, isDir: boolean) => {
    if (isDir) return <FolderOpen className="w-4 h-4 text-yellow-400" />;
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-purple-400" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/80 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-white">Research Assistant</h1>
          <p className="text-xs text-gray-400">Claude Code Headless Mode</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {user?.name && <span>Signed in as {user.name}</span>}
          <button
            onClick={() => setShowFilesPanel(!showFilesPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showFilesPanel ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-700'
            }`}
            title="Toggle files panel"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
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

        {/* Right panel: Terminal + Files */}
        <div className="w-80 p-4 pl-2 flex-shrink-0 flex flex-col gap-4">
          {/* Mini Terminal */}
          <div className={showFilesPanel ? 'h-1/2' : 'h-full'}>
            <MiniTerminal
              entries={terminalEntries}
              isRunning={isRunning}
              onClear={handleClearTerminal}
            />
          </div>

          {/* Files Panel */}
          {showFilesPanel && (
            <div className="h-1/2 flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              {/* Files Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Workspace Files</span>
                </div>
                <button
                  onClick={() => activeSessionId && loadFiles(activeSessionId)}
                  disabled={isLoadingFiles}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
                  title="Refresh files"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Files List */}
              <div className="flex-1 overflow-y-auto p-2">
                {!activeSession ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    Select a session to view files
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    <File className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p>No files yet</p>
                    <p className="text-xs mt-1">Upload files or let Claude create them</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800/50 group"
                      >
                        {getFileIcon(file.name, file.is_dir)}
                        <span className="flex-1 text-sm text-gray-300 truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                        {!file.is_dir && (
                          <button
                            onClick={() => handleDownloadFile(file.path)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded transition-all"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Files Footer */}
              {activeSession && files.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-700 text-xs text-gray-500">
                  {files.length} file{files.length !== 1 ? 's' : ''} in data/
                </div>
              )}
            </div>
          )}
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
