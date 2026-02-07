'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileCode, FileJson, Image, Video, Music, FileType,
  FileSpreadsheet, RefreshCw, Plus, X, Download, Table, Loader2
} from 'lucide-react';
import NextImage from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import DOMPurify from 'isomorphic-dompurify';
import { workspaceApi, WorkspaceDataItem, getApiUrl } from '@/lib/api';

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
const isSpreadsheet = (filename: string) => isCsvFile(filename) || isExcelFile(filename);
const isTextBasedFile = (filename: string) => {
  const ext = getFileExtension(filename);
  const textExtensions = ['md', 'markdown', 'mmd', 'txt', 'log', 'json', 'jsonl', 'yaml', 'yml', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'py', 'sh', 'bash', 'gitignore', 'env'];
  return textExtensions.includes(ext) || !ext;
};

// Preview size limits (in bytes)
const PREVIEW_SIZE_LIMITS = {
  spreadsheet: 5 * 1024 * 1024,
  text: 2 * 1024 * 1024,
  office: 10 * 1024 * 1024,
};
const SPREADSHEET_ROW_LIMIT = 500;

// Mermaid Diagram Component
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
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true }, FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) }}
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
        let cls = 'text-amber-400';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-indigo-400';
          } else {
            cls = 'text-emerald-400';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-400';
        } else if (/null/.test(match)) {
          cls = 'text-slate-500';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  };

  const formatted = JSON.stringify(parsedJson, null, 2);
  const highlighted = syntaxHighlight(formatted);

  return (
    <pre
      className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlighted, { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] }) }}
    />
  );
}

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
        const Papa = (await import('papaparse')).default;
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
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: SPREADSHEET_ROW_LIMIT + 1 });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        setTotalRows(range.e.r);

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
          Showing {visibleData.length} of {totalRows > 0 ? `~${totalRows}` : data.length} rows x {headers.length} columns
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
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtml(result.value);
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
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) }}
    />
  );
}

// File icon helper
function FileIcon({ filename, size = 18 }: { filename: string; size?: number }) {
  if (isImageFile(filename)) return <Image size={size} className="flex-shrink-0 text-pink-400" />;
  if (isVideoFile(filename)) return <Video size={size} className="flex-shrink-0 text-red-400" />;
  if (isAudioFile(filename)) return <Music size={size} className="flex-shrink-0 text-cyan-400" />;
  if (isPdfFile(filename)) return <FileType size={size} className="flex-shrink-0 text-orange-400" />;
  if (isSpreadsheet(filename)) return <FileSpreadsheet size={size} className="flex-shrink-0 text-emerald-400" />;
  if (isDocxFile(filename)) return <FileText size={size} className="flex-shrink-0 text-blue-400" />;
  if (isJsonFile(filename)) return <FileJson size={size} className="flex-shrink-0 text-amber-400" />;
  if (isMarkdownFile(filename) || isMermaidFile(filename)) return <FileText size={size} className="flex-shrink-0 text-indigo-400" />;
  if (isYamlFile(filename)) return <FileCode size={size} className="flex-shrink-0 text-purple-400" />;
  if (isLogFile(filename)) return <FileText size={size} className="flex-shrink-0 text-emerald-400" />;
  return <FileText size={size} className="flex-shrink-0 text-slate-400" />;
}

interface NotesViewProps {
  selectedProject: string;
  searchQuery: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onShowNewNoteModal: () => void;
}

export default function NotesView({
  selectedProject,
  searchQuery,
  showToast,
  onShowNewNoteModal,
}: NotesViewProps) {
  // Text files state
  const [textFiles, setTextFiles] = useState<WorkspaceDataItem[]>([]);
  const [loadingTextFiles, setLoadingTextFiles] = useState(false);
  const [selectedTextFile, setSelectedTextFile] = useState<WorkspaceDataItem | null>(null);
  const [textFileContent, setTextFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [skipLargeFileLoad, setSkipLargeFileLoad] = useState(false);

  // Load text files for selected project
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
      setTextFiles([]);
    } finally {
      setLoadingTextFiles(false);
    }
  }, [selectedProject]);

  // Load content of selected text file
  const loadTextFileContent = useCallback(async (file: WorkspaceDataItem, forceLoad = false) => {
    if (!selectedProject) return;

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
      setTextFileContent('');
    } finally {
      setLoadingContent(false);
    }
  }, [selectedProject, showToast]);

  // Initial load
  useEffect(() => {
    loadTextFiles();
    setSelectedTextFile(null);
    setTextFileContent('');
  }, [loadTextFiles]);

  // Load file content when a text file is selected
  useEffect(() => {
    if (selectedTextFile) {
      loadTextFileContent(selectedTextFile);
    }
  }, [selectedTextFile, loadTextFileContent]);

  // Auto-refresh text files every 10 seconds
  useEffect(() => {
    if (!selectedProject) return;

    const interval = setInterval(() => {
      workspaceApi.listTextFiles(selectedProject).then(data => {
        setTextFiles(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            return data;
          }
          return prev;
        });
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedProject]);

  // Handle text file selection
  const handleSelectTextFile = (file: WorkspaceDataItem) => {
    setSelectedTextFile(file);
  };

  // Close text file preview
  const handleClosePreview = () => {
    setSelectedTextFile(null);
    setTextFileContent('');
  };

  // Filter text files by search query
  const filteredTextFiles = textFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
                onClick={onShowNewNoteModal}
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
                <FileIcon filename={file.name} />
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
              <FileIcon filename={selectedTextFile.name} size={16} />
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
              <div className="bg-slate-900/50 rounded-lg p-4">
                <JsonViewer content={textFileContent} />
              </div>
            ) : isYamlFile(selectedTextFile.name) ? (
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {textFileContent.split('\n').map((line, i) => {
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
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {textFileContent.split('\n').map((line, i) => {
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
                  } else if (lower.includes('success') || lower.includes('\u2713') || lower.includes('complete')) {
                    className = 'text-emerald-400';
                  }
                  return <div key={i} className={className}>{line}</div>;
                })}
              </pre>
            ) : isImageFile(selectedTextFile.name) ? (
              <div className="relative flex items-center justify-center h-full">
                <NextImage
                  src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                  alt={selectedTextFile.name}
                  fill
                  className="object-contain rounded-lg shadow-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                />
              </div>
            ) : isVideoFile(selectedTextFile.name) ? (
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
              <div className="h-full">
                <iframe
                  src={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                  className="w-full h-full rounded-lg border border-slate-700"
                  title={selectedTextFile.name}
                />
              </div>
            ) : isSpreadsheet(selectedTextFile.name) ? (
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
              <DocxViewer
                fileUrl={`${getApiUrl()}/workspace/projects/${encodeURIComponent(selectedProject)}/data/download?path=${encodeURIComponent(selectedTextFile.path)}`}
                fileSize={selectedTextFile.size}
              />
            ) : (
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {textFileContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
