'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Link2,
  X,
  Plus,
  Loader2,
  FolderOpen,
  Trash2,
} from 'lucide-react';

interface ContextItem {
  type: 'image' | 'file' | 'notes' | 'reference';
  filename?: string;
  path?: string;
  size?: number;
  project?: string;
}

interface Context {
  notes: string | null;
  images: ContextItem[];
  files: ContextItem[];
  references: ContextItem[];
}

interface ContextPanelProps {
  projectId: string;
  context: Context;
  onContextUpdate: () => void;
  onUpload: (files: FileList, notes?: string) => Promise<void>;
  onImportWorkspace: (projectName: string) => Promise<void>;
  onDeleteItem: (type: string, name: string) => Promise<void>;
}

export default function ContextPanel({
  projectId,
  context,
  onContextUpdate,
  onUpload,
  onImportWorkspace,
  onDeleteItem,
}: ContextPanelProps) {
  const [notes, setNotes] = useState(context?.notes || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        setUploading(true);
        try {
          await onUpload(files);
          onContextUpdate();
        } finally {
          setUploading(false);
        }
      }
    },
    [onUpload, onContextUpdate]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      try {
        await onUpload(files);
        onContextUpdate();
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        setUploading(true);
        try {
          const fileList = new DataTransfer();
          files.forEach((f) => fileList.items.add(f));
          await onUpload(fileList.files);
          onContextUpdate();
        } finally {
          setUploading(false);
        }
      }
    },
    [onUpload, onContextUpdate]
  );

  const handleSaveNotes = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('notes', notes);
      // API call handled by parent
      await onUpload(new DataTransfer().files, notes);
      onContextUpdate();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      {/* Notes Section */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notes & Context
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes, ideas, or context for your video...

Example:
- Target audience: Tech professionals
- Key message: AI tools save time
- Tone: Professional but friendly
- Include statistics about AI adoption"
          className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSaveNotes}
          disabled={uploading || notes === (context?.notes || '')}
          className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm disabled:opacity-50"
        >
          Save Notes
        </button>
      </div>

      {/* File Upload Section */}
      <div
        className={`bg-gray-800 rounded-lg p-4 border-2 border-dashed transition-colors ${
          dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Files & Images
        </h3>

        <div className="text-center py-6">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-400 mb-2">
                Drag & drop files here, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-purple-400 hover:text-purple-300"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Supports images, PDFs, text files. You can also paste images.
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded Files */}
      {(context?.images?.length > 0 || context?.files?.length > 0) && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Uploaded Content
          </h3>

          {/* Images */}
          {context?.images?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Images</p>
              <div className="grid grid-cols-3 gap-2">
                {context.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square bg-gray-700 rounded overflow-hidden"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => onDeleteItem('image', img.filename || '')}
                        className="p-1 bg-red-500/50 rounded hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs p-1 truncate">
                      {img.filename}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {context?.files?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Files</p>
              <div className="space-y-1">
                {context.files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm truncate">{file.filename}</span>
                    </div>
                    <button
                      onClick={() => onDeleteItem('file', file.filename || '')}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workspace Import */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Workspace References
        </h3>

        {context?.references?.length > 0 && (
          <div className="mb-3 space-y-1">
            {context.references.map((ref, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-700 rounded"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">{ref.project}</span>
                </div>
                <button
                  onClick={() => onDeleteItem('reference', ref.project || '')}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowWorkspaceModal(true)}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-purple-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Import from Workspace
        </button>
      </div>

      {/* Workspace Import Modal */}
      {showWorkspaceModal && (
        <WorkspaceImportModal
          onImport={async (projectName) => {
            await onImportWorkspace(projectName);
            setShowWorkspaceModal(false);
            onContextUpdate();
          }}
          onClose={() => setShowWorkspaceModal(false)}
        />
      )}
    </div>
  );
}

function WorkspaceImportModal({
  onImport,
  onClose,
}: {
  onImport: (projectName: string) => Promise<void>;
  onClose: () => void;
}) {
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    try {
      await onImport(projectName.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Import Workspace Project</h2>

        <p className="text-sm text-gray-400 mb-4">
          Import files from a workspace project as context for video generation.
        </p>

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter workspace project name..."
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-4 focus:outline-none focus:border-purple-500"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!projectName.trim() || loading}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
