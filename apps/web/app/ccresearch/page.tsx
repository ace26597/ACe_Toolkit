"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  AlertCircle,
  Activity,
  Home,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronRight,
  FolderArchive,
  Download,
  Save,
  FolderOpen,
  HardDrive,
  ArrowLeft,
  Power,
  SquarePlus,
  Database,
  FlaskConical,
  FileText,
  Workflow,
  Plug,
  Cpu,
  BarChart3,
  Microscope,
  BookOpen,
  Shield,
  Play,
  Server,
  Globe,
  Key,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';

// Dynamic import for Terminal (client-only, xterm.js requires DOM)
const CCResearchTerminal = dynamic(
  () => import('@/components/ccresearch/CCResearchTerminal'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900/50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Loading terminal...</p>
        </div>
      </div>
    )
  }
);

// Dynamic import for FileBrowser
const FileBrowser = dynamic(
  () => import('@/components/ccresearch/FileBrowser'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900/50 rounded-lg">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    )
  }
);

// Types
interface CCResearchSession {
  id: string;
  session_id: string;
  email: string;
  title: string;
  workspace_dir: string;
  status: 'created' | 'active' | 'disconnected' | 'terminated' | 'error';
  terminal_rows: number;
  terminal_cols: number;
  commands_executed: number;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  uploaded_files?: string[];
}

interface SavedProject {
  name: string;
  path: string;
  description?: string;
  saved_at: string;
  files?: string[];
}

interface CapabilitiesData {
  version: string;
  plugins: {
    installed: Array<{
      id: string;
      name: string;
      version: string;
      status: string;
      skills_count?: number;
      description: string;
      mcp_required?: boolean;
    }>;
    summary: { total: number; active: number; with_mcp: number };
  };
  mcp_servers: {
    active: Array<{ name: string; status: string; description: string; tools?: string[] }>;
    available_local: Array<{ name: string; description: string; auth_required: boolean; maintained: boolean }>;
    available_remote: Array<{ name: string; description: string; auth_method: string }>;
    summary: { running: number; available_local: number; available_remote: number };
  };
  available_skills: {
    skills: Array<{ name: string; description: string; category: string; status: string }>;
    summary: { total: number; installed: number };
  };
  scientific_skills: {
    total: number;
    categories: Record<string, {
      count: number;
      status: string;
      skills: Array<{ name: string; description: string; status: string }>;
    }>;
  };
  security: {
    sandbox_enabled: boolean;
    sandbox_type: string;
    isolation_features: string[];
  };
  api_keys: {
    configured: string[];
    recommended: Array<{ name: string; purpose: string }>;
  };
}

// API functions
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const ccresearchApi = {
  createSession: async (
    browserSessionId: string,
    email: string,
    title?: string,
    files?: File[]
  ): Promise<CCResearchSession> => {
    const formData = new FormData();
    formData.append('session_id', browserSessionId);
    formData.append('email', email);
    if (title) formData.append('title', title);
    if (files) {
      files.forEach(file => formData.append('files', file));
    }

    const res = await fetch(`${API_URL}/ccresearch/sessions`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
      throw new Error(error.detail || 'Failed to create session');
    }
    return res.json();
  },

  uploadFiles: async (ccresearchId: string, files: File[]): Promise<{ uploaded_files: string[]; data_dir: string }> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to upload files' }));
      throw new Error(error.detail || 'Failed to upload files');
    }
    return res.json();
  },

  listSessions: async (browserSessionId: string): Promise<CCResearchSession[]> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${browserSessionId}`);
    if (!res.ok) throw new Error('Failed to list sessions');
    return res.json();
  },

  deleteSession: async (ccresearchId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  resizeTerminal: async (ccresearchId: string, rows: number, cols: number): Promise<void> => {
    await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, cols }),
    });
  },

  downloadWorkspaceZip: (ccresearchId: string): void => {
    window.open(`${API_URL}/ccresearch/sessions/${ccresearchId}/download-zip`, '_blank');
  },

  // Project save/restore
  saveProject: async (ccresearchId: string, projectName: string, description?: string): Promise<{
    name: string;
    path: string;
    saved_at: string;
  }> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/save-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_name: projectName, description }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to save project' }));
      throw new Error(error.detail || 'Failed to save project');
    }
    return res.json();
  },

  listProjects: async (): Promise<SavedProject[]> => {
    const res = await fetch(`${API_URL}/ccresearch/projects`);
    if (!res.ok) throw new Error('Failed to list projects');
    return res.json();
  },

  createFromProject: async (browserSessionId: string, email: string, projectName: string, title?: string): Promise<CCResearchSession> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/from-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: browserSessionId, email, project_name: projectName, title }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to restore project' }));
      throw new Error(error.detail || 'Failed to restore project');
    }
    return res.json();
  },

  deleteProject: async (projectName: string): Promise<void> => {
    const res = await fetch(`${API_URL}/ccresearch/projects/${encodeURIComponent(projectName)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },
};

// Generate browser session ID
const generateSessionId = () => {
  if (typeof window === 'undefined') return '';
  const stored = sessionStorage.getItem('ccresearch_session_id');
  if (stored) return stored;
  const newId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('ccresearch_session_id', newId);
  return newId;
};

export default function CCResearchPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<CCResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [browserSessionId, setBrowserSessionId] = useState('');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState('');
  const [saveProjectContext, setSaveProjectContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showProjectsTab, setShowProjectsTab] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [capabilities, setCapabilities] = useState<CapabilitiesData | null>(null);

  // New session creation state
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionEmail, setNewSessionEmail] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionFiles, setNewSessionFiles] = useState<File[]>([]);
  const [emailError, setEmailError] = useState('');

  // Initialize browser session ID
  useEffect(() => {
    setBrowserSessionId(generateSessionId());
  }, []);

  // Load capabilities data (embedded for reliability)
  useEffect(() => {
    // Embedded capabilities data for production reliability
    const capabilitiesData: CapabilitiesData = {
      version: "2.19.0",
      plugins: {
        installed: [
          { id: "scientific-skills@claude-scientific-skills", name: "K-Dense Scientific Skills", version: "2.17.0", status: "active", skills_count: 140, description: "140 scientific research skills" },
          { id: "context7@claude-plugins-official", name: "Context7", version: "f70b65538da0", status: "active", mcp_required: true, description: "Documentation lookup via MCP" },
          { id: "frontend-design@claude-plugins-official", name: "Frontend Design", version: "f70b65538da0", status: "active", description: "Frontend interface generation" },
          { id: "code-simplifier@claude-plugins-official", name: "Code Simplifier", version: "1.0.0", status: "active", description: "Code clarity refinement" },
          { id: "plugin-dev@claude-plugins-official", name: "Plugin Dev", version: "f70b65538da0", status: "active", description: "Plugin development tools" }
        ],
        summary: { total: 5, active: 5, with_mcp: 1 }
      },
      mcp_servers: {
        active: [
          { name: "context7", status: "running", description: "Library documentation lookup", tools: ["resolve-library-id", "query-docs"] },
          { name: "filesystem", status: "running", description: "Secure file operations", tools: ["read_file", "write_file", "list_directory", "search_files"] },
          { name: "memory", status: "running", description: "Knowledge graph persistence", tools: ["create_entities", "create_relations", "read_graph", "search_nodes"] },
          { name: "sequential-thinking", status: "running", description: "Dynamic problem-solving", tools: ["sequentialthinking"] },
          { name: "fetch", status: "running", description: "Web content fetching", tools: ["fetch"] },
          { name: "git", status: "running", description: "Git repository operations", tools: ["git_status", "git_diff", "git_commit", "git_log"] },
          { name: "time", status: "running", description: "Time/timezone utilities", tools: ["get_current_time", "convert_time"] },
          { name: "sqlite", status: "running", description: "SQLite database operations", tools: ["read_query", "write_query", "list_tables"] },
          { name: "playwright", status: "running", description: "Browser automation", tools: ["browser_navigate", "browser_screenshot", "browser_click"] }
        ],
        available_local: [
          { name: "postgres", description: "PostgreSQL access", auth_required: true, maintained: true },
          { name: "redis", description: "Redis cache", auth_required: true, maintained: true }
        ],
        available_remote: [
          { name: "github", description: "GitHub repositories", auth_method: "OAuth" },
          { name: "gitlab", description: "GitLab CI/CD", auth_method: "None" },
          { name: "linear", description: "Project management", auth_method: "OAuth" },
          { name: "sentry", description: "Error monitoring", auth_method: "OAuth" },
          { name: "slack", description: "Slack messaging", auth_method: "OAuth" },
          { name: "supabase", description: "Database & auth", auth_method: "OAuth" }
        ],
        summary: { running: 9, available_local: 2, available_remote: 6 }
      },
      available_skills: {
        skills: [
          { name: "docx", description: "Word documents", category: "document", status: "not_installed" },
          { name: "pdf", description: "PDF generation", category: "document", status: "not_installed" },
          { name: "pptx", description: "PowerPoint slides", category: "document", status: "not_installed" },
          { name: "xlsx", description: "Excel spreadsheets", category: "document", status: "not_installed" },
          { name: "mcp-builder", description: "Build MCP servers", category: "development", status: "not_installed" },
          { name: "skill-creator", description: "Create custom skills", category: "development", status: "not_installed" },
          { name: "webapp-testing", description: "Web app testing", category: "development", status: "not_installed" },
          { name: "algorithmic-art", description: "Generative art", category: "creative", status: "not_installed" },
          { name: "brand-guidelines", description: "Brand design", category: "creative", status: "not_installed" },
          { name: "canvas-design", description: "Canvas animation", category: "creative", status: "not_installed" },
          { name: "theme-factory", description: "UI themes", category: "creative", status: "not_installed" },
          { name: "internal-comms", description: "Internal comms", category: "enterprise", status: "not_installed" }
        ],
        summary: { total: 16, installed: 1 }
      },
      scientific_skills: {
        total: 140,
        categories: {
          databases: { count: 28, status: "all_working", skills: [
            { name: "pubmed-database", description: "Biomedical literature", status: "working" },
            { name: "uniprot-database", description: "Protein sequences", status: "working" },
            { name: "chembl-database", description: "Bioactive molecules", status: "working" },
            { name: "drugbank-database", description: "Drug & target info", status: "working" },
            { name: "pdb-database", description: "Protein structures", status: "working" },
            { name: "alphafold-database", description: "AI protein predictions", status: "working" },
            { name: "kegg-database", description: "Pathways & diseases", status: "working" },
            { name: "reactome-database", description: "Biological pathways", status: "working" },
            { name: "string-database", description: "Protein interactions", status: "working" },
            { name: "clinicaltrials-database", description: "Clinical trials", status: "working" },
            { name: "clinvar-database", description: "Genetic variants", status: "working" },
            { name: "cosmic-database", description: "Cancer mutations", status: "working" },
            { name: "gwas-database", description: "GWAS catalog", status: "working" },
            { name: "opentargets-database", description: "Target-disease links", status: "working" },
            { name: "ensembl-database", description: "Genome annotation", status: "working" },
            { name: "pubchem-database", description: "Chemical compounds", status: "working" }
          ]},
          bioinformatics: { count: 15, status: "all_working", skills: [
            { name: "biopython", description: "Sequence analysis", status: "working" },
            { name: "scanpy", description: "Single-cell RNA-seq", status: "working" },
            { name: "pysam", description: "SAM/BAM files", status: "working" },
            { name: "gget", description: "Gene retrieval", status: "working" },
            { name: "deeptools", description: "NGS analysis", status: "working" }
          ]},
          cheminformatics: { count: 8, status: "all_working", skills: [
            { name: "rdkit", description: "Molecular modeling", status: "working" },
            { name: "datamol", description: "Molecular data science", status: "working" },
            { name: "deepchem", description: "Molecular ML", status: "working" },
            { name: "torchdrug", description: "Drug discovery ML", status: "working" },
            { name: "diffdock", description: "Molecular docking", status: "working" }
          ]},
          data_science_ml: { count: 18, status: "all_working", skills: [
            { name: "polars", description: "Fast DataFrames", status: "working" },
            { name: "scikit-learn", description: "Machine learning", status: "working" },
            { name: "pytorch-lightning", description: "PyTorch training", status: "working" },
            { name: "transformers", description: "Hugging Face", status: "working" },
            { name: "shap", description: "Model interpretability", status: "working" },
            { name: "statsmodels", description: "Statistical models", status: "working" },
            { name: "pymc", description: "Probabilistic programming", status: "working" },
            { name: "networkx", description: "Network analysis", status: "working" },
            { name: "esm", description: "Protein LLMs", status: "working" }
          ]},
          document_generation: { count: 11, status: "all_working", skills: [
            { name: "generate-image", description: "AI image generation", status: "working" },
            { name: "latex-posters", description: "LaTeX posters", status: "working" },
            { name: "scientific-slides", description: "Presentations", status: "working" },
            { name: "clinical-reports", description: "Clinical reports", status: "working" },
            { name: "markitdown", description: "File to Markdown", status: "working" },
            { name: "scientific-writing", description: "Manuscript writing", status: "working" }
          ]},
          research_workflows: { count: 10, status: "all_working", skills: [
            { name: "literature-review", description: "Systematic reviews", status: "working" },
            { name: "hypothesis-generation", description: "Research hypotheses", status: "working" },
            { name: "statistical-analysis", description: "Statistical methods", status: "working" },
            { name: "peer-review", description: "Manuscript review", status: "working" },
            { name: "citation-management", description: "References", status: "working" }
          ]},
          lab_integrations: { count: 9, status: "all_working", skills: [
            { name: "adaptyv", description: "Protein testing", status: "working" },
            { name: "benchling-integration", description: "Lab notebook", status: "working" },
            { name: "opentrons-integration", description: "Lab automation", status: "working" },
            { name: "pylabrobot", description: "Lab robotics", status: "working" }
          ]}
        }
      },
      security: {
        sandbox_enabled: true,
        sandbox_type: "bubblewrap",
        isolation_features: [
          "Isolated workspace per session",
          "No access to host filesystem",
          "Read-only system directories",
          "Network allowed for APIs only",
          "24-hour session auto-cleanup",
          "Terminal logs preserved"
        ]
      },
      api_keys: {
        configured: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
        recommended: [
          { name: "GITHUB_TOKEN", purpose: "GitHub MCP server" },
          { name: "TAVILY_API_KEY", purpose: "Web search" },
          { name: "SENTRY_AUTH_TOKEN", purpose: "Error monitoring" }
        ]
      }
    };
    setCapabilities(capabilitiesData);
  }, []);

  // Load sessions on mount and periodically
  const loadSessions = useCallback(async () => {
    if (!browserSessionId) return;
    try {
      const data = await ccresearchApi.listSessions(browserSessionId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [browserSessionId]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Load saved projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await ccresearchApi.listProjects();
      setSavedProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setShowSessionDropdown(false);
    if (showSessionDropdown) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showSessionDropdown]);

  // Auto-open files bar when terminal connects
  useEffect(() => {
    if (terminalConnected && activeSessionId) {
      setShowFileBrowser(true);
    }
  }, [terminalConnected, activeSessionId]);

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Open new session modal
  const openNewSessionModal = () => {
    setNewSessionEmail('');
    setNewSessionTitle('');
    setNewSessionFiles([]);
    setEmailError('');
    setShowNewSessionModal(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewSessionFiles(prev => [...prev, ...files]);
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setNewSessionFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Create session with email and files
  const createSession = async () => {
    if (!browserSessionId) return;

    // Validate email
    if (!newSessionEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(newSessionEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    setEmailError('');
    try {
      const session = await ccresearchApi.createSession(
        browserSessionId,
        newSessionEmail.trim(),
        newSessionTitle.trim() || undefined,
        newSessionFiles.length > 0 ? newSessionFiles : undefined
      );
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setShowNewSessionModal(false);
      setShowSessionDropdown(false);
      showToast({
        message: `Session created${newSessionFiles.length > 0 ? ` with ${newSessionFiles.length} file(s)` : ''}`,
        type: 'success'
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to create session',
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Legacy: simple create session (for backward compatibility)
  const createSessionSimple = () => {
    openNewSessionModal();
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await ccresearchApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      showToast({ message: 'Session deleted', type: 'success' });
    } catch {
      showToast({ message: 'Failed to delete session', type: 'error' });
    }
  };

  const saveProject = async () => {
    if (!activeSessionId || !saveProjectName.trim()) return;
    setIsSaving(true);
    try {
      await ccresearchApi.saveProject(activeSessionId, saveProjectName.trim(), saveProjectContext.trim());
      showToast({ message: `Project "${saveProjectName}" saved to SSD`, type: 'success' });
      setShowSaveDialog(false);
      setSaveProjectName('');
      setSaveProjectContext('');
      loadProjects();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to save project',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreProject = async (projectName: string) => {
    if (!browserSessionId) return;

    // Prompt for email if not available
    const email = prompt('Enter your email address to restore this project:');
    if (!email || !validateEmail(email)) {
      showToast({ message: 'Valid email is required to restore a project', type: 'error' });
      return;
    }

    setIsCreating(true);
    try {
      const session = await ccresearchApi.createFromProject(browserSessionId, email, projectName);
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setShowSessionDropdown(false);
      showToast({ message: `Restored project "${projectName}"`, type: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to restore project',
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete saved project "${projectName}"?`)) return;
    try {
      await ccresearchApi.deleteProject(projectName);
      setSavedProjects(prev => prev.filter(p => p.name !== projectName));
      showToast({ message: 'Project deleted', type: 'success' });
    } catch {
      showToast({ message: 'Failed to delete project', type: 'error' });
    }
  };

  const handleResize = useCallback((rows: number, cols: number) => {
    if (activeSessionId) {
      ccresearchApi.resizeTerminal(activeSessionId, rows, cols).catch(console.error);
    }
  }, [activeSessionId]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getExpiresIn = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    if (diffMs <= 0) return 'Expired';
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'created': return 'bg-blue-500';
      case 'disconnected': return 'bg-yellow-500';
      case 'terminated': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Back Button, Logo & Quick Actions */}
            <div className="flex items-center gap-2">
              {/* Back to landing page */}
              {activeSessionId ? (
                <button
                  onClick={() => setActiveSessionId(null)}
                  className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Back to sessions"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/"
                  className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Home"
                >
                  <Home className="w-4 h-4" />
                </Link>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <span className="font-semibold text-lg">CCResearch</span>
              </div>

              {/* Separator */}
              <div className="w-px h-6 bg-gray-700 mx-2" />

              {/* Quick Actions */}
              <button
                onClick={openNewSessionModal}
                disabled={isCreating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
                title="New session"
              >
                {isCreating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <SquarePlus className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">New</span>
              </button>

              {activeSessionId && (
                <button
                  onClick={(e) => {
                    if (confirm('Delete this session and all its data?')) {
                      deleteSession(activeSessionId, e);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm"
                  title="Delete session"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">End</span>
                </button>
              )}
            </div>

            {/* Center: Session Selector */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSessionDropdown(!showSessionDropdown);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors min-w-[200px]"
                >
                  <TerminalIcon className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left text-sm truncate">
                    {activeSession?.title || 'Select Session'}
                  </span>
                  {activeSession && (
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activeSession.status)}`} />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Session Dropdown */}
                {showSessionDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-700">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowProjectsTab(false); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          !showProjectsTab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        Sessions
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowProjectsTab(true); loadProjects(); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                          showProjectsTab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        Saved
                      </button>
                    </div>

                    {!showProjectsTab ? (
                      <>
                        {/* New Session Button */}
                        <button
                          onClick={openNewSessionModal}
                          disabled={isCreating}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-blue-400 border-b border-gray-700"
                        >
                          {isCreating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">New Session</span>
                        </button>

                        {/* Sessions List */}
                        <div className="max-h-64 overflow-y-auto">
                          {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                          ) : sessions.length === 0 ? (
                            <div className="py-4 text-center text-gray-500 text-sm">
                              No sessions yet
                            </div>
                          ) : (
                            sessions.map(session => (
                              <div
                                key={session.id}
                                onClick={() => {
                                  setActiveSessionId(session.id);
                                  setShowSessionDropdown(false);
                                }}
                                className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors ${
                                  activeSessionId === session.id ? 'bg-gray-800' : ''
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm truncate">{session.title}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>{formatTimeAgo(session.created_at)}</span>
                                    <span>•</span>
                                    <span>Expires: {getExpiresIn(session.expires_at)}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => deleteSession(session.id, e)}
                                  className="p-1 hover:bg-red-900/50 rounded transition-colors flex-shrink-0"
                                  title="Delete session"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      /* Saved Projects List */
                      <div className="max-h-64 overflow-y-auto">
                        {savedProjects.length === 0 ? (
                          <div className="py-6 text-center text-gray-500 text-sm">
                            <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No saved projects</p>
                            <p className="text-xs mt-1">Save a session to persist it on SSD</p>
                          </div>
                        ) : (
                          savedProjects.map(project => (
                            <div
                              key={project.name}
                              onClick={() => restoreProject(project.name)}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors"
                            >
                              <FolderOpen className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{project.name}</div>
                                <div className="text-xs text-gray-500">
                                  Saved {formatTimeAgo(project.saved_at)}
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteProject(project.name, e)}
                                className="p-1 hover:bg-red-900/50 rounded transition-colors flex-shrink-0"
                                title="Delete project"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-3">
              {activeSession && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Activity className={`w-3.5 h-3.5 ${terminalConnected ? 'text-green-400' : 'text-gray-500'}`} />
                    <span>{terminalConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-700" />
                  <button
                    onClick={() => {
                      setSaveProjectName(activeSession.title);
                      setShowSaveDialog(true);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-green-400"
                    title="Save project to SSD"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => ccresearchApi.downloadWorkspaceZip(activeSessionId!)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-blue-400"
                    title="Download workspace as ZIP"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>ZIP</span>
                  </button>
                  <button
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                      showFileBrowser ? 'bg-blue-600 text-white' : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                    title={showFileBrowser ? 'Hide files' : 'Show files'}
                  >
                    {showFileBrowser ? (
                      <PanelRightClose className="w-3.5 h-3.5" />
                    ) : (
                      <PanelRightOpen className="w-3.5 h-3.5" />
                    )}
                    <span>Files</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {activeSessionId ? (
          <>
            {/* Terminal - Full Width */}
            <div className={`flex-1 flex flex-col bg-gray-950 ${showFileBrowser ? 'border-r border-gray-800' : ''}`}>
              {/* Terminal Header Bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    {activeSession?.title}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {activeSession?.workspace_dir}
                </div>
              </div>

              {/* Terminal Component - Full Height */}
              <div className="flex-1 overflow-hidden">
                <CCResearchTerminal
                  key={activeSessionId}
                  sessionId={activeSessionId}
                  onResize={handleResize}
                  onStatusChange={setTerminalConnected}
                />
              </div>
            </div>

            {/* File Browser Panel */}
            {showFileBrowser && activeSession && (
              <div className="w-80 h-full flex-shrink-0 bg-gray-900/50 overflow-hidden flex flex-col">
                <FileBrowser
                  sessionId={activeSessionId}
                  workspaceDir={activeSession.workspace_dir}
                />
              </div>
            )}
          </>
        ) : (
          /* Landing Page - 2 Column Layout */
          <div className="flex-1 flex bg-gray-950 overflow-hidden">
            {/* Left Column - Hero, Quick Start, Video */}
            <div className="w-1/2 h-full overflow-y-auto border-r border-gray-800 p-6">
              {/* Hero Section */}
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Microscope className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">CCResearch Terminal</h1>
                    <p className="text-sm text-gray-400">Claude Code Research Platform + 140 Scientific Tools</p>
                  </div>
                </div>

                <button
                  onClick={openNewSessionModal}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 rounded-xl transition-all font-semibold text-lg shadow-lg shadow-blue-500/25"
                >
                  {isCreating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  Create New Session
                </button>
              </div>

              {/* Quick Features */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">28 Databases</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <FlaskConical className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">23 Bio/Chem Tools</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">18 ML Libraries</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400">Sandboxed Sessions</span>
                </div>
              </div>

              {/* Getting Started */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <span>📋</span> Quick Start Guide
                </h3>
                <ol className="space-y-2 text-xs text-gray-400">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">1</span>
                    <span><strong className="text-gray-300">Theme:</strong> Press Enter for default</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">2</span>
                    <span><strong className="text-gray-300">Auth:</strong> Click login URL or paste code</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">3</span>
                    <span><strong className="text-gray-300">Setup:</strong> Press Enter through prompts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600/20 text-green-400 text-[10px] flex items-center justify-center font-bold">4</span>
                    <span><strong className="text-gray-300">Research:</strong> Ask Claude anything!</span>
                  </li>
                </ol>
              </div>

              {/* MCP Video */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-400" />
                  Learn About MCP
                </h3>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                  <video
                    controls
                    className="w-full aspect-video object-contain bg-black"
                    preload="metadata"
                  >
                    <source src="/mcp-protocol-video.mp4" type="video/mp4" />
                  </video>
                  <div className="p-3 border-t border-gray-800">
                    <p className="text-xs text-gray-400">
                      <strong className="text-gray-300">MCP & Claude Skills Explained</strong> - How MCP protocol and skills extend Claude's capabilities with security guardrails.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Capabilities */}
            <div className="w-1/2 h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  Available Capabilities
                </h2>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">v{capabilities?.version || '2.17.0'}</span>
              </div>

              {/* Plugins Status - Compact */}
              {capabilities && (
                <div className="mb-4 p-3 bg-gradient-to-r from-gray-900/80 to-gray-800/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-300">Active Plugins</span>
                    <span className="text-xs text-green-400 font-medium">{capabilities.plugins.summary.active}/{capabilities.plugins.summary.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.plugins.installed.map(plugin => (
                      <span key={plugin.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800/80 rounded-md text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${plugin.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <span className="text-gray-300">{plugin.name}</span>
                        {plugin.skills_count && <span className="text-gray-500">({plugin.skills_count})</span>}
                        {plugin.mcp_required && <span className="text-purple-400">MCP</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* MCP Server Status - Active */}
              <div className="mb-4 p-2 bg-purple-900/20 rounded-lg border border-purple-700/30 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Active MCP:</span>
                {capabilities?.mcp_servers.active.map(mcp => (
                  <span key={mcp.name} className="inline-flex items-center gap-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-purple-300 font-medium">{mcp.name}</span>
                  </span>
                ))}
                <span className="text-[10px] text-gray-500 ml-auto">{capabilities?.mcp_servers.summary.running} active, {(capabilities?.mcp_servers.summary.available_local || 0) + (capabilities?.mcp_servers.summary.available_remote || 0)} available</span>
              </div>

              {/* API Keys Status */}
              {capabilities?.api_keys && (
                <div className="mb-4 p-2 bg-green-900/20 rounded-lg border border-green-700/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Key className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-gray-400">API Keys:</span>
                    {capabilities.api_keys.configured.map(key => (
                      <span key={key} className="text-[10px] text-green-300 bg-green-900/40 px-1.5 py-0.5 rounded">{key.replace('_API_KEY', '').replace('_', ' ')}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span>Recommended:</span>
                    {capabilities.api_keys.recommended.slice(0, 2).map(r => (
                      <span key={r.name} className="text-yellow-500/70">{r.name.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capability Categories - Compact Accordions */}
              <div className="space-y-2">
                {/* Available MCP Servers */}
                <div className="bg-gray-900/50 border border-purple-800/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, mcp_servers: !prev.mcp_servers }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-200">Available MCP Servers</span>
                      <span className="text-[10px] text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded">{(capabilities?.mcp_servers.summary.available_local || 0) + (capabilities?.mcp_servers.summary.available_remote || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">ready to add</span>
                      {expandedSections.mcp_servers ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.mcp_servers && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Local (stdio)</p>
                          <div className="grid grid-cols-2 gap-1">
                            {capabilities.mcp_servers.available_local?.map(mcp => (
                              <span key={mcp.name} className="flex items-center gap-1 text-[11px]">
                                <span className={`w-1 h-1 rounded-full ${mcp.maintained ? 'bg-blue-400' : 'bg-gray-500'}`} />
                                <span className="text-gray-300">{mcp.name}</span>
                                {mcp.auth_required && <Key className="w-2.5 h-2.5 text-yellow-500" />}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Remote (OAuth)</p>
                          <div className="grid grid-cols-3 gap-1">
                            {capabilities.mcp_servers.available_remote?.map(mcp => (
                              <span key={mcp.name} className="flex items-center gap-1 text-[11px]">
                                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                                <span className="text-gray-300">{mcp.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Available Skills */}
                <div className="bg-gray-900/50 border border-cyan-800/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, available_skills: !prev.available_skills }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-gray-200">Anthropic Skills</span>
                      <span className="text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">{capabilities?.available_skills?.summary.total || 16}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{capabilities?.available_skills?.summary.installed || 1} installed</span>
                      {expandedSections.available_skills ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.available_skills && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {capabilities.available_skills?.skills.map(skill => (
                          <span key={skill.name} className="flex items-center gap-1 text-[11px]">
                            <span className={`w-1 h-1 rounded-full ${skill.status === 'installed' ? 'bg-green-400' : 'bg-gray-500'}`} />
                            <span className={skill.status === 'installed' ? 'text-green-300' : 'text-gray-400'}>{skill.name}</span>
                            <span className="text-[9px] text-gray-600">({skill.category})</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">Install: /plugin install document-skills@anthropic-agent-skills</p>
                    </div>
                  )}
                </div>
                {/* Databases */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, databases: !prev.databases }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-200">Scientific Databases</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{capabilities?.scientific_skills.categories.databases?.count || 28}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.databases ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.databases && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-400">
                        {capabilities.scientific_skills.categories.databases?.skills.slice(0, 16).map(skill => (
                          <span key={skill.name} className="flex items-center gap-1 truncate">
                            <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                            {skill.description}
                          </span>
                        ))}
                      </div>
                      {(capabilities.scientific_skills.categories.databases?.count || 0) > 16 && (
                        <p className="text-[10px] text-gray-600 mt-2">+ {(capabilities.scientific_skills.categories.databases?.count || 0) - 16} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bioinformatics */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, bioinformatics: !prev.bioinformatics }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-gray-200">Bio & Cheminformatics</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{(capabilities?.scientific_skills.categories.bioinformatics?.count || 15) + (capabilities?.scientific_skills.categories.cheminformatics?.count || 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.bioinformatics ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.bioinformatics && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px]"><span className="text-blue-400">Bio:</span> <span className="text-gray-400">{capabilities.scientific_skills.categories.bioinformatics?.skills.slice(0, 5).map(s => s.name).join(', ')}</span></p>
                        <p className="text-[11px]"><span className="text-green-400">Chem:</span> <span className="text-gray-400">{capabilities.scientific_skills.categories.cheminformatics?.skills.slice(0, 5).map(s => s.name).join(', ')}</span></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ML & Data Science */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, ml: !prev.ml }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-200">ML & Data Science</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{capabilities?.scientific_skills.categories.data_science_ml?.count || 18}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.ml ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.ml && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] text-gray-400">
                        {capabilities.scientific_skills.categories.data_science_ml?.skills.map(skill => (
                          <span key={skill.name} className="truncate">{skill.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, documents: !prev.documents }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-gray-200">Document Generation</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{capabilities?.scientific_skills.categories.document_generation?.count || 11}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.documents ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.documents && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-400">
                        {capabilities.scientific_skills.categories.document_generation?.skills.map(skill => (
                          <span key={skill.name}>{skill.description}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Workflows */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, workflows: !prev.workflows }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-200">Research Workflows</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{capabilities?.scientific_skills.categories.research_workflows?.count || 10}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.workflows ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.workflows && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-400">
                        {capabilities.scientific_skills.categories.research_workflows?.skills.map(skill => (
                          <span key={skill.name}>{skill.description}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lab Integrations */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, integrations: !prev.integrations }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Plug className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-gray-200">Lab Integrations</span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{capabilities?.scientific_skills.categories.lab_integrations?.count || 9}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.integrations ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.integrations && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-400">
                        {capabilities.scientific_skills.categories.lab_integrations?.skills.map(skill => (
                          <span key={skill.name}>{skill.description}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Security */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, security: !prev.security }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-gray-200">Security & Isolation</span>
                      <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">{capabilities?.security.sandbox_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {expandedSections.security ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedSections.security && capabilities && (
                    <div className="px-3 pb-3 border-t border-gray-800">
                      <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                        {capabilities.security.isolation_features.map((feature, idx) => (
                          <p key={idx} className="flex items-center gap-1.5">
                            <span className="text-green-400">✓</span>
                            {feature}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Skills Summary */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-700/30 text-center">
                <p className="text-2xl font-bold text-white">{capabilities?.scientific_skills.total || 140}+</p>
                <p className="text-xs text-gray-400">Scientific Skills Ready</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/50 px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Powered by Claude Code Research Platform + Scientific Skills MCP</span>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>For research purposes only</span>
          </div>
        </div>
      </div>

      {/* Save Project Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[500px] shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-green-400" />
              Save Project to SSD
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Save this session as a permanent project. Add context below so Claude knows what you were working on when you restore later.
            </p>
            <input
              type="text"
              value={saveProjectName}
              onChange={(e) => setSaveProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 mb-3"
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Session Context <span className="text-yellow-500">(paste this in Claude Code before saving)</span>
              </label>
              <textarea
                value={saveProjectContext}
                onChange={(e) => setSaveProjectContext(e.target.value)}
                placeholder="Describe what you were working on, your goals, current progress, and next steps...

Example:
- Goal: Analyzing CRISPR gene therapy papers for cancer treatment
- Progress: Found 15 relevant papers, extracted key findings
- Next steps: Compare efficacy data across studies, create summary table
- Notes: Focus on CAR-T cell therapy approaches"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 h-40 resize-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This context will be added to CLAUDE.md so Claude can resume your work seamlessly.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveProjectName('');
                  setSaveProjectContext('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProject}
                disabled={!saveProjectName.trim() || isSaving}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal with Email and File Upload */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <SquarePlus className="w-6 h-6 text-blue-400" />
                    Create New Research Session
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Claude Code Research Platform</p>
                </div>
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={newSessionEmail}
                  onChange={(e) => {
                    setNewSessionEmail(e.target.value);
                    setEmailError('');
                  }}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    emailError ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-400">{emailError}</p>
                )}
              </div>

              {/* Session Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session Title (optional)
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="e.g., CRISPR Gene Analysis"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Data Files (optional)
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FolderOpen className="w-10 h-10 mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-300">Click to upload files</p>
                    <p className="text-xs text-gray-500 mt-1">CSV, Excel, PDF, images, or any data files</p>
                  </label>
                </div>

                {/* Selected Files */}
                {newSessionFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newSessionFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Start Guide */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-yellow-400" />
                  Quick Start Guide
                </h3>
                <ol className="text-xs text-gray-400 space-y-2">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">1</span>
                    <span><strong className="text-gray-300">Wait:</strong> Claude Code will start automatically</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">2</span>
                    <span><strong className="text-gray-300">Auth:</strong> Click login URL or paste code</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">3</span>
                    <span><strong className="text-gray-300">Setup:</strong> Press Enter through prompts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600/20 text-green-400 text-[10px] flex items-center justify-center font-bold">4</span>
                    <span><strong className="text-gray-300">Research:</strong> Ask Claude anything!</span>
                  </li>
                </ol>
                {newSessionFiles.length > 0 && (
                  <div className="mt-3 p-2 bg-green-900/30 border border-green-700/50 rounded-lg">
                    <p className="text-xs text-green-400">
                      <strong>Tip:</strong> Your {newSessionFiles.length} uploaded file(s) will be available in the <code className="bg-gray-800 px-1 rounded">data/</code> directory.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={isCreating}
                className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <TerminalIcon className="w-4 h-4" />
                    Create Session
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
