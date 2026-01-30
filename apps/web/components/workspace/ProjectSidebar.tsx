'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, RefreshCw, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeft } from 'lucide-react';
import { WorkspaceProject } from '@/lib/api';

interface ProjectSidebarProps {
  projects: WorkspaceProject[];
  selectedProject: string | null;
  onSelectProject: (name: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (name: string) => void;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const COLLAPSED_KEY = 'workspace_sidebar_collapsed';

export default function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  loading,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: ProjectSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Use controlled collapsed state if provided, otherwise manage internally
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  // Load collapsed state from localStorage on mount (only for internal state)
  useEffect(() => {
    if (controlledCollapsed === undefined) {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === 'true') setInternalCollapsed(true);
    }
  }, [controlledCollapsed]);

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
      localStorage.setItem(COLLAPSED_KEY, (!internalCollapsed).toString());
    }
  };

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewProjectName('');
    }
  };

  // Collapsed view - just icons
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-slate-800/50 border-r border-slate-700 flex flex-col transition-all duration-200">
        {/* Header */}
        <div className="p-2 border-b border-slate-700 flex flex-col items-center gap-2">
          <button
            onClick={toggleCollapse}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft size={18} />
          </button>
          <button
            onClick={() => {
              toggleCollapse();
              setTimeout(() => setIsCreating(true), 200);
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="New Project"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Project Icons */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-16">
              <RefreshCw size={16} className="text-slate-400 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center h-16">
              <FolderOpen size={16} className="text-slate-500" />
            </div>
          ) : (
            <ul className="flex flex-col items-center gap-1">
              {projects.map((project) => (
                <li key={project.name}>
                  <button
                    onClick={() => onSelectProject(project.name)}
                    className={`p-2 rounded transition-colors ${
                      selectedProject === project.name
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                    title={project.name}
                  >
                    <FolderOpen size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-700 text-xs text-slate-500 text-center">
          {projects.length}
        </div>
      </aside>
    );
  }

  // Expanded view
  return (
    <aside className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Projects
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreating(true)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="New Project"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={toggleCollapse}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Project Input */}
      {isCreating && (
        <div className="p-2 border-b border-slate-700">
          <input
            type="text"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1.5 rounded transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
              }}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="text-slate-400 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p>No projects yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="text-indigo-400 hover:text-indigo-300 mt-2"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <ul className="py-2">
            {projects.map((project) => (
              <li key={project.name}>
                <button
                  onClick={() => onSelectProject(project.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left group transition-colors ${
                    selectedProject === project.name
                      ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <FolderOpen
                    size={18}
                    className={selectedProject === project.name ? 'text-indigo-400' : 'text-slate-400'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    <div className="text-xs text-slate-500">
                      {project.noteCount} notes · {project.dataSize}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                      selectedProject === project.name ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 text-xs text-slate-500 text-center">
        {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>
    </aside>
  );
}
