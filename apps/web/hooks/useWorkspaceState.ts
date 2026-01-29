"use client";

import { useState, useEffect, useCallback } from 'react';

// Types for workspace state
export type ViewMode = 'terminal' | 'notes' | 'data';
export type TerminalMode = 'claude' | 'ssh';

export interface WorkspaceState {
  selectedProject: string | null;
  viewMode: ViewMode;
  terminalMode: TerminalMode;
  fileBrowserOpen: boolean;
  sidebarOpen: boolean; // For mobile drawer
}

const STORAGE_KEYS = {
  selectedProject: 'workspace_selected_project',
  viewMode: 'workspace_view_mode',
  terminalMode: 'workspace_terminal_mode',
  fileBrowserOpen: 'workspace_file_browser_open',
  sidebarOpen: 'workspace_sidebar_open',
} as const;

const DEFAULT_STATE: WorkspaceState = {
  selectedProject: null,
  viewMode: 'terminal',
  terminalMode: 'claude',
  fileBrowserOpen: true,
  sidebarOpen: false, // Closed by default on mobile
};

/**
 * Custom hook for persisting workspace state to localStorage
 * Automatically syncs state changes and restores on page load
 */
export function useWorkspaceState() {
  const [state, setState] = useState<WorkspaceState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const loadedState: Partial<WorkspaceState> = {};

      // Load each key from localStorage
      const project = localStorage.getItem(STORAGE_KEYS.selectedProject);
      if (project) loadedState.selectedProject = project;

      const viewMode = localStorage.getItem(STORAGE_KEYS.viewMode);
      if (viewMode && ['terminal', 'notes', 'data'].includes(viewMode)) {
        loadedState.viewMode = viewMode as ViewMode;
      }

      const terminalMode = localStorage.getItem(STORAGE_KEYS.terminalMode);
      if (terminalMode && ['claude', 'ssh'].includes(terminalMode)) {
        loadedState.terminalMode = terminalMode as TerminalMode;
      }

      const fileBrowserOpen = localStorage.getItem(STORAGE_KEYS.fileBrowserOpen);
      if (fileBrowserOpen !== null) {
        loadedState.fileBrowserOpen = fileBrowserOpen === 'true';
      }

      setState(prev => ({ ...prev, ...loadedState }));
    } catch (error) {
      console.error('Failed to load workspace state:', error);
    }

    setIsHydrated(true);
  }, []);

  // Persist individual state changes to localStorage
  const persistValue = useCallback((key: keyof typeof STORAGE_KEYS, value: string | boolean | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (value === null) {
        localStorage.removeItem(STORAGE_KEYS[key]);
      } else {
        localStorage.setItem(STORAGE_KEYS[key], String(value));
      }
    } catch (error) {
      console.error(`Failed to persist ${key}:`, error);
    }
  }, []);

  // Individual setters that also persist
  const setSelectedProject = useCallback((project: string | null) => {
    setState(prev => ({ ...prev, selectedProject: project }));
    persistValue('selectedProject', project);
  }, [persistValue]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
    persistValue('viewMode', mode);
  }, [persistValue]);

  const setTerminalMode = useCallback((mode: TerminalMode) => {
    setState(prev => ({ ...prev, terminalMode: mode }));
    persistValue('terminalMode', mode);
  }, [persistValue]);

  const setFileBrowserOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, fileBrowserOpen: open }));
    persistValue('fileBrowserOpen', open);
  }, [persistValue]);

  const setSidebarOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, sidebarOpen: open }));
    // Don't persist sidebar state - always start closed on mobile
  }, []);

  const toggleFileBrowser = useCallback(() => {
    setState(prev => {
      const newValue = !prev.fileBrowserOpen;
      persistValue('fileBrowserOpen', newValue);
      return { ...prev, fileBrowserOpen: newValue };
    });
  }, [persistValue]);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  // Clear all persisted state
  const clearState = useCallback(() => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    setState(DEFAULT_STATE);
  }, []);

  return {
    ...state,
    isHydrated,
    setSelectedProject,
    setViewMode,
    setTerminalMode,
    setFileBrowserOpen,
    setSidebarOpen,
    toggleFileBrowser,
    toggleSidebar,
    clearState,
  };
}

/**
 * Hook to detect if we're on a mobile device
 * Uses both screen width and touch capability
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < breakpoint);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook to detect screen size category
 */
export function useScreenSize() {
  const [size, setSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setSize('mobile');
      } else if (width < 1024) {
        setSize('tablet');
      } else {
        setSize('desktop');
      }
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return size;
}
