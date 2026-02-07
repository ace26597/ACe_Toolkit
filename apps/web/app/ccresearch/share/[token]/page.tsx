"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  FileText,
  Folder,
  Download,
  ChevronRight,
  Home,
  RefreshCw,
  AlertCircle,
  Terminal,
  User,
  Calendar,
  Files,
  Eye,
  ArrowLeft,
  Share2,
  ExternalLink,
  Film,
  ScrollText,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

// Dynamic import for SessionPlayer (accesses window/document via asciinema-player)
const SessionPlayer = dynamic(
  () => import('@/components/workspace/SessionPlayer'),
  { ssr: false }
);

interface SharedSession {
  id: string;
  title: string;
  email: string;
  created_at: string;
  shared_at: string;
  files_count: number;
  has_log: boolean;
  workspace_project?: string;
  duration?: number;
}

interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_at: string;
}

interface RecordingStatus {
  has_recording: boolean;
  size_bytes: number;
}

// API functions for shared sessions
const sharedApi = {
  getSession: async (token: string): Promise<SharedSession> => {
    const res = await fetch(`${getApiUrl()}/ccresearch/share/${token}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Session not found or share link expired');
      throw new Error('Failed to load shared session');
    }
    return res.json();
  },

  listFiles: async (token: string, path: string = ''): Promise<{ files: FileInfo[]; current_path: string }> => {
    const url = `${getApiUrl()}/ccresearch/share/${token}/files${path ? `?path=${encodeURIComponent(path)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load files');
    return res.json();
  },

  getFileContent: async (token: string, path: string): Promise<{ content: string; name: string }> => {
    const res = await fetch(`${getApiUrl()}/ccresearch/share/${token}/files/content?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Failed to load file content');
    return res.json();
  },

  getLog: async (token: string): Promise<{ log: string; lines: number }> => {
    const res = await fetch(`${getApiUrl()}/ccresearch/share/${token}/log`);
    if (!res.ok) throw new Error('Failed to load log');
    return res.json();
  },

  getDownloadUrl: (token: string, path: string): string => {
    return `${getApiUrl()}/ccresearch/share/${token}/files/download?path=${encodeURIComponent(path)}`;
  },

  getRecordingUrl: (token: string): string => {
    return `${getApiUrl()}/ccresearch/share/${token}/recording`;
  },

  checkRecording: async (token: string): Promise<RecordingStatus> => {
    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/share/${token}/has-recording`);
      if (!res.ok) return { has_recording: false, size_bytes: 0 };
      return res.json();
    } catch {
      return { has_recording: false, size_bytes: 0 };
    }
  },
};

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format duration
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
};

// Get file icon based on extension
const getFileIcon = (name: string, isDir: boolean) => {
  if (isDir) return <Folder className="w-4 h-4 text-[#7aa2f7]" />;

  const ext = name.split('.').pop()?.toLowerCase();
  const codeExts = ['py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json'];
  const dataExts = ['csv', 'yaml', 'yml', 'xml', 'sql'];
  const docExts = ['md', 'txt', 'log', 'rst'];

  if (codeExts.includes(ext || '')) {
    return <FileText className="w-4 h-4 text-[#9ece6a]" />;
  }
  if (dataExts.includes(ext || '')) {
    return <FileText className="w-4 h-4 text-[#e0af68]" />;
  }
  if (docExts.includes(ext || '')) {
    return <FileText className="w-4 h-4 text-[#a9b1d6]" />;
  }
  return <FileText className="w-4 h-4 text-[#565f89]" />;
};

// Strip ANSI escape codes from text
const stripAnsi = (text: string): string => {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
};

type TabType = 'replay' | 'transcript' | 'files';

export default function SharedSessionPage() {
  const params = useParams();
  const token = params.token as string;

  const [session, setSession] = useState<SharedSession | null>(null);
  const [hasRecording, setHasRecording] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [log, setLog] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('replay');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load session info and check recording availability
  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const [data, recording] = await Promise.all([
          sharedApi.getSession(token),
          sharedApi.checkRecording(token),
        ]);
        setSession(data);
        setHasRecording(recording.has_recording);
        // If no recording, default to transcript tab
        if (!recording.has_recording) {
          setActiveTab(data.has_log ? 'transcript' : 'files');
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadSession();
    }
  }, [token]);

  // Load files when files tab is active
  const loadFiles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await sharedApi.listFiles(token, currentPath);
      setFiles(data.files);
    } catch {
      // Failed to load files
    }
  }, [token, currentPath]);

  useEffect(() => {
    if (session && activeTab === 'files') {
      loadFiles();
    }
  }, [session, activeTab, loadFiles]);

  // Load log when transcript tab is active
  const loadLog = useCallback(async () => {
    if (!token || !session?.has_log) return;
    setLogLoading(true);
    try {
      const data = await sharedApi.getLog(token);
      setLog(data.log);
    } catch {
      setLog('Failed to load terminal log');
    } finally {
      setLogLoading(false);
    }
  }, [token, session?.has_log]);

  useEffect(() => {
    if (session && activeTab === 'transcript') {
      loadLog();
    }
  }, [session, activeTab, loadLog]);

  // Handle file click
  const handleFileClick = async (file: FileInfo) => {
    if (file.is_dir) {
      setCurrentPath(file.path);
      setSelectedFile(null);
      setFileContent('');
    } else {
      const textExts = ['md', 'txt', 'log', 'json', 'yaml', 'yml', 'csv', 'py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'mmd', 'xml', 'sql', 'sh', 'bash', 'toml', 'ini', 'cfg', 'conf', 'rst'];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (textExts.includes(ext || '') && file.size < 1024 * 1024) {
        try {
          const data = await sharedApi.getFileContent(token, file.path);
          setFileContent(data.content);
          setSelectedFile(file);
        } catch {
          setSelectedFile(file);
          setFileContent('');
        }
      } else {
        setSelectedFile(file);
        setFileContent('');
      }
    }
  };

  // Navigate up
  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
    setSelectedFile(null);
    setFileContent('');
  };

  // Copy share link
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#7aa2f7] mx-auto mb-4 animate-spin" />
          <p className="text-[#565f89]">Loading shared session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-[#f7768e] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#a9b1d6] mb-2">Session Not Found</h1>
          <p className="text-[#565f89] mb-6">{error}</p>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7aa2f7] hover:bg-[#7aa2f7]/80 text-[#1a1b26] font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Workspace
          </Link>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#1a1b26] text-[#a9b1d6] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#24283b] border-b border-[#33467c]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/workspace"
                className="flex items-center gap-2 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Workspace</span>
              </Link>
              <div className="h-5 w-px bg-[#33467c]" />
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#9ece6a]" />
                <span className="text-xs text-[#565f89]">Shared Session</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1b26] hover:bg-[#33467c] text-[#565f89] hover:text-[#a9b1d6] rounded text-xs transition-colors border border-[#33467c]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#9ece6a]" />
                    <span className="text-[#9ece6a]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Link
                  </>
                )}
              </button>
              <span className="text-xs text-[#414868] hidden sm:block">Read-only</span>
            </div>
          </div>
        </div>
      </header>

      {/* Session Info */}
      <div className="flex-shrink-0 bg-[#1a1b26] border-b border-[#33467c]">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-[#c0caf5] mb-3">{session.title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-[#565f89]">
              <User className="w-4 h-4" />
              <span>{session.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#565f89]">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(session.created_at)}</span>
            </div>
            {session.duration && session.duration > 0 && (
              <div className="flex items-center gap-1.5 text-[#565f89]">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(session.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[#565f89]">
              <Files className="w-4 h-4" />
              <span>{session.files_count} files</span>
            </div>
            {session.workspace_project && (
              <div className="flex items-center gap-1.5 text-[#565f89]">
                <Folder className="w-4 h-4" />
                <span>{session.workspace_project}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-[#24283b] border-b border-[#33467c]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('replay')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'replay'
                  ? 'text-[#7aa2f7] border-[#7aa2f7]'
                  : 'text-[#565f89] border-transparent hover:text-[#a9b1d6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Replay
              </div>
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transcript'
                  ? 'text-[#7aa2f7] border-[#7aa2f7]'
                  : 'text-[#565f89] border-transparent hover:text-[#a9b1d6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                Transcript
              </div>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'files'
                  ? 'text-[#7aa2f7] border-[#7aa2f7]'
                  : 'text-[#565f89] border-transparent hover:text-[#a9b1d6]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4" />
                Files
                {session.files_count > 0 && (
                  <span className="text-xs bg-[#33467c] text-[#7aa2f7] px-1.5 py-0.5 rounded-full">
                    {session.files_count}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Replay Tab */}
        {activeTab === 'replay' && (
          <div className="h-full flex flex-col">
            {hasRecording ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {showPlayer ? (
                  <SessionPlayer
                    src={sharedApi.getRecordingUrl(token)}
                    onClose={() => setShowPlayer(false)}
                  />
                ) : (
                  <div className="text-center max-w-lg">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#24283b] rounded-2xl border border-[#33467c] flex items-center justify-center">
                      <Film className="w-10 h-10 text-[#7aa2f7]" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#c0caf5] mb-2">Session Recording Available</h2>
                    <p className="text-[#565f89] mb-6">
                      Watch a full replay of this terminal session. You can control playback speed and use the progress bar to navigate.
                    </p>
                    <button
                      onClick={() => setShowPlayer(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#7aa2f7] hover:bg-[#7aa2f7]/80 text-[#1a1b26] font-medium rounded-lg transition-colors shadow-lg shadow-[#7aa2f7]/20"
                    >
                      <Film className="w-5 h-5" />
                      Play Recording
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#24283b] rounded-2xl border border-[#33467c] flex items-center justify-center">
                    <Film className="w-8 h-8 text-[#414868]" />
                  </div>
                  <h2 className="text-lg font-medium text-[#565f89] mb-2">No Recording Available</h2>
                  <p className="text-[#414868] text-sm mb-4">
                    This session does not have a terminal recording.
                  </p>
                  {session.has_log && (
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#24283b] hover:bg-[#33467c] text-[#a9b1d6] rounded-lg text-sm transition-colors border border-[#33467c]"
                    >
                      <ScrollText className="w-4 h-4" />
                      View Transcript Instead
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="h-full flex flex-col">
            {logLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-[#7aa2f7] animate-spin" />
              </div>
            ) : log ? (
              <div className="flex-1 overflow-auto bg-[#1a1b26]">
                <div className="max-w-7xl mx-auto p-4">
                  <TranscriptRenderer log={log} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Terminal className="w-12 h-12 mx-auto mb-3 text-[#414868]" />
                  <p className="text-[#565f89]">No terminal log available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="h-full flex">
            {/* File List */}
            <div className="w-full md:w-1/2 lg:w-2/5 border-r border-[#33467c] flex flex-col bg-[#1a1b26]">
              {/* Breadcrumb */}
              <div className="flex-shrink-0 px-4 py-2 bg-[#24283b] border-b border-[#33467c] flex items-center gap-1 text-sm overflow-x-auto">
                <button
                  onClick={() => { setCurrentPath(''); setSelectedFile(null); setFileContent(''); }}
                  className="flex items-center gap-1 text-[#565f89] hover:text-[#a9b1d6]"
                >
                  <Home className="w-4 h-4" />
                </button>
                {breadcrumbs.map((part, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight className="w-4 h-4 text-[#414868]" />
                    <button
                      onClick={() => {
                        setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'));
                        setSelectedFile(null);
                        setFileContent('');
                      }}
                      className="text-[#565f89] hover:text-[#a9b1d6] truncate max-w-[120px]"
                    >
                      {part}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Files */}
              <div className="flex-1 overflow-y-auto">
                {currentPath && (
                  <button
                    onClick={navigateUp}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#24283b] text-[#565f89] transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    <span>..</span>
                  </button>
                )}
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      selectedFile?.path === file.path
                        ? 'bg-[#33467c]/50 border-l-2 border-[#7aa2f7]'
                        : 'hover:bg-[#24283b] border-l-2 border-transparent'
                    }`}
                  >
                    {getFileIcon(file.name, file.is_dir)}
                    <span className="flex-1 text-left truncate text-[#a9b1d6]">{file.name}</span>
                    {!file.is_dir && (
                      <span className="text-xs text-[#414868]">{formatSize(file.size)}</span>
                    )}
                  </button>
                ))}
                {files.length === 0 && (
                  <div className="p-8 text-center text-[#414868]">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Empty directory</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="hidden md:flex flex-1 flex-col bg-[#1a1b26]">
              {selectedFile ? (
                <>
                  {/* Preview Header */}
                  <div className="flex-shrink-0 px-4 py-3 bg-[#24283b] border-b border-[#33467c] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedFile.name, false)}
                      <span className="font-medium text-[#c0caf5]">{selectedFile.name}</span>
                      <span className="text-xs text-[#414868]">({formatSize(selectedFile.size)})</span>
                    </div>
                    <a
                      href={sharedApi.getDownloadUrl(token, selectedFile.path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#1a1b26] hover:bg-[#33467c] text-[#a9b1d6] rounded-lg transition-colors border border-[#33467c]"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {fileContent ? (
                      <pre className="text-sm text-[#a9b1d6] font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {fileContent}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-[#414868]">
                          <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Preview not available for this file type</p>
                          <p className="text-sm mt-1">Click download to view</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-[#414868]">
                    <Files className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a file to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-[#24283b] border-t border-[#33467c] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#414868]">
            <Terminal className="w-3.5 h-3.5" />
            <span>Powered by C3 Researcher Workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[#9ece6a]" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href="https://orpheuscore.uk/workspace"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
            >
              Start your own session
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Transcript renderer - parses terminal log and renders with collapsible tool calls
function TranscriptRenderer({ log }: { log: string }) {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Parse log into sections: detect tool calls and regular output
  const cleanLog = stripAnsi(log);
  const lines = cleanLog.split('\n');
  const sections: Array<{ type: 'text' | 'tool'; title: string; content: string; index: number }> = [];

  let currentSection: { type: 'text' | 'tool'; title: string; lines: string[] } | null = null;
  let sectionIndex = 0;

  for (const line of lines) {
    // Detect tool call patterns
    const toolCallMatch = line.match(/^(?:Tool|Using|Running|Calling):\s*(.+)/i) ||
                          line.match(/^>\s*(Read|Write|Edit|Bash|Glob|Grep|WebFetch|WebSearch)\s*\(/i);

    if (toolCallMatch) {
      // Save current section
      if (currentSection) {
        sections.push({
          type: currentSection.type,
          title: currentSection.title,
          content: currentSection.lines.join('\n'),
          index: sectionIndex++,
        });
      }
      currentSection = {
        type: 'tool',
        title: toolCallMatch[1] || line.trim(),
        lines: [line],
      };
    } else {
      if (!currentSection || currentSection.type === 'tool') {
        // Start new text section
        if (currentSection) {
          sections.push({
            type: currentSection.type,
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            index: sectionIndex++,
          });
        }
        currentSection = { type: 'text', title: '', lines: [line] };
      } else {
        currentSection.lines.push(line);
      }
    }
  }

  // Push last section
  if (currentSection) {
    sections.push({
      type: currentSection.type,
      title: currentSection.title,
      content: currentSection.lines.join('\n'),
      index: sectionIndex,
    });
  }

  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <div key={section.index}>
          {section.type === 'tool' ? (
            <div className="border border-[#33467c] rounded-lg overflow-hidden my-2">
              <button
                onClick={() => toggleSection(section.index)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[#24283b] hover:bg-[#33467c]/50 text-left transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 text-[#565f89] transition-transform ${
                    !collapsedSections.has(section.index) ? 'rotate-90' : ''
                  }`}
                />
                <Terminal className="w-3.5 h-3.5 text-[#e0af68]" />
                <span className="text-xs font-medium text-[#e0af68] truncate">
                  {section.title}
                </span>
              </button>
              {!collapsedSections.has(section.index) && (
                <pre className="px-3 py-2 text-xs text-[#565f89] font-mono whitespace-pre-wrap break-words bg-[#1a1b26] border-t border-[#33467c] max-h-60 overflow-y-auto">
                  {section.content}
                </pre>
              )}
            </div>
          ) : (
            <pre className="text-sm text-[#a9b1d6] font-mono whitespace-pre-wrap break-words leading-relaxed">
              {section.content}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
