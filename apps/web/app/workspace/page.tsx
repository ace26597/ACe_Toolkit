'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FolderOpen, FileText, RefreshCw, Home, Globe, Github, X, ChevronRight, Clock, MessageSquare, Loader2, Download, Terminal, Plus, FileCode, FileJson, Square, Image, Video, Music, FileType, Sparkles, Bot, Upload, Table, FileSpreadsheet, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import ProjectSidebar from '@/components/workspace/ProjectSidebar';
import DataBrowser from '@/components/workspace/DataBrowser';
import { workspaceApi, WorkspaceProject, WorkspaceDataItem } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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

// Dynamic API URL based on hostname (production vs local)
function getApiUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  const hostname = window.location.hostname;
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk') {
    return 'https://api.orpheuscore.uk';
  }
  if (hostname === 'ai.ultronsolar.in' || hostname === 'www.ultronsolar.in') {
    return 'https://api.ultronsolar.in';
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}

const API_URL = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

type ViewMode = 'notes' | 'data' | 'research';
type SourceType = 'web' | 'github';

interface ResearchSession {
  id: string;
  project_name: string;
  claude_session_id: string | null;
  source_type: string;
  urls: string[];
  initial_prompt: string;
  status: string;
  error_message: string | null;
  created_at: string;
  last_activity: string;
  conversation_turns: number;
  last_response: string | null;
}

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

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceType, setImportSourceType] = useState<SourceType>('web');
  const [importUrls, setImportUrls] = useState<string[]>(['']);
  const [importPrompt, setImportPrompt] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Research sessions state
  const [researchSessions, setResearchSessions] = useState<ResearchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);

  // Streaming log state
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  // Get WebSocket URL
  const getWsUrl = () => {
    const apiUrl = getApiUrl();
    return apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  };

  // Connect to streaming WebSocket
  const connectToStream = useCallback((sessionId: string) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStreamingLog('Connecting to session stream...\n');
    setIsStreaming(true);

    const wsUrl = `${getWsUrl()}/import-research/sessions/${sessionId}/stream`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStreamingLog(prev => prev + '=== Connected to stream ===\n\n');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'log') {
          setStreamingLog(prev => prev + data.content);
          // Auto-scroll to bottom
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        } else if (data.type === 'complete') {
          setStreamingLog(prev => prev + `\n\n=== Session Complete (${data.status}) ===\n`);
          setIsStreaming(false);
        } else if (data.type === 'error') {
          setStreamingLog(prev => prev + `\n\n=== Error: ${data.message} ===\n`);
          setIsStreaming(false);
        }
      } catch (e) {
        // Plain text message
        setStreamingLog(prev => prev + event.data);
      }
    };

    ws.onerror = () => {
      setStreamingLog(prev => prev + '\n\n=== Connection error ===\n');
      setIsStreaming(false);
    };

    ws.onclose = () => {
      setStreamingLog(prev => prev + '\n\n=== Connection closed ===\n');
      setIsStreaming(false);
    };
  }, []);

  // Disconnect from stream
  const disconnectStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Auto-connect when viewing a processing session
  useEffect(() => {
    if (selectedSession && (selectedSession.status === 'processing' || selectedSession.status === 'crawling')) {
      connectToStream(selectedSession.id);
    } else {
      disconnectStream();
      setStreamingLog('');
    }

    return () => {
      disconnectStream();
    };
  }, [selectedSession?.id, selectedSession?.status, connectToStream, disconnectStream]);

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

  // Load research sessions for selected project
  const loadResearchSessions = useCallback(async () => {
    if (!selectedProject) {
      setResearchSessions([]);
      setSelectedSession(null);
      return;
    }

    try {
      setLoadingSessions(true);
      const res = await fetch(`${API_URL}/import-research/sessions?project_name=${encodeURIComponent(selectedProject)}`);
      if (res.ok) {
        const data = await res.json();
        setResearchSessions(data);
        // Auto-select the first (only) session for this project
        if (data.length > 0) {
          setSelectedSession(data[0]);
          // Connect to stream if session is processing
          if (data[0].status === 'processing' || data[0].status === 'crawling') {
            connectToStream(data[0].id);
          }
        } else {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to load research sessions:', error);
    } finally {
      setLoadingSessions(false);
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
      } else if (viewMode === 'research') {
        loadResearchSessions();
      }
    }
  }, [selectedProject, viewMode, loadTextFiles, loadResearchSessions]);

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

  // Refresh session status periodically
  useEffect(() => {
    if (viewMode !== 'research' || !selectedProject) return;

    const interval = setInterval(() => {
      loadResearchSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, [viewMode, selectedProject, loadResearchSessions]);

  // Reload sessions when streaming completes
  useEffect(() => {
    if (!isStreaming && streamingLog.includes('=== Session Complete')) {
      loadResearchSessions();
    }
  }, [isStreaming, streamingLog, loadResearchSessions]);

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

  // Add URL input
  const handleAddUrl = () => {
    setImportUrls(prev => [...prev, '']);
  };

  // Update URL
  const handleUpdateUrl = (index: number, value: string) => {
    setImportUrls(prev => prev.map((url, i) => i === index ? value : url));
  };

  // Remove URL
  const handleRemoveUrl = (index: number) => {
    if (importUrls.length > 1) {
      setImportUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Start import or chat
  const handleStartImport = async () => {
    if (!selectedProject) {
      showToast('Select a project first', 'error');
      return;
    }

    if (!importPrompt.trim()) {
      showToast('Enter a prompt', 'error');
      return;
    }

    const validUrls = importUrls.filter(url => url.trim());
    const hasUrls = validUrls.length > 0;

    try {
      setIsImporting(true);

      const res = await fetch(`${API_URL}/import-research/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: selectedProject,
          urls: validUrls,
          prompt: importPrompt.trim(),
          source_type: hasUrls ? importSourceType : 'chat',
          auto_process: true, // Always true - chat mode skips crawling automatically
          auto_run: true
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
        throw new Error(error.detail || 'Failed to create session');
      }

      const session = await res.json();

      showToast(hasUrls ? 'Import started! Processing sources...' : 'Starting conversation...');
      setShowImportModal(false);
      setImportUrls(['']);
      setImportPrompt('');
      setViewMode('research');
      loadResearchSessions();

    } catch (error: any) {
      showToast(error.message || 'Failed to start', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Continue conversation
  const handleContinueConversation = async () => {
    if (!selectedSession || !continuePrompt.trim()) return;

    try {
      setIsContinuing(true);
      const sessionId = selectedSession.id;
      const prompt = continuePrompt.trim();
      setContinuePrompt('');

      // Update session status locally to show processing state
      setSelectedSession(prev => prev ? { ...prev, status: 'processing' } : null);

      // Connect to stream immediately to see live output
      connectToStream(sessionId);

      // Send the continue request (don't wait for it to complete)
      fetch(`${API_URL}/import-research/sessions/${sessionId}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ detail: 'Failed to continue' }));
          showToast(error.detail || 'Failed to continue conversation', 'error');
        }
        // Refresh sessions when done
        loadResearchSessions();
      }).catch((error) => {
        showToast(error.message || 'Failed to continue', 'error');
      }).finally(() => {
        setIsContinuing(false);
      });

    } catch (error: any) {
      showToast(error.message || 'Failed to continue', 'error');
      setIsContinuing(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this research session?')) return;

    try {
      await fetch(`${API_URL}/import-research/sessions/${sessionId}`, { method: 'DELETE' });
      setResearchSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      showToast('Session deleted');
    } catch (error: any) {
      showToast('Failed to delete session', 'error');
    }
  };

  // Stop a running session
  const handleStopSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/import-research/sessions/${sessionId}/stop`, {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Failed to stop session');
      }

      showToast('Session stopped');
      disconnectStream();
      loadResearchSessions();

      // Refresh the selected session
      const updated = await fetch(`${API_URL}/import-research/sessions/${sessionId}`);
      if (updated.ok) {
        const sessionData = await updated.json();
        setSelectedSession(sessionData);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to stop session', 'error');
    }
  };

  // Filter notes by search
  // Filter text files by search query
  const filteredTextFiles = textFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'processing': case 'crawling': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

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

      {/* Ask AI Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-400" />
                Ask AI
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* URL/Repo Input (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL or GitHub repo <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {importUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        {url.includes('github.com') ? (
                          <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        ) : url.trim() ? (
                          <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        ) : (
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        )}
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => {
                            handleUpdateUrl(index, e.target.value);
                            // Auto-detect source type
                            if (e.target.value.includes('github.com')) {
                              setImportSourceType('github');
                            } else if (e.target.value.startsWith('http')) {
                              setImportSourceType('web');
                            }
                          }}
                          placeholder="https://docs.example.com or github.com/owner/repo"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      {importUrls.length > 1 && (
                        <button
                          onClick={() => handleRemoveUrl(index)}
                          className="px-2 text-slate-400 hover:text-red-400"
                          title="Remove URL"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {importUrls.some(u => u.trim()) && (
                    <button
                      onClick={handleAddUrl}
                      className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add another URL
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Leave empty to chat about project files • Paste URL to import & analyze
                </p>
              </div>

              {/* Quick Suggestions */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quick actions</label>
                <div className="flex flex-wrap gap-1.5">
                  {importUrls.some(u => u.includes('github.com')) ? (
                    // GitHub suggestions
                    <>
                      <button
                        onClick={() => setImportPrompt('Clone the repository and analyze the codebase. Create a summary of the architecture, main components, and how to get started.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Analyze repo structure
                      </button>
                      <button
                        onClick={() => setImportPrompt('Clone and review the code for [FEATURE]. Explain how it works and suggest improvements.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Review feature
                      </button>
                      <button
                        onClick={() => setImportPrompt('Clone the repo and create documentation including README, API docs, and usage examples.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Generate docs
                      </button>
                    </>
                  ) : importUrls.some(u => u.trim()) ? (
                    // Website suggestions
                    <>
                      <button
                        onClick={() => setImportPrompt('Crawl and extract all content from the website. Create a comprehensive summary of the key information.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Scrape all pages
                      </button>
                      <button
                        onClick={() => setImportPrompt('Crawl the website and extract data about [TOPIC]. Format as a structured report.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Extract specific data
                      </button>
                      <button
                        onClick={() => setImportPrompt('Import the documentation and create a getting started guide with code examples.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Create guide from docs
                      </button>
                    </>
                  ) : (
                    // Project analysis suggestions
                    <>
                      <button
                        onClick={() => setImportPrompt('Read all files in this project and summarize what it does, its structure, and key components.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Summarize project
                      </button>
                      <button
                        onClick={() => setImportPrompt('Analyze the uploaded data files and create a detailed report with insights and visualizations.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Analyze data
                      </button>
                      <button
                        onClick={() => setImportPrompt('Search PubMed and bioRxiv for recent papers about [TOPIC] and create a literature review.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Literature search
                      </button>
                      <button
                        onClick={() => setImportPrompt('Query the AACT clinical trials database for studies related to [CONDITION/DRUG] and summarize findings.')}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        Clinical trials
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What would you like Claude to do?
                </label>
                <textarea
                  value={importPrompt}
                  onChange={(e) => setImportPrompt(e.target.value)}
                  placeholder={importUrls.some(u => u.includes('github.com'))
                    ? "e.g., Clone and analyze the repo structure, review specific features..."
                    : importUrls.some(u => u.trim())
                    ? "e.g., Crawl and summarize the docs, extract data from pages..."
                    : "e.g., Summarize project files, analyze data, search literature..."
                  }
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
                {importPrompt.includes('[') && (
                  <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                    <span>💡</span> Replace [PLACEHOLDERS] with your specific values
                  </p>
                )}
              </div>

              {/* Capabilities hint - collapsed by default */}
              <details className="bg-slate-700/30 rounded-lg text-xs text-slate-400">
                <summary className="p-3 cursor-pointer hover:text-slate-300 flex items-center gap-2">
                  <span className="font-medium text-slate-300">What Claude can do</span>
                  <span className="text-slate-500">• Click to expand</span>
                </summary>
                <div className="px-3 pb-3 pt-1 border-t border-slate-600/50">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Read and analyze all files in your project</li>
                    <li>Import websites, docs, or GitHub repos</li>
                    <li>Connect to databases (AACT clinical trials, external DBs)</li>
                    <li>Search PubMed, bioRxiv, ChEMBL, and 15+ sources</li>
                    <li>Generate reports, summaries, and documentation</li>
                    <li>Create files, scripts, and visualizations</li>
                  </ul>
                  <Link
                    href="/ccresearch/tips"
                    target="_blank"
                    className="inline-flex items-center gap-1 mt-2 text-amber-400 hover:text-amber-300"
                  >
                    <Lightbulb size={12} />
                    View prompting tips & best practices
                  </Link>
                </div>
              </details>

              {/* Start button */}
              <button
                onClick={handleStartImport}
                disabled={isImporting || !importPrompt.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {importUrls.some(u => u.trim()) ? 'Import & Analyze' : 'Start'}
                  </>
                )}
              </button>
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
                onClick={() => {
                  setViewMode('research');
                  if (!researchSessions.length) {
                    setShowImportModal(true);
                  }
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'research'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles size={16} className="inline-block mr-1" />
                AI
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
            /* AI Research View - Single Session Per Project */
            <div className="h-full flex flex-col">
              {loadingSessions ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw size={24} className="text-slate-400 animate-spin" />
                </div>
              ) : !selectedSession ? (
                /* No session - show start button */
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Bot size={48} className="mb-4 opacity-50" />
                  <p className="text-lg mb-2">No AI conversation yet</p>
                  <p className="text-sm text-slate-500 mb-4 text-center max-w-md">
                    Start a conversation with Claude to analyze your project files,
                    import external content, or connect to databases.
                  </p>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
                  >
                    <Sparkles size={18} />
                    Start AI Conversation
                  </button>
                </div>
              ) : (
                /* Session exists - show terminal/output */
                <div className="h-full flex flex-col">
                  {/* Session Header */}
                  <div className="p-4 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {selectedSession.source_type === 'chat' ? (
                            <Bot size={16} className="text-purple-400" />
                          ) : selectedSession.source_type === 'web' ? (
                            <Globe size={16} className="text-indigo-400" />
                          ) : (
                            <Github size={16} className="text-slate-400" />
                          )}
                          <span className={`text-sm font-medium ${getStatusColor(selectedSession.status)}`}>
                            {selectedSession.status.toUpperCase()}
                          </span>
                          {selectedSession.error_message && (
                            <span className="text-red-400 text-xs">{selectedSession.error_message}</span>
                          )}
                        </div>
                        <p className="text-white font-medium">{selectedSession.initial_prompt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Stop button - only show when processing */}
                        {(selectedSession.status === 'processing' || selectedSession.status === 'crawling') && (
                          <button
                            onClick={() => handleStopSession(selectedSession.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            <Square size={12} fill="currentColor" />
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(selectedSession.id)}
                          className="text-slate-400 hover:text-red-400 p-2"
                          title="Delete session"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {selectedSession.urls && selectedSession.urls.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedSession.urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-700 text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded"
                          >
                            {url}
                          </a>
                        ))}
                      </div>
                    ) : selectedSession.source_type === 'chat' ? (
                      <div className="mt-2">
                        <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded">
                          Analyzing project files
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Response / Live Terminal */}
                  <div className="flex-1 overflow-hidden p-4">
                    {selectedSession.status === 'processing' || selectedSession.status === 'crawling' ? (
                      /* Live Terminal View - Human Readable */
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Terminal size={16} className="text-emerald-400" />
                            <span className="text-sm font-medium">Claude Working</span>
                            {isStreaming && (
                              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                Live
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {selectedSession.status === 'crawling' ? 'Fetching sources...' : 'Analyzing...'}
                          </span>
                        </div>
                        <div
                          ref={logContainerRef}
                          className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-sm overflow-y-auto border border-slate-700/50 shadow-inner"
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {streamingLog ? (
                            <div className="text-slate-200 leading-relaxed">
                              {streamingLog.split('\n').map((line, i) => {
                                // Color-code different line types
                                if (line.startsWith('╔') || line.startsWith('╚') || line.startsWith('║')) {
                                  return <div key={i} className="text-indigo-400">{line}</div>;
                                }
                                if (line.startsWith('🔧')) {
                                  return <div key={i} className="text-amber-400 mt-2">{line}</div>;
                                }
                                if (line.startsWith('   $')) {
                                  return <div key={i} className="text-cyan-400 text-xs ml-4">{line}</div>;
                                }
                                if (line.startsWith('   📄') || line.startsWith('   🔍')) {
                                  return <div key={i} className="text-cyan-400 text-xs ml-4">{line}</div>;
                                }
                                if (line.startsWith('   ✅')) {
                                  return <div key={i} className="text-green-400 text-xs ml-4">{line}</div>;
                                }
                                if (line.startsWith('   ❌')) {
                                  return <div key={i} className="text-red-400 text-xs ml-4">{line}</div>;
                                }
                                if (line.startsWith('✨') || line.startsWith('🏁')) {
                                  return <div key={i} className="text-emerald-400 mt-2">{line}</div>;
                                }
                                if (line.startsWith('─') || line.startsWith('═')) {
                                  return <div key={i} className="text-slate-600">{line}</div>;
                                }
                                if (line.startsWith('📅') || line.startsWith('📝')) {
                                  return <div key={i} className="text-slate-400 text-xs">{line}</div>;
                                }
                                if (line.includes('===')) {
                                  return <div key={i} className="text-slate-500 text-xs">{line}</div>;
                                }
                                // Regular text - Claude's response
                                return <div key={i} className="text-slate-100">{line}</div>;
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                              <Loader2 size={24} className="animate-spin mb-2" />
                              <span>
                                {selectedSession.status === 'crawling'
                                  ? 'Crawling sources...'
                                  : 'Starting Claude...'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedSession.last_response ? (
                      <div className="h-full overflow-y-auto">
                        <div className="prose prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-800/50 p-4 rounded-lg">
                            {selectedSession.last_response}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <p>No response yet</p>
                      </div>
                    )}
                  </div>

                  {/* Continue Input - Show when ready or error */}
                  {(selectedSession.status === 'ready' || selectedSession.status === 'error') && (
                    <div className="p-4 border-t border-slate-700">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={continuePrompt}
                          onChange={(e) => setContinuePrompt(e.target.value)}
                          placeholder={selectedSession.claude_session_id
                            ? "Continue the conversation..."
                            : "Ask a follow-up question..."
                          }
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isContinuing) {
                              handleContinueConversation();
                            }
                          }}
                        />
                        <button
                          onClick={handleContinueConversation}
                          disabled={isContinuing || !continuePrompt.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          {isContinuing ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteSession(selectedSession.id);
                            setShowImportModal(true);
                          }}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                          title="Start new conversation"
                        >
                          <Plus size={16} />
                          New
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
