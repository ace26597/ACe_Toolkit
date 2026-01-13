'use client';

import { useState, useCallback } from 'react';
import { Upload, File, Image, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  conversationId: string | null;
  onFilesUploaded: (files: any[]) => void;
}

export default function FileUploadZone({ conversationId, onFilesUploaded }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'uploading' | 'success' | 'error' }>({});
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      validateAndAddFiles(selectedFiles);
    }
  }, []);

  const validateAndAddFiles = (newFiles: File[]) => {
    const validTypes = ['image/', 'application/pdf', 'text/', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large (max 100MB)`);
        return false;
      }
      if (!validTypes.some(type => file.type.startsWith(type) || file.type.includes(type))) {
        alert(`File ${file.name} has unsupported type`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!conversationId || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('conversation_id', conversationId);
      files.forEach(file => {
        formData.append('files', file);
        setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                     process.env.NEXT_PUBLIC_API_BASE_URL ||
                     'http://localhost:8000';

      const response = await fetch(`${apiUrl}/research/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();

      // Update status
      files.forEach(file => {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      });

      onFilesUploaded(data.uploaded);
    } catch (error) {
      console.error('Upload error:', error);
      files.forEach(file => {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getStatusIcon = (fileName: string) => {
    const status = uploadStatus[fileName];
    if (status === 'uploading') return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Upload Files</h3>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-300 text-sm mb-2">Drag & drop files here</p>
        <p className="text-gray-500 text-xs mb-3">Images, PDFs, CSV, Excel, Text</p>
        <label className="cursor-pointer">
          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 inline-block">
            Browse Files
          </span>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            accept="image/*,.pdf,.csv,.xlsx,.xls,.txt,.md"
          />
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg">
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              {getStatusIcon(file.name)}
              {!uploadStatus[file.name] && (
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {/* Upload Button */}
          {files.some(f => !uploadStatus[f.name]) && (
            <button
              onClick={uploadFiles}
              disabled={uploading || !conversationId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : `Upload ${files.filter(f => !uploadStatus[f.name]).length} File(s)`}
            </button>
          )}
        </div>
      )}

      {!conversationId && files.length > 0 && (
        <p className="mt-2 text-xs text-yellow-400">Start a conversation first to upload files</p>
      )}
    </div>
  );
}
