"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video, Plus, Play, Download, Trash2, FolderOpen,
  Terminal, Loader2, X, RefreshCw, ChevronRight,
  Film, Clock
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import { getApiUrl } from '@/lib/api';

// Dynamic import for xterm (client-side only)
import type { Terminal as XTermType } from '@xterm/xterm';
import type { FitAddon as FitAddonType } from '@xterm/addon-fit';

interface Project {
  name: string;
  display_name?: string;
  created_at: string;
  last_activity?: string;
  video_count: number;
  has_terminal: boolean;
  npm_installed?: boolean;
}

interface VideoFile {
  filename: string;
  size: number;
  created_at: number;
  url: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function VideoStudioContent() {
  const router = useRouter();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Terminal refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTermType | null>(null);
  const fitAddonRef = useRef<FitAddonType | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/video-studio/projects`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch project details
  const fetchProjectDetails = useCallback(async (projectName: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/video-studio/projects/${projectName}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setProjectDetails(data);
        setVideos(data.videos || []);
        setSessionActive(data.has_terminal);
      }
    } catch (err) {
      console.error('Failed to fetch project details:', err);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch details when project selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetails(selectedProject);
    }
  }, [selectedProject, fetchProjectDetails]);

  // Load xterm CSS
  useEffect(() => {
    // Add xterm CSS dynamically
    const linkId = 'xterm-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize terminal with dynamic import (client-side only)
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    let mounted = true;

    const initTerminal = async () => {
      // Dynamic import to avoid SSR issues
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit')
      ]);

      if (!mounted || !terminalRef.current) return;

      const term = new XTerm({
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          selectionBackground: '#264f78',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
          brightBlack: '#6e7681',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc'
        },
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 10000,
        convertEol: true
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);

      setTimeout(() => fitAddon.fit(), 100);

      xtermRef.current = term as any;
      fitAddonRef.current = fitAddon as any;

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          (fitAddonRef.current as any).fit();
          // Send resize to backend
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'resize',
              rows: term.rows,
              cols: term.cols
            }));
          }
        }
      };
      window.addEventListener('resize', handleResize);

      // Handle terminal input
      term.onData((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });
    };

    initTerminal();

    return () => {
      mounted = false;
      // Close WebSocket on unmount to prevent memory leaks
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        (xtermRef.current as any).dispose();
        xtermRef.current = null;
      }
    };
  }, []);

  // Create project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch(`${getApiUrl()}/video-studio/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newProjectName })
      });

      if (res.ok) {
        const project = await res.json();
        setIsCreatingProject(false);
        setNewProjectName('');
        await fetchProjects();
        setSelectedProject(project.name);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
    }
  };

  // Delete project
  const handleDeleteProject = async (projectName: string) => {
    if (!confirm(`Delete project "${projectName}" and all its videos?`)) return;

    try {
      await fetch(`${getApiUrl()}/video-studio/projects/${projectName}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (selectedProject === projectName) {
        setSelectedProject(null);
        setProjectDetails(null);
      }
      fetchProjects();
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  // Start terminal session
  const handleStartSession = async () => {
    if (!selectedProject) return;

    setIsStartingSession(true);
    setError(null);

    // Clear terminal
    xtermRef.current?.clear();
    xtermRef.current?.writeln(`\x1b[36mStarting Claude Code terminal...\x1b[0m\r\n`);

    try {
      // Start session
      const res = await fetch(`${getApiUrl()}/video-studio/projects/${selectedProject}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rows: xtermRef.current?.rows || 30,
          cols: xtermRef.current?.cols || 120
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to start session');
      }

      // Connect WebSocket
      const apiUrl = getApiUrl();
      const wsUrl = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsUrl}/video-studio/terminal/${selectedProject}`);

      // Use arraybuffer for binary data (same as CCResearch)
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setSessionActive(true);
        setIsStartingSession(false);
      };

      ws.onmessage = (event) => {
        // Handle binary data (terminal output)
        if (event.data instanceof ArrayBuffer) {
          const data = new Uint8Array(event.data);
          xtermRef.current?.write(data);
        } else {
          // Handle JSON messages
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'session_ended') {
              xtermRef.current?.writeln('\r\n\x1b[33mSession ended.\x1b[0m');
              setSessionActive(false);
              if (selectedProject) {
                fetchProjectDetails(selectedProject);
              }
            } else if (msg.type === 'status') {
              if (msg.status === 'connected') {
                xtermRef.current?.writeln(`\x1b[34mClaude Code started (PID: ${msg.pid})\x1b[0m`);
              }
            } else if (msg.type === 'error') {
              xtermRef.current?.writeln(`\r\n\x1b[31mError: ${msg.error}\x1b[0m`);
            }
          } catch {
            // Plain text fallback
            xtermRef.current?.write(event.data);
          }
        }
      };

      ws.onerror = () => {
        xtermRef.current?.writeln('\r\n\x1b[31mConnection error\x1b[0m');
        setSessionActive(false);
      };

      ws.onclose = () => {
        setSessionActive(false);
        if (selectedProject) {
          fetchProjectDetails(selectedProject);
        }
      };

      wsRef.current = ws;

    } catch (err: any) {
      setError(err.message);
      xtermRef.current?.writeln(`\r\n\x1b[31mError: ${err.message}\x1b[0m`);
      setIsStartingSession(false);
    }
  };

  // Terminate session
  const handleTerminateSession = async () => {
    if (!selectedProject) return;

    wsRef.current?.close();
    wsRef.current = null;

    await fetch(`${getApiUrl()}/video-studio/projects/${selectedProject}/session/terminate`, {
      method: 'POST',
      credentials: 'include'
    });

    setSessionActive(false);
    xtermRef.current?.writeln('\r\n\x1b[33mSession terminated.\x1b[0m');
  };

  // Delete video
  const handleDeleteVideo = async (filename: string) => {
    if (!selectedProject || !confirm(`Delete ${filename}?`)) return;

    await fetch(`${getApiUrl()}/video-studio/projects/${selectedProject}/videos/${filename}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    fetchProjectDetails(selectedProject);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar - Projects */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              <h1 className="font-semibold">Video Studio</h1>
            </div>
            <button
              onClick={() => setIsCreatingProject(true)}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create Project Modal */}
          {isCreatingProject && (
            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-purple-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-sm py-1.5 rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="px-3 hover:bg-gray-700 text-sm py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No projects yet. Create one to start!
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.name}
                onClick={() => setSelectedProject(project.name)}
                className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${
                  selectedProject === project.name ? 'bg-gray-900 border-l-2 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{project.display_name || project.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.name);
                    }}
                    className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {project.video_count}
                  </span>
                  {project.has_terminal && (
                    <span className="flex items-center gap-1 text-green-500">
                      <Terminal className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedProject ? (
          // Welcome view
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Film className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Remotion Video Studio</h2>
              <p className="text-gray-400 mb-6">
                Create stunning videos with AI. Select a project or create a new one to get started.
              </p>
              <button
                onClick={() => setIsCreatingProject(true)}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create New Project
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-400" />
                  {projectDetails?.display_name || selectedProject}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  {projectDetails?.npm_installed ? (
                    <span className="text-green-500">Dependencies installed</span>
                  ) : (
                    <span className="text-amber-500">Needs npm install</span>
                  )}
                  {sessionActive && (
                    <span className="flex items-center gap-1 text-green-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Session active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchProjectDetails(selectedProject)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terminal Controls */}
            <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Type your video idea directly into Claude Code below
              </p>
              <div className="flex items-center gap-2">
                {sessionActive ? (
                  <button
                    onClick={handleTerminateSession}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Stop Terminal
                  </button>
                ) : (
                  <button
                    onClick={handleStartSession}
                    disabled={isStartingSession}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isStartingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Terminal className="w-4 h-4" />
                    )}
                    Start Terminal
                  </button>
                )}
                {error && (
                  <span className="text-sm text-red-400">{error}</span>
                )}
              </div>
            </div>

            {/* Terminal and Videos */}
            <div className="flex-1 flex">
              {/* Terminal */}
              <div className="flex-1 flex flex-col border-r border-gray-800">
                <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2 bg-gray-900/50">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">Claude Code Terminal</span>
                </div>
                <div
                  ref={terminalRef}
                  className="flex-1 bg-[#0d1117]"
                  style={{ padding: '8px' }}
                />
              </div>

              {/* Videos Sidebar */}
              <div className="w-80 flex flex-col">
                <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                  <span className="text-sm font-medium">Videos</span>
                  <span className="text-xs text-gray-500">{videos.length} videos</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {videos.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No videos yet. Generate one!
                    </div>
                  ) : (
                    videos.map((video) => (
                      <div
                        key={video.filename}
                        className="p-3 border-b border-gray-800 hover:bg-gray-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium truncate flex-1">{video.filename}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>{formatFileSize(video.size)}</span>
                          <span>{formatDate(video.created_at)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPlayingVideo(video)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Play
                          </button>
                          <a
                            href={`${getApiUrl()}/video-studio/projects/${selectedProject}/videos/${video.filename}?download=true`}
                            className="flex items-center justify-center px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleDeleteVideo(video.filename)}
                            className="flex items-center justify-center px-2 py-1.5 bg-gray-700 hover:bg-red-600 rounded text-xs transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Video Player Modal */}
      {playingVideo && selectedProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg overflow-hidden max-w-4xl w-full mx-4">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <span className="font-medium">{playingVideo.filename}</span>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={`${getApiUrl()}/video-studio/projects/${selectedProject}/videos/${playingVideo.filename}`}
              controls
              autoPlay
              className="w-full max-h-[70vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoStudioPage() {
  return (
    <ProtectedRoute>
      <VideoStudioContent />
    </ProtectedRoute>
  );
}
