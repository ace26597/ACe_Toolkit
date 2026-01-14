"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  AlertCircle,
  Activity,
  Home,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  FolderArchive,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';

// Dynamic import for Terminal (client-only, xterm.js requires DOM)
const MedResearchTerminal = dynamic(
  () => import('@/components/medresearch/MedResearchTerminal'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900/50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading terminal...</p>
        </div>
      </div>
    )
  }
);

// Dynamic import for FileBrowser
const FileBrowser = dynamic(
  () => import('@/components/medresearch/FileBrowser'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900/50 rounded-lg">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    )
  }
);

// Types
interface MedResearchSession {
  id: string;
  session_id: string;
  title: string;
  workspace_dir: string;
  status: 'created' | 'active' | 'disconnected' | 'terminated' | 'error';
  terminal_rows: number;
  terminal_cols: number;
  commands_executed: number;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
}

// API functions
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const medresearchApi = {
  createSession: async (browserSessionId: string, title?: string): Promise<MedResearchSession> => {
    const res = await fetch(`${API_URL}/medresearch/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: browserSessionId, title }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
      throw new Error(error.detail || 'Failed to create session');
    }
    return res.json();
  },

  listSessions: async (browserSessionId: string): Promise<MedResearchSession[]> => {
    const res = await fetch(`${API_URL}/medresearch/sessions/${browserSessionId}`);
    if (!res.ok) throw new Error('Failed to list sessions');
    return res.json();
  },

  deleteSession: async (medresearchId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/medresearch/sessions/${medresearchId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  resizeTerminal: async (medresearchId: string, rows: number, cols: number): Promise<void> => {
    await fetch(`${API_URL}/medresearch/sessions/${medresearchId}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, cols }),
    });
  },

  downloadWorkspaceZip: (medresearchId: string): void => {
    window.open(`${API_URL}/medresearch/sessions/${medresearchId}/download-zip`, '_blank');
  },
};

// Generate browser session ID
const generateSessionId = () => {
  if (typeof window === 'undefined') return '';
  const stored = sessionStorage.getItem('medresearch_session_id');
  if (stored) return stored;
  const newId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('medresearch_session_id', newId);
  return newId;
};

export default function MedResearchPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<MedResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [browserSessionId, setBrowserSessionId] = useState('');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  // Initialize browser session ID
  useEffect(() => {
    setBrowserSessionId(generateSessionId());
  }, []);

  // Load sessions on mount and periodically
  const loadSessions = useCallback(async () => {
    if (!browserSessionId) return;
    try {
      const data = await medresearchApi.listSessions(browserSessionId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [browserSessionId]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setShowSessionDropdown(false);
    if (showSessionDropdown) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showSessionDropdown]);

  const createSession = async () => {
    if (!browserSessionId) return;
    setIsCreating(true);
    try {
      const session = await medresearchApi.createSession(browserSessionId);
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setShowSessionDropdown(false);
      showToast({ message: 'Session created', type: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to create session',
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await medresearchApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      showToast({ message: 'Session deleted', type: 'success' });
    } catch {
      showToast({ message: 'Failed to delete session', type: 'error' });
    }
  };

  const handleResize = useCallback((rows: number, cols: number) => {
    if (activeSessionId) {
      medresearchApi.resizeTerminal(activeSessionId, rows, cols).catch(console.error);
    }
  }, [activeSessionId]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getExpiresIn = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    if (diffMs <= 0) return 'Expired';
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'created': return 'bg-blue-500';
      case 'disconnected': return 'bg-yellow-500';
      case 'terminated': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Home"
              >
                <Home className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <span className="font-semibold text-lg">MedResearch</span>
              </div>
            </div>

            {/* Center: Session Selector */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSessionDropdown(!showSessionDropdown);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors min-w-[200px]"
                >
                  <TerminalIcon className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left text-sm truncate">
                    {activeSession?.title || 'Select Session'}
                  </span>
                  {activeSession && (
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activeSession.status)}`} />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Session Dropdown */}
                {showSessionDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* New Session Button */}
                    <button
                      onClick={createSession}
                      disabled={isCreating}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-blue-400 border-b border-gray-700"
                    >
                      {isCreating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">New Session</span>
                    </button>

                    {/* Sessions List */}
                    <div className="max-h-64 overflow-y-auto">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="py-4 text-center text-gray-500 text-sm">
                          No sessions yet
                        </div>
                      ) : (
                        sessions.map(session => (
                          <div
                            key={session.id}
                            onClick={() => {
                              setActiveSessionId(session.id);
                              setShowSessionDropdown(false);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors ${
                              activeSessionId === session.id ? 'bg-gray-800' : ''
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{session.title}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{formatTimeAgo(session.created_at)}</span>
                                <span>•</span>
                                <span>Expires: {getExpiresIn(session.expires_at)}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteSession(session.id, e)}
                              className="p-1 hover:bg-red-900/50 rounded transition-colors flex-shrink-0"
                              title="Delete session"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-3">
              {activeSession && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Activity className={`w-3.5 h-3.5 ${terminalConnected ? 'text-green-400' : 'text-gray-500'}`} />
                    <span>{terminalConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-700" />
                  <button
                    onClick={() => medresearchApi.downloadWorkspaceZip(activeSessionId!)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-green-400"
                    title="Download workspace as ZIP"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Download ZIP</span>
                  </button>
                  <button
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                      showFileBrowser ? 'bg-blue-600 text-white' : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                    title={showFileBrowser ? 'Hide files' : 'Show files'}
                  >
                    {showFileBrowser ? (
                      <PanelRightClose className="w-3.5 h-3.5" />
                    ) : (
                      <PanelRightOpen className="w-3.5 h-3.5" />
                    )}
                    <span>Files</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {activeSessionId ? (
          <>
            {/* Terminal - Full Width */}
            <div className={`flex-1 flex flex-col bg-gray-950 ${showFileBrowser ? 'border-r border-gray-800' : ''}`}>
              {/* Terminal Header Bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    {activeSession?.title}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {activeSession?.workspace_dir}
                </div>
              </div>

              {/* Terminal Component - Full Height */}
              <div className="flex-1 overflow-hidden">
                <MedResearchTerminal
                  sessionId={activeSessionId}
                  onResize={handleResize}
                  onStatusChange={setTerminalConnected}
                />
              </div>
            </div>

            {/* File Browser Panel */}
            {showFileBrowser && activeSession && (
              <div className="w-80 flex-shrink-0 bg-gray-900/50 overflow-hidden">
                <FileBrowser
                  sessionId={activeSessionId}
                  workspaceDir={activeSession.workspace_dir}
                />
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-gray-950">
            <div className="text-center text-gray-400 max-w-lg px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
                <TerminalIcon className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-3">
                MedResearch Terminal
              </h3>
              <p className="text-sm mb-6 text-gray-500">
                Claude Code environment with 140+ scientific tools for medical research.
                Create a session to start analyzing data, searching literature, and generating insights.
              </p>
              <button
                onClick={createSession}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                {isCreating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Create New Session
              </button>
              <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span>
                  <span>PubMed, UniProt, ChEMBL</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>RDKit, Biopython, PyTorch</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>Data analysis & visualization</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  <span>Isolated 24h sessions</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/50 px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Powered by Claude Code + Scientific Skills MCP</span>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>For research purposes only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
