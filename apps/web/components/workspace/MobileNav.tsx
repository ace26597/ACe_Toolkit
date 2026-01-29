"use client";

import React from 'react';
import { Terminal, FileText, Database, FolderOpen, Menu } from 'lucide-react';

export type ViewMode = 'terminal' | 'notes' | 'data';

interface MobileNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSidebar: () => void;
  onToggleFileBrowser: () => void;
  fileBrowserOpen: boolean;
  hasProject: boolean;
}

/**
 * Bottom navigation bar for mobile devices
 * Shows tab bar with Terminal, Notes, Data, and Files
 */
export function MobileNav({
  viewMode,
  onViewModeChange,
  onToggleSidebar,
  onToggleFileBrowser,
  fileBrowserOpen,
  hasProject,
}: MobileNavProps) {
  const tabs = [
    { id: 'terminal' as ViewMode, icon: Terminal, label: 'Terminal' },
    { id: 'notes' as ViewMode, icon: FileText, label: 'Notes' },
    { id: 'data' as ViewMode, icon: Database, label: 'Data' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {/* Hamburger menu for sidebar */}
        <button
          onClick={onToggleSidebar}
          className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white active:bg-slate-800 transition-colors"
          aria-label="Open projects menu"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] mt-1">Projects</span>
        </button>

        {/* Main tabs */}
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => hasProject && onViewModeChange(tab.id)}
              disabled={!hasProject}
              className={`
                flex flex-col items-center justify-center w-16 h-full transition-colors
                ${isActive
                  ? 'text-blue-400'
                  : hasProject
                    ? 'text-slate-400 hover:text-white active:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-[10px] mt-1 ${isActive ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Files toggle */}
        <button
          onClick={onToggleFileBrowser}
          disabled={!hasProject || viewMode !== 'terminal'}
          className={`
            flex flex-col items-center justify-center w-16 h-full transition-colors
            ${fileBrowserOpen && viewMode === 'terminal'
              ? 'text-green-400'
              : hasProject && viewMode === 'terminal'
                ? 'text-slate-400 hover:text-white active:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }
          `}
          aria-label="Toggle files"
        >
          <FolderOpen className="w-6 h-6" />
          <span className="text-[10px] mt-1">Files</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Mobile header with hamburger and project name
 */
interface MobileHeaderProps {
  projectName: string | null;
  onToggleSidebar: () => void;
}

export function MobileHeader({ projectName, onToggleSidebar }: MobileHeaderProps) {
  return (
    <header className="md:hidden flex items-center h-14 px-4 bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
      <button
        onClick={onToggleSidebar}
        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="ml-3 flex-1 truncate">
        <h1 className="text-sm font-medium text-white truncate">
          {projectName || 'C3 Researcher'}
        </h1>
        <p className="text-xs text-slate-400">Workspace</p>
      </div>
    </header>
  );
}

/**
 * Drawer overlay for mobile sidebar
 */
interface DrawerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DrawerOverlay({ isOpen, onClose, children }: DrawerOverlayProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          md:hidden fixed inset-0 bg-black/60 z-50 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          md:hidden fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-slate-900 z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Projects sidebar"
      >
        {children}
      </div>
    </>
  );
}

/**
 * File browser modal for mobile
 */
interface FileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FileBrowserModal({ isOpen, onClose, children }: FileBrowserModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal from bottom */}
      <div
        className={`
          md:hidden fixed bottom-16 left-0 right-0 top-14 bg-slate-900 z-50
          transform transition-transform duration-300 ease-out
          flex flex-col overflow-hidden rounded-t-xl
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="File browser"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">Files</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}
