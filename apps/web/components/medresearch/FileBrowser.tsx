"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  Download,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Home,
  ArrowUp,
  Eye,
  X,
  FileJson
} from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_at: string;
}

interface FileBrowserProps {
  sessionId: string;
  workspaceDir: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// File icon helper
const getFileIcon = (name: string, isDir: boolean) => {
  if (isDir) return <Folder className="w-4 h-4 text-yellow-400" />;

  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'sh':
    case 'bash':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-300" />;
    case 'md':
    case 'txt':
    case 'log':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className="w-4 h-4 text-purple-400" />;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
    case 'pdf':
      return <File className="w-4 h-4 text-red-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
};

// Format file size
const formatSize = (bytes: number) => {
  if (bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Check if file is previewable
const isPreviewable = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const previewable = ['md', 'txt', 'log', 'json', 'py', 'js', 'ts', 'tsx', 'jsx', 'sh', 'bash', 'yaml', 'yml', 'csv', 'html', 'css'];
  return previewable.includes(ext || '');
};

export default function FileBrowser({ sessionId, workspaceDir }: FileBrowserProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{ content: string; name: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async (path: string = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_URL}/medresearch/sessions/${sessionId}/files${path ? `?path=${encodeURIComponent(path)}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Failed to load files' }));
        throw new Error(errData.detail);
      }

      const data = await res.json();
      setFiles(data.files);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const navigateToDir = (path: string) => {
    loadFiles(path);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    loadFiles(parts.join('/'));
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.is_dir) {
      navigateToDir(file.path);
    }
  };

  const downloadFile = async (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${API_URL}/medresearch/sessions/${sessionId}/files/download?path=${encodeURIComponent(file.path)}`;
    window.open(url, '_blank');
  };

  const previewFile = async (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewLoading(true);

    try {
      const url = `${API_URL}/medresearch/sessions/${sessionId}/files/content?path=${encodeURIComponent(file.path)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Failed to preview file' }));
        throw new Error(errData.detail);
      }

      const data = await res.json();
      setPreviewContent({ content: data.content, name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2 text-sm">
          <Folder className="w-4 h-4 text-yellow-400" />
          <span className="text-gray-300 font-medium">Files</span>
        </div>
        <button
          onClick={() => loadFiles(currentPath)}
          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 px-3 py-2 text-xs bg-gray-800/30 border-b border-gray-700/50 overflow-x-auto">
        <button
          onClick={() => loadFiles('')}
          className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-gray-200"
        >
          <Home className="w-3 h-3" />
        </button>
        {breadcrumbs.map((part, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <button
              onClick={() => loadFiles(breadcrumbs.slice(0, idx + 1).join('/'))}
              className="px-2 py-1 hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-gray-200 truncate max-w-[100px]"
              title={part}
            >
              {part}
            </button>
          </React.Fragment>
        ))}
        {currentPath && (
          <button
            onClick={navigateUp}
            className="ml-auto flex items-center gap-1 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-gray-200"
            title="Go up"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400 text-sm">
            <p>{error}</p>
            <button
              onClick={() => loadFiles(currentPath)}
              className="mt-2 text-blue-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No files yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {files.map((file) => (
              <div
                key={file.path}
                onClick={() => handleFileClick(file)}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 transition-colors ${
                  file.is_dir ? 'cursor-pointer' : ''
                }`}
              >
                {getFileIcon(file.name, file.is_dir)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate" title={file.name}>
                    {file.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatSize(file.size)}
                  </span>
                  {!file.is_dir && (
                    <div className="flex items-center gap-1">
                      {isPreviewable(file.name) && (
                        <button
                          onClick={(e) => previewFile(file, e)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-blue-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => downloadFile(file, e)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-400 hover:text-green-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg border border-gray-700 w-[90%] max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                {getFileIcon(previewContent.name, false)}
                <span className="text-sm font-medium text-gray-200">{previewContent.name}</span>
              </div>
              <button
                onClick={() => setPreviewContent(null)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                {previewContent.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Preview Loading Overlay */}
      {isPreviewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}
    </div>
  );
}
