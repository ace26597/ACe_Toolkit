'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Folder,
  File,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  X,
  Eye,
  Edit3,
  ArrowUpDown,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { workspaceApi, WorkspaceDataItem } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'isomorphic-dompurify';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface DataBrowserProps {
  projectName: string;
}

type SortField = 'name' | 'date' | 'size';
type SortOrder = 'asc' | 'desc';

// Check if file is an archive
const isArchive = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  return ['zip', 'tar', 'gz', 'rar', '7z', 'tgz', 'bz2'].includes(ext || '');
};

// Check if file is previewable (markdown, mermaid, code, text)
const isNoteFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const previewable = [
    // Markdown & Mermaid
    'md', 'markdown', 'mmd',
    // Text
    'txt', 'log', 'csv',
    // Code files
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
    'go', 'rs', 'rb', 'php', 'sh', 'bash', 'zsh',
    // Config & data
    'json', 'jsonl', 'yaml', 'yml', 'xml', 'toml', 'ini', 'env',
    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    // SQL
    'sql',
  ];
  return previewable.includes(ext || '');
};

// Check if file is a code file (for syntax highlighting hint)
const isCodeFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
    'go', 'rs', 'rb', 'php', 'sh', 'bash', 'zsh', 'sql',
    'json', 'jsonl', 'yaml', 'yml', 'xml', 'toml', 'html', 'htm', 'css', 'scss',
  ];
  return codeExts.includes(ext || '');
};

// Get icon based on file extension
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext || '')) {
    return FileImage;
  }
  if (isArchive(name)) {
    return FileArchive;
  }
  if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
    return FileSpreadsheet;
  }
  if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'json', 'yaml', 'yml', 'xml', 'html', 'css'].includes(ext || '')) {
    return FileCode;
  }
  if (['txt', 'md', 'markdown', 'mmd', 'doc', 'docx', 'pdf'].includes(ext || '')) {
    return FileText;
  }

  return File;
};

// Format date for display
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }
};

// Format file size
const formatSize = (bytes: number) => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Mermaid diagram component
function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, code);
        setSvg(svg);
        setError('');
      } catch (err) {
        setError(String(err));
        setSvg('');
      }
    };
    renderDiagram();
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
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
    />
  );
}

// File Preview Panel Component
function FilePreviewPanel({
  projectName,
  item,
  onClose,
}: {
  projectName: string;
  item: WorkspaceDataItem;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [mermaidKey, setMermaidKey] = useState(0);
  let mermaidCounter = 0;

  // Load file content
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const text = await workspaceApi.getFileContent(projectName, item.path);
        setContent(text);
        setEditContent(text);
        setMermaidKey(prev => prev + 1);
      } catch (err: any) {
        setError(err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [projectName, item.path]);

  // Save file
  const handleSave = async () => {
    setSaving(true);
    try {
      await workspaceApi.saveFileContent(projectName, item.path, editContent);
      setContent(editContent);
      setIsEditing(false);
      setMermaidKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const isMarkdown = item.name.endsWith('.md') || item.name.endsWith('.markdown');
  const isMermaid = item.name.endsWith('.mmd');

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-indigo-400 flex-shrink-0" />
          <span className="text-white font-medium truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {isNoteFile(item.name) && (
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing) setEditContent(content);
              }}
              className={`p-2 rounded transition-colors ${
                isEditing
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={isEditing ? 'Preview' : 'Edit'}
            >
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={24} className="text-slate-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <p>{error}</p>
          </div>
        ) : isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed"
              placeholder="Edit file content..."
            />
            <div className="flex justify-end gap-2 p-3 border-t border-slate-700">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(content);
                }}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : isMermaid ? (
          <div className="h-full overflow-y-auto p-4">
            <MermaidDiagram code={content} id={`preview-${mermaidKey}`} />
            <pre className="mt-4 bg-slate-800 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-slate-300 font-mono">{content}</code>
            </pre>
          </div>
        ) : isMarkdown ? (
          <div className="h-full overflow-y-auto p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h1>
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
                    mermaidCounter++;
                    return <MermaidDiagram code={codeString} id={`md-${mermaidKey}-${mermaidCounter}`} />;
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
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="h-full overflow-auto p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
        <span>{item.sizeFormatted || formatSize(item.size || 0)}</span>
        <span>Modified: {formatDate(item.modifiedAt)}</span>
      </div>
    </div>
  );
}

export default function DataBrowser({ projectName }: DataBrowserProps) {
  const [items, setItems] = useState<WorkspaceDataItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<WorkspaceDataItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sort items: folders first, then apply sort
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Always put folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      // Within same type, apply sorting
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortOrder]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Get sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />;
  };

  // Load items
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workspaceApi.listData(projectName, currentPath);
      setItems(data);
      setSelectedItems(new Set());
    } catch (error) {
      showToast('Failed to load files', 'error');
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }, [projectName, currentPath]);

  // Load items when path changes and set up auto-refresh
  useEffect(() => {
    loadItems();

    // Auto-refresh every 10 seconds to pick up files created by CCResearch
    const interval = setInterval(() => {
      workspaceApi.listData(projectName, currentPath).then(data => {
        setItems(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            return data;
          }
          return prev;
        });
      }).catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadItems, projectName, currentPath]);

  // Navigate to folder
  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  // Get breadcrumb parts
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '' }];

    let accPath = '';
    for (const part of parts) {
      accPath += (accPath ? '/' : '') + part;
      breadcrumbs.push({ name: part, path: accPath });
    }

    return breadcrumbs;
  };

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const results = await workspaceApi.uploadData(projectName, files, currentPath);

      const notesCreated = results.filter((r: any) => r.noteCreated);
      if (notesCreated.length > 0) {
        const noteNames = notesCreated.map((r: any) => r.noteTitle).join(', ');
        showToast(`Uploaded ${files.length} file(s). Notes created: ${noteNames}`);
      } else {
        showToast(`Uploaded ${files.length} file(s)`);
      }

      loadItems();
    } catch (error: any) {
      showToast(error.message || 'Failed to upload files', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      await workspaceApi.createFolder(projectName, folderPath);
      showToast('Folder created');
      setNewFolderName('');
      setShowNewFolder(false);
      loadItems();
    } catch (error: any) {
      showToast(error.message || 'Failed to create folder', 'error');
    }
  };

  // Delete item
  const handleDelete = async (path: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      await workspaceApi.deleteData(projectName, path);
      showToast('Deleted');
      if (selectedFile?.path === path) setSelectedFile(null);
      loadItems();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete', 'error');
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected item(s)?`)) return;

    try {
      for (const path of selectedItems) {
        await workspaceApi.deleteData(projectName, path);
      }
      showToast(`Deleted ${selectedItems.size} item(s)`);
      setSelectedFile(null);
      loadItems();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete', 'error');
    }
  };

  // Download item
  const handleDownload = (path: string) => {
    const url = workspaceApi.downloadData(projectName, path);
    window.open(url, '_blank');
  };

  // Handle row click - single click to select/preview, double click to open folder
  const handleRowClick = (item: WorkspaceDataItem, e: React.MouseEvent) => {
    if (clickTimeoutRef.current) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      if (item.type === 'folder') {
        navigateToFolder(item.path);
      } else {
        handleDownload(item.path);
      }
    } else {
      // Single click - wait to see if it's a double click
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;

        // Single click action - select file for preview
        if (item.type === 'file') {
          if (isNoteFile(item.name)) {
            setSelectedFile(item);
          } else {
            // Toggle selection for non-note files
            const newSelection = new Set(selectedItems);
            if (newSelection.has(item.path)) {
              newSelection.delete(item.path);
            } else {
              newSelection.add(item.path);
            }
            setSelectedItems(newSelection);
          }
        }
      }, 250);
    }
  };

  // Toggle selection
  const toggleSelection = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedItems(newSelection);
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.filter(i => i.type === 'file').length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.filter(i => i.type === 'file').map(i => i.path)));
    }
  };

  return (
    <div
      className="h-full flex"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Main File List */}
      <div className={`flex-1 flex flex-col ${selectedFile ? 'border-r border-slate-700' : ''}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm">
              {getBreadcrumbs().map((crumb, index) => (
                <div key={crumb.path} className="flex items-center">
                  {index > 0 && <ChevronRight size={14} className="text-slate-500 mx-1" />}
                  <button
                    onClick={() => navigateToFolder(crumb.path)}
                    className={`px-2 py-1 rounded hover:bg-slate-700 transition-colors ${
                      index === getBreadcrumbs().length - 1
                        ? 'text-white font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {index === 0 ? <Home size={14} /> : crumb.name}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Selected actions */}
            {selectedItems.size > 0 && (
              <>
                <span className="text-sm text-slate-400">
                  {selectedItems.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}

            {/* Refresh */}
            <button
              onClick={loadItems}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* New folder */}
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 text-sm rounded transition-colors"
            >
              <FolderPlus size={16} />
              New Folder
            </button>

            {/* Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/30">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }
              }}
              placeholder="Folder name..."
              autoFocus
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* File list - Details View */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="text-slate-400 animate-spin" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Folder size={48} className="mb-4 opacity-50" />
              <p className="text-lg mb-2">This folder is empty</p>
              <p className="text-sm text-slate-500">
                Drag and drop files here or click Upload
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/80 sticky top-0">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedItems.size > 0 && selectedItems.size === sortedItems.filter(i => i.type === 'file').length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-2 w-24 text-right">
                    <button
                      onClick={() => toggleSort('size')}
                      className="flex items-center gap-1 justify-end hover:text-white transition-colors ml-auto"
                    >
                      Size <SortIcon field="size" />
                    </button>
                  </th>
                  <th className="px-4 py-2 w-32 text-right">
                    <button
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 justify-end hover:text-white transition-colors ml-auto"
                    >
                      Modified <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedItems.map((item) => {
                  const FileIcon = item.type === 'folder' ? Folder : getFileIcon(item.name);
                  const isSelected = selectedItems.has(item.path);
                  const isPreview = selectedFile?.path === item.path;
                  const isNote = isNoteFile(item.name);

                  return (
                    <tr
                      key={item.path}
                      className={`group cursor-pointer transition-colors ${
                        isPreview
                          ? 'bg-indigo-600/30'
                          : isSelected
                          ? 'bg-indigo-600/20'
                          : 'hover:bg-slate-800/50'
                      }`}
                      onClick={(e) => handleRowClick(item, e)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-2">
                        {item.type === 'file' ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelection(item.path, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </td>

                      {/* Name with icon */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <FileIcon
                            size={18}
                            className={
                              item.type === 'folder'
                                ? 'text-amber-400 flex-shrink-0'
                                : isArchive(item.name)
                                ? 'text-purple-400 flex-shrink-0'
                                : isNote
                                ? 'text-emerald-400 flex-shrink-0'
                                : 'text-slate-400 flex-shrink-0'
                            }
                          />
                          <span className={`truncate ${item.type === 'folder' ? 'text-slate-200 font-medium' : 'text-slate-300'}`}>
                            {item.name}
                          </span>
                          {item.type === 'folder' && (
                            <span className="text-xs text-slate-500 ml-1">(double-click to open)</span>
                          )}
                          {isNote && (
                            <span className="text-xs text-emerald-500 ml-1">(click to preview)</span>
                          )}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-2 text-right text-sm text-slate-500">
                        {item.type === 'file' ? item.sizeFormatted || formatSize(item.size || 0) : '-'}
                      </td>

                      {/* Modified */}
                      <td className="px-4 py-2 text-right text-sm text-slate-500">
                        {formatDate(item.modifiedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item.path);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.path);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
          <span>
            {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
            {sortedItems.filter(i => i.type === 'folder').length > 0 &&
              ` (${sortedItems.filter(i => i.type === 'folder').length} folders)`}
          </span>
          <span className="flex items-center gap-3">
            <span>Sort: {sortField} ({sortOrder})</span>
            {uploading && 'Uploading...'}
            {!uploading && selectedItems.size > 0 && `${selectedItems.size} selected`}
          </span>
        </div>
      </div>

      {/* File Preview Panel */}
      {selectedFile && (
        <div className="w-1/2 min-w-[400px] max-w-[600px]">
          <FilePreviewPanel
            projectName={projectName}
            item={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        </div>
      )}
    </div>
  );
}
