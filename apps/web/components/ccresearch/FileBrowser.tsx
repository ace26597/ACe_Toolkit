"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api';
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
  FileJson,
  Upload,
  FolderOpen,
  Archive,
  Github,
  GitBranch
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
  autoRefreshInterval?: number; // ms, default 3000
  initialPath?: string; // auto-navigate to this path on mount
  onUpload?: (files: File[], targetPath: string) => Promise<void>; // Upload callback
  onCloneRepo?: (repoUrl: string, targetPath: string, branch?: string) => Promise<void>; // Clone callback
}

const API_URL = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

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

export default function FileBrowser({
  sessionId,
  workspaceDir,
  autoRefreshInterval = 3000,
  initialPath = '',
  onUpload,
  onCloneRepo
}: FileBrowserProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{ content: string; name: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'files' | 'directory'>('files');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Clone repo state
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneRepoUrl, setCloneRepoUrl] = useState('');
  const [cloneBranch, setCloneBranch] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const loadFiles = useCallback(async (path: string = '', isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setIsLoading(true);
    } else {
      setIsAutoRefreshing(true);
    }
    setError(null);

    try {
      const url = `${API_URL}/ccresearch/sessions/${sessionId}/files${path ? `?path=${encodeURIComponent(path)}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Failed to load files' }));
        throw new Error(errData.detail);
      }

      const data = await res.json();
      setFiles(data.files);
      setCurrentPath(path);
    } catch (err) {
      if (!isAutoRefresh) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
      }
    } finally {
      setIsLoading(false);
      setIsAutoRefreshing(false);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    loadFiles(initialPath);
  }, [loadFiles, initialPath]);

  // Auto-refresh polling for live file updates
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadFiles(currentPath, true);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [loadFiles, currentPath, autoRefreshInterval]);

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
    const url = `${API_URL}/ccresearch/sessions/${sessionId}/files/download?path=${encodeURIComponent(file.path)}`;
    window.open(url, '_blank');
  };

  const previewFile = async (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewLoading(true);

    try {
      const url = `${API_URL}/ccresearch/sessions/${sessionId}/files/content?path=${encodeURIComponent(file.path)}`;
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

  // Upload functions
  const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files = Array.from(fileList);
    setSelectedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!onUpload || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await onUpload(selectedFiles, currentPath);
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadMode('files');
      // Refresh file list
      loadFiles(currentPath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Clone repo handler
  const handleClone = async () => {
    if (!onCloneRepo || !cloneRepoUrl.trim()) return;

    setIsCloning(true);
    setCloneError(null);

    try {
      await onCloneRepo(cloneRepoUrl.trim(), currentPath || 'data', cloneBranch.trim() || undefined);
      setShowCloneModal(false);
      setCloneRepoUrl('');
      setCloneBranch('');
      // Refresh file list
      loadFiles(currentPath);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setIsCloning(false);
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
          {isAutoRefreshing && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="Auto-refreshing" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {onCloneRepo && (
            <button
              onClick={() => setShowCloneModal(true)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title="Clone GitHub repo"
            >
              <Github className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          )}
          {onUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title="Upload files"
            >
              <Upload className="w-4 h-4 text-blue-400" />
            </button>
          )}
          <button
            onClick={() => loadFiles(currentPath)}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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

      {/* Upload Modal */}
      {showUploadModal && onUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg border border-gray-700 w-[90%] max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-gray-200">
                  Upload to {currentPath ? `/${currentPath}` : 'workspace'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setUploadError(null);
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Upload Mode Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadMode('files')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    uploadMode === 'files'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <File className="w-4 h-4" />
                  Files
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('directory')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    uploadMode === 'directory'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  Directory
                </button>
              </div>

              {/* Drop Zone */}
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                {uploadMode === 'files' ? (
                  <>
                    <input
                      type="file"
                      multiple
                      onChange={handleUploadFileSelect}
                      className="hidden"
                      id="fb-file-upload"
                    />
                    <label htmlFor="fb-file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-300">Click to select files</p>
                      <p className="text-xs text-gray-500 mt-1">ZIP files will be auto-extracted</p>
                    </label>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      {...{ webkitdirectory: '' }}
                      onChange={handleUploadFileSelect}
                      className="hidden"
                      id="fb-directory-upload"
                    />
                    <label htmlFor="fb-directory-upload" className="cursor-pointer">
                      <FolderOpen className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-300">Click to select directory</p>
                      <p className="text-xs text-gray-500 mt-1">All files will be uploaded</p>
                    </label>
                  </>
                )}
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        {file.name.toLowerCase().endsWith('.zip') ? (
                          <Archive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-300 truncate">
                          {(file as any).webkitRelativePath || file.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeSelectedFile(index)}
                        className="p-1 hover:bg-gray-700 rounded flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setUploadError(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Repo Modal */}
      {showCloneModal && onCloneRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg border border-gray-700 w-[90%] max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <span className="font-medium text-gray-200">Clone GitHub Repository</span>
              </div>
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneRepoUrl('');
                  setCloneBranch('');
                  setCloneError(null);
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Target path info */}
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <Folder className="w-3.5 h-3.5" />
                Cloning to: <span className="text-gray-300">/{currentPath || 'data'}/</span>
              </div>

              {/* Repo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={cloneRepoUrl}
                  onChange={(e) => setCloneRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Branch (optional)
                </label>
                <input
                  type="text"
                  value={cloneBranch}
                  onChange={(e) => setCloneBranch(e.target.value)}
                  placeholder="main (default)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Error */}
              {cloneError && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">
                  {cloneError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneRepoUrl('');
                  setCloneBranch('');
                  setCloneError(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={!cloneRepoUrl.trim() || isCloning}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isCloning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Clone
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
