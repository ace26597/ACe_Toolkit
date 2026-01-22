"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Activity,
  Home,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronRight,
  FolderArchive,
  FolderOpen,
  ArrowLeft,
  Pencil,
  Power,
  SquarePlus,
  Database,
  FlaskConical,
  FileText,
  Plug,
  Cpu,
  BarChart3,
  Microscope,
  BookOpen,
  Play,
  Server,
  Globe,
  Key,
  Sparkles,
  Shield,
  X,
  Upload,
  Folder,
  Archive,
  Github,
  GitBranch,
  Share2,
  Link2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import { ProtectedRoute, useAuth } from '@/components/auth';

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
  session_number: number;
  title: string;
  workspace_dir: string;
  workspace_project?: string;  // Linked Workspace project name
  status: 'created' | 'active' | 'disconnected' | 'terminated' | 'error';
  terminal_rows: number;
  terminal_cols: number;
  commands_executed: number;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  uploaded_files?: string[];
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
    available_remote: Array<{ name: string; description: string; auth_method: string; status?: string }>;
    summary: { running: number; available_local: number; available_remote: number };
  };
  available_skills: {
    source?: string;
    skills: Array<{ name: string; description: string; category: string; status: string }>;
    summary: { total: number; installed: number };
  };
  agents?: {
    installed: Array<{ name: string; description: string; status: string }>;
    summary: { total: number; active: number };
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

// Dynamic API URL - works with multiple domains
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side - use env var
    return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Map frontend domains to API domains
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk') {
    return `${protocol}//api.orpheuscore.uk`;
  }
  if (hostname === 'ai.ultronsolar.in') {
    return `${protocol}//api.ultronsolar.in`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Fallback: try api subdomain of current host
  return `${protocol}//api.${hostname}`;
};

// API URL - evaluated lazily on client
const API_URL = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

const ccresearchApi = {
  createSession: async (
    browserSessionId: string,
    email?: string,
    accessKey?: string,
    title?: string,
    files?: File[]
  ): Promise<CCResearchSession> => {
    const formData = new FormData();
    formData.append('session_id', browserSessionId);
    if (email) formData.append('email', email);
    if (accessKey) formData.append('access_key', accessKey);
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

  uploadFiles: async (
    ccresearchId: string,
    files: File[],
    targetPath?: string,
    extractZip: boolean = true
  ): Promise<{ uploaded_files: string[]; data_dir: string }> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (targetPath) formData.append('target_path', targetPath);
    formData.append('extract_zip', extractZip.toString());

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

  cloneRepo: async (
    ccresearchId: string,
    repoUrl: string,
    targetPath?: string,
    branch?: string
  ): Promise<{ success: boolean; repo_name: string; clone_path: string; message: string }> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/clone-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, target_path: targetPath, branch }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to clone repository' }));
      throw new Error(error.detail || 'Failed to clone repository');
    }
    return res.json();
  },

  listSessions: async (browserSessionId: string): Promise<CCResearchSession[]> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${browserSessionId}`);
    if (!res.ok) throw new Error('Failed to list sessions');
    return res.json();
  },

  listSessionsByEmail: async (email: string): Promise<CCResearchSession[]> => {
    if (!email) return [];
    const res = await fetch(`${API_URL}/ccresearch/sessions/by-email?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to list sessions');
    return res.json();
  },

  deleteSession: async (ccresearchId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  terminateSession: async (ccresearchId: string): Promise<void> => {
    // Terminate the sandbox process without deleting workspace
    await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/terminate`, {
      method: 'POST',
    });
    // Don't throw on errors - this is a cleanup operation
  },

  resizeTerminal: async (ccresearchId: string, rows: number, cols: number): Promise<void> => {
    await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, cols }),
    });
  },

  renameSession: async (ccresearchId: string, title: string): Promise<{ old_title: string; new_title: string }> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to rename session');
    return res.json();
  },

  downloadWorkspaceZip: (ccresearchId: string): void => {
    window.open(`${API_URL}/ccresearch/sessions/${ccresearchId}/download-zip`, '_blank');
  },

  // Request access to CCResearch
  requestAccess: async (email: string, name: string, reason: string): Promise<{ status: string; message: string }> => {
    const res = await fetch(`${API_URL}/ccresearch/requests/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, reason }),
    });
    return res.json();
  },

  // Request a plugin or skill
  requestPluginOrSkill: async (
    email: string,
    requestType: 'plugin' | 'skill',
    name: string,
    description: string,
    useCase: string
  ): Promise<{ status: string; message: string }> => {
    const res = await fetch(`${API_URL}/ccresearch/requests/plugin-skill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        request_type: requestType,
        name,
        description,
        use_case: useCase,
      }),
    });
    return res.json();
  },

  // Share session
  createShareLink: async (ccresearchId: string): Promise<{
    share_token: string;
    share_url: string;
    shared_at: string;
  }> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/share`, {
      method: 'POST',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create share link' }));
      throw new Error(error.detail || 'Failed to create share link');
    }
    return res.json();
  },

  revokeShareLink: async (ccresearchId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/share`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to revoke share link' }));
      throw new Error(error.detail || 'Failed to revoke share link');
    }
  },

  getShareStatus: async (ccresearchId: string): Promise<{
    is_shared: boolean;
    share_token?: string;
    share_url?: string;
    shared_at?: string;
  }> => {
    const res = await fetch(`${API_URL}/ccresearch/sessions/${ccresearchId}/share-status`);
    if (!res.ok) return { is_shared: false };
    return res.json();
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

function CCResearchPageContent() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<CCResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialSessionLoaded, setInitialSessionLoaded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [browserSessionId, setBrowserSessionId] = useState('');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [capabilities, setCapabilities] = useState<CapabilitiesData | null>(null);

  // File browser resize state - default much larger width for visibility
  const [fileBrowserWidth, setFileBrowserWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  // New session creation state
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionAccessKey, setNewSessionAccessKey] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionFiles, setNewSessionFiles] = useState<File[]>([]);
  const [accessKeyError, setAccessKeyError] = useState('');
  const [uploadMode, setUploadMode] = useState<'files' | 'directory'>('files');
  const [newSessionGithubUrl, setNewSessionGithubUrl] = useState('');
  const [newSessionGithubBranch, setNewSessionGithubBranch] = useState('');
  // User email for session filtering - persists across page loads
  const [userEmail, setUserEmail] = useState('');
  // Request plugin/skill state
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  // Request plugin/skill state
  const [showRequestPluginSkillForm, setShowRequestPluginSkillForm] = useState(false);
  const [requestType, setRequestType] = useState<'plugin' | 'skill'>('skill');
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestUseCase, setRequestUseCase] = useState('');

  // Share session state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Initialize browser session ID and use logged-in user's email
  useEffect(() => {
    setBrowserSessionId(generateSessionId());
    // Use logged-in user's email for session filtering
    if (user?.email) {
      setUserEmail(user.email);
      localStorage.setItem('ccresearch_email', user.email);
    }
    // Load saved access key from localStorage (still needed for direct terminal access)
    const savedAccessKey = localStorage.getItem('ccresearch_access_key');
    if (savedAccessKey) {
      setNewSessionAccessKey(savedAccessKey);
    }
  }, [user]);

  // Load capabilities data (embedded for reliability)
  useEffect(() => {
    // Embedded capabilities data for production reliability
    const capabilitiesData: CapabilitiesData = {
      version: "2.19.0",
      plugins: {
        installed: [
          { id: "scientific-skills@claude-scientific-skills", name: "K-Dense Scientific Skills", version: "955a36ac82d8", status: "active", skills_count: 140, description: "140 scientific research skills" },
          { id: "context7@claude-plugins-official", name: "Context7", version: "f70b65538da0", status: "active", mcp_required: true, description: "Documentation lookup via MCP" },
          { id: "frontend-design@claude-plugins-official", name: "Frontend Design", version: "f70b65538da0", status: "active", description: "Frontend interface generation" },
          { id: "code-simplifier@claude-plugins-official", name: "Code Simplifier", version: "1.0.0", status: "active", description: "Code clarity refinement" },
          { id: "plugin-dev@claude-plugins-official", name: "Plugin Dev", version: "f70b65538da0", status: "active", description: "Plugin development tools" },
          { id: "document-skills@anthropic-agent-skills", name: "Document Skills", version: "69c0b1a06741", status: "active", description: "Document generation (PDF, DOCX, PPTX, XLSX)" },
          { id: "agent-sdk-dev@claude-code-plugins", name: "Agent SDK Dev", version: "1.0.0", status: "active", description: "Agent SDK development tools" },
          { id: "feature-dev@claude-plugins-official", name: "Feature Dev", version: "f70b65538da0", status: "active", description: "Guided feature development workflow" },
          { id: "ralph-loop@claude-plugins-official", name: "Ralph Loop", version: "f70b65538da0", status: "active", description: "Iterative refinement workflow" },
          { id: "huggingface-skills@claude-plugins-official", name: "HuggingFace Skills", version: "f70b65538da0", status: "active", description: "HuggingFace model integration" },
          { id: "ai@claude-skills", name: "AI Skills", version: "1.0.0", status: "active", description: "AI/ML development utilities" },
          { id: "backend@claude-skills", name: "Backend Skills", version: "1.0.0", status: "active", description: "Backend development patterns" },
          { id: "aact-clinical-trials@local", name: "AACT Clinical Trials", version: "1.0.0", status: "active", description: "Query AACT database (566K+ studies)" }
        ],
        summary: { total: 14, active: 14, with_mcp: 1 }
      },
      mcp_servers: {
        active: [
          // Medical/Clinical MCP Servers (10)
          { name: "pubmed", status: "running", description: "Biomedical literature search", tools: ["search_articles", "get_article_metadata", "find_related_articles"] },
          { name: "biorxiv", status: "running", description: "bioRxiv/medRxiv preprints", tools: ["search_preprints", "get_preprint", "get_categories"] },
          { name: "chembl", status: "running", description: "Bioactive compounds & drug data", tools: ["compound_search", "get_bioactivity", "target_search", "get_mechanism"] },
          { name: "clinical-trials", status: "running", description: "ClinicalTrials.gov API v2", tools: ["search_trials", "get_trial_details", "search_investigators"] },
          { name: "aact", status: "running", description: "AACT Clinical Trials DB (566K+)", tools: ["list_tables", "describe_table", "read_query"] },
          { name: "cms-coverage", status: "running", description: "Medicare Coverage (NCDs/LCDs)", tools: ["search_national_coverage", "search_local_coverage", "get_coverage_document"] },
          { name: "npi-registry", status: "running", description: "NPI Provider Lookup", tools: ["npi_validate", "npi_lookup", "npi_search"] },
          { name: "icd-10-codes", status: "running", description: "ICD-10-CM/PCS codes (2026)", tools: ["lookup_code", "search_codes", "validate_code", "get_hierarchy"] },
          { name: "medidata", status: "running", description: "Clinical trial data platform", tools: ["query_trials", "get_study_data"] },
          { name: "open-targets", status: "running", description: "Drug target platform", tools: ["search_targets", "get_associations"] },
          // Research/Data MCP Servers (4)
          { name: "scholar-gateway", status: "running", description: "Semantic literature search", tools: ["semanticSearch"] },
          { name: "hugging-face", status: "running", description: "HuggingFace models/datasets", tools: ["model_search", "dataset_search", "paper_search"] },
          { name: "hf-mcp-server", status: "running", description: "HuggingFace Hub login", tools: ["use_space", "get_model_info"] },
          { name: "MotherDuck", status: "running", description: "Cloud DuckDB analytics", tools: ["run_query", "list_databases"] },
          // Core Tools MCP Servers (8)
          { name: "memory", status: "running", description: "Knowledge graph persistence", tools: ["create_entities", "create_relations", "read_graph", "search_nodes"] },
          { name: "filesystem", status: "running", description: "Secure file operations", tools: ["read_file", "write_file", "list_directory", "search_files"] },
          { name: "git", status: "running", description: "Git repository operations", tools: ["git_status", "git_diff", "git_commit", "git_log"] },
          { name: "sqlite", status: "running", description: "SQLite database operations", tools: ["read_query", "write_query", "list_tables", "describe_table"] },
          { name: "playwright", status: "running", description: "Browser automation", tools: ["browser_navigate", "browser_snapshot", "browser_click", "browser_screenshot"] },
          { name: "fetch", status: "running", description: "Web content fetching", tools: ["fetch"] },
          { name: "time", status: "running", description: "Time/timezone utilities", tools: ["get_current_time", "convert_time"] },
          { name: "sequential-thinking", status: "running", description: "Dynamic problem-solving", tools: ["sequentialthinking"] },
          // Utilities MCP Servers (4)
          { name: "cloudflare", status: "running", description: "Cloudflare services", tools: ["manage_dns", "get_analytics"] },
          { name: "bitly", status: "running", description: "URL shortening", tools: ["shorten_url", "get_clicks"] },
          { name: "lunarcrush", status: "running", description: "Crypto social analytics", tools: ["get_coin_data", "search_assets"] },
          { name: "mercury", status: "running", description: "Banking API", tools: ["get_accounts", "get_transactions"] }
        ],
        available_local: [],
        available_remote: [],
        summary: { running: 26, available_local: 0, available_remote: 0 }
      },
      available_skills: {
        source: "https://github.com/anthropics/skills",
        skills: [
          // Custom installed skills
          { name: "code-review", description: "Comprehensive code quality check and linting", category: "custom", status: "installed" },
          { name: "update-docs", description: "Quick documentation refresh for CLAUDE.md/README", category: "custom", status: "installed" },
          { name: "aact-clinical-trials", description: "Query AACT Clinical Trials database (566K+ studies)", category: "scientific", status: "installed" },
          // Document processing skills (newly installed)
          { name: "pdf-processing-pro", description: "Production PDF: forms, tables, OCR, validation, batch ops", category: "documents", status: "installed" },
          { name: "xlsx", description: "Excel spreadsheet creation, editing, formulas, charts", category: "documents", status: "installed" },
          { name: "docx", description: "Word documents with tracked changes, comments, formatting", category: "documents", status: "installed" },
          // Scientific skills (newly installed)
          { name: "exploratory-data-analysis", description: "EDA on 200+ scientific file formats with reports", category: "scientific", status: "installed" },
          { name: "plotly", description: "Interactive charts, plots, dashboards (Express + Graph Objects)", category: "scientific", status: "installed" },
          // Development skills
          { name: "frontend-design", description: "Frontend UI/UX design", category: "development", status: "installed" },
          { name: "feature-dev", description: "Guided feature development workflow", category: "development", status: "installed" },
          { name: "create-plugin", description: "End-to-end plugin creation", category: "development", status: "installed" },
          { name: "new-sdk-app", description: "Create Agent SDK applications", category: "development", status: "installed" },
          { name: "markitdown", description: "Convert files to Markdown", category: "documents", status: "installed" },
          { name: "pdf", description: "PDF generation and manipulation", category: "documents", status: "installed" },
          { name: "pptx", description: "PowerPoint presentation creation", category: "documents", status: "installed" },
          // Available skills (not yet installed)
          { name: "algorithmic-art", description: "Create algorithmic and generative art", category: "creative", status: "available" },
          { name: "brand-guidelines", description: "Brand identity and design guidelines", category: "enterprise", status: "available" },
          { name: "canvas-design", description: "Canvas-based visual design", category: "creative", status: "available" },
          { name: "doc-coauthoring", description: "Collaborative document authoring", category: "enterprise", status: "available" },
          { name: "internal-comms", description: "Internal communications tools", category: "enterprise", status: "available" },
          { name: "mcp-builder", description: "MCP server builder", category: "development", status: "available" },
          { name: "skill-creator", description: "Create and test new skills", category: "development", status: "available" },
          { name: "slack-gif-creator", description: "GIF creation for Slack", category: "creative", status: "available" },
          { name: "theme-factory", description: "Theme generation and customization", category: "creative", status: "available" },
          { name: "web-artifacts-builder", description: "Web artifact creation", category: "development", status: "available" },
          { name: "webapp-testing", description: "Web application testing", category: "development", status: "available" }
        ],
        summary: { total: 26, installed: 15 }
      },
      agents: {
        installed: [
          { name: "prompt-engineer", description: "AI specialist for prompt engineering and optimization", status: "active" }
        ],
        summary: { total: 1, active: 1 }
      },
      scientific_skills: {
        total: 145,
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
            { name: "clinvar-database", description: "Genetic variants", status: "working" },
            { name: "cosmic-database", description: "Cancer mutations", status: "working" },
            { name: "gwas-database", description: "GWAS catalog", status: "working" },
            { name: "opentargets-database", description: "Target-disease links", status: "working" },
            { name: "ensembl-database", description: "Genome annotation", status: "working" },
            { name: "pubchem-database", description: "Chemical compounds", status: "working" },
            { name: "aact-database", description: "Clinical trials (566K+)", status: "working" }
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
          data_science_ml: { count: 20, status: "all_working", skills: [
            { name: "polars", description: "Fast DataFrames", status: "working" },
            { name: "scikit-learn", description: "Machine learning", status: "working" },
            { name: "pytorch-lightning", description: "PyTorch training", status: "working" },
            { name: "transformers", description: "Hugging Face", status: "working" },
            { name: "shap", description: "Model interpretability", status: "working" },
            { name: "statsmodels", description: "Statistical models", status: "working" },
            { name: "pymc", description: "Probabilistic programming", status: "working" },
            { name: "networkx", description: "Network analysis", status: "working" },
            { name: "esm", description: "Protein LLMs", status: "working" },
            { name: "plotly", description: "Interactive charts", status: "working" },
            { name: "exploratory-data-analysis", description: "EDA 200+ formats", status: "working" }
          ]},
          document_generation: { count: 14, status: "all_working", skills: [
            { name: "generate-image", description: "AI image generation", status: "working" },
            { name: "latex-posters", description: "LaTeX posters", status: "working" },
            { name: "scientific-slides", description: "Presentations", status: "working" },
            { name: "clinical-reports", description: "Clinical reports", status: "working" },
            { name: "markitdown", description: "File to Markdown", status: "working" },
            { name: "scientific-writing", description: "Manuscript writing", status: "working" },
            { name: "pdf-processing-pro", description: "PDF forms, OCR, tables", status: "working" },
            { name: "xlsx", description: "Excel spreadsheets", status: "working" },
            { name: "docx", description: "Word documents", status: "working" }
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

  // Load sessions on mount and periodically - filter by user email
  const loadSessions = useCallback(async () => {
    if (!userEmail) {
      // No email set yet - don't load sessions (user needs to create one first)
      setIsLoading(false);
      return;
    }
    try {
      const data = await ccresearchApi.listSessionsByEmail(userEmail);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Handle session query parameter (from Workspace redirect)
  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam && !initialSessionLoaded && !isLoading) {
      // Check if this session exists in our list
      const sessionExists = sessions.some(s => s.id === sessionParam);
      if (sessionExists) {
        setActiveSessionId(sessionParam);
        setInitialSessionLoaded(true);
      } else if (sessions.length > 0) {
        // Sessions loaded but param session not found - might need to fetch it
        // Try setting it anyway - the terminal component will handle errors
        setActiveSessionId(sessionParam);
        setInitialSessionLoaded(true);
      }
    }
  }, [searchParams, initialSessionLoaded, isLoading, sessions]);

  // Check share status when active session changes
  const checkShareStatus = useCallback(async (sessionId: string) => {
    try {
      const status = await ccresearchApi.getShareStatus(sessionId);
      setIsShared(status.is_shared);
      if (status.is_shared && status.share_url) {
        setShareUrl(status.share_url);
        setShareToken(status.share_token || '');
      } else {
        setShareUrl('');
        setShareToken('');
      }
    } catch (error) {
      console.error('Failed to check share status:', error);
      setIsShared(false);
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      checkShareStatus(activeSessionId);
    } else {
      setIsShared(false);
      setShareUrl('');
      setShareToken('');
    }
  }, [activeSessionId, checkShareStatus]);

  // Create or get share link
  const handleCreateShare = async () => {
    if (!activeSessionId) return;
    setIsCreatingShare(true);
    try {
      const result = await ccresearchApi.createShareLink(activeSessionId);
      setShareUrl(result.share_url);
      setShareToken(result.share_token);
      setIsShared(true);
      showToast({ message: 'Share link created', type: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to create share link',
        type: 'error'
      });
    } finally {
      setIsCreatingShare(false);
    }
  };

  // Revoke share link
  const handleRevokeShare = async () => {
    if (!activeSessionId) return;
    try {
      await ccresearchApi.revokeShareLink(activeSessionId);
      setIsShared(false);
      setShareUrl('');
      setShareToken('');
      setShowShareModal(false);
      showToast({ message: 'Share link revoked', type: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to revoke share link',
        type: 'error'
      });
    }
  };

  // Copy share URL to clipboard
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (error) {
      showToast({ message: 'Failed to copy to clipboard', type: 'error' });
    }
  };

  // Close dropdown when clicking outside - with delay to prevent immediate close
  useEffect(() => {
    if (!showSessionDropdown) return;

    // Small delay to prevent the opening click from immediately closing
    const timeoutId = setTimeout(() => {
      const handleClick = (e: MouseEvent) => {
        // Check if click is inside dropdown
        const dropdown = document.getElementById('session-dropdown');
        if (dropdown && dropdown.contains(e.target as Node)) {
          return; // Don't close if clicking inside dropdown
        }
        setShowSessionDropdown(false);
      };
      document.addEventListener('click', handleClick);
      // Store handler reference for cleanup
      (window as unknown as Record<string, (e: MouseEvent) => void>).__dropdownHandler = handleClick;
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      const handler = (window as unknown as Record<string, (e: MouseEvent) => void>).__dropdownHandler;
      if (handler) {
        document.removeEventListener('click', handler);
        delete (window as unknown as Record<string, (e: MouseEvent) => void>).__dropdownHandler;
      }
    };
  }, [showSessionDropdown]);

  // Auto-open files bar when terminal connects
  useEffect(() => {
    if (terminalConnected && activeSessionId) {
      setShowFileBrowser(true);
    }
  }, [terminalConnected, activeSessionId]);

  // Cleanup active session when tab/window is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send delete request for active session (fire and forget)
      if (activeSessionId) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(`${getApiUrl()}/ccresearch/sessions/${activeSessionId}/terminate`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeSessionId]);

  // Open new session modal
  const openNewSessionModal = () => {
    setNewSessionTitle('');
    setNewSessionFiles([]);
    setAccessKeyError('');
    setShowNewSessionModal(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    // For directory uploads, the webkitRelativePath contains the path
    const files = Array.from(fileList);
    setNewSessionFiles(prev => [...prev, ...files]);

    // Reset file input for subsequent uploads
    e.target.value = '';
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setNewSessionFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Create session with user's email, optional access key, and optional files
  const createSession = async () => {
    if (!browserSessionId) return;

    // Use logged-in user's email
    const userEmail = user?.email;
    if (!userEmail) {
      showToast({ message: 'Please log in to create a session', type: 'error' });
      return;
    }

    const hasAccessKey = newSessionAccessKey.trim().length > 0;
    const hasGithubUrl = newSessionGithubUrl.trim().length > 0;

    // Access key is optional - if provided, grants direct terminal access

    setIsCreating(true);
    setAccessKeyError('');
    try {
      // Terminate current session if one is active (cleanup sandbox process)
      if (activeSessionId) {
        try {
          await ccresearchApi.terminateSession(activeSessionId);
        } catch {
          // Ignore termination errors - might already be terminated
        }
      }

      const session = await ccresearchApi.createSession(
        browserSessionId,
        userEmail,
        hasAccessKey ? newSessionAccessKey.trim() : undefined,
        newSessionTitle.trim() || undefined,
        newSessionFiles.length > 0 ? newSessionFiles : undefined
      );

      // Save email to localStorage and update user email state for session filtering
      const trimmedEmail = userEmail.toLowerCase();
      localStorage.setItem('ccresearch_email', trimmedEmail);
      setUserEmail(trimmedEmail);
      if (hasAccessKey) {
        localStorage.setItem('ccresearch_access_key', newSessionAccessKey.trim());
      }

      // Clone GitHub repo if URL provided
      let cloneMessage = '';
      if (hasGithubUrl) {
        try {
          const cloneResult = await ccresearchApi.cloneRepo(
            session.id,
            newSessionGithubUrl.trim(),
            'data',
            newSessionGithubBranch.trim() || undefined
          );
          cloneMessage = ` and cloned ${cloneResult.repo_name}`;
        } catch (cloneError) {
          showToast({
            message: `Session created, but repo clone failed: ${cloneError instanceof Error ? cloneError.message : 'Unknown error'}`,
            type: 'warning'
          });
        }
      }

      // Determine session type for message
      const sessionType = hasAccessKey ? 'Terminal' : 'Claude Code';

      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setShowNewSessionModal(false);
      setShowSessionDropdown(false);
      // Reset form
      setNewSessionGithubUrl('');
      setNewSessionGithubBranch('');
      showToast({
        message: `${sessionType} session created${newSessionFiles.length > 0 ? ` with ${newSessionFiles.length} file(s)` : ''}${cloneMessage}`,
        type: 'success'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';

      // Handle specific error codes
      if (errorMessage === 'wrong_access_key') {
        setAccessKeyError('Wrong access key. Try again or leave empty for Claude Code.');
        return;
      }

      showToast({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      // First terminate the sandbox process
      await ccresearchApi.terminateSession(sessionId);
      // Then delete the session record and workspace
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

  const startRenameSession = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const saveRenamedSession = async (sessionId: string, e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await ccresearchApi.renameSession(sessionId, editingTitle.trim());
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, title: editingTitle.trim() } : s
      ));
      showToast({ message: 'Session renamed', type: 'success' });
    } catch {
      showToast({ message: 'Failed to rename session', type: 'error' });
    }
    setEditingSessionId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  // Submit plugin/skill request
  const submitPluginSkillRequest = async () => {
    const userEmail = user?.email;
    if (!userEmail || !requestName.trim() || !requestDescription.trim() || !requestUseCase.trim()) {
      showToast({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const result = await ccresearchApi.requestPluginOrSkill(
        userEmail,
        requestType,
        requestName.trim(),
        requestDescription.trim(),
        requestUseCase.trim()
      );
      showToast({ message: result.message, type: 'success' });
      setShowRequestPluginSkillForm(false);
      setRequestName('');
      setRequestDescription('');
      setRequestUseCase('');
    } catch {
      showToast({ message: 'Failed to submit request', type: 'error' });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleResize = useCallback((rows: number, cols: number) => {
    if (activeSessionId) {
      ccresearchApi.resizeTerminal(activeSessionId, rows, cols).catch(console.error);
    }
  }, [activeSessionId]);

  // Handle automation notifications from terminal
  const handleAutomation = useCallback((notification: { description: string; action: string; value: string }) => {
    showToast({
      message: `Auto: ${notification.description}`,
      type: 'info',
      duration: 3000
    });
  }, [showToast]);

  // File browser resize handlers
  const handleFileBrowserResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // File browser upload handler
  const handleFileBrowserUpload = useCallback(async (files: File[], targetPath: string) => {
    if (!activeSessionId) return;

    await ccresearchApi.uploadFiles(activeSessionId, files, targetPath, true);
    showToast({ type: 'success', message: `Uploaded ${files.length} file(s)` });
  }, [activeSessionId, showToast]);

  // File browser clone repo handler
  const handleFileBrowserCloneRepo = useCallback(async (repoUrl: string, targetPath: string, branch?: string) => {
    if (!activeSessionId) return;

    const result = await ccresearchApi.cloneRepo(activeSessionId, repoUrl, targetPath, branch);
    showToast({ type: 'success', message: `Cloned ${result.repo_name}` });
  }, [activeSessionId, showToast]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const newWidth = containerWidth - e.clientX;
      // Min 350px, max 60% of viewport (more space for files)
      const maxWidth = Math.floor(containerWidth * 0.6);
      setFileBrowserWidth(Math.min(maxWidth, Math.max(350, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
      {/* Compact Header - Responsive */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back Button, Logo & Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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

              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-lg sm:text-xl">🔬</span>
                <span className="font-semibold text-sm sm:text-lg hidden xs:inline">CCResearch</span>
              </div>

              {/* Separator - hidden on very small screens */}
              <div className="w-px h-6 bg-gray-700 mx-1 sm:mx-2 hidden sm:block" />

              {/* Use Cases Link */}
              <Link
                href="/ccresearch/use-cases"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-purple-200 rounded-lg transition-colors text-xs sm:text-sm"
                title="Browse use cases and examples"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Use Cases</span>
              </Link>

              {/* Tips Link */}
              <Link
                href="/ccresearch/tips"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 hover:text-amber-200 rounded-lg transition-colors text-xs sm:text-sm"
                title="Prompting tips and best practices"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tips</span>
              </Link>

              {/* Quick Actions */}
              <button
                onClick={openNewSessionModal}
                disabled={isCreating}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg transition-colors text-xs sm:text-sm font-medium"
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
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs sm:text-sm"
                  title="Delete session"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">End</span>
                </button>
              )}
            </div>

            {/* Center: Session Selector */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center min-w-0">
              <div className="relative max-w-xs sm:max-w-sm w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSessionDropdown(!showSessionDropdown);
                  }}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors w-full"
                >
                  <TerminalIcon className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left text-sm truncate flex items-center gap-2">
                    {activeSession ? (
                      <>
                        <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded font-medium">
                          #{activeSession.session_number}
                        </span>
                        {activeSession.title}
                      </>
                    ) : 'Select Session'}
                  </span>
                  {activeSession && (
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activeSession.status)}`} />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Session Dropdown */}
                {showSessionDropdown && (
                  <div id="session-dropdown" className="absolute top-full left-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
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

                    {/* Sessions List with Date Grouping */}
                    <div className="max-h-80 overflow-y-auto">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="py-4 text-center text-gray-500 text-sm">
                          No sessions yet
                        </div>
                      ) : (
                        (() => {
                          // Group sessions by date
                          const grouped: Record<string, typeof sessions> = {};
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

                          return Object.entries(grouped).map(([dateLabel, dateSessions]) => (
                            <div key={dateLabel}>
                              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-800/50 sticky top-0">
                                {dateLabel}
                              </div>
                              {dateSessions.map(session => (
                                <div
                                  key={session.id}
                                  onClick={() => {
                                    if (editingSessionId !== session.id) {
                                      setActiveSessionId(session.id);
                                      setShowSessionDropdown(false);
                                    }
                                  }}
                                  className={`group flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors ${
                                    activeSessionId === session.id ? 'bg-gray-800' : ''
                                  }`}
                                >
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm truncate flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded font-medium">
                                        #{session.session_number}
                                      </span>
                                      {editingSessionId === session.id ? (
                                        <input
                                          type="text"
                                          value={editingTitle}
                                          onChange={(e) => setEditingTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveRenamedSession(session.id, e);
                                            if (e.key === 'Escape') setEditingSessionId(null);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          autoFocus
                                          className="flex-1 px-1 py-0.5 bg-gray-700 border border-blue-500 rounded text-white text-sm focus:outline-none"
                                        />
                                      ) : (
                                        <span className="truncate">{session.title}</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTimeAgo(session.created_at)}
                                    </div>
                                  </div>
                                  {editingSessionId === session.id ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={(e) => saveRenamedSession(session.id, e)}
                                        className="p-1 hover:bg-green-900/50 rounded transition-colors flex-shrink-0"
                                        title="Save"
                                      >
                                        <Check className="w-3.5 h-3.5 text-green-400" />
                                      </button>
                                      <button
                                        onClick={cancelRename}
                                        className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={(e) => startRenameSession(session.id, session.title, e)}
                                        className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Rename session"
                                      >
                                        <Pencil className="w-3 h-3 text-gray-400" />
                                      </button>
                                      <button
                                        onClick={(e) => deleteSession(session.id, e)}
                                        className="p-1 hover:bg-red-900/50 rounded transition-colors flex-shrink-0"
                                        title="Delete session"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {activeSession && (
                <>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                    <Activity className={`w-3.5 h-3.5 ${terminalConnected ? 'text-green-400' : 'text-gray-500'}`} />
                    <span className="hidden md:inline">{terminalConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-700 hidden sm:block" />
                  <button
                    onClick={() => ccresearchApi.downloadWorkspaceZip(activeSessionId!)}
                    className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2 sm:py-1 text-xs hover:bg-gray-700/50 rounded transition-colors text-gray-400 hover:text-blue-400"
                    title="Download workspace as ZIP"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">ZIP</span>
                  </button>
                  <button
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors ${
                      showFileBrowser ? 'bg-blue-600 text-white' : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                    title={showFileBrowser ? 'Hide files' : 'Show files'}
                  >
                    {showFileBrowser ? (
                      <PanelRightClose className="w-3.5 h-3.5" />
                    ) : (
                      <PanelRightOpen className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden md:inline">Files</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2 sm:py-1 text-xs rounded transition-colors ${
                      isShared ? 'bg-emerald-600 text-white' : 'hover:bg-gray-700/50 text-gray-400 hover:text-emerald-400'
                    }`}
                    title={isShared ? 'Session is shared - click to manage' : 'Share this session'}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{isShared ? 'Shared' : 'Share'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height Terminal */}
      <div className={`flex-1 flex overflow-hidden ${isResizing ? 'select-none' : ''}`}>
        {/* Resize overlay to prevent terminal interference */}
        {isResizing && (
          <div className="fixed inset-0 z-40 cursor-col-resize" />
        )}
        {activeSessionId ? (
          <>
            {/* Terminal - Takes remaining space after file browser */}
            <div className={`flex-1 min-w-0 flex flex-col bg-gray-950 ${showFileBrowser ? 'border-r border-gray-800' : ''}`}>
              {/* Terminal Header Bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex items-center gap-2">
                    {activeSession && (
                      <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 text-xs rounded font-medium">
                        #{activeSession.session_number}
                      </span>
                    )}
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
                  onAutomation={handleAutomation}
                />
              </div>
            </div>

            {/* File Browser Panel - Responsive: Overlay on mobile, side panel on desktop */}
            {showFileBrowser && activeSession && (
              <>
                {/* Mobile: Full screen overlay */}
                <div className="md:hidden fixed inset-0 z-50 bg-gray-950">
                  <div className="h-full flex flex-col">
                    {/* Mobile header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
                      <span className="font-medium text-white">Files</span>
                      <button
                        onClick={() => setShowFileBrowser(false)}
                        className="p-2 hover:bg-gray-700 rounded-lg"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <FileBrowser
                        sessionId={activeSessionId}
                        workspaceDir={activeSession.workspace_dir}
                        autoRefreshInterval={3000}
                        initialPath={activeSession.uploaded_files && activeSession.uploaded_files.length > 0 ? 'data' : ''}
                        onUpload={handleFileBrowserUpload}
                        onCloneRepo={handleFileBrowserCloneRepo}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop: Side panel with resize handle - enforced minimum width */}
                <div
                  className="hidden md:flex h-full"
                  style={{ width: fileBrowserWidth, minWidth: 350, flexShrink: 0 }}
                >
                  {/* Resize Handle */}
                  <div
                    className={`w-2 h-full cursor-col-resize hover:bg-blue-500 transition-colors flex-shrink-0 ${
                      isResizing ? 'bg-blue-500' : 'bg-gray-600 hover:bg-blue-400'
                    }`}
                    onMouseDown={handleFileBrowserResizeStart}
                    title="Drag to resize"
                  />
                  {/* File Browser Content */}
                  <div className="flex-1 h-full bg-gray-900 overflow-hidden flex flex-col border-l border-gray-700">
                    <FileBrowser
                      sessionId={activeSessionId}
                      workspaceDir={activeSession.workspace_dir}
                      autoRefreshInterval={3000}
                      initialPath={activeSession.uploaded_files && activeSession.uploaded_files.length > 0 ? 'data' : ''}
                      onUpload={handleFileBrowserUpload}
                      onCloneRepo={handleFileBrowserCloneRepo}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* Landing Page - Responsive Layout */
          <div className="flex-1 flex flex-col lg:flex-row bg-gray-950 overflow-hidden">
            {/* Left Column - Hero, Features, Video */}
            <div className="w-full lg:w-1/2 h-auto lg:h-full overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-800 p-4 sm:p-6">
              {/* Hero Section */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <Microscope className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white truncate">CCResearch Terminal</h1>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">Claude Code Sandboxed Research Terminal</p>
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
                  <FlaskConical className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">Python + pip</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">Web APIs</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400">Data Analysis</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg text-xs">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400">Sandboxed Sessions</span>
                </div>
              </div>

              {/* Use Cases Link */}
              <Link
                href="/ccresearch/use-cases"
                className="block mb-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Browse Use Cases & Examples
                    </h3>
                    <p className="text-xs text-gray-400">
                      40+ example prompts for scientific databases, ML, drug discovery, and more
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </Link>

              {/* Tips Link */}
              <Link
                href="/ccresearch/tips"
                className="block mb-4 p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl hover:border-amber-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                      Tips Before Using
                    </h3>
                    <p className="text-xs text-gray-400">
                      Learn how Claude Code works, prompting best practices, and how to use skills & MCP
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>

              {/* Request Plugin/Skill Button */}
              <button
                onClick={() => setShowRequestPluginSkillForm(true)}
                className="block w-full mb-6 p-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl hover:border-emerald-500/50 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                    <Plug className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      Request a Plugin or Skill
                    </h3>
                    <p className="text-xs text-gray-400">
                      Suggest new capabilities - paste a link or describe what you need
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </div>
              </button>

              {/* Video: Learn About Claude, MCP & Skills */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-400" />
                  Learn About Claude, MCP & Skills
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
                      <strong className="text-gray-300">Claude Code, MCP & Skills</strong> - How Claude Code uses MCP servers and skills to extend capabilities for research tasks.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Capabilities */}
            <div className="w-full lg:w-1/2 h-auto lg:h-full overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  <span className="hidden xs:inline">Available</span> Capabilities
                </h2>
                <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">v{capabilities?.version || '2.17.0'}</span>
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
              <div className="mb-4 p-2 bg-purple-900/20 rounded-lg border border-purple-700/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">Active MCP:</span>
                  {capabilities?.mcp_servers.active.map(mcp => (
                    <span key={mcp.name} className="inline-flex items-center gap-1 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="font-medium text-purple-300">{mcp.name}</span>
                    </span>
                  ))}
                  <span className="text-[10px] text-gray-500 ml-auto">{capabilities?.mcp_servers.summary.running} active, {(capabilities?.mcp_servers.summary.available_local || 0) + (capabilities?.mcp_servers.summary.available_remote || 0)} available</span>
                </div>
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
                          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Remote Services</p>
                          <div className="grid grid-cols-2 gap-1">
                            {capabilities.mcp_servers.available_remote?.map(mcp => (
                              <span key={mcp.name} className="flex items-center gap-1 text-[11px]" title={`${mcp.description} - Auth: ${mcp.auth_method}`}>
                                <span className={`w-1 h-1 rounded-full ${mcp.status === 'configured' ? 'bg-green-400' : 'bg-cyan-400'}`} />
                                <span className="text-gray-300">{mcp.name}</span>
                                {mcp.auth_method !== 'None' && <Key className="w-2.5 h-2.5 text-yellow-500" />}
                                {mcp.status === 'configured' && <span className="text-[8px] text-green-400 bg-green-900/30 px-1 rounded">ready</span>}
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
                      <p className="text-[10px] text-gray-500 mt-2">
                        Source: <a href="https://github.com/anthropics/skills" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">github.com/anthropics/skills</a>
                        {' | Install: '}<code className="text-cyan-300">/install skill-name</code>
                      </p>
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
                <p className="text-2xl font-bold text-white">{capabilities?.scientific_skills.total || 145}+</p>
                <p className="text-xs text-gray-400">Scientific Skills Ready</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer - Responsive */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/50 px-2 sm:px-4 py-1 sm:py-1.5">
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-600">
          <span className="truncate">Powered by Claude Code + Scientific Skills</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">For research purposes only</span>
          </div>
        </div>
      </div>

      {/* New Session Modal with Email and File Upload - Responsive */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Compact Header */}
            <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <SquarePlus className="w-5 h-5 text-blue-400" />
                <h2 className="text-base sm:text-lg font-semibold text-white">New Research Session</h2>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form - Two Column Layout */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column - Required Fields */}
                <div className="space-y-3">
                  {/* User Email (from login) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Logged in as
                    </label>
                    <div className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300">
                      {user?.email || 'Not logged in'}
                    </div>
                  </div>

                  {/* Access Key (optional - for direct terminal access) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Access Key <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="password"
                      value={newSessionAccessKey}
                      onChange={(e) => { setNewSessionAccessKey(e.target.value); setAccessKeyError(''); }}
                      placeholder="Leave empty for Claude Code"
                      className={`w-full px-3 py-2 text-sm bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${accessKeyError ? 'border-red-500' : 'border-gray-700'}`}
                    />
                    {accessKeyError && <p className="text-xs text-red-400 mt-1">{accessKeyError}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">With key = Direct Pi terminal • Without = Claude Code</p>
                  </div>

                  {/* Session Title */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Session Title <span className="text-gray-500">(optional)</span></label>
                    <input
                      type="text"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="e.g., CRISPR Gene Analysis"
                      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Claude Code Info */}
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-2 text-xs">
                    <p className="text-blue-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Claude Code Research Platform
                    </p>
                    <p className="text-gray-400 mt-1">Full access to 145+ skills, 14 plugins, and 26 MCP servers.</p>
                  </div>

                  {/* GitHub Repo - Compact */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <Github className="w-3.5 h-3.5" /> Clone Repo <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newSessionGithubUrl}
                      onChange={(e) => setNewSessionGithubUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {newSessionGithubUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                        <input
                          type="text"
                          value={newSessionGithubBranch}
                          onChange={(e) => setNewSessionGithubBranch(e.target.value)}
                          placeholder="Branch (default: main)"
                          className="flex-1 px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - File Upload */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Upload Files <span className="text-gray-500">(optional)</span></label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setUploadMode('files')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
                          uploadMode === 'files' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> Files
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('directory')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
                          uploadMode === 'directory' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" /> Directory
                      </button>
                    </div>

                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                      {uploadMode === 'files' ? (
                        <>
                          <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-upload" />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                            <p className="text-sm text-gray-300">Click to upload</p>
                            <p className="text-[10px] text-gray-500">CSV, PDF, images, ZIP</p>
                          </label>
                        </>
                      ) : (
                        <>
                          <input type="file" {...{ webkitdirectory: '' }} onChange={handleFileSelect} className="hidden" id="directory-upload" />
                          <label htmlFor="directory-upload" className="cursor-pointer">
                            <FolderOpen className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                            <p className="text-sm text-gray-300">Select directory</p>
                            <p className="text-[10px] text-gray-500">All files uploaded</p>
                          </label>
                        </>
                      )}
                    </div>

                    {/* Selected Files - Compact */}
                    {newSessionFiles.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                        {newSessionFiles.slice(0, 4).map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-800 px-2 py-1.5 rounded text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {file.name.toLowerCase().endsWith('.zip') ? (
                                <Archive className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              )}
                              <span className="text-gray-300 truncate">{(file as any).webkitRelativePath || file.name}</span>
                            </div>
                            <button onClick={() => removeFile(index)} className="p-0.5 hover:bg-gray-700 rounded">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        ))}
                        {newSessionFiles.length > 4 && (
                          <div className="text-[10px] text-gray-500 text-center">+{newSessionFiles.length - 4} more files</div>
                        )}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400/80">
                      <Archive className="w-3 h-3" /> ZIP files auto-extracted
                    </div>
                  </div>

                  {/* Quick Guide - Inline */}
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h3 className="text-xs font-semibold text-gray-200 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-yellow-400" /> Quick Start
                    </h3>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">1</span> Wait for Claude</div>
                      <div className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">2</span> Auth via URL</div>
                      <div className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">3</span> Press Enter</div>
                      <div className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center font-bold">4</span> Research!</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer - Always visible */}
            <div className="p-3 sm:p-4 border-t border-gray-800 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={isCreating}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isCreating ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</>
                ) : (
                  <><TerminalIcon className="w-3.5 h-3.5" /> Create Session</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Plugin/Skill Modal */}
      {showRequestPluginSkillForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plug className="w-5 h-5 text-emerald-400" />
                Request Plugin/Skill
              </h2>
              <button
                onClick={() => setShowRequestPluginSkillForm(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Request Type */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Request Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('skill')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      requestType === 'skill' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Skill
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('plugin')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      requestType === 'plugin' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Plugin
                  </button>
                </div>
              </div>

              {/* Logged in as */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Logged in as</label>
                <div className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300">
                  {user?.email || 'Not logged in'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">{requestType === 'skill' ? 'Skill' : 'Plugin'} Name</label>
                <input
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder={`e.g., ${requestType === 'skill' ? 'clinical-trials-search' : 'deep-learning-skills'}`}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Description or Link</label>
                <textarea
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Describe what it does, or paste a link to the plugin/skill (GitHub, npm, etc.)"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">You can paste a GitHub URL, npm package link, or describe the functionality</p>
              </div>

              {/* Use Case */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Your Use Case</label>
                <textarea
                  value={requestUseCase}
                  onChange={(e) => setRequestUseCase(e.target.value)}
                  placeholder="How would you use this in your research?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setShowRequestPluginSkillForm(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPluginSkillRequest}
                disabled={isSubmittingRequest}
                className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isSubmittingRequest ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit Request</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Session Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                Share Session
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {isShared ? (
                <>
                  {/* Already shared - show link */}
                  <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
                      <Link2 className="w-4 h-4" />
                      <span className="font-medium">Session is shared</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Anyone with this link can view your session files (read-only).
                    </p>
                  </div>

                  {/* Share URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-2">Share Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white font-mono"
                      />
                      <button
                        onClick={copyShareUrl}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {shareCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>

                  {/* Revoke option */}
                  <div className="pt-2 border-t border-gray-800">
                    <button
                      onClick={handleRevokeShare}
                      className="w-full px-4 py-2 text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Revoke Share Link
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      This will disable the share link permanently.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Not shared yet */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                    <Share2 className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Share this session</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Create a public link to share your research session. Others will be able to view files and terminal output (read-only).
                    </p>
                    <button
                      onClick={handleCreateShare}
                      disabled={isCreatingShare}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                      {isCreatingShare ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                      ) : (
                        <><Link2 className="w-4 h-4" /> Create Share Link</>
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Share link gives read-only access to files</p>
                    <p>• You can revoke the link at any time</p>
                    <p>• Terminal output/log is also visible</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading fallback component
function CCResearchLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Loading CCResearch...</p>
      </div>
    </div>
  );
}

// Default export with ProtectedRoute and Suspense boundary
export default function CCResearchPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<CCResearchLoading />}>
        <CCResearchPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
