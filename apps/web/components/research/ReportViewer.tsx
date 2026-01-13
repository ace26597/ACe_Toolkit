'use client';

import { useState } from 'react';
import { FileText, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface ReportViewerProps {
  conversationId: string | null;
  report: string | null;
}

export default function ReportViewer({ conversationId, report }: ReportViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (format: 'md' | 'html' | 'pdf' | 'csv') => {
    if (!conversationId) return;

    setDownloading(format);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                     process.env.NEXT_PUBLIC_API_BASE_URL ||
                     'http://localhost:8000';

      const response = await fetch(
        `${apiUrl}/research/reports/${conversationId}?format=${format}`
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research_report_${conversationId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  if (!report) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Report</h3>
        </div>
        <div className="text-center py-12">
          <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Report will appear here after research completes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Report</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Download Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => downloadReport('md')}
            disabled={downloading === 'md'}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
          >
            <Download className="w-3 h-3" />
            {downloading === 'md' ? 'Downloading...' : 'Markdown'}
          </button>
          <button
            onClick={() => downloadReport('html')}
            disabled={downloading === 'html'}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
          >
            <Download className="w-3 h-3" />
            {downloading === 'html' ? 'Downloading...' : 'HTML'}
          </button>
          <button
            onClick={() => downloadReport('pdf')}
            disabled={downloading === 'pdf'}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
          >
            <Download className="w-3 h-3" />
            {downloading === 'pdf' ? 'Downloading...' : 'PDF'}
          </button>
          <button
            onClick={() => downloadReport('csv')}
            disabled={downloading === 'csv'}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-wait transition-colors"
          >
            <Download className="w-3 h-3" />
            {downloading === 'csv' ? 'Downloading...' : 'CSV'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {expanded && (
        <div className="p-4 max-h-[600px] overflow-y-auto">
          <div className="prose prose-invert prose-sm max-w-none">
            {/* Simple markdown-like rendering */}
            {report.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index} className="text-2xl font-bold text-white mb-3">{line.replace('# ', '')}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold text-blue-300 mb-2 mt-4">{line.replace('## ', '')}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index} className="text-lg font-semibold text-gray-200 mb-2">{line.replace('### ', '')}</h3>;
              } else if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} className="font-bold text-gray-200 mb-1">{line.replace(/\*\*/g, '')}</p>;
              } else if (line.startsWith('---')) {
                return <hr key={index} className="my-4 border-gray-600" />;
              } else if (line.trim()) {
                return <p key={index} className="text-gray-300 mb-2">{line}</p>;
              }
              return <br key={index} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
