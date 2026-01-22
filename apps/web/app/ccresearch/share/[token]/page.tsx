"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
  ExternalLink
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface SharedSession {
  id: string;
  title: string;
  email: string;
  created_at: string;
  shared_at: string;
  files_count: number;
  has_log: boolean;
}

interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_at: string;
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
  }
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

// Get file icon based on extension
const getFileIcon = (name: string, isDir: boolean) => {
  if (isDir) return <Folder className="w-4 h-4 text-blue-400" />;

  const ext = name.split('.').pop()?.toLowerCase();
  const textExts = ['md', 'txt', 'log', 'json', 'yaml', 'yml', 'csv', 'py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css'];

  if (textExts.includes(ext || '')) {
    return <FileText className="w-4 h-4 text-gray-400" />;
  }
  return <FileText className="w-4 h-4 text-gray-500" />;
};

export default function SharedSessionPage() {
  const params = useParams();
  const token = params.token as string;

  const [session, setSession] = useState<SharedSession | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [log, setLog] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'files' | 'log'>('files');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session info
  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const data = await sharedApi.getSession(token);
        setSession(data);
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

  // Load files when path changes
  const loadFiles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await sharedApi.listFiles(token, currentPath);
      setFiles(data.files);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, [token, currentPath]);

  useEffect(() => {
    if (session && activeTab === 'files') {
      loadFiles();
    }
  }, [session, activeTab, loadFiles]);

  // Load log
  const loadLog = useCallback(async () => {
    if (!token || !session?.has_log) return;
    try {
      const data = await sharedApi.getLog(token);
      setLog(data.log);
    } catch (err) {
      console.error('Failed to load log:', err);
      setLog('Failed to load terminal log');
    }
  }, [token, session?.has_log]);

  useEffect(() => {
    if (session && activeTab === 'log') {
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
      // Check if it's a text file we can preview
      const textExts = ['md', 'txt', 'log', 'json', 'yaml', 'yml', 'csv', 'py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'mmd'];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (textExts.includes(ext || '') && file.size < 1024 * 1024) {
        try {
          const data = await sharedApi.getFileContent(token, file.path);
          setFileContent(data.content);
          setSelectedFile(file);
        } catch (err) {
          console.error('Failed to load file content:', err);
        }
      } else {
        // For binary files, just select but don't load content
        setSelectedFile(file);
        setFileContent('');
      }
    }
  };

  // Navigate up one directory
  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
    setSelectedFile(null);
    setFileContent('');
  };

  // Build breadcrumb path
  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading shared session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Session Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/ccresearch"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to CCResearch
          </Link>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/ccresearch"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">CCResearch</span>
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-gray-400">Shared Session</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Read-only view
            </div>
          </div>
        </div>
      </header>

      {/* Session Info */}
      <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-white mb-3">{session.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{session.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(session.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Files className="w-4 h-4" />
              <span>{session.files_count} files</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-gray-900/30 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'files'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4" />
                Files
              </div>
            </button>
            {session.has_log && (
              <button
                onClick={() => setActiveTab('log')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'log'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Terminal Log
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' ? (
          <div className="h-full flex">
            {/* File List */}
            <div className="w-full md:w-1/2 lg:w-2/5 border-r border-gray-800 flex flex-col">
              {/* Breadcrumb */}
              <div className="flex-shrink-0 px-4 py-2 bg-gray-900/50 border-b border-gray-800 flex items-center gap-1 text-sm overflow-x-auto">
                <button
                  onClick={() => { setCurrentPath(''); setSelectedFile(null); setFileContent(''); }}
                  className="flex items-center gap-1 text-gray-400 hover:text-white"
                >
                  <Home className="w-4 h-4" />
                </button>
                {breadcrumbs.map((part, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                    <button
                      onClick={() => {
                        setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'));
                        setSelectedFile(null);
                        setFileContent('');
                      }}
                      className="text-gray-400 hover:text-white truncate max-w-[100px]"
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
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800/50 text-gray-400"
                  >
                    <Folder className="w-4 h-4" />
                    <span>..</span>
                  </button>
                )}
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800/50 ${
                      selectedFile?.path === file.path ? 'bg-gray-800' : ''
                    }`}
                  >
                    {getFileIcon(file.name, file.is_dir)}
                    <span className="flex-1 text-left truncate text-gray-300">{file.name}</span>
                    {!file.is_dir && (
                      <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                    )}
                  </button>
                ))}
                {files.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Empty directory</p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="hidden md:flex flex-1 flex-col bg-gray-950">
              {selectedFile ? (
                <>
                  {/* Preview Header */}
                  <div className="flex-shrink-0 px-4 py-3 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedFile.name, false)}
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({formatSize(selectedFile.size)})</span>
                    </div>
                    <a
                      href={sharedApi.getDownloadUrl(token, selectedFile.path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {fileContent ? (
                      <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {fileContent}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Preview not available for this file type</p>
                          <p className="text-sm mt-1">Click download to view</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Files className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a file to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Terminal Log */
          <div className="h-full overflow-auto p-4 bg-black">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
              {log || 'No terminal log available'}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-gray-900 border-t border-gray-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <span>Shared via CCResearch</span>
          <a
            href="https://orpheuscore.uk/ccresearch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-400 transition-colors"
          >
            Start your own research session
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
