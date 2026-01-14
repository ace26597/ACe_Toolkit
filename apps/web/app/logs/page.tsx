'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, Download, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

type LogType = 'backend' | 'frontend' | 'cloudflare' | 'startup' | 'shutdown';

interface LogFile {
  name: string;
  path: string;
  size_bytes: number;
  size_human: string;
  modified_at: string;
  type: string;
}

export default function LogsPage() {
  const [selectedLog, setSelectedLog] = useState<LogType>('backend');
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lines, setLines] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ||
                  process.env.NEXT_PUBLIC_API_BASE_URL ||
                  'http://localhost:8000';

  // Fetch log content
  const fetchLogs = async (logType: LogType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/logs/${logType}?lines=${lines}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${logType} logs`);
      }

      const content = await response.text();
      setLogContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLogContent('');
    } finally {
      setLoading(false);
    }
  };

  // Fetch list of log files
  const fetchLogFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/logs/list`);
      if (response.ok) {
        const data = await response.json();
        setLogFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch log files:', err);
    }
  };

  // Search logs
  const searchLogs = async () => {
    if (!searchQuery.trim()) {
      fetchLogs(selectedLog);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/logs/search?query=${encodeURIComponent(searchQuery)}&log_type=${selectedLog}&lines=${lines}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const content = await response.text();
      setLogContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Download logs
  const downloadLogs = () => {
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLog}-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Initial load
  useEffect(() => {
    fetchLogs(selectedLog);
    fetchLogFiles();
  }, [selectedLog, lines]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs(selectedLog);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedLog, refreshInterval, lines]);

  // Auto-scroll to bottom when log content changes
  useEffect(() => {
    if (autoScrollRef.current && logContainerRef.current && logContent) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [logContent]);

  // Sync autoScrollRef with autoScroll state
  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  // Handle scroll event to detect manual scrolling
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold

    // If user scrolled away from bottom, disable auto-scroll
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
    // If user scrolled back to bottom, enable auto-scroll
    else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Format log lines with syntax highlighting
  const formatLogLine = (line: string, index: number) => {
    let className = 'text-gray-300';

    // Color code by log level
    if (line.includes('ERROR') || line.includes('error') || line.includes('FAILED')) {
      className = 'text-red-400 font-medium';
    } else if (line.includes('WARNING') || line.includes('warning') || line.includes('WARN')) {
      className = 'text-yellow-400';
    } else if (line.includes('INFO') || line.includes('info')) {
      className = 'text-blue-400';
    } else if (line.includes('SUCCESS') || line.includes('success') || line.includes('✓')) {
      className = 'text-green-400';
    } else if (line.includes('DEBUG') || line.includes('debug')) {
      className = 'text-purple-400';
    }

    // Highlight search terms
    if (searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase())) {
      className += ' bg-yellow-900/30';
    }

    return (
      <div key={index} className={`font-mono text-sm ${className} py-0.5 px-2 hover:bg-gray-800/50`}>
        {line || '\u00A0'}
      </div>
    );
  };

  const logTabs: { value: LogType; label: string; icon: string }[] = [
    { value: 'backend', label: 'Backend', icon: '🔧' },
    { value: 'frontend', label: 'Frontend', icon: '🎨' },
    { value: 'cloudflare', label: 'Cloudflare', icon: '☁️' },
    { value: 'startup', label: 'Startup', icon: '🚀' },
    { value: 'shutdown', label: 'Shutdown', icon: '⏹️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">System Logs</h1>
          <p className="text-gray-400">Monitor and analyze application logs in real-time</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Log Type Tabs */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Log Type</label>
              <div className="flex gap-2 flex-wrap">
                {logTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setSelectedLog(tab.value)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedLog === tab.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lines Control */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lines</label>
              <select
                value={lines}
                onChange={(e) => setLines(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={5000}>5000</option>
              </select>
            </div>

            {/* Auto-Refresh Control */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Refresh</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    autoRefresh
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {autoRefresh ? 'ON' : 'OFF'}
                </button>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={!autoRefresh}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                >
                  <option value={2000}>2s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchLogs()}
                placeholder="Search logs... (press Enter)"
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={searchLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>

            <button
              onClick={() => fetchLogs(selectedLog)}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={downloadLogs}
              disabled={!logContent}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            {loading ? (
              <div className="flex items-center gap-2 text-yellow-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {logContent.split('\n').length} lines loaded
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            {autoRefresh && `Auto-refresh every ${refreshInterval / 1000}s`}
            {autoScroll && (
              <span className="text-blue-400">📍 Auto-scroll: ON</span>
            )}
            {!autoScroll && (
              <span className="text-gray-500">📍 Auto-scroll: OFF (scroll to bottom to re-enable)</span>
            )}
          </div>
        </div>

        {/* Log Content */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="h-[calc(100vh-400px)] overflow-y-auto p-4 font-mono text-sm"
            style={{ scrollBehavior: 'smooth' }}
          >
            {logContent ? (
              logContent.split('\n').map((line, index) => formatLogLine(line, index))
            ) : (
              <div className="text-gray-500 text-center py-12">
                No logs available. Click Refresh to load logs.
              </div>
            )}
          </div>
        </div>

        {/* Log Files Info */}
        {logFiles.length > 0 && (
          <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Available Log Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {logFiles.slice(0, 9).map((file, index) => (
                <div
                  key={index}
                  className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors"
                >
                  <div className="text-sm font-medium text-white truncate">{file.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {file.size_human} • {new Date(file.modified_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
