'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    ArrowLeft, Database, FileSpreadsheet, Trash2, Loader2,
    BarChart3, Table, Code, Plus, Upload, RefreshCw, Sparkles, Edit3,
    Hash, FileText, AlertCircle, CheckCircle,
    Import, X, Wand2, LayoutDashboard, MessageSquare
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import {
    dataStudioV2Api, workspaceApi,
    DataStudioProject, DataFile, ProjectMetadata, Dashboard, DashboardWidget
} from '@/lib/api';
import mermaid from 'mermaid';
import DOMPurify from 'isomorphic-dompurify';

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Initialize mermaid
if (typeof window !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
    });
}

// ==================== Types ====================

type ViewMode = 'projects' | 'import' | 'analyzing' | 'dashboard';

interface AnalysisProgress {
    stage: 'scanning' | 'analyzing' | 'generating' | 'complete';
    message: string;
    progress: number;
}

// ==================== Utility Components ====================

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(num: number): string {
    return num.toLocaleString();
}

// ==================== Project Selector ====================

function ProjectSelector({
    onSelect,
    onCreateNew
}: {
    onSelect: (project: DataStudioProject) => void;
    onCreateNew: () => void;
}) {
    const [projects, setProjects] = useState<DataStudioProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await dataStudioV2Api.listProjects();
            setProjects(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, projectName: string) => {
        e.stopPropagation();
        if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) return;

        try {
            setDeleting(projectName);
            await dataStudioV2Api.deleteProject(projectName);
            setProjects(projects.filter(p => p.name !== projectName));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Data Studio Projects</h2>
                    <p className="text-gray-400 mt-1">Select a project or create a new one to start analyzing</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadProjects}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors"
                        title="Refresh projects"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onCreateNew}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        New Project
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300">
                    {error}
                </div>
            )}

            {projects.length === 0 ? (
                <div className="text-center p-12 border border-gray-700 rounded-lg bg-gray-800/50">
                    <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
                    <p className="text-gray-400 mb-6">Create your first Data Studio project to start analyzing data</p>
                    <button
                        onClick={onCreateNew}
                        className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {projects.map(project => (
                        <div
                            key={project.name}
                            className="relative flex items-start gap-4 p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 rounded-lg transition-all group cursor-pointer"
                            onClick={() => onSelect(project)}
                        >
                            <div className="w-12 h-12 rounded-lg bg-cyan-900/50 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">{project.name}</h3>
                                {project.description && (
                                    <p className="text-sm text-gray-400 truncate">{project.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {project.file_count} files
                                    </span>
                                    {project.has_analysis && (
                                        <span className="flex items-center gap-1 text-green-400">
                                            <CheckCircle className="w-3 h-3" />
                                            Analyzed
                                        </span>
                                    )}
                                    {project.has_dashboard && (
                                        <span className="flex items-center gap-1 text-purple-400">
                                            <LayoutDashboard className="w-3 h-3" />
                                            Dashboard
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Delete button */}
                            <button
                                onClick={(e) => handleDelete(e, project.name)}
                                className="absolute top-3 right-3 p-1.5 rounded bg-gray-700/50 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-all"
                                title="Delete project"
                            >
                                {deleting === project.name ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ==================== Create Project Modal ====================

function CreateProjectModal({
    onClose,
    onCreate
}: {
    onClose: () => void;
    onCreate: (name: string, description?: string) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setCreating(true);
        setError(null);
        try {
            await onCreate(name.trim(), description.trim() || undefined);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium text-white">Create New Project</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="my-analysis-project"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What will you be analyzing?"
                            rows={3}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || creating}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== Data Importer ====================

type AnalysisMode = 'combined' | 'separate';

function DataImporter({
    project,
    onComplete,
    onBack
}: {
    project: DataStudioProject;
    onComplete: (mode: AnalysisMode, fileCount: number, fileNames: string[]) => void;
    onBack: () => void;
}) {
    const [files, setFiles] = useState<DataFile[]>([]);
    const [workspaceProjects, setWorkspaceProjects] = useState<{ name: string }[]>([]);
    const [selectedWorkspaceProject, setSelectedWorkspaceProject] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [tab, setTab] = useState<'upload' | 'import'>('upload');
    const [showModeSelector, setShowModeSelector] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleStartAnalysis = () => {
        const fileNames = files.map(f => f.name);
        // If only 1 file, go straight to analysis with combined mode
        if (files.length <= 1) {
            onComplete('combined', files.length, fileNames);
        } else {
            // Show mode selector for multiple files
            setShowModeSelector(true);
        }
    };

    useEffect(() => {
        loadFiles();
        loadWorkspaceProjects();
    }, [project.name]);

    const loadFiles = async () => {
        try {
            const data = await dataStudioV2Api.listFiles(project.name);
            setFiles(data.files);
        } catch (e) {
            console.error('Failed to load files:', e);
        }
    };

    const loadWorkspaceProjects = async () => {
        try {
            const projects = await workspaceApi.listProjects();
            setWorkspaceProjects(projects.map(p => ({ name: p.name })));
        } catch (e) {
            console.error('Failed to load workspace projects:', e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        try {
            await dataStudioV2Api.uploadFiles(project.name, selectedFiles);
            await loadFiles();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImportFromWorkspace = async () => {
        if (!selectedWorkspaceProject) return;

        setImporting(true);
        try {
            await dataStudioV2Api.importFromWorkspace(project.name, selectedWorkspaceProject);
            await loadFiles();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setImporting(false);
        }
    };

    const handleDeleteFile = async (path: string) => {
        if (!confirm('Delete this file?')) return;
        try {
            await dataStudioV2Api.deleteFile(project.name, path);
            await loadFiles();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
            </button>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                    <p className="text-gray-400 mt-1">Add data files to your project</p>
                </div>
                <button
                    onClick={handleStartAnalysis}
                    disabled={files.length === 0}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Sparkles className="w-5 h-5" />
                    Analyze Data
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg inline-flex">
                <button
                    onClick={() => setTab('upload')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        tab === 'upload' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Upload className="w-4 h-4 inline-block mr-2" />
                    Upload Files
                </button>
                <button
                    onClick={() => setTab('import')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        tab === 'import' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Import className="w-4 h-4 inline-block mr-2" />
                    Import from Workspace
                </button>
            </div>

            {/* Upload Tab */}
            {tab === 'upload' && (
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center mb-8 hover:border-cyan-500 transition-colors">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".csv,.tsv,.json,.jsonl,.xlsx,.xls,.parquet,.md,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">
                        {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                        Supports CSV, JSON, Excel, Parquet, Markdown
                    </p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> : null}
                        Select Files
                    </button>
                </div>
            )}

            {/* Import Tab */}
            {tab === 'import' && (
                <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
                    <p className="text-gray-300 mb-4">Import data files from an existing Workspace project:</p>
                    <div className="flex gap-4">
                        <select
                            value={selectedWorkspaceProject}
                            onChange={e => setSelectedWorkspaceProject(e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">Select a project...</option>
                            {workspaceProjects.map(p => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleImportFromWorkspace}
                            disabled={!selectedWorkspaceProject || importing}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
                            Import
                        </button>
                    </div>
                </div>
            )}

            {/* File List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-medium text-white">Project Files ({files.length})</h3>
                    <button onClick={loadFiles} className="text-gray-400 hover:text-white">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                {files.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No files yet. Upload or import data files to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {files.map(file => (
                            <div key={file.path} className="flex items-center justify-between p-3 hover:bg-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <FileTypeIcon type={file.type} />
                                    <div>
                                        <span className="text-gray-200">{file.name}</span>
                                        {file.folder !== 'root' && (
                                            <span className="text-gray-500 text-sm ml-2">in {file.folder}/</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-500 text-sm">{formatBytes(file.size)}</span>
                                    <button
                                        onClick={() => handleDeleteFile(file.path)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Analysis Mode Selector Modal */}
            {showModeSelector && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-2">How should we analyze your files?</h3>
                        <p className="text-gray-400 mb-6">
                            You have {files.length} files. Choose how to analyze them:
                        </p>

                        <div className="space-y-4">
                            {/* Combined Analysis Option */}
                            <button
                                onClick={() => {
                                    setShowModeSelector(false);
                                    onComplete('combined', files.length, files.map(f => f.name));
                                }}
                                className="w-full text-left p-4 rounded-lg border border-gray-700 hover:border-cyan-500 hover:bg-gray-800/50 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-600/30">
                                        <Database className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white mb-1">Combined Analysis</h4>
                                        <p className="text-sm text-gray-400">
                                            Analyze all files together. Best for related datasets that share columns or can be merged.
                                            Creates a unified dashboard with cross-file insights.
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Separate Analysis Option */}
                            <button
                                onClick={() => {
                                    setShowModeSelector(false);
                                    onComplete('separate', files.length, files.map(f => f.name));
                                }}
                                className="w-full text-left p-4 rounded-lg border border-gray-700 hover:border-purple-500 hover:bg-gray-800/50 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/30">
                                        <FileText className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white mb-1">Separate Analysis</h4>
                                        <p className="text-sm text-gray-400">
                                            Analyze each file independently with detailed per-file insights.
                                            Best for unrelated files or when you need deep analysis of each.
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowModeSelector(false)}
                            className="mt-6 w-full text-center text-gray-400 hover:text-white text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FileTypeIcon({ type }: { type: string }) {
    const iconClass = "w-5 h-5";
    switch (type) {
        case 'csv':
        case 'tsv':
            return <Table className={`${iconClass} text-green-500`} />;
        case 'xlsx':
        case 'xls':
            return <FileSpreadsheet className={`${iconClass} text-emerald-500`} />;
        case 'json':
        case 'jsonl':
            return <Code className={`${iconClass} text-yellow-500`} />;
        case 'parquet':
            return <Database className={`${iconClass} text-purple-500`} />;
        default:
            return <FileText className={`${iconClass} text-gray-500`} />;
    }
}

// ==================== Analysis Progress ====================

function AnalysisProgressView({
    project,
    analysisMode = 'combined',
    fileCount = 0,
    fileNames = [],
    onComplete,
    onBack
}: {
    project: DataStudioProject;
    analysisMode?: AnalysisMode;
    fileCount?: number;
    fileNames?: string[];
    onComplete: (metadata: ProjectMetadata, dashboard: Dashboard) => void;
    onBack: () => void;
}) {
    const [progress, setProgress] = useState<AnalysisProgress>({
        stage: 'scanning',
        message: 'Scanning data files...',
        progress: 0
    });
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        runAnalysis();
    }, [project.name]);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleEvent = (event: { type: string; content: any }) => {
        if (event.type === 'status') {
            addLog(`⚡ ${event.content}`);
        } else if (event.type === 'text') {
            // Claude's text output - show up to 500 chars for better visibility
            const text = String(event.content).trim();
            if (!text) return;
            // Split long text into multiple lines for readability
            const lines = text.split('\n');
            for (const line of lines.slice(0, 10)) { // Show first 10 lines
                if (line.trim()) {
                    if (line.length > 120) {
                        addLog(`📝 ${line.slice(0, 120)}...`);
                    } else {
                        addLog(`📝 ${line}`);
                    }
                }
            }
            if (lines.length > 10) {
                addLog(`   ... (${lines.length - 10} more lines)`);
            }
        } else if (event.type === 'tool') {
            addLog(`🔧 Tool: ${event.content}`);
        } else if (event.type === 'result') {
            // Show a sample of the result - properly stringify objects
            let result: string;
            if (typeof event.content === 'object' && event.content !== null) {
                try {
                    result = JSON.stringify(event.content, null, 2);
                } catch {
                    result = String(event.content);
                }
            } else {
                result = String(event.content);
            }
            if (result.length > 300) {
                addLog(`✅ Result: ${result.slice(0, 300)}...`);
            } else {
                addLog(`✅ Result: ${result}`);
            }
        } else if (event.type === 'error') {
            addLog(`❌ Error: ${event.content}`);
        } else if (event.type === 'complete') {
            addLog(`🎉 ${event.content}`);
        }
    };

    // Retry helper for fetching results with exponential backoff
    const fetchWithRetry = async <T,>(
        fn: () => Promise<T>,
        label: string,
        maxRetries: number = 5,
        baseDelayMs: number = 1000
    ): Promise<T> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                addLog(`📂 ${label} (attempt ${attempt}/${maxRetries})...`);
                const result = await fn();
                addLog(`✅ ${label} successful`);
                return result;
            } catch (e: any) {
                if (attempt === maxRetries) {
                    addLog(`❌ ${label} failed after ${maxRetries} attempts: ${e.message}`);
                    throw e;
                }
                // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                addLog(`⏳ ${label} not ready, waiting ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw new Error(`${label} failed`);
    };

    const runAnalysis = async () => {
        const actualFileCount = fileCount || project.file_count || 0;
        const actualFileNames = fileNames.length > 0 ? fileNames : [];

        try {
            // Stage 1: Scanning
            setProgress({ stage: 'scanning', message: 'Scanning data files...', progress: 5 });
            addLog('🚀 Starting Data Studio analysis pipeline...');
            addLog(`📁 Project: ${project.name}`);
            addLog(`📊 Files to analyze: ${actualFileCount}`);
            if (actualFileNames.length > 0) {
                addLog(`📄 Files: ${actualFileNames.join(', ')}`);
            }
            addLog(`🔧 Analysis Mode: ${analysisMode === 'combined' ? 'Combined (unified analysis)' : 'Separate (per-file analysis)'}`);
            await new Promise(r => setTimeout(r, 300));

            // Stage 2: Analyzing with Claude
            setProgress({ stage: 'analyzing', message: 'Claude is analyzing data...', progress: 10 });
            addLog('');
            addLog('═══════════════════════════════════════');
            addLog('📊 PHASE 1: DATA ANALYSIS');
            addLog('═══════════════════════════════════════');
            addLog('🤖 Invoking Claude Code for data analysis...');
            addLog('   - Activating Python environment');
            addLog('   - Loading data files with pandas');
            addLog('   - Extracting column types and statistics');
            if (analysisMode === 'separate') {
                addLog('   - Creating per-file detailed insights');
            } else {
                addLog('   - Analyzing cross-file relationships');
            }
            addLog('');

            await dataStudioV2Api.analyzeProject(
                project.name,
                { mode: 'terminal', analysisMode },
                handleEvent
            );

            setProgress({ stage: 'analyzing', message: 'Analysis complete, verifying...', progress: 50 });
            addLog('');
            addLog('✅ Data analysis phase completed');

            // Give filesystem time to flush
            addLog('⏳ Waiting for files to sync...');
            await new Promise(r => setTimeout(r, 2000));

            // Stage 3: Generating dashboard
            setProgress({ stage: 'generating', message: 'Claude is generating dashboard...', progress: 55 });
            addLog('');
            addLog('═══════════════════════════════════════');
            addLog('📈 PHASE 2: DASHBOARD GENERATION');
            addLog('═══════════════════════════════════════');
            addLog('🤖 Invoking Claude Code for dashboard generation...');
            addLog('   - Reading analysis metadata');
            addLog('   - Selecting optimal chart types');
            addLog('   - Creating Plotly specifications');
            addLog('');

            await dataStudioV2Api.generateDashboard(
                project.name,
                { mode: 'terminal' },
                handleEvent
            );

            setProgress({ stage: 'generating', message: 'Dashboard generated, loading...', progress: 85 });
            addLog('');
            addLog('✅ Dashboard generation phase completed');

            // Give filesystem time to flush
            addLog('⏳ Waiting for files to sync...');
            await new Promise(r => setTimeout(r, 2000));

            // Fetch results with retry logic
            addLog('');
            addLog('═══════════════════════════════════════');
            addLog('📥 PHASE 3: LOADING RESULTS');
            addLog('═══════════════════════════════════════');

            setProgress({ stage: 'generating', message: 'Loading metadata...', progress: 90 });
            const metadata = await fetchWithRetry(
                () => dataStudioV2Api.getMetadata(project.name),
                'Fetching analysis metadata'
            );

            setProgress({ stage: 'generating', message: 'Loading dashboard...', progress: 95 });
            const dashboard = await fetchWithRetry(
                () => dataStudioV2Api.getDashboard(project.name, 'default'),
                'Fetching dashboard'
            );

            // Complete
            setProgress({ stage: 'complete', message: 'Ready!', progress: 100 });
            addLog('');
            addLog('═══════════════════════════════════════');
            addLog('🎉 ALL PHASES COMPLETE');
            addLog('═══════════════════════════════════════');
            addLog(`📊 Analyzed ${Object.keys(metadata.files || {}).length} files`);
            addLog(`📈 Generated ${dashboard.widgets?.length || 0} widgets`);
            addLog('');
            addLog('🚀 Loading dashboard view...');
            await new Promise(r => setTimeout(r, 800));

            onComplete(metadata, dashboard);
        } catch (e: any) {
            addLog('');
            addLog('═══════════════════════════════════════');
            addLog('❌ ANALYSIS FAILED');
            addLog('═══════════════════════════════════════');
            addLog(`Error: ${e.message}`);
            addLog('');
            addLog('💡 Troubleshooting tips:');
            addLog('   - Check that data files are valid CSV/JSON/Excel');
            addLog('   - Try refreshing and running analysis again');
            addLog('   - Check backend logs for more details');
            setError(e.message);
        }
    };

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center mb-6">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                </div>

                {/* Show logs on error for debugging */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 max-h-80 overflow-y-auto font-mono text-sm">
                    {logs.map((log, i) => (
                        <div key={i} className="text-gray-300 whitespace-pre-wrap">{log}</div>
                    ))}
                </div>

                <div className="text-center">
                    <button
                        onClick={onBack}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 h-full flex flex-col">
            <div className="text-center mb-4">
                <Sparkles className="w-10 h-10 text-cyan-500 mx-auto mb-2 animate-pulse" />
                <h2 className="text-lg font-bold text-white mb-1">Analyzing {project.name}</h2>
                <p className="text-gray-400 text-sm">{progress.message}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                />
            </div>

            {/* Stage indicators */}
            <div className="flex justify-between text-xs text-gray-500 mb-6">
                <span className={progress.stage === 'scanning' ? 'text-cyan-400' : progress.progress > 10 ? 'text-green-400' : ''}>
                    Scan
                </span>
                <span className={progress.stage === 'analyzing' ? 'text-cyan-400' : progress.progress > 60 ? 'text-green-400' : ''}>
                    Analyze
                </span>
                <span className={progress.stage === 'generating' ? 'text-cyan-400' : progress.progress > 80 ? 'text-green-400' : ''}>
                    Generate
                </span>
                <span className={progress.stage === 'complete' ? 'text-green-400' : ''}>
                    Done
                </span>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-400">{fileCount || project.file_count || '?'}</p>
                    <p className="text-xs text-gray-500">Files to Analyze</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">pandas</p>
                    <p className="text-xs text-gray-500">Data Library</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">Plotly</p>
                    <p className="text-xs text-gray-500">Charts</p>
                </div>
            </div>

            {/* Live Terminal Output */}
            <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col">
                <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400 text-sm ml-2">Claude Code Output</span>
                    <span className="text-gray-600 text-xs ml-auto">Project: {project.name}</span>
                </div>
                <div className="p-4 h-80 overflow-y-auto font-mono text-sm flex-1">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 animate-pulse">Initializing Claude Code session...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-gray-300 whitespace-pre-wrap mb-1">{log}</div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Tips */}
            <p className="text-xs text-gray-600 text-center mt-3">
                Claude is writing and executing Python scripts to analyze your data
            </p>
        </div>
    );
}

// ==================== Dashboard View ====================

function DashboardView({
    project,
    metadata,
    dashboard,
    onBack,
    onRefresh
}: {
    project: DataStudioProject;
    metadata: ProjectMetadata;
    dashboard: Dashboard;
    onBack: () => void;
    onRefresh: () => void;
}) {
    const [widgets, setWidgets] = useState<DashboardWidget[]>(dashboard.widgets || []);
    const [editingWidget, setEditingWidget] = useState<string | null>(null);
    const [nlpInput, setNlpInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [nlpLogs, setNlpLogs] = useState<string[]>([]);
    const [showNlpProgress, setShowNlpProgress] = useState(false);
    const nlpLogsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll NLP logs
    useEffect(() => {
        nlpLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [nlpLogs]);

    const addNlpLog = (message: string) => {
        setNlpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleNlpEvent = (event: { type: string; content: any }) => {
        if (event.type === 'status') {
            addNlpLog(`⚡ ${event.content}`);
        } else if (event.type === 'text') {
            const text = String(event.content);
            if (text.length > 150) {
                addNlpLog(`📝 ${text.slice(0, 150)}...`);
            } else {
                addNlpLog(`📝 ${text}`);
            }
        } else if (event.type === 'tool') {
            addNlpLog(`🔧 ${event.content}`);
        } else if (event.type === 'result') {
            addNlpLog(`✅ Edit applied`);
        } else if (event.type === 'error') {
            addNlpLog(`❌ Error: ${event.content}`);
        } else if (event.type === 'complete') {
            addNlpLog(`🎉 ${event.content}`);
        }
    };

    const handleNlpEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nlpInput.trim() || processing) return;

        const request = nlpInput.trim();
        setProcessing(true);
        setShowNlpProgress(true);
        setNlpLogs([]);

        addNlpLog('═══════════════════════════════════════');
        addNlpLog('🎨 NLP DASHBOARD EDIT');
        addNlpLog('═══════════════════════════════════════');
        addNlpLog(`📝 Request: "${request}"`);
        addNlpLog(`🎯 Target: ${editingWidget ? `Widget ${editingWidget}` : 'Entire dashboard'}`);
        addNlpLog('');
        addNlpLog('🤖 Invoking Claude Code...');

        try {
            const result = await dataStudioV2Api.nlpEdit(
                project.name,
                request,
                { dashboardId: 'default', targetWidgetId: editingWidget || undefined, mode: 'terminal' },
                handleNlpEvent
            );

            addNlpLog('');
            addNlpLog('📥 Fetching updated dashboard...');

            // Fetch the updated dashboard to get new widgets
            await new Promise(r => setTimeout(r, 1000)); // Wait for file to sync
            const updatedDashboard = await dataStudioV2Api.getDashboard(project.name, 'default');

            if (updatedDashboard.widgets) {
                setWidgets(updatedDashboard.widgets);
                addNlpLog(`✅ Dashboard updated with ${updatedDashboard.widgets.length} widgets`);
            } else if ('widgets' in result && result.widgets) {
                setWidgets(result.widgets);
                addNlpLog(`✅ Dashboard updated`);
            }

            addNlpLog('');
            addNlpLog('🎉 Edit complete!');
            setNlpInput('');
            setEditingWidget(null);

            // Auto-close after success
            setTimeout(() => setShowNlpProgress(false), 1500);
        } catch (e: any) {
            addNlpLog('');
            addNlpLog('═══════════════════════════════════════');
            addNlpLog('❌ EDIT FAILED');
            addNlpLog('═══════════════════════════════════════');
            addNlpLog(`Error: ${e.message}`);
            addNlpLog('');
            addNlpLog('💡 Tips:');
            addNlpLog('   - Try rephrasing your request');
            addNlpLog('   - Be specific about chart type or colors');
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveWidget = (widgetId: string) => {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* NLP Edit Progress Modal */}
            {showNlpProgress && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl mx-4 overflow-hidden">
                        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                <Wand2 className={`w-5 h-5 text-purple-400 ${processing ? 'animate-pulse' : ''}`} />
                                <span className="font-medium text-white">AI Dashboard Edit</span>
                                {processing && (
                                    <span className="text-xs text-gray-400 animate-pulse">Processing...</span>
                                )}
                            </div>
                            {!processing && (
                                <button
                                    onClick={() => setShowNlpProgress(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="p-4 h-80 overflow-y-auto font-mono text-sm bg-gray-950">
                            {nlpLogs.length === 0 ? (
                                <div className="text-gray-500 animate-pulse">Initializing...</div>
                            ) : (
                                nlpLogs.map((log, i) => (
                                    <div key={i} className="text-gray-300 whitespace-pre-wrap mb-1">{log}</div>
                                ))
                            )}
                            <div ref={nlpLogsEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-950 flex-shrink-0">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="h-5 w-px bg-gray-700" />
                        <h1 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            C3 Data Studio
                        </h1>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-300">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                showChat ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Chat
                        </button>
                        <button
                            onClick={onRefresh}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* NLP Edit Bar */}
                <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
                    <form onSubmit={handleNlpEdit} className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                            <Wand2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={nlpInput}
                                onChange={e => setNlpInput(e.target.value)}
                                placeholder={editingWidget
                                    ? "Describe how to edit this widget..."
                                    : "Describe changes to the dashboard (e.g., 'Add a pie chart for categories')"
                                }
                                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                            />
                            {editingWidget && (
                                <button
                                    type="button"
                                    onClick={() => setEditingWidget(null)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!nlpInput.trim() || processing}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Apply
                        </button>
                    </form>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Metadata Summary */}
                <aside className="w-72 border-r border-gray-800 bg-gray-950 flex-shrink-0 overflow-auto">
                    <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Data Summary</h3>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <StatCard label="Files" value={metadata.summary.total_files || 0} icon={FileText} />
                            <StatCard label="Rows" value={formatNumber(metadata.summary.total_rows || 0)} icon={Table} />
                            {metadata.summary.total_columns && (
                                <StatCard label="Columns" value={metadata.summary.total_columns} icon={Hash} />
                            )}
                            {metadata.summary.primary_data_type && (
                                <StatCard label="Type" value={metadata.summary.primary_data_type.split('_')[0]} icon={Database} />
                            )}
                        </div>

                        {/* Themes */}
                        {metadata.summary.themes && metadata.summary.themes.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Detected Themes</h4>
                                <div className="flex flex-wrap gap-1">
                                    {metadata.summary.themes.map(theme => (
                                        <span
                                            key={theme}
                                            className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                                        >
                                            {theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Domain */}
                        {metadata.summary.domain_detected && (
                            <div className="mb-4 p-3 bg-cyan-900/30 border border-cyan-800 rounded-lg">
                                <p className="text-xs text-cyan-400 font-medium">Domain Detected</p>
                                <p className="text-sm text-white capitalize">{metadata.summary.domain_detected}</p>
                            </div>
                        )}

                        {/* Files List */}
                        <h4 className="text-xs font-medium text-gray-500 mb-2">Analyzed Files</h4>
                        <div className="space-y-2">
                            {metadata.files && Object.entries(metadata.files).map(([filename, analysis]: [string, any]) => (
                                <div key={filename} className="bg-gray-800 rounded p-2 text-sm">
                                    <p className="text-gray-200 truncate font-medium">{filename}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatNumber(analysis.rows || analysis.row_count || 0)} rows, {analysis.columns || analysis.column_count || 0} cols
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Dashboard Canvas */}
                <main className="flex-1 overflow-auto p-6 bg-gray-900">
                    {widgets.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No widgets yet</p>
                                <p className="text-sm mt-2">Use the NLP bar above to add visualizations</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-4 auto-rows-min">
                            {widgets.map(widget => (
                                <WidgetCard
                                    key={widget.id}
                                    widget={widget}
                                    metadata={metadata}
                                    isEditing={editingWidget === widget.id}
                                    onEdit={() => setEditingWidget(widget.id)}
                                    onRemove={() => handleRemoveWidget(widget.id)}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {/* Chat Panel */}
                {showChat && (
                    <aside className="w-80 border-l border-gray-800 bg-gray-950 flex-shrink-0 flex flex-col">
                        <div className="p-3 border-b border-gray-800">
                            <h3 className="font-medium text-white">Chat with your data</h3>
                        </div>
                        <div className="flex-1 p-4 text-center text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Chat feature coming soon</p>
                            <p className="text-xs mt-1">Use NLP bar for now</p>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
}) {
    return (
        <div className="bg-gray-800 rounded-lg p-3">
            <Icon className="w-4 h-4 text-cyan-400 mb-1" />
            <p className="text-lg font-semibold text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}

function WidgetCard({
    widget,
    metadata,
    isEditing,
    onEdit,
    onRemove
}: {
    widget: DashboardWidget;
    metadata: ProjectMetadata;
    isEditing: boolean;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const [mermaidSvg, setMermaidSvg] = useState<string>('');
    const layout = widget.layout || { x: 0, y: 0, w: 4, h: 3 };
    const colSpan = Math.max(3, Math.min(12, layout.w));
    const rowSpan = Math.max(2, layout.h);

    // Render Mermaid
    useEffect(() => {
        if (widget.type === 'mermaid' && widget.mermaid_code) {
            const renderMermaid = async () => {
                try {
                    const id = `mermaid-${widget.id}`;
                    const { svg } = await mermaid.render(id, widget.mermaid_code!);
                    setMermaidSvg(svg);
                } catch (e) {
                    console.error('Mermaid render error:', e);
                }
            };
            renderMermaid();
        }
    }, [widget.id, widget.type, widget.mermaid_code]);

    return (
        <div
            className={`bg-gray-800 rounded-lg border overflow-hidden ${
                isEditing ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-700'
            }`}
            style={{
                gridColumn: `span ${colSpan}`,
                minHeight: `${rowSpan * 100}px`
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
                <span className="text-sm text-gray-300 font-medium truncate">
                    {widget.title || widget.type}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-1 text-gray-500 hover:text-purple-400 transition-colors"
                        title="Edit with NLP"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onRemove}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                {widget.type === 'stat_card' && (
                    <div className="text-center py-4">
                        <p className="text-3xl font-bold text-white">
                            {widget.stat_value || widget.value || '-'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            {widget.stat_label || widget.subtitle || widget.title || ''}
                        </p>
                    </div>
                )}

                {widget.type === 'mermaid' && mermaidSvg && (
                    <div
                        className="flex justify-center bg-gray-900/50 rounded p-4 overflow-auto"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mermaidSvg, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
                    />
                )}

                {(widget.plotly_spec || widget.plotly) && widget.type !== 'stat_card' && widget.type !== 'mermaid' && (
                    <PlotlyWidget spec={widget.plotly_spec || widget.plotly} metadata={metadata} />
                )}

                {widget.type === 'table' && (
                    <div className="text-gray-400 text-sm text-center py-8">
                        Table widget - data loading...
                    </div>
                )}
            </div>
        </div>
    );
}

function PlotlyWidget({
    spec,
    metadata
}: {
    spec: any;
    metadata: ProjectMetadata;
}) {
    // In a full implementation, we'd load actual data here based on spec._file, _column, etc.
    // For now, show the spec structure
    const chartData = useMemo(() => {
        if (spec.data && spec.layout) {
            // Apply dark theme
            const layout = {
                ...spec.layout,
                template: 'plotly_dark',
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(31,41,55,0.5)',
                font: { color: '#9ca3af' },
                margin: { t: 40, r: 20, b: 40, l: 50 },
            };
            return { data: spec.data, layout };
        }
        return null;
    }, [spec]);

    if (!chartData) {
        return (
            <div className="text-gray-500 text-sm text-center py-8">
                Chart configuration needed
            </div>
        );
    }

    return (
        <Plot
            data={chartData.data}
            layout={chartData.layout}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: 300 }}
        />
    );
}

// ==================== Main Page ====================

function DataStudioContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<ViewMode>('projects');
    const [selectedProject, setSelectedProject] = useState<DataStudioProject | null>(null);
    const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('combined');
    const [analysisFileCount, setAnalysisFileCount] = useState(0);
    const [analysisFileNames, setAnalysisFileNames] = useState<string[]>([]);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Restore project from URL on mount
    useEffect(() => {
        const urlProject = searchParams.get('project');
        if (urlProject && !initialLoadDone) {
            // Load the project from URL
            dataStudioV2Api.listProjects().then(projects => {
                const project = projects.find(p => p.name === urlProject);
                if (project) {
                    setSelectedProject(project);
                    if (project.has_dashboard) {
                        loadExistingData(project);
                    } else if (project.file_count > 0) {
                        setViewMode('analyzing');
                    } else {
                        setViewMode('import');
                    }
                }
                setInitialLoadDone(true);
            }).catch(() => {
                setInitialLoadDone(true);
            });
        } else {
            setInitialLoadDone(true);
        }
    }, [searchParams]);

    // Update URL when project changes
    useEffect(() => {
        if (!initialLoadDone) return;

        const params = new URLSearchParams();
        if (selectedProject) params.set('project', selectedProject.name);
        const newUrl = params.toString() ? `?${params.toString()}` : '/data-studio';
        window.history.replaceState({}, '', newUrl);
    }, [selectedProject, initialLoadDone]);

    const handleSelectProject = (project: DataStudioProject) => {
        setSelectedProject(project);
        if (project.has_dashboard) {
            // Load existing dashboard
            loadExistingData(project);
        } else if (project.file_count > 0) {
            // Has files but no dashboard - go to analysis with default combined mode
            setAnalysisMode('combined');
            setViewMode('analyzing');
        } else {
            // No files - go to import
            setViewMode('import');
        }
    };

    const loadExistingData = async (project: DataStudioProject) => {
        try {
            const [metadataResult, dashboardResult] = await Promise.all([
                dataStudioV2Api.getMetadata(project.name),
                dataStudioV2Api.getDashboard(project.name, 'default')
            ]);
            setMetadata(metadataResult);
            setDashboard(dashboardResult);
            setViewMode('dashboard');
        } catch (e) {
            // If loading fails, go to import
            setViewMode('import');
        }
    };

    const handleCreateProject = async (name: string, description?: string) => {
        const project = await dataStudioV2Api.createProject(name, description);
        setSelectedProject(project);
        setViewMode('import');
    };

    const handleAnalysisComplete = (newMetadata: ProjectMetadata, newDashboard: Dashboard) => {
        setMetadata(newMetadata);
        setDashboard(newDashboard);
        setViewMode('dashboard');
    };

    const handleRefresh = async () => {
        if (!selectedProject) return;
        await loadExistingData(selectedProject);
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
        setMetadata(null);
        setDashboard(null);
        setViewMode('projects');
    };

    // Project selector view
    if (viewMode === 'projects') {
        return (
            <div className="min-h-screen bg-gray-900">
                <header className="border-b border-gray-800 bg-gray-950">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">Home</span>
                        </Link>
                        <div className="h-4 w-px bg-gray-700" />
                        <h1 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            C3 Data Studio
                        </h1>
                    </div>
                </header>
                <ProjectSelector
                    onSelect={handleSelectProject}
                    onCreateNew={() => setShowCreateModal(true)}
                />
                {showCreateModal && (
                    <CreateProjectModal
                        onClose={() => setShowCreateModal(false)}
                        onCreate={handleCreateProject}
                    />
                )}
            </div>
        );
    }

    // Import data view
    if (viewMode === 'import' && selectedProject) {
        return (
            <div className="min-h-screen bg-gray-900">
                <header className="border-b border-gray-800 bg-gray-950">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="h-4 w-px bg-gray-700" />
                        <h1 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            C3 Data Studio
                        </h1>
                    </div>
                </header>
                <DataImporter
                    project={selectedProject}
                    onComplete={(mode, fileCount, fileNames) => {
                        setAnalysisMode(mode);
                        setAnalysisFileCount(fileCount);
                        setAnalysisFileNames(fileNames);
                        setViewMode('analyzing');
                    }}
                    onBack={handleBackToProjects}
                />
            </div>
        );
    }

    // Analysis progress view
    if (viewMode === 'analyzing' && selectedProject) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <AnalysisProgressView
                    project={selectedProject}
                    analysisMode={analysisMode}
                    fileCount={analysisFileCount}
                    fileNames={analysisFileNames}
                    onComplete={handleAnalysisComplete}
                    onBack={() => setViewMode('import')}
                />
            </div>
        );
    }

    // Dashboard view
    if (viewMode === 'dashboard' && selectedProject && metadata && dashboard) {
        return (
            <ProtectedRoute>
                <DashboardView
                    project={selectedProject}
                    metadata={metadata}
                    dashboard={dashboard}
                    onBack={handleBackToProjects}
                    onRefresh={handleRefresh}
                />
            </ProtectedRoute>
        );
    }

    // Fallback
    return null;
}

export default function DataStudioPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
            }>
                <DataStudioContent />
            </Suspense>
        </ProtectedRoute>
    );
}
