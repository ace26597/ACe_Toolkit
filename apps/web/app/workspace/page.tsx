'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, FolderOpen, FileText, RefreshCw, Home, X, ChevronRight, Clock, Download, Terminal, Plus, FileCode, FileJson, Image, Video, Music, FileType, Upload, Table, FileSpreadsheet, Loader2, Lightbulb, Play, Power, Github, Globe, Link as LinkIcon, Key } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute, useAuth } from '@/components/auth';
import ProjectSidebar from '@/components/workspace/ProjectSidebar';
import DataBrowser from '@/components/workspace/DataBrowser';
import FileBrowser from '@/components/ccresearch/FileBrowser';
import { workspaceApi, WorkspaceProject, WorkspaceDataItem, getApiUrl } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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

// Initialize mermaid for notes preview
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
}

// Get file extension
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Check file type
const isMarkdownFile = (filename: string) => ['md', 'markdown'].includes(getFileExtension(filename));
const isMermaidFile = (filename: string) => getFileExtension(filename) === 'mmd';
const isJsonFile = (filename: string) => ['json', 'jsonl'].includes(getFileExtension(filename));
const isYamlFile = (filename: string) => ['yaml', 'yml'].includes(getFileExtension(filename));
const isLogFile = (filename: string) => getFileExtension(filename) === 'log';
const isImageFile = (filename: string) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(getFileExtension(filename));
const isVideoFile = (filename: string) => ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(getFileExtension(filename));
const isAudioFile = (filename: string) => ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(getFileExtension(filename));
const isPdfFile = (filename: string) => getFileExtension(filename) === 'pdf';
const isCsvFile = (filename: string) => getFileExtension(filename) === 'csv';
const isExcelFile = (filename: string) => ['xlsx', 'xls', 'xlsm'].includes(getFileExtension(filename));
const isDocxFile = (filename: string) => getFileExtension(filename) === 'docx';
const isPptxFile = (filename: string) => ['pptx', 'ppt'].includes(getFileExtension(filename));
const isSpreadsheet = (filename: string) => isCsvFile(filename) || isExcelFile(filename);
const isOfficeDoc = (filename: string) => isDocxFile(filename) || isPptxFile(filename);
const isTextBasedFile = (filename: string) => {
  const ext = getFileExtension(filename);
  const textExtensions = ['md', 'markdown', 'mmd', 'txt', 'log', 'json', 'jsonl', 'yaml', 'yml', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'py', 'sh', 'bash', 'gitignore', 'env'];
  return textExtensions.includes(ext) || !ext; // No extension = likely text
};
const isMediaFile = (filename: string) => isImageFile(filename) || isVideoFile(filename) || isAudioFile(filename) || isPdfFile(filename);
const isViewableFile = (filename: string) => isTextBasedFile(filename) || isMediaFile(filename) || isSpreadsheet(filename) || isOfficeDoc(filename);

// Mermaid Diagram Component for Notes preview
function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(`mermaid-notes-${id}`, code);
        setSvg(svg);
        setError('');
      } catch (err) {
        setError(String(err));
        setSvg('');
      }
    };
    if (code) renderDiagram();
  }, [code, id]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 my-3">
        <p className="text-red-400 text-sm font-medium mb-2">Mermaid Error</p>
        <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-900/50 rounded-lg p-4 my-3 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// JSON Viewer Component with syntax highlighting
function JsonViewer({ content }: { content: string }) {
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [parseError, setParseError] = useState<string>('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      setParsedJson(parsed);
      setParseError('');
    } catch (err) {
      setParseError(String(err));
      setParsedJson(null);
    }
  }, [content]);

  if (parseError) {
    return (
      <div>
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 mb-4">
          <p className="text-amber-400 text-sm">Invalid JSON: {parseError}</p>
        </div>
        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{content}</pre>
      </div>
    );
  }

  const syntaxHighlight = (json: string): string => {
    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-amber-400'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-indigo-400'; // key
          } else {
            cls = 'text-emerald-400'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-400'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-slate-500'; // null
        }
        return `<span class="${cls}">${match}</span>`;
      });
  };

  const formatted = JSON.stringify(parsedJson, null, 2);
  const highlighted = syntaxHighlight(formatted);

  return (
    <pre
      className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

// Preview size limits (in bytes)
const PREVIEW_SIZE_LIMITS = {
  spreadsheet: 5 * 1024 * 1024,  // 5MB for CSV/Excel
  text: 2 * 1024 * 1024,         // 2MB for text files
  office: 10 * 1024 * 1024,      // 10MB for DOCX/PPTX
};
const SPREADSHEET_ROW_LIMIT = 500; // Show max 500 rows initially

// Large File Prompt Component
function LargeFilePrompt({
  filename,
  size,
  sizeFormatted,
  onLoad,
  downloadUrl
}: {
  filename: string;
  size: number;
  sizeFormatted: string;
  onLoad: () => void;
  downloadUrl: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <FileSpreadsheet size={48} className="mb-4 opacity-50" />
      <p className="text-lg mb-2">Large file ({sizeFormatted})</p>
      <p className="text-sm text-slate-500 mb-4 text-center max-w-md">
        This file is large and may slow down your browser. You can download it or load a preview.
      </p>
      <div className="flex gap-3">
        <a
          href={downloadUrl}
          download={filename}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Download size={16} />
          Download
        </a>
        <button
          onClick={onLoad}
          className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Table size={16} />
          Load Preview (first {SPREADSHEET_ROW_LIMIT} rows)
        </button>
      </div>
    </div>
  );
}

// Spreadsheet Viewer Component (CSV and Excel)
function SpreadsheetViewer({
  content,
  filename,
  fileUrl,
  fileSize = 0,
  autoLoad = true
}: {
  content?: string;
  filename: string;
  fileUrl?: string;
  fileSize?: number;
  autoLoad?: boolean;
}) {
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [displayedRows, setDisplayedRows] = useState(SPREADSHEET_ROW_LIMIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [shouldLoad, setShouldLoad] = useState(autoLoad && fileSize < PREVIEW_SIZE_LIMITS.spreadsheet);

  const parseData = async () => {
    setLoading(true);
    setError('');

    try {
      if (isCsvFile(filename) && content) {
        // Parse CSV content
        const result = Papa.parse(content, {
          skipEmptyLines: true,
        });

        if (result.data && result.data.length > 0) {
          const rows = result.data as string[][];
          setHeaders(rows[0] || []);
          const dataRows = rows.slice(1);
          setTotalRows(dataRows.length);
          setData(dataRows);
        }
      } else if (isExcelFile(filename) && fileUrl) {
        // Fetch and parse Excel file
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: SPREADSHEET_ROW_LIMIT + 1 });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get total row count from range
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        setTotalRows(range.e.r); // End row

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        if (jsonData.length > 0) {
          setHeaders((jsonData[0] as string[]).map(h => String(h ?? '')));
          setData(jsonData.slice(1).map(row => (row as string[]).map(c => String(c ?? ''))));
        }
      }
    } catch (err) {
      setError(`Failed to parse file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldLoad) {
      parseData();
    }
  }, [shouldLoad, content, filename, fileUrl]);

  // Show load prompt for large files
  if (!shouldLoad && !loading && data.length === 0) {
    return (
      <LargeFilePrompt
        filename={filename}
        size={fileSize}
        sizeFormatted={`${(fileSize / (1024 * 1024)).toFixed(1)} MB`}
        onLoad={() => setShouldLoad(true)}
        downloadUrl={fileUrl || ''}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw size={24} className="text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading spreadsheet...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        <Table size={32} className="mx-auto mb-2 opacity-50" />
        <p>No data found in spreadsheet</p>
      </div>
    );
  }

  const visibleData = data.slice(0, displayedRows);
  const hasMore = data.length > displayedRows || totalRows > data.length;

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 border-b border-slate-700 bg-slate-800">
              #
            </th>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-xs font-medium text-indigo-400 border-b border-slate-700 bg-slate-800 whitespace-nowrap"
              >
                {header || `Column ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}
            >
              <td className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700/50 font-mono">
                {rowIndex + 1}
              </td>
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="px-3 py-2 text-slate-300 border-b border-slate-700/50 whitespace-nowrap"
                >
                  {row[colIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sticky bottom-0 bg-slate-800 px-3 py-2 text-xs border-t border-slate-700 flex items-center justify-between">
        <span className="text-slate-500">
          Showing {visibleData.length} of {totalRows > 0 ? `~${totalRows}` : data.length} rows × {headers.length} columns
        </span>
        {hasMore && displayedRows < data.length && (
          <button
            onClick={() => setDisplayedRows(prev => Math.min(prev + SPREADSHEET_ROW_LIMIT, data.length))}
            className="text-indigo-400 hover:text-indigo-300 text-xs"
          >
            Load {Math.min(SPREADSHEET_ROW_LIMIT, data.length - displayedRows)} more rows
          </button>
        )}
        {totalRows > data.length && (
          <span className="text-amber-400 text-xs">
            (Preview limited - download for full data)
          </span>
        )}
      </div>
    </div>
  );
}

// DOCX Viewer Component
function DocxViewer({ fileUrl, fileSize = 0 }: { fileUrl: string; fileSize?: number }) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [shouldLoad, setShouldLoad] = useState(fileSize < PREVIEW_SIZE_LIMITS.office);

  const parseDocx = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtml(result.value);

      if (result.messages.length > 0) {
        console.log('DOCX conversion messages:', result.messages);
      }
    } catch (err) {
      setError(`Failed to parse document: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldLoad) {
      parseDocx();
    }
  }, [shouldLoad, fileUrl]);

  // Show load prompt for large files
  if (!shouldLoad && !loading && !html) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <FileText size={48} className="mb-4 opacity-50" />
        <p className="text-lg mb-2">Large document ({(fileSize / (1024 * 1024)).toFixed(1)} MB)</p>
        <p className="text-sm text-slate-500 mb-4 text-center max-w-md">
          This file is large and may take a while to process.
        </p>
        <div className="flex gap-3">
          <a
            href={fileUrl}
            download
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Download size={16} />
            Download
          </a>
          <button
            onClick={() => setShouldLoad(true)}
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <FileText size={16} />
            Load Preview
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw size={24} className="text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="prose prose-invert prose-sm max-w-none overflow-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type ViewMode = 'notes' | 'data' | 'terminal';

const LAST_PROJECT_KEY = 'workspace_last_project';

export default function WorkspacePage() {
  // Projects state
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Text files state (for Notes view - all readable files in project)
  const [textFiles, setTextFiles] = useState<WorkspaceDataItem[]>([]);
  const [loadingTextFiles, setLoadingTextFiles] = useState(false);
  const [selectedTextFile, setSelectedTextFile] = useState<WorkspaceDataItem | null>(null);
  const [textFileContent, setTextFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [skipLargeFileLoad, setSkipLargeFileLoad] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('notes');

  // Terminal state
  const { user } = useAuth();
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [terminalWorkspaceDir, setTerminalWorkspaceDir] = useState<string>('');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [isStartingTerminal, setIsStartingTerminal] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState('');
  const [projectSessions, setProjectSessions] = useState<any[]>([]);
  const [loadingProjectSessions, setLoadingProjectSessions] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(true);

  // Import data modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'web'>('github');
  const [importUrl, setImportUrl] = useState('');
  const [importBranch, setImportBranch] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Terminal mode state
  const [terminalMode, setTerminalMode] = useState<'claude' | 'ssh'>('claude');
  const [accessKey, setAccessKey] = useState('');
  const [showUseCases, setShowUseCases] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');


  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New note modal state
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteFilename, setNewNoteFilename] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize browser session ID for terminal
  useEffect(() => {
    const storedId = localStorage.getItem('workspace-browser-session-id');
    if (storedId) {
      setBrowserSessionId(storedId);
    } else {
      const newId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem('workspace-browser-session-id', newId);
      setBrowserSessionId(newId);
    }
  }, []);

  // Start terminal session for current project
  const startTerminalSession = async (mode: 'claude' | 'ssh' = 'claude', key?: string) => {
    if (!selectedProject || !user?.email || !browserSessionId) return;

    // SSH mode requires access key
    if (mode === 'ssh' && !key?.trim()) {
      showToast('Access key is required for SSH terminal', 'error');
      return;
    }

    setIsStartingTerminal(true);
    try {
      const formData = new FormData();
      formData.append('session_id', browserSessionId);
      formData.append('email', user.email);
      formData.append('project_name', selectedProject);
      formData.append('title', selectedProject);

      // Add access key for SSH mode
      if (mode === 'ssh' && key) {
        formData.append('access_key', key);
      }

      const res = await fetch(`${getApiUrl()}/ccresearch/sessions`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Failed to start terminal' }));
        throw new Error(error.detail || 'Failed to start terminal');
      }

      const session = await res.json();
      setTerminalSessionId(session.id);
      setTerminalWorkspaceDir(session.workspace_dir || '');
      setAccessKey(''); // Clear access key after successful start
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
      });
      setTerminalSessionId(null);
      setTerminalWorkspaceDir('');
      setTerminalConnected(false);
      showToast('Terminal stopped', 'success');
    } catch (error) {
      // Ignore termination errors
    }
  };

  // Import data from GitHub
  const importFromGitHub = async () => {
    if (!terminalSessionId || !importUrl.trim()) return;

    setIsImporting(true);
    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/clone-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: importUrl.trim(),
          branch: importBranch.trim() || undefined,
          target_path: 'data',
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Clone failed' }));
        throw new Error(error.detail || 'Failed to clone repository');
      }

      const result = await res.json();
      showToast(`Cloned ${result.repo_name} successfully`, 'success');
      setShowImportModal(false);
      setImportUrl('');
      setImportBranch('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to clone repository', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Import data from Web URL
  const importFromWeb = async () => {
    if (!terminalSessionId || !importUrl.trim()) return;

    setIsImporting(true);
    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: importUrl.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Fetch failed' }));
        throw new Error(error.detail || 'Failed to fetch URL');
      }

      const result = await res.json();
      showToast(`Saved ${result.filename}`, 'success');
      setShowImportModal(false);
      setImportUrl('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to fetch URL', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (importType === 'github') {
      importFromGitHub();
    } else {
      importFromWeb();
    }
  };

  // Upload files to terminal session
  const handleTerminalUpload = async (files: File[], targetPath: string) => {
    if (!terminalSessionId) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('target_path', targetPath || 'data');

    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
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
        headers: { 'Content-Type': 'application/json' },
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

  // Load sessions for the current project (for Terminal tab)
  const loadProjectSessions = useCallback(async () => {
    if (!selectedProject || !browserSessionId) return;

    try {
      setLoadingProjectSessions(true);
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${browserSessionId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const sessions = await res.json();
        // Filter to sessions that match this project name
        const projectMatches = sessions.filter((s: any) =>
          s.workspace_project === selectedProject || s.title === selectedProject
        );
        setProjectSessions(projectMatches);
      }
    } catch (error) {
      console.error('Failed to load project sessions:', error);
    } finally {
      setLoadingProjectSessions(false);
    }
  }, [selectedProject, browserSessionId]);

  // Reset terminal when project changes
  useEffect(() => {
    setTerminalSessionId(null);
    setTerminalWorkspaceDir('');
    setTerminalConnected(false);
    setProjectSessions([]);
  }, [selectedProject]);

  // Load project sessions when switching to terminal view or project changes
  useEffect(() => {
    if (viewMode === 'terminal' && selectedProject && browserSessionId) {
      loadProjectSessions();
    }
  }, [viewMode, selectedProject, browserSessionId, loadProjectSessions]);

  // Save selected project to localStorage when it changes
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem(LAST_PROJECT_KEY, selectedProject);
    }
  }, [selectedProject]);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await workspaceApi.listProjects();
      setProjects(data);

      // Check if saved project exists, otherwise use first project
      if (typeof window !== 'undefined') {
        const savedProject = localStorage.getItem(LAST_PROJECT_KEY);
        if (savedProject && data.some(p => p.name === savedProject)) {
          setSelectedProject(savedProject);
          return; // Don't fall through
        }
      }
      // No saved project or it doesn't exist - select first
      if (data.length > 0) {
        setSelectedProject(data[0].name);
      }
    } catch (error) {
      showToast('Failed to load projects', 'error');
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Load text files for selected project (for Notes view)
  const loadTextFiles = useCallback(async () => {
    if (!selectedProject) {
      setTextFiles([]);
      return;
    }

    try {
      setLoadingTextFiles(true);
      const data = await workspaceApi.listTextFiles(selectedProject);
      setTextFiles(data);
    } catch (error) {
      showToast('Failed to load text files', 'error');
      console.error('Failed to load text files:', error);
    } finally {
      setLoadingTextFiles(false);
    }
  }, [selectedProject]);

  // Load content of selected text file
  const loadTextFileContent = useCallback(async (file: WorkspaceDataItem, forceLoad = false) => {
    if (!selectedProject) return;

    // Check if file is too large for text preview (skip for media/binary files)
    const isLargeTextFile = isTextBasedFile(file.name) && (file.size || 0) > PREVIEW_SIZE_LIMITS.text;
    if (isLargeTextFile && !forceLoad) {
      setSkipLargeFileLoad(true);
      setTextFileContent('');
      setLoadingContent(false);
      return;
    }

    setSkipLargeFileLoad(false);
    try {
      setLoadingContent(true);
      const content = await workspaceApi.getFileContent(selectedProject, file.path);
      setTextFileContent(content);
    } catch (error) {
      showToast('Failed to load file content', 'error');
      console.error('Failed to load file content:', error);
      setTextFileContent('');
    } finally {
      setLoadingContent(false);
    }
  }, [selectedProject]);

  // Initial load
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load content when project or view changes
  useEffect(() => {
    if (selectedProject) {
      if (viewMode === 'notes') {
        loadTextFiles();
        setSelectedTextFile(null);
        setTextFileContent('');
      }
    }
  }, [selectedProject, viewMode, loadTextFiles]);

  // Load file content when a text file is selected
  useEffect(() => {
    if (selectedTextFile) {
      loadTextFileContent(selectedTextFile);
    }
  }, [selectedTextFile, loadTextFileContent]);

  // Auto-refresh text files every 10 seconds (for Notes view)
  useEffect(() => {
    if (viewMode !== 'notes' || !selectedProject) return;

    const interval = setInterval(() => {
      workspaceApi.listTextFiles(selectedProject).then(data => {
        setTextFiles(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            return data;
          }
          return prev;
        });
      }).catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [viewMode, selectedProject]);

  // Create project
  const handleCreateProject = async (name: string) => {
    try {
      const project = await workspaceApi.createProject(name);
      setProjects(prev => [project, ...prev]);
      setSelectedProject(project.name);
      showToast('Project created');
    } catch (error: any) {
      showToast(error.message || 'Failed to create project', 'error');
    }
  };

  // Delete project
  const handleDeleteProject = async (name: string) => {
    if (!confirm(`Delete project "${name}" and all its contents?`)) return;

    try {
      await workspaceApi.deleteProject(name);
      setProjects(prev => prev.filter(p => p.name !== name));
      if (selectedProject === name) {
        setSelectedProject(projects.length > 1 ? projects.find(p => p.name !== name)?.name || null : null);
      }
      showToast('Project deleted');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete project', 'error');
    }
  };

  // Handle text file selection
  const handleSelectTextFile = (file: WorkspaceDataItem) => {
    setSelectedTextFile(file);
  };

  // Close text file preview
  const handleClosePreview = () => {
    setSelectedTextFile(null);
    setTextFileContent('');
  };

  // Create new note
  const handleCreateNewNote = async () => {
    if (!selectedProject) {
      showToast('Select a project first', 'error');
      return;
    }

    // Validate filename
    let filename = newNoteFilename.trim();
    if (!filename) {
      showToast('Enter a filename', 'error');
      return;
    }

    // Add .md extension if no extension provided
    if (!filename.includes('.')) {
      filename += '.md';
    }

    // Validate extension
    const validExtensions = ['.md', '.txt', '.mmd', '.markdown', '.log', '.json', '.yaml', '.yml', '.csv'];
    const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      showToast('Only text files allowed (.md, .txt, .mmd, etc.)', 'error');
      return;
    }

    try {
      setIsCreatingNote(true);
      await workspaceApi.saveFileContent(selectedProject, filename, newNoteContent, true);
      showToast(`Note "${filename}" created`);
      setShowNewNoteModal(false);
      setNewNoteFilename('');
      setNewNoteContent('');
      loadTextFiles(); // Refresh the file list
    } catch (error: any) {
      showToast(error.message || 'Failed to create note', 'error');
    } finally {
      setIsCreatingNote(false);
    }
  };

  // Filter text files by search query
  const filteredTextFiles = textFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* New Note Modal */}
      {showNewNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-emerald-400" />
                New Note
              </h2>
              <button
                onClick={() => {
                  setShowNewNoteModal(false);
                  setNewNoteFilename('');
                  setNewNoteContent('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Filename */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Filename
                </label>
                <input
                  type="text"
                  value={newNoteFilename}
                  onChange={(e) => setNewNoteFilename(e.target.value)}
                  placeholder="my-note.md"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  .md extension added automatically if not specified
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Content <span className="text-slate-500 font-normal">(optional - paste or type)</span>
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="# My Note&#10;&#10;Start writing here... or paste content from elsewhere."
                  rows={10}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewNoteModal(false);
                    setNewNoteFilename('');
                    setNewNoteContent('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewNote}
                  disabled={isCreatingNote || !newNoteFilename.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingNote ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <Home size={20} />
            </Link>
            <h1 className="text-xl font-bold text-white">Workspace</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>

            {/* New Note Button - only show in notes view with selected project */}
            {viewMode === 'notes' && selectedProject && (
              <button
                onClick={() => setShowNewNoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
                title="Create a new note"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Note</span>
              </button>
            )}

            {/* Tips Link */}
            <Link
              href="/ccresearch/tips"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 rounded-lg transition-colors text-sm"
              title="Prompting tips & best practices"
            >
              <Lightbulb size={16} />
              <span className="hidden sm:inline">Tips</span>
            </Link>

            {/* View toggle */}
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('notes')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'notes'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText size={16} className="inline-block mr-1" />
                Notes
              </button>
              <button
                onClick={() => setViewMode('data')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'data'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FolderOpen size={16} className="inline-block mr-1" />
                Files
              </button>
              <button
                onClick={() => setViewMode('terminal')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'terminal'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Terminal size={16} className="inline-block mr-1" />
                Terminal
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Project Sidebar */}
        <ProjectSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          loading={loadingProjects}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FolderOpen size={48} className="mb-4 opacity-50" />
              <p className="text-lg">Select or create a project to get started</p>
            </div>
          ) : viewMode === 'notes' ? (
            <div className="h-full flex">
              {/* Text Files List */}
              <div className={`${selectedTextFile ? 'w-1/3 border-r border-slate-700' : 'w-full'} overflow-y-auto`}>
                {loadingTextFiles ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw size={24} className="text-slate-400 animate-spin" />
                  </div>
                ) : filteredTextFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <FileText size={48} className="mb-4 opacity-50" />
                    <p className="text-lg mb-2">
                      {searchQuery ? 'No files match your search' : 'No text files yet'}
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                      Create a new note, upload files, or use Ask AI
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowNewNoteModal(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Create New Note
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {filteredTextFiles.map(file => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectTextFile(file)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selectedTextFile?.path === file.path
                            ? 'bg-indigo-600/20 border-l-2 border-indigo-500'
                            : 'hover:bg-slate-700/50'
                        }`}
                      >
                        {isImageFile(file.name) ? (
                          <Image size={18} className="flex-shrink-0 text-pink-400" />
                        ) : isVideoFile(file.name) ? (
                          <Video size={18} className="flex-shrink-0 text-red-400" />
                        ) : isAudioFile(file.name) ? (
                          <Music size={18} className="flex-shrink-0 text-cyan-400" />
                        ) : isPdfFile(file.name) ? (
                          <FileType size={18} className="flex-shrink-0 text-orange-400" />
                        ) : isSpreadsheet(file.name) ? (
                          <FileSpreadsheet size={18} className="flex-shrink-0 text-emerald-400" />
                        ) : isDocxFile(file.name) ? (
                          <FileText size={18} className="flex-shrink-0 text-blue-400" />
                        ) : isJsonFile(file.name) ? (
                          <FileJson size={18} className="flex-shrink-0 text-amber-400" />
                        ) : isMarkdownFile(file.name) || isMermaidFile(file.name) ? (
                          <FileText size={18} className="flex-shrink-0 text-indigo-400" />
                        ) : isYamlFile(file.name) ? (
                          <FileCode size={18} className="flex-shrink-0 text-purple-400" />
                        ) : isLogFile(file.name) ? (
                          <FileText size={18} className="flex-shrink-0 text-emerald-400" />
                        ) : (
                          <FileText size={18} className="flex-shrink-0 text-slate-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{file.name}</p>
                          <p className="text-slate-500 text-xs truncate">{file.path}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-slate-400 text-xs">{file.sizeFormatted}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(file.modifiedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Text File Preview */}
              {selectedTextFile && selectedProject && (
                <div className="w-2/3 h-full flex flex-col bg-slate-800/30">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 min-w-0">
                      {isImageFile(selectedTextFile.name) ? (
                        <Image size={16} className="text-pink-400 flex-shrink-0" />
                      ) : isVideoFile(selectedTextFile.name) ? (
                        <Video size={16} className="text-red-400 flex-shrink-0" />
                      ) : isAudioFile(selectedTextFile.name) ? (
                        <Music size={16} className="text-cyan-400 flex-shrink-0" />
                      ) : isPdfFile(selectedTextFile.name) ? (
                        <FileType size={16} className="text-orange-400 flex-shrink-0" />
                      ) : isSpreadsheet(selectedTextFile.name) ? (
                        <FileSpreadsheet size={16} className="text-emerald-400 flex-shrink-0" />
                      ) : isDocxFile(selectedTextFile.name) ? (
                        <FileText size={16} className="text-blue-400 flex-shrink-0" />
                      ) : isJsonFile(selectedTextFile.name) ? (
                        <FileJson size={16} className="text-amber-400 flex-shrink-0" />
                      ) : isMarkdownFile(selectedTextFile.name) || isMermaidFile(selectedTextFile.name) ? (
                        <FileText size={16} className="text-indigo-400 flex-shrink-0" />
                      ) : isYamlFile(selectedTextFile.name) ? (
                        <FileCode size={16} className="text-purple-400 flex-shrink-0" />
                      ) : isLogFile(selectedTextFile.name) ? (
                        <FileText size={16} className="text-emerald-400 flex-shrink-0" />
                      ) : (
                        <FileText size={16} className="text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-white font-medium truncate">{selectedTextFile.name}</span>
                      <span className="text-slate-500 text-xs">({selectedTextFile.sizeFormatted})</span>
                      <span className="text-slate-600 text-xs px-2 py-0.5 bg-slate-700/50 rounded">
                        {getFileExtension(selectedTextFile.name).toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={handleClosePreview}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingContent ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw size={24} className="text-slate-400 animate-spin" />
                      </div>
                    ) : skipLargeFileLoad && isTextBasedFile(selectedTextFile.name) ? (
                      /* Large text file - show download prompt */
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p className="text-lg mb-2">Large file ({selectedTextFile.sizeFormatted})</p>
                        <p className="text-sm text-slate-500 mb-4 text-center max-w-md">
                          This file is large and may slow down your browser. You can download it or load a preview.
                        </p>
                        <div className="flex gap-3">
                          <a
                            href={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                            download={selectedTextFile.name}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            <Download size={16} />
                            Download
                          </a>
                          <button
                            onClick={() => loadTextFileContent(selectedTextFile, true)}
                            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            <FileText size={16} />
                            Load Preview
                          </button>
                        </div>
                      </div>
                    ) : isMermaidFile(selectedTextFile.name) ? (
                      /* Mermaid Diagram */
                      <div>
                        <MermaidDiagram code={textFileContent} id={`preview-${Date.now()}`} />
                        <details className="mt-4">
                          <summary className="text-slate-400 text-sm cursor-pointer hover:text-white">Show source code</summary>
                          <pre className="mt-2 bg-slate-800 rounded-lg p-4 overflow-x-auto">
                            <code className="text-sm text-slate-300 font-mono">{textFileContent}</code>
                          </pre>
                        </details>
                      </div>
                    ) : isMarkdownFile(selectedTextFile.name) ? (
                      /* Markdown Rendering */
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-2xl font-bold text-white mt-6 mb-3 first:mt-0">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-xl font-semibold text-slate-200 mt-5 mb-2">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-2">{children}</h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-slate-300 my-2 leading-relaxed">{children}</p>
                            ),
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside my-2 space-y-1 text-slate-300">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside my-2 space-y-1 text-slate-300">{children}</ol>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-indigo-500 pl-4 my-3 text-slate-400 italic">{children}</blockquote>
                            ),
                            code: ({ className, children }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const language = match ? match[1] : '';
                              const codeString = String(children).replace(/\n$/, '');

                              if (language === 'mermaid') {
                                return <MermaidDiagram code={codeString} id={`md-inline-${Date.now()}`} />;
                              }

                              if (className || codeString.includes('\n')) {
                                return (
                                  <pre className="bg-slate-800 rounded-lg p-4 my-3 overflow-x-auto">
                                    <code className="text-sm text-slate-300 font-mono">{children}</code>
                                  </pre>
                                );
                              }

                              return (
                                <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-indigo-300 font-mono">{children}</code>
                              );
                            },
                            pre: ({ children }) => <>{children}</>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-slate-600">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
                            th: ({ children }) => (
                              <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200 border border-slate-600">{children}</th>
                            ),
                            td: ({ children }) => (
                              <td className="px-4 py-2 text-sm text-slate-300 border border-slate-600">{children}</td>
                            ),
                            hr: () => <hr className="border-slate-700 my-6" />,
                            img: ({ src, alt }) => <img src={src} alt={alt || ''} className="max-w-full rounded-lg my-3" />,
                            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                          }}
                        >
                          {textFileContent}
                        </ReactMarkdown>
                      </div>
                    ) : isJsonFile(selectedTextFile.name) ? (
                      /* JSON Viewer */
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <JsonViewer content={textFileContent} />
                      </div>
                    ) : isYamlFile(selectedTextFile.name) ? (
                      /* YAML with syntax highlighting */
                      <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                        {textFileContent.split('\n').map((line, i) => {
                          // Basic YAML highlighting
                          const keyMatch = line.match(/^(\s*)([^:]+):/);
                          if (keyMatch) {
                            const [, indent, key] = keyMatch;
                            const rest = line.slice(indent.length + key.length + 1);
                            return (
                              <div key={i}>
                                <span className="text-slate-500">{indent}</span>
                                <span className="text-indigo-400">{key}</span>
                                <span className="text-slate-400">:</span>
                                <span className="text-emerald-400">{rest}</span>
                              </div>
                            );
                          }
                          if (line.trim().startsWith('#')) {
                            return <div key={i} className="text-slate-500">{line}</div>;
                          }
                          if (line.trim().startsWith('-')) {
                            return <div key={i} className="text-amber-400">{line}</div>;
                          }
                          return <div key={i} className="text-slate-300">{line}</div>;
                        })}
                      </pre>
                    ) : isLogFile(selectedTextFile.name) ? (
                      /* Log file with line highlighting */
                      <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                        {textFileContent.split('\n').map((line, i) => {
                          // Color-code log levels
                          const lower = line.toLowerCase();
                          let className = 'text-slate-300';
                          if (lower.includes('error') || lower.includes('fail') || lower.includes('exception')) {
                            className = 'text-red-400';
                          } else if (lower.includes('warn')) {
                            className = 'text-amber-400';
                          } else if (lower.includes('info')) {
                            className = 'text-blue-400';
                          } else if (lower.includes('debug')) {
                            className = 'text-slate-500';
                          } else if (lower.includes('success') || lower.includes('✓') || lower.includes('complete')) {
                            className = 'text-emerald-400';
                          }
                          return <div key={i} className={className}>{line}</div>;
                        })}
                      </pre>
                    ) : isImageFile(selectedTextFile.name) ? (
                      /* Image Preview */
                      <div className="flex items-center justify-center h-full">
                        <img
                          src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                          alt={selectedTextFile.name}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                      </div>
                    ) : isVideoFile(selectedTextFile.name) ? (
                      /* Video Preview */
                      <div className="flex items-center justify-center h-full">
                        <video
                          src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                          controls
                          className="max-w-full max-h-full rounded-lg shadow-lg"
                        >
                          Your browser does not support video playback.
                        </video>
                      </div>
                    ) : isAudioFile(selectedTextFile.name) ? (
                      /* Audio Preview */
                      <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center">
                          <Music size={48} className="text-cyan-400" />
                        </div>
                        <p className="text-white font-medium">{selectedTextFile.name}</p>
                        <audio
                          src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                          controls
                          className="w-full max-w-md"
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    ) : isPdfFile(selectedTextFile.name) ? (
                      /* PDF Preview */
                      <div className="h-full">
                        <iframe
                          src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                          className="w-full h-full rounded-lg border border-slate-700"
                          title={selectedTextFile.name}
                        />
                      </div>
                    ) : isSpreadsheet(selectedTextFile.name) ? (
                      /* CSV/Excel Table Preview */
                      <SpreadsheetViewer
                        content={isCsvFile(selectedTextFile.name) ? textFileContent : undefined}
                        filename={selectedTextFile.name}
                        fileSize={selectedTextFile.size}
                        fileUrl={isExcelFile(selectedTextFile.name) ?
                          `${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`
                          : undefined
                        }
                      />
                    ) : isDocxFile(selectedTextFile.name) ? (
                      /* DOCX Preview */
                      <DocxViewer
                        fileUrl={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                        fileSize={selectedTextFile.size}
                      />
                    ) : (
                      /* Plain text (default) */
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {textFileContent}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === 'data' ? (
            <DataBrowser projectName={selectedProject} />
          ) : (
            /* Terminal View - Embedded Claude Code Terminal */
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
                </div>
                <div className="flex items-center gap-2">
                  {terminalSessionId && (
                    <>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded text-sm transition-colors"
                        title="Import data from GitHub or Web"
                      >
                        <Download size={14} />
                        Import Data
                      </button>
                      <button
                        onClick={() => setShowFileBrowser(!showFileBrowser)}
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
                    </>
                  )}
                  {terminalSessionId ? (
                    <button
                      onClick={stopTerminalSession}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                    >
                      <Power size={14} />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startTerminalSession(terminalMode, accessKey)}
                      disabled={isStartingTerminal || !user?.email}
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
                      />
                    </div>
                    {/* File Browser Sidebar */}
                    {showFileBrowser && (
                      <div className="w-80 border-l border-slate-700 bg-slate-900/50 flex-shrink-0 overflow-hidden">
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
                    <div className="flex-shrink-0 grid grid-cols-4 gap-2 p-4 border-b border-slate-800">
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-emerald-400">140+</div>
                        <div className="text-xs text-slate-500">Skills</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-blue-400">26</div>
                        <div className="text-xs text-slate-500">MCP Servers</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-purple-400">13</div>
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
                          onClick={() => setTerminalMode('claude')}
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
                          onClick={() => setTerminalMode('ssh')}
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

                      {/* Access Key Input (SSH mode only) */}
                      {terminalMode === 'ssh' && (
                        <div className="mb-4">
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
                          <p className="text-xs text-slate-500 mt-1">
                            SSH mode provides direct bash access without Claude
                          </p>
                        </div>
                      )}

                      {/* Start Button */}
                      <button
                        onClick={() => startTerminalSession(terminalMode, accessKey)}
                        disabled={isStartingTerminal || !user?.email || (terminalMode === 'ssh' && !accessKey.trim())}
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
                      {!user?.email && (
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
            </div>
          )}
        </main>
      </div>
    </div>

    {/* Import Data Modal */}
    {showImportModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Download size={20} className="text-indigo-400" />
              Import Data
            </h3>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportUrl('');
                setImportBranch('');
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  importType === 'web'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Globe size={16} />
                Web URL
              </button>
            </div>

            {/* GitHub Import */}
            {importType === 'github' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Branch (optional)
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
                  Repository will be cloned into the data/ folder
                </p>
              </div>
            )}

            {/* Web URL Import */}
            {importType === 'web' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Web URL
                  </label>
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Page content will be saved as a markdown file
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportUrl('');
                setImportBranch('');
              }}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !importUrl.trim()}
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
    </ProtectedRoute>
  );
}
