'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Pin, Tag, Trash2, Eye, Edit3, Save } from 'lucide-react';
import { WorkspaceNote, workspaceApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface NoteEditorProps {
  note: WorkspaceNote;
  projectName: string;
  onUpdate: (updates: Partial<WorkspaceNote>) => void;
  onClose: () => void;
  onDelete: () => void;
}

// Mermaid diagram component
function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
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
        <pre className="text-xs text-slate-500 mt-2 overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/50 rounded-lg p-4 my-3 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function NoteEditor({
  note,
  projectName,
  onUpdate,
  onClose,
  onDelete,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mermaidKey, setMermaidKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setIsDirty(false);
    setMermaidKey(prev => prev + 1);
  }, [note.id, note.title, note.content, note.tags]);

  // Auto-save with debounce
  useEffect(() => {
    if (isDirty) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, tags, isDirty]);

  // Save on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (isDirty && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        onUpdate({ title, content, tags });
      }
    };
  }, [isDirty, title, content, tags, onUpdate]);

  // Handle save
  const handleSave = async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await onUpdate({ title, content, tags });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle paste for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const result = await workspaceApi.uploadImage(projectName, file);
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + result.markdown + content.slice(end);
            setContent(newContent);
            setIsDirty(true);
          }
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
        break;
      }
    }
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const result = await workspaceApi.uploadImage(projectName, file);
          setContent(prev => prev + '\n' + result.markdown);
          setIsDirty(true);
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }
    }
  };

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setTagInput('');
      setIsDirty(true);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setIsDirty(true);
  };

  // Counter for unique mermaid IDs
  let mermaidCounter = 0;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Note title..."
            className="flex-1 bg-transparent text-lg font-medium text-white placeholder-slate-500 focus:outline-none"
          />
          {isDirty && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Save size={12} />
              {isSaving ? 'Saving...' : 'Unsaved'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle preview */}
          <button
            onClick={() => {
              setShowPreview(!showPreview);
              setMermaidKey(prev => prev + 1);
            }}
            className={`p-2 rounded transition-colors ${
              showPreview
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={showPreview ? 'Edit mode' : 'Preview mode'}
          >
            {showPreview ? <Edit3 size={18} /> : <Eye size={18} />}
          </button>

          {/* Pin */}
          <button
            onClick={() => onUpdate({ pinned: !note.pinned })}
            className={`p-2 rounded transition-colors ${
              note.pinned
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'
            }`}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={18} className={note.pinned ? 'fill-current' : ''} />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>

          {/* Close */}
          <button
            onClick={() => {
              if (isDirty) handleSave();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
        <Tag size={14} className="text-slate-500" />
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300 group"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add tag..."
            className="bg-transparent text-xs text-slate-400 placeholder-slate-600 focus:outline-none w-20"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-y-auto p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                // Headers
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-slate-200 mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-2">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold text-slate-300 mt-3 mb-1">{children}</h4>
                ),
                // Paragraphs
                p: ({ children }) => (
                  <p className="text-slate-300 my-2 leading-relaxed">{children}</p>
                ),
                // Links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    {children}
                  </a>
                ),
                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-inside my-2 space-y-1 text-slate-300">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside my-2 space-y-1 text-slate-300">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-slate-300">{children}</li>
                ),
                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 my-3 text-slate-400 italic">
                    {children}
                  </blockquote>
                ),
                // Code blocks
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  // Handle mermaid diagrams
                  if (language === 'mermaid') {
                    mermaidCounter++;
                    return (
                      <MermaidDiagram
                        code={codeString}
                        id={`${note.id}-${mermaidKey}-${mermaidCounter}`}
                      />
                    );
                  }

                  // Block code
                  if (className || codeString.includes('\n')) {
                    return (
                      <pre className="bg-slate-800 rounded-lg p-4 my-3 overflow-x-auto">
                        <code className="text-sm text-slate-300 font-mono">{children}</code>
                      </pre>
                    );
                  }

                  // Inline code
                  return (
                    <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-indigo-300 font-mono">
                      {children}
                    </code>
                  );
                },
                // Pre (for code blocks)
                pre: ({ children }) => <>{children}</>,
                // Tables
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-slate-600">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-800">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-slate-700">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-slate-800/50">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200 border border-slate-600">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-sm text-slate-300 border border-slate-600">
                    {children}
                  </td>
                ),
                // Horizontal rule
                hr: () => <hr className="border-slate-700 my-6" />,
                // Images
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt || ''}
                    className="max-w-full rounded-lg my-3"
                  />
                ),
                // Strong/Bold
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-100">{children}</strong>
                ),
                // Emphasis/Italic
                em: ({ children }) => (
                  <em className="italic text-slate-300">{children}</em>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsDirty(true);
            }}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Write your note in Markdown...

Supports:
- **Bold**, *italic*, `code`
- Headers (# ## ###)
- Lists, links, images
- Tables (GFM syntax)
- Code blocks with syntax highlighting
- Mermaid diagrams (\`\`\`mermaid)

Paste images directly (Ctrl+V) or drag & drop."
            className="w-full h-full p-6 bg-transparent text-slate-200 placeholder-slate-600 resize-none focus:outline-none font-mono text-sm leading-relaxed"
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
        <span>
          Updated: {new Date(note.updatedAt).toLocaleString()}
        </span>
        <div className="flex items-center gap-3">
          <span>{content.length} characters</span>
          <span>{content.split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
    </div>
  );
}
