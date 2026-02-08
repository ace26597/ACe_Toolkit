'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Terminal, Play, Power, Download, FolderOpen, Key, Lightbulb,
  FileText, RefreshCw, Loader2, Plus, X, Github, Globe, Upload, Film
} from 'lucide-react';
import FileBrowser from '@/components/ccresearch/FileBrowser';
import { MobileTerminalInput } from '@/components/workspace/MobileTerminalInput';
import { getApiUrl, WorkspaceProject } from '@/lib/api';
import type { CCResearchTerminalHandle } from '@/components/ccresearch/CCResearchTerminal';

// Dynamic import for CCResearchTerminal (client-only, xterm.js requires DOM)
const CCResearchTerminal = dynamic(
  () => import('@/components/ccresearch/CCResearchTerminal'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-900/50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading terminal...</p>
        </div>
      </div>
    )
  }
);

// Dynamic import for RecordingsList (uses asciinema-player which requires DOM)
const RecordingsList = dynamic(
  () => import('@/components/workspace/RecordingsList'),
  { ssr: false }
);

// SSH directory presets
const SSH_DIR_PRESETS = [
  { label: 'Project Directory', value: 'project', description: 'Start in the selected project folder' },
  { label: 'Home Directory', value: '/Users/blest', description: 'Your home folder' },
  { label: 'Unity Projects', value: '/Users/blest/Unity', description: 'Unity game development projects' },
  { label: 'Data Directory', value: '/Volumes/T7/dev', description: 'External SSD data folder' },
  { label: 'Dev Projects', value: '/Users/blest/dev', description: 'All development projects' },
  { label: 'Custom...', value: '__custom__', description: 'Enter a custom directory path' },
];

interface TerminalViewProps {
  selectedProject: string;
  userEmail: string | undefined;
  showToast: (message: string, type?: 'success' | 'error') => void;
  isMobile: boolean;
  projectType?: string;
  projectSshConfig?: { working_directory?: string };
}

export default function TerminalView({
  selectedProject,
  userEmail,
  showToast,
  isMobile,
  projectType,
  projectSshConfig,
}: TerminalViewProps) {
  // Terminal state
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalWorkspaceDir, setTerminalWorkspaceDir] = useState<string>('');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [isStartingTerminal, setIsStartingTerminal] = useState(false);
  const [isExportingLog, setIsExportingLog] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState('');
  const [projectSessions, setProjectSessions] = useState<any[]>([]);
  const [loadingProjectSessions, setLoadingProjectSessions] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(true);

  // Terminal mode state
  const [terminalMode, setTerminalMode] = useState<'claude' | 'ssh'>('claude');
  const [accessKey, setAccessKey] = useState('');
  const [sshWorkingDir, setSshWorkingDir] = useState('project');
  const [customSshDir, setCustomSshDir] = useState('');

  // Import data modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'web' | 'upload'>('github');
  const [importUrls, setImportUrls] = useState<string[]>(['']);
  const [importBranch, setImportBranch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const importFileInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.value = '';
  }, []);

  // Mobile file browser modal
  const [mobileFileBrowserOpen, setMobileFileBrowserOpen] = useState(false);

  // Recordings list modal
  const [showRecordingsList, setShowRecordingsList] = useState(false);

  // Ref for sending input to terminal (for mobile input component)
  const terminalInputRef = useRef<CCResearchTerminalHandle | null>(null);

  // Initialize browser session ID for terminal
  const getBrowserSessionId = useCallback(() => {
    if (browserSessionId) return browserSessionId;
    if (typeof window === 'undefined') return '';
    const storedId = localStorage.getItem('workspace-browser-session-id');
    if (storedId) {
      setBrowserSessionId(storedId);
      return storedId;
    }
    const newId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('workspace-browser-session-id', newId);
    setBrowserSessionId(newId);
    return newId;
  }, [browserSessionId]);

  // Initialize on mount
  useState(() => {
    getBrowserSessionId();
  });

  // Handle mobile terminal input
  const handleMobileTerminalInput = useCallback((input: string) => {
    if (terminalInputRef.current) {
      terminalInputRef.current.sendInput(input);
    }
  }, []);

  // Handle mobile terminal control sequences (Ctrl+C, etc)
  const handleMobileTerminalControl = useCallback((sequence: string) => {
    if (terminalInputRef.current) {
      terminalInputRef.current.sendInput(sequence);
    }
  }, []);

  // Start terminal session for current project
  const startTerminalSession = async (mode: 'claude' | 'ssh' = 'claude', key?: string) => {
    if (!selectedProject) {
      showToast('Please select or create a project first', 'error');
      return;
    }
    const bsId = getBrowserSessionId();
    if (!userEmail || !bsId) return;

    // SSH mode requires access key
    if (mode === 'ssh' && !key?.trim()) {
      showToast('Access key is required for SSH terminal', 'error');
      return;
    }

    setIsStartingTerminal(true);
    try {
      const formData = new FormData();
      formData.append('session_id', bsId);
      formData.append('email', userEmail);
      formData.append('project_name', selectedProject);
      formData.append('title', selectedProject);

      // Add access key and working directory for SSH mode
      if (mode === 'ssh' && key) {
        formData.append('access_key', key);
        const effectiveDir = sshWorkingDir === '__custom__' ? customSshDir.trim() : sshWorkingDir;
        if (effectiveDir && effectiveDir !== 'project') {
          formData.append('working_directory', effectiveDir);
        }
      }

      const res = await fetch(`${getApiUrl()}/ccresearch/sessions`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Failed to start terminal' }));
        throw new Error(error.detail || 'Failed to start terminal');
      }

      const session = await res.json();
      setTerminalSessionId(session.id);
      setTerminalWorkspaceDir(session.effective_working_dir || session.workspace_dir || '');
      setAccessKey('');
      showToast(`${mode === 'ssh' ? 'SSH' : 'Claude Code'} terminal started`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to start terminal', 'error');
    } finally {
      setIsStartingTerminal(false);
    }
  };

  // Stop terminal session
  const stopTerminalSession = async () => {
    if (!terminalSessionId) return;

    try {
      await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/terminate`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      setTerminalSessionId(null);
      setTerminalWorkspaceDir('');
      setTerminalConnected(false);
      showToast('Terminal stopped', 'success');
    } catch (error) {
      // Ignore termination errors
    }
  };

  // Export session log to project
  const exportSessionLog = async () => {
    if (!terminalSessionId) return;

    setIsExportingLog(true);
    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/export-log`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(error.detail || 'Failed to export session log');
      }

      const data = await res.json();
      showToast(`Session exported to ${data.path}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to export session', 'error');
    } finally {
      setIsExportingLog(false);
    }
  };

  // Check if we're on local network (for large file uploads)
  const isLocalNetwork = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.startsWith('172.16.') ||
           hostname.startsWith('172.17.') ||
           hostname.startsWith('172.18.') ||
           hostname.startsWith('172.19.') ||
           hostname.startsWith('172.2') ||
           hostname.startsWith('172.30.') ||
           hostname.startsWith('172.31.');
  };

  // Upload files to terminal session
  const handleTerminalUpload = async (files: File[], targetPath: string) => {
    if (!terminalSessionId) return;

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    const useLocalUpload = totalSize > SIZE_THRESHOLD && isLocalNetwork();
    const endpoint = useLocalUpload ? 'upload-local' : 'upload';

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('target_path', targetPath || 'data');

    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/${endpoint}`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        if (useLocalUpload && error.detail?.includes('local network')) {
          const fallbackRes = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/upload`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
            body: formData,
          });
          if (!fallbackRes.ok) {
            const fallbackError = await fallbackRes.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(fallbackError.detail || 'Failed to upload files');
          }
          const result = await fallbackRes.json();
          showToast(`Uploaded ${result.uploaded_files?.length || files.length} file(s)`, 'success');
          return;
        }
        throw new Error(error.detail || 'Failed to upload files');
      }

      const result = await res.json();
      showToast(`Uploaded ${result.uploaded_files?.length || files.length} file(s)`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload files', 'error');
      throw error;
    }
  };

  // Clone GitHub repo to terminal session
  const handleTerminalCloneRepo = async (repoUrl: string, targetPath: string, branch?: string) => {
    if (!terminalSessionId) return;

    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/clone-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify({
          repo_url: repoUrl,
          target_path: targetPath || 'data',
          branch: branch || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Clone failed' }));
        throw new Error(error.detail || 'Failed to clone repository');
      }

      const result = await res.json();
      showToast(`Cloned ${result.repo_name}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to clone repository', 'error');
      throw error;
    }
  };

  // Handle pasted image from clipboard
  const handleImagePaste = async (file: File): Promise<string | null> => {
    if (!terminalSessionId) return null;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('target_path', 'data/images');

    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/upload`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Failed to upload image');
      }

      const result = await res.json();
      if (result.uploaded_files?.length > 0) {
        return `data/images/${result.uploaded_files[0]}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Load sessions for the current project
  const loadProjectSessions = useCallback(async () => {
    const bsId = getBrowserSessionId();
    if (!selectedProject || !bsId) return;

    try {
      setLoadingProjectSessions(true);
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${bsId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const sessions = await res.json();
        const projectMatches = sessions.filter((s: any) =>
          s.workspace_project === selectedProject || s.title === selectedProject
        );
        setProjectSessions(projectMatches);
      }
    } catch (error) {
      // Failed to load project sessions - silently handled
    } finally {
      setLoadingProjectSessions(false);
    }
  }, [selectedProject, getBrowserSessionId]);

  // Import data from GitHub (supports multiple URLs)
  const importFromGitHub = async () => {
    const validUrls = importUrls.filter(url => url.trim());
    if (!terminalSessionId || validUrls.length === 0) {
      showToast('Start a terminal first to clone repositories', 'error');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    try {
      for (const url of validUrls) {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/clone-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
          body: JSON.stringify({
            repo_url: url.trim(),
            branch: importBranch.trim() || undefined,
            target_path: 'data',
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const error = await res.json().catch(() => ({ detail: 'Clone failed' }));
          showToast(`Failed to clone ${url}: ${error.detail}`, 'error');
        }
      }

      if (successCount > 0) {
        showToast(`Cloned ${successCount} repository(s) successfully`, 'success');
        setShowImportModal(false);
        setImportUrls(['']);
        setImportBranch('');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to clone repositories', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Import data from Web URLs (supports multiple)
  const importFromWeb = async () => {
    const validUrls = importUrls.filter(url => url.trim());
    if (!terminalSessionId || validUrls.length === 0) {
      showToast('Start a terminal first to fetch web URLs', 'error');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    try {
      for (const url of validUrls) {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/fetch-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
          body: JSON.stringify({
            url: url.trim(),
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const error = await res.json().catch(() => ({ detail: 'Fetch failed' }));
          showToast(`Failed to fetch ${url}: ${error.detail}`, 'error');
        }
      }

      if (successCount > 0) {
        showToast(`Fetched ${successCount} URL(s) successfully`, 'success');
        setShowImportModal(false);
        setImportUrls(['']);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to fetch URLs', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Import files via upload
  const importFromUpload = async () => {
    if (importFiles.length === 0) return;

    setIsImporting(true);
    try {
      if (terminalSessionId) {
        await handleTerminalUpload(importFiles, 'data');
      } else {
        showToast('Start a terminal first to upload files', 'error');
        return;
      }

      showToast(`Uploaded ${importFiles.length} file(s) successfully`, 'success');
      setShowImportModal(false);
      setImportFiles([]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload files', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (importType === 'github') {
      importFromGitHub();
    } else if (importType === 'web') {
      importFromWeb();
    } else if (importType === 'upload') {
      importFromUpload();
    }
  };

  // Add/remove URL inputs
  const addUrlInput = () => {
    setImportUrls([...importUrls, '']);
  };

  const removeUrlInput = (index: number) => {
    if (importUrls.length > 1) {
      setImportUrls(importUrls.filter((_, i) => i !== index));
    }
  };

  const updateUrlInput = (index: number, value: string) => {
    const newUrls = [...importUrls];
    newUrls[index] = value;
    setImportUrls(newUrls);
  };

  // Persist terminal mode to localStorage
  const handleTerminalModeChange = (mode: 'claude' | 'ssh') => {
    setTerminalMode(mode);
    localStorage.setItem('workspace_terminal_mode', mode);
  };

  // Persist file browser state to localStorage
  const handleFileBrowserToggle = () => {
    const newValue = !showFileBrowser;
    setShowFileBrowser(newValue);
    localStorage.setItem('workspace_file_browser_open', String(newValue));
  };

  // Load saved state on mount
  useState(() => {
    if (typeof window === 'undefined') return;
    const savedTerminalMode = localStorage.getItem('workspace_terminal_mode');
    if (savedTerminalMode && ['claude', 'ssh'].includes(savedTerminalMode)) {
      setTerminalMode(savedTerminalMode as 'claude' | 'ssh');
    }
    const savedFileBrowser = localStorage.getItem('workspace_file_browser_open');
    if (savedFileBrowser !== null) {
      setShowFileBrowser(savedFileBrowser === 'true');
    }
    // Load project sessions
    loadProjectSessions();
  });

  // Auto-select terminal mode based on project type
  useEffect(() => {
    if (!terminalSessionId) {
      // Only auto-switch when no active session
      if (projectType === 'ssh') {
        setTerminalMode('ssh');
        // Pre-fill SSH working directory from project config
        if (projectSshConfig?.working_directory) {
          const presetMatch = SSH_DIR_PRESETS.find(p => p.value === projectSshConfig.working_directory);
          if (presetMatch) {
            setSshWorkingDir(presetMatch.value);
          } else {
            setSshWorkingDir('__custom__');
            setCustomSshDir(projectSshConfig.working_directory);
          }
        }
      } else {
        setTerminalMode('claude');
      }
    }
  }, [projectType, projectSshConfig, terminalSessionId]);

  // Reset terminal when project changes (handled by key prop from parent)

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Terminal Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-emerald-400" />
            <span className="text-white font-medium">{selectedProject}</span>
            {terminalConnected && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Connected
              </span>
            )}
            {terminalSessionId && terminalConnected && (
              <span className="flex items-center gap-1 text-red-400 text-xs" title="Session is being recorded">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                REC
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Recordings button */}
            {terminalSessionId && (
              <button
                onClick={() => setShowRecordingsList(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24283b] hover:bg-[#33467c] text-[#7aa2f7] rounded text-sm transition-colors"
                title="View session recordings"
              >
                <Film size={14} />
                Recordings
              </button>
            )}
            {/* Import Data - Always visible */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded text-sm transition-colors"
              title="Import data from GitHub, Web URLs, or upload files"
            >
              <Download size={14} />
              Import Data
            </button>
            {terminalSessionId && (
              <button
                onClick={handleFileBrowserToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  showFileBrowser
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title="Toggle file browser"
              >
                <FolderOpen size={14} />
                Files
              </button>
            )}
            {terminalSessionId ? (
              <>
                <button
                  onClick={exportSessionLog}
                  disabled={isExportingLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors disabled:opacity-50"
                  title="Export session log to project"
                >
                  {isExportingLog ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Export
                </button>
                <button
                  onClick={stopTerminalSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                >
                  <Power size={14} />
                  Stop
                </button>
              </>
            ) : (
              <button
                onClick={() => startTerminalSession(terminalMode, accessKey)}
                disabled={isStartingTerminal || !userEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded text-sm transition-colors"
              >
                {isStartingTerminal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Start Terminal
              </button>
            )}
          </div>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 overflow-hidden flex">
          {terminalSessionId ? (
            <>
              {/* Terminal */}
              <div className={`${showFileBrowser ? 'flex-1' : 'w-full'} h-full`}>
                <CCResearchTerminal
                  sessionId={terminalSessionId}
                  onStatusChange={(connected) => setTerminalConnected(connected)}
                  onImagePaste={handleImagePaste}
                  inputRef={terminalInputRef}
                />
              </div>
              {/* File Browser Sidebar - Desktop only */}
              {showFileBrowser && (
                <div className="hidden md:block w-80 border-l border-slate-700 bg-slate-900/50 flex-shrink-0 overflow-hidden">
                  <FileBrowser
                    sessionId={terminalSessionId}
                    workspaceDir={terminalWorkspaceDir}
                    autoRefreshInterval={5000}
                    onUpload={handleTerminalUpload}
                    onCloneRepo={handleTerminalCloneRepo}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col bg-slate-900/50 overflow-y-auto">
              {/* Stats Bar */}
              <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 p-4 border-b border-slate-800">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-400">145+</div>
                  <div className="text-xs text-slate-500">Skills</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-blue-400">34</div>
                  <div className="text-xs text-slate-500">MCP Servers</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-purple-400">14</div>
                  <div className="text-xs text-slate-500">Plugins</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-amber-400">566K+</div>
                  <div className="text-xs text-slate-500">Trials</div>
                </div>
              </div>

              {/* Start New Session Section */}
              <div className="flex-shrink-0 p-4 border-b border-slate-800">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Terminal size={24} className="text-emerald-400" />
                  <h3 className="text-lg font-medium text-white">Start Terminal</h3>
                </div>

                {/* Terminal Mode Selection */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => handleTerminalModeChange('claude')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      terminalMode === 'claude'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Terminal size={16} />
                    Claude Code
                  </button>
                  <button
                    onClick={() => handleTerminalModeChange('ssh')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      terminalMode === 'ssh'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Key size={16} />
                    SSH Terminal
                  </button>
                </div>

                {/* SSH Mode Options */}
                {terminalMode === 'ssh' && (
                  <>
                    {/* Access Key Input */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Access Key
                      </label>
                      <input
                        type="password"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder="Enter access key for SSH terminal"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>

                    {/* Working Directory Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Starting Directory
                      </label>
                      <select
                        value={sshWorkingDir}
                        onChange={(e) => {
                          setSshWorkingDir(e.target.value);
                          if (e.target.value !== '__custom__') {
                            setCustomSshDir('');
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        {SSH_DIR_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                      {sshWorkingDir === '__custom__' ? (
                        <input
                          type="text"
                          value={customSshDir}
                          onChange={(e) => setCustomSshDir(e.target.value)}
                          placeholder="/absolute/path/to/directory"
                          className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                        />
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">
                          {SSH_DIR_PRESETS.find(p => p.value === sshWorkingDir)?.description || 'Select where to start the terminal'}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Start Button */}
                <button
                  onClick={() => startTerminalSession(terminalMode, accessKey)}
                  disabled={isStartingTerminal || !userEmail || (terminalMode === 'ssh' && !accessKey.trim())}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg ${
                    terminalMode === 'ssh'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                  } disabled:from-slate-600 disabled:to-slate-600 disabled:shadow-none text-white`}
                >
                  {isStartingTerminal ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start {terminalMode === 'ssh' ? 'SSH' : 'Claude Code'} Terminal
                    </>
                  )}
                </button>
                {!userEmail && (
                  <p className="text-xs text-red-400 mt-2 text-center">
                    Please log in to use the terminal
                  </p>
                )}

                {/* Use Cases & Tips Buttons */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href="/ccresearch/use-cases"
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                  >
                    <Lightbulb size={14} />
                    Use Cases
                  </Link>
                  <Link
                    href="/ccresearch/tips"
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                  >
                    <FileText size={14} />
                    Tips
                  </Link>
                </div>
              </div>

              {/* Existing Sessions Section */}
              <div className="flex-1 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Project Sessions
                  </h4>
                  <button
                    onClick={loadProjectSessions}
                    className="text-slate-500 hover:text-slate-300 p-1"
                    title="Refresh sessions"
                  >
                    <RefreshCw size={14} className={loadingProjectSessions ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loadingProjectSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                  </div>
                ) : projectSessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No previous sessions for this project
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setTerminalSessionId(session.id);
                          setTerminalWorkspaceDir(session.workspace_dir || '');
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-left transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          session.status === 'active' ? 'bg-green-500' :
                          session.status === 'disconnected' ? 'bg-yellow-500' :
                          'bg-slate-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {session.title || `Session #${session.session_number}`}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {new Date(session.last_activity_at || session.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-emerald-400 text-xs">Resume</span>
                          <Play size={14} className="text-emerald-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Terminal Input - Only show when terminal is active */}
        {terminalSessionId && (
          <MobileTerminalInput
            onSendInput={handleMobileTerminalInput}
            onSendControlSequence={handleMobileTerminalControl}
            disabled={!terminalConnected}
          />
        )}
      </div>

      {/* Recordings List Modal */}
      {showRecordingsList && terminalSessionId && (
        <RecordingsList
          sessionId={terminalSessionId}
          onClose={() => setShowRecordingsList(false)}
          showToast={showToast}
        />
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Download size={20} className="text-indigo-400" />
                Import Data
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportUrls(['']);
                  setImportBranch('');
                  setImportFiles([]);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Import Type Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setImportType('github')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    importType === 'github'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Github size={16} />
                  GitHub
                </button>
                <button
                  onClick={() => setImportType('web')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    importType === 'web'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Globe size={16} />
                  Web URL
                </button>
                <button
                  onClick={() => setImportType('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    importType === 'upload'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Upload size={16} />
                  Upload
                </button>
              </div>

              {/* GitHub Import */}
              {importType === 'github' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Repository URLs
                    </label>
                    <div className="space-y-2">
                      {importUrls.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => updateUrlInput(index, e.target.value)}
                            placeholder="https://github.com/user/repo"
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          {importUrls.length > 1 && (
                            <button
                              onClick={() => removeUrlInput(index)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addUrlInput}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add another URL
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Branch (optional, applies to all)
                    </label>
                    <input
                      type="text"
                      value={importBranch}
                      onChange={(e) => setImportBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Repositories will be cloned into the data/ folder. Requires active terminal.
                  </p>
                </div>
              )}

              {/* Web URL Import */}
              {importType === 'web' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Web URLs
                    </label>
                    <div className="space-y-2">
                      {importUrls.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => updateUrlInput(index, e.target.value)}
                            placeholder="https://example.com/page"
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          {importUrls.length > 1 && (
                            <button
                              onClick={() => removeUrlInput(index)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addUrlInput}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add another URL
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Page content will be saved as markdown files. Requires active terminal.
                  </p>
                </div>
              )}

              {/* File Upload */}
              {importType === 'upload' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Select Files
                    </label>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => setImportFiles(Array.from(e.target.files || []))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                  </div>
                  {importFiles.length > 0 && (
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-sm text-slate-300 mb-2">{importFiles.length} file(s) selected:</p>
                      <ul className="text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                        {importFiles.map((file, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <FileText size={12} />
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Files will be uploaded to the data/ folder. Works with or without active terminal.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportUrls(['']);
                  setImportBranch('');
                  setImportFiles([]);
                }}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || (importType !== 'upload' && !importUrls.some(u => u.trim())) || (importType === 'upload' && importFiles.length === 0)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
