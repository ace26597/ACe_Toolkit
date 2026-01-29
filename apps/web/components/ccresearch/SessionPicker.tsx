"use client";

import React from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  Terminal,
  Clock,
  Pencil,
  Check,
  X,
  Sparkles,
  Server,
  Database,
  FlaskConical,
  Plug,
  ArrowRight,
  FolderOpen,
  Play
} from 'lucide-react';

interface CCResearchSession {
  id: string;
  session_id: string;
  email: string;
  session_number: number;
  title: string;
  workspace_dir: string;
  status: 'created' | 'active' | 'disconnected' | 'terminated' | 'error';
  created_at: string;
  last_activity_at: string;
}

interface UnifiedProject {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  path: string;
  terminal_session_id?: string;
  terminal_status?: string;
}

interface SessionPickerProps {
  sessions: CCResearchSession[];
  unifiedProjects?: UnifiedProject[];
  isLoading: boolean;
  isCreating: boolean;
  editingSessionId: string | null;
  editingTitle: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onOpenProject: (projectName: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onStartRename: (sessionId: string, currentTitle: string, e: React.MouseEvent) => void;
  onSaveRename: (sessionId: string, e?: React.KeyboardEvent | React.MouseEvent) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  setEditingTitle: (title: string) => void;
  onRefresh: () => void;
}

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'disconnected': return 'bg-yellow-500';
    case 'created': return 'bg-blue-500';
    case 'terminated': return 'bg-slate-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-slate-500';
  }
};

// Format relative time
const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Group sessions by date
const groupSessionsByDate = (sessions: CCResearchSession[]) => {
  const grouped: Record<string, CCResearchSession[]> = {};

  sessions.forEach(session => {
    const date = new Date(session.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      label = 'This Week';
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(session);
  });

  return grouped;
};

export function SessionPicker({
  sessions,
  unifiedProjects = [],
  isLoading,
  isCreating,
  editingSessionId,
  editingTitle,
  onSelectSession,
  onCreateSession,
  onOpenProject,
  onDeleteSession,
  onStartRename,
  onSaveRename,
  onCancelRename,
  setEditingTitle,
  onRefresh
}: SessionPickerProps) {
  const groupedSessions = groupSessionsByDate(sessions);

  // Filter out projects that already have active CCResearch sessions
  const sessionProjectNames = new Set(sessions.map(s => s.title));
  const workspaceOnlyProjects = unifiedProjects.filter(
    p => p.created_by === 'workspace' && !sessionProjectNames.has(p.name) && !p.terminal_session_id
  );

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-6 h-6 text-blue-500" />
              CCResearch Terminal
            </h1>
            <p className="text-sm text-slate-400 mt-1">Select a project to continue or create a new one</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Refresh sessions"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">145+</div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <FlaskConical className="w-3 h-3" /> Skills
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">34</div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <Server className="w-3 h-3" /> MCP Servers
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">14</div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <Plug className="w-3 h-3" /> Plugins
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">566K+</div>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <Database className="w-3 h-3" /> Trials (AACT)
              </div>
            </div>
          </div>

          {/* Create New Project - Prominent */}
          <button
            onClick={onCreateSession}
            disabled={isCreating}
            className="w-full mb-6 p-4 sm:p-6 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 hover:from-blue-900/50 hover:to-cyan-900/50 border border-blue-700/50 hover:border-blue-500 rounded-xl transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
                  {isCreating ? (
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <Plus className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-white">Create Project</h3>
                  <p className="text-sm text-slate-400">Start a new research project with Claude Code</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Sessions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Recent Projects</h2>
              <span className="text-xs text-slate-500">{sessions.length} total</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
                <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No projects yet</h3>
                <p className="text-sm text-slate-500">Create your first research project to get started</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
                  <div key={dateLabel}>
                    {/* Date Header */}
                    <div className="px-4 py-2 bg-slate-800/50 text-xs font-medium text-slate-500 sticky top-0">
                      {dateLabel}
                    </div>

                    {/* Sessions in this group */}
                    {dateSessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (editingSessionId !== session.id) {
                            onSelectSession(session.id);
                          }
                        }}
                        className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        {/* Status indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded font-medium">
                              #{session.session_number}
                            </span>
                            {editingSessionId === session.id ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onSaveRename(session.id, e);
                                  if (e.key === 'Escape') onCancelRename(e as any);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="flex-1 px-2 py-1 bg-slate-700 border border-blue-500 rounded text-white text-sm focus:outline-none"
                              />
                            ) : (
                              <span className="text-white truncate font-medium">{session.title}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(session.last_activity_at)}</span>
                            <span>•</span>
                            <span className="truncate">{session.email}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {editingSessionId === session.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => onSaveRename(session.id, e)}
                              className="p-2 hover:bg-green-900/50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                              onClick={onCancelRename}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => onStartRename(session.id, session.title, e)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Rename session"
                            >
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={(e) => onDeleteSession(session.id, e)}
                              className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                              title="Delete session"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        )}

                        {/* Arrow */}
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Projects - can be opened in terminal */}
          {workspaceOnlyProjects.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  Workspace Projects
                </h2>
                <span className="text-xs text-slate-500">{workspaceOnlyProjects.length} available</span>
              </div>

              <div className="bg-slate-900 rounded-xl border border-indigo-800/50 overflow-hidden divide-y divide-slate-800">
                {workspaceOnlyProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => onOpenProject(project.name)}
                    className="group flex items-center gap-4 px-4 py-3 hover:bg-indigo-900/20 cursor-pointer transition-colors"
                  >
                    {/* Folder icon */}
                    <div className="p-2 bg-indigo-600/20 rounded-lg">
                      <FolderOpen className="w-4 h-4 text-indigo-400" />
                    </div>

                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white truncate font-medium">{project.name}</span>
                        <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded">
                          workspace
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(project.updated_at)}</span>
                      </div>
                    </div>

                    {/* Open in Terminal button */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open in Terminal
                      </span>
                      <Play className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionPicker;
