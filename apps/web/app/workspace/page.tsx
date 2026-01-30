'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Search, FolderOpen, FileText, RefreshCw, Home, X, ChevronRight, ChevronDown, Clock, Download, Terminal, Plus, FileCode, FileJson, Image, Video, Music, FileType, Upload, Table, FileSpreadsheet, Loader2, Lightbulb, Play, Power, Github, Globe, Link as LinkIcon, Key, Database, Server, Sparkles, Wrench, Dna, Pill, Brain, BarChart3, BookOpen, Zap, Copy, Check, ExternalLink, Beaker, Menu } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import ProjectSidebar from '@/components/workspace/ProjectSidebar';
import DataBrowser from '@/components/workspace/DataBrowser';
import FileBrowser from '@/components/ccresearch/FileBrowser';
import { MobileNav, MobileHeader, DrawerOverlay, FileBrowserModal } from '@/components/workspace/MobileNav';
import { MobileTerminalInput } from '@/components/workspace/MobileTerminalInput';
import { useIsMobile } from '@/hooks/useWorkspaceState';
import { workspaceApi, WorkspaceProject, WorkspaceDataItem, getApiUrl } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

// Import capabilities data for welcome view
import capabilitiesData from '@/data/ccresearch/capabilities.json';
import useCasesData from '@/data/ccresearch/use-cases.json';

// Import handle type for terminal ref
import type { CCResearchTerminalHandle } from '@/components/ccresearch/CCResearchTerminal';

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

// Welcome Content Component - shows when no project selected
function WelcomeContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'capabilities' | 'databases'>('overview');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showAllServers, setShowAllServers] = useState(false);

  const stats = capabilitiesData.stats;
  const plugins = capabilitiesData.plugins;
  const mcpServers = capabilitiesData.mcpServers;
  const scientificCategories = capabilitiesData.scientificCategories;

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  // Get icon for category
  const getCategoryIcon = (id: string) => {
    const icons: Record<string, React.ReactNode> = {
      'databases': <Database className="w-5 h-5" />,
      'bioinformatics': <Dna className="w-5 h-5" />,
      'cheminformatics': <Pill className="w-5 h-5" />,
      'ml': <Brain className="w-5 h-5" />,
      'visualization': <BarChart3 className="w-5 h-5" />,
      'documents': <FileText className="w-5 h-5" />,
      'medical': <Beaker className="w-5 h-5" />,
      'integrations': <Server className="w-5 h-5" />,
    };
    return icons[id] || <Sparkles className="w-5 h-5" />;
  };

  const getCategoryColor = (id: string) => {
    const colors: Record<string, string> = {
      'databases': 'from-blue-500 to-cyan-500',
      'bioinformatics': 'from-green-500 to-emerald-500',
      'cheminformatics': 'from-pink-500 to-rose-500',
      'ml': 'from-purple-500 to-violet-500',
      'visualization': 'from-amber-500 to-orange-500',
      'documents': 'from-cyan-500 to-teal-500',
      'medical': 'from-red-500 to-pink-500',
      'integrations': 'from-indigo-500 to-purple-500',
    };
    return colors[id] || 'from-slate-500 to-slate-600';
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 text-sm font-medium">Powered by Claude Code</span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    C3 Researcher
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Workspace
                  </span>
                </h1>

                <p className="text-lg text-slate-400 mb-8 max-w-xl">
                  AI-powered scientific research terminal with {stats.totalSkills}+ skills,
                  {stats.totalMcpServers} MCP servers, and access to {stats.totalDatabases}+ databases.
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                  <div className="group relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
                    <div className="absolute inset-0 bg-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{stats.totalSkills}+</div>
                    <div className="text-xs text-slate-500">Scientific Skills</div>
                  </div>
                  <div className="group relative bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-all">
                    <div className="absolute inset-0 bg-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Server className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{stats.totalMcpServers}</div>
                    <div className="text-xs text-slate-500">MCP Servers</div>
                  </div>
                  <div className="group relative bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition-all">
                    <div className="absolute inset-0 bg-amber-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Wrench className="w-5 h-5 text-amber-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{stats.totalPlugins}</div>
                    <div className="text-xs text-slate-500">Plugins</div>
                  </div>
                  <div className="group relative bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-all">
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Database className="w-5 h-5 text-emerald-400 mb-2" />
                    <div className="text-2xl font-bold text-white">{stats.totalDatabases}+</div>
                    <div className="text-xs text-slate-500">Databases</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <Link
                    href="/ccresearch/use-cases"
                    className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/25"
                  >
                    <BookOpen className="w-4 h-4" />
                    Browse Use Cases
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/ccresearch/tips"
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Pro Tips
                  </Link>
                </div>
              </div>

              {/* Right: Video */}
              <div className="flex-1 w-full max-w-xl">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                  <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <video
                      controls
                      className="w-full aspect-video object-contain bg-black"
                      preload="metadata"
                    >
                      <source src="/mcp-protocol-video.mp4" type="video/mp4" />
                    </video>
                    <div className="p-4 bg-slate-900/80 backdrop-blur border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                          <Play className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">Claude Code, MCP & Skills</h4>
                          <p className="text-xs text-slate-500">Learn how MCP extends capabilities</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-slate-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1 py-2">
              {[
                { id: 'overview', label: 'Getting Started', icon: <Zap className="w-4 h-4" /> },
                { id: 'capabilities', label: 'Capabilities', icon: <Sparkles className="w-4 h-4" /> },
                { id: 'databases', label: 'Databases & Servers', icon: <Database className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Quick Start Steps */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  Quick Start
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: 'Create Project', desc: 'Click "New Project" in sidebar', icon: <FolderOpen className="w-5 h-5" />, color: 'emerald' },
                    { step: 2, title: 'Start Terminal', desc: 'Open Terminal tab, click Start', icon: <Terminal className="w-5 h-5" />, color: 'blue' },
                    { step: 3, title: 'Ask Questions', desc: 'Type natural language queries', icon: <Sparkles className="w-5 h-5" />, color: 'purple' },
                    { step: 4, title: 'Review Results', desc: 'View in Notes & Files tabs', icon: <FileText className="w-5 h-5" />, color: 'amber' },
                  ].map((item) => (
                    <div key={item.step} className="relative group">
                      <div className={`absolute -inset-0.5 bg-gradient-to-r from-${item.color}-500/50 to-${item.color}-500/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-${item.color}-500/20 text-${item.color}-400 mb-4`}>
                          {item.icon}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-500">STEP {item.step}</span>
                        </div>
                        <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commands & Shortcuts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Slash Commands
                  </h3>
                  <div className="space-y-2">
                    {[
                      { cmd: '/help', desc: 'Show available commands' },
                      { cmd: '/clear', desc: 'Clear conversation' },
                      { cmd: '/compact', desc: 'Toggle compact mode' },
                      { cmd: '/model', desc: 'Switch AI model' },
                    ].map((item) => (
                      <div key={item.cmd} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                        <code className="text-emerald-400 font-mono text-sm">{item.cmd}</code>
                        <span className="text-slate-500 text-sm">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400" />
                    Keyboard Shortcuts
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'Ctrl+C', desc: 'Cancel operation' },
                      { key: 'Ctrl+L', desc: 'Clear terminal' },
                      { key: '↑/↓', desc: 'History navigation' },
                      { key: 'Tab', desc: 'Auto-complete' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                        <code className="text-blue-400 font-mono text-sm">{item.key}</code>
                        <span className="text-slate-500 text-sm">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Example Prompts */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                  Try These Prompts
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {useCasesData.categories.slice(0, 2).flatMap((cat: any) =>
                    cat.examples.slice(0, 2).map((ex: any) => (
                      <div key={ex.id} className="group bg-slate-900/30 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-white">{ex.title}</span>
                              {ex.verified && (
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Verified</span>
                              )}
                            </div>
                            <code className="text-xs text-emerald-400/80 block bg-slate-950 rounded-lg p-3 font-mono leading-relaxed">
                              {ex.prompt.length > 100 ? ex.prompt.substring(0, 100) + '...' : ex.prompt}
                            </code>
                          </div>
                          <button
                            onClick={() => copyPrompt(ex.prompt, ex.id)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                          >
                            {copiedPrompt === ex.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Capabilities Tab */}
          {activeTab === 'capabilities' && (
            <div className="space-y-8">
              {/* Scientific Categories - Bento Grid */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/20 rounded-lg">
                    <Dna className="w-4 h-4 text-purple-400" />
                  </div>
                  Scientific Capabilities
                  <span className="text-sm font-normal text-slate-500">({stats.totalSkills}+ skills)</span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scientificCategories.map((cat: any, idx: number) => (
                    <div
                      key={cat.id}
                      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:border-slate-700 transition-all ${
                        idx === 0 ? 'lg:col-span-2 lg:row-span-2' : ''
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(cat.id)} opacity-5 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${getCategoryColor(cat.id)} mb-4`}>
                          {getCategoryIcon(cat.id)}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white">{cat.name}</h3>
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{cat.count} skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {cat.examples.slice(0, idx === 0 ? 8 : 4).map((ex: string) => (
                            <span key={ex} className="text-xs bg-slate-800/80 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors">
                              {ex}
                            </span>
                          ))}
                          {cat.examples.length > (idx === 0 ? 8 : 4) && (
                            <span className="text-xs text-slate-600 px-2 py-1">+{cat.examples.length - (idx === 0 ? 8 : 4)} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plugins */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <Wrench className="w-4 h-4 text-amber-400" />
                  </div>
                  Installed Plugins
                  <span className="text-sm font-normal text-slate-500">({plugins.length})</span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {plugins.slice(0, 9).map((plugin: any) => (
                    <div key={plugin.id} className="flex items-start gap-3 bg-slate-900/30 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${plugin.status === 'active' ? 'bg-green-500' : 'bg-slate-600'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm truncate">{plugin.name}</span>
                          {plugin.skillsCount && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded flex-shrink-0">
                              {plugin.skillsCount} skills
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{plugin.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Databases Tab */}
          {activeTab === 'databases' && (
            <div className="space-y-8">
              {/* MCP Servers */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Server className="w-4 h-4 text-blue-400" />
                  </div>
                  MCP Servers
                  <span className="text-sm font-normal text-slate-500">({mcpServers.length} active)</span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(showAllServers ? mcpServers : mcpServers.slice(0, 12)).map((server: any) => (
                    <div key={server.id} className="group bg-slate-900/30 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${server.status === 'active' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-slate-600'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm">{server.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              server.category === 'scientific' ? 'bg-purple-500/20 text-purple-400' :
                              server.category === 'ai' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-700 text-slate-400'
                            }`}>{server.category}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{server.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {mcpServers.length > 12 && (
                  <button
                    onClick={() => setShowAllServers(!showAllServers)}
                    className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mx-auto"
                  >
                    {showAllServers ? 'Show less' : `Show all ${mcpServers.length} servers`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllServers ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Database Highlights */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  Featured Databases
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'PubMed', count: '36M+', desc: 'Biomedical literature', color: 'blue' },
                    { name: 'ChEMBL', count: '2.4M', desc: 'Bioactive compounds', color: 'pink' },
                    { name: 'AACT', count: '566K+', desc: 'Clinical trials', color: 'emerald' },
                  ].map((db) => (
                    <div key={db.name} className={`relative overflow-hidden bg-gradient-to-br from-${db.color}-500/10 to-transparent border border-${db.color}-500/20 rounded-xl p-5`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 bg-${db.color}-500/10 rounded-full blur-2xl`} />
                      <div className="relative">
                        <h3 className="font-bold text-white text-lg mb-1">{db.name}</h3>
                        <div className={`text-2xl font-bold text-${db.color}-400 mb-2`}>{db.count}</div>
                        <p className="text-sm text-slate-400">{db.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-slate-800/50 bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Ready to start?</h3>
                <p className="text-slate-400 text-sm">Select or create a project from the sidebar to begin your research</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

function WorkspaceContent() {
  // URL params for project and tab persistence
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mobile detection
  const isMobile = useIsMobile(768);

  // Projects state
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Text files state (for Notes view - all readable files in project)
  const [textFiles, setTextFiles] = useState<WorkspaceDataItem[]>([]);
  const [loadingTextFiles, setLoadingTextFiles] = useState(false);
  const [selectedTextFile, setSelectedTextFile] = useState<WorkspaceDataItem | null>(null);
  const [textFileContent, setTextFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [skipLargeFileLoad, setSkipLargeFileLoad] = useState(false);

  // View mode - default to terminal for quick research start
  const [viewMode, setViewMode] = useState<ViewMode>('terminal');

  // Mobile UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileFileBrowserOpen, setMobileFileBrowserOpen] = useState(false);

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

  // Ref for sending input to terminal (for mobile input component)
  const terminalInputRef = useRef<CCResearchTerminalHandle | null>(null);

  // Import data modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'web' | 'upload'>('github');
  const [importUrls, setImportUrls] = useState<string[]>(['']);
  const [importBranch, setImportBranch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const importFileInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.value = '';
  }, []);

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

  // Restore state from URL params (priority) or localStorage on mount
  useEffect(() => {
    // URL params take priority over localStorage
    const urlProject = searchParams.get('project');
    const urlTab = searchParams.get('tab');

    const savedProject = localStorage.getItem('workspace_selected_project');
    const savedViewMode = localStorage.getItem('workspace_view_mode');
    const savedTerminalMode = localStorage.getItem('workspace_terminal_mode');
    const savedFileBrowser = localStorage.getItem('workspace_file_browser_open');
    const savedSidebarCollapsed = localStorage.getItem('workspace_sidebar_collapsed');

    // Project: URL param > localStorage
    if (urlProject) {
      setSelectedProject(urlProject);
    } else if (savedProject) {
      setSelectedProject(savedProject);
    }

    // Tab/ViewMode: URL param > localStorage
    if (urlTab && ['terminal', 'notes', 'data'].includes(urlTab)) {
      setViewMode(urlTab as ViewMode);
    } else if (savedViewMode && ['terminal', 'notes', 'data'].includes(savedViewMode)) {
      setViewMode(savedViewMode as ViewMode);
    }

    if (savedTerminalMode && ['claude', 'ssh'].includes(savedTerminalMode)) {
      setTerminalMode(savedTerminalMode as 'claude' | 'ssh');
    }
    if (savedFileBrowser !== null) {
      setShowFileBrowser(savedFileBrowser === 'true');
    }
    if (savedSidebarCollapsed === 'true') {
      setSidebarCollapsed(true);
    }
  }, [searchParams]);

  // Update URL and localStorage when project or viewMode changes
  useEffect(() => {
    // Persist to localStorage
    if (selectedProject) {
      localStorage.setItem('workspace_selected_project', selectedProject);
    } else {
      localStorage.removeItem('workspace_selected_project');
    }
    localStorage.setItem('workspace_view_mode', viewMode);
    localStorage.setItem('workspace_sidebar_collapsed', sidebarCollapsed.toString());

    // Update URL without triggering navigation
    const params = new URLSearchParams();
    if (selectedProject) params.set('project', selectedProject);
    if (viewMode !== 'terminal') params.set('tab', viewMode); // Only include if not default

    const newUrl = params.toString() ? `?${params.toString()}` : '/workspace';
    window.history.replaceState({}, '', newUrl);
  }, [selectedProject, viewMode, sidebarCollapsed]);

  // Persist terminal mode to localStorage
  useEffect(() => {
    localStorage.setItem('workspace_terminal_mode', terminalMode);
  }, [terminalMode]);

  // Persist file browser state to localStorage
  useEffect(() => {
    localStorage.setItem('workspace_file_browser_open', String(showFileBrowser));
  }, [showFileBrowser]);

  // Close sidebar when project is selected on mobile
  useEffect(() => {
    if (isMobile && selectedProject) {
      setSidebarOpen(false);
    }
  }, [selectedProject, isMobile]);

  // Handle mobile terminal input
  const handleMobileTerminalInput = useCallback((input: string) => {
    if (terminalInputRef.current) {
      terminalInputRef.current.sendInput(input);
    }
  }, []);

  // Handle mobile terminal control sequences (Ctrl+C, etc)
  const handleMobileTerminalControl = useCallback((sequence: string) => {
    if (terminalInputRef.current) {
      terminalInputRef.current.sendInput(sequence);
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

  // Import data from GitHub (supports multiple URLs)
  const importFromGitHub = async () => {
    const validUrls = importUrls.filter(url => url.trim());
    if (!terminalSessionId || validUrls.length === 0) {
      showToast('Start a terminal first to clone repositories', 'error');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    try {
      for (const url of validUrls) {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/clone-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo_url: url.trim(),
            branch: importBranch.trim() || undefined,
            target_path: 'data',
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const error = await res.json().catch(() => ({ detail: 'Clone failed' }));
          showToast(`Failed to clone ${url}: ${error.detail}`, 'error');
        }
      }

      if (successCount > 0) {
        showToast(`Cloned ${successCount} repository(s) successfully`, 'success');
        setShowImportModal(false);
        setImportUrls(['']);
        setImportBranch('');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to clone repositories', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Import data from Web URLs (supports multiple)
  const importFromWeb = async () => {
    const validUrls = importUrls.filter(url => url.trim());
    if (!terminalSessionId || validUrls.length === 0) {
      showToast('Start a terminal first to fetch web URLs', 'error');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    try {
      for (const url of validUrls) {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/fetch-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const error = await res.json().catch(() => ({ detail: 'Fetch failed' }));
          showToast(`Failed to fetch ${url}: ${error.detail}`, 'error');
        }
      }

      if (successCount > 0) {
        showToast(`Fetched ${successCount} URL(s) successfully`, 'success');
        setShowImportModal(false);
        setImportUrls(['']);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to fetch URLs', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Import files via upload
  const importFromUpload = async () => {
    if (importFiles.length === 0) return;

    setIsImporting(true);
    try {
      if (terminalSessionId) {
        // Upload to terminal session
        await handleTerminalUpload(importFiles, 'data');
      } else if (selectedProject) {
        // Upload to workspace project
        await workspaceApi.uploadData(selectedProject, importFiles, '');
      } else {
        showToast('Select a project or start a terminal first', 'error');
        return;
      }

      showToast(`Uploaded ${importFiles.length} file(s) successfully`, 'success');
      setShowImportModal(false);
      setImportFiles([]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload files', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (importType === 'github') {
      importFromGitHub();
    } else if (importType === 'web') {
      importFromWeb();
    } else if (importType === 'upload') {
      importFromUpload();
    }
  };

  // Add/remove URL inputs
  const addUrlInput = () => {
    setImportUrls([...importUrls, '']);
  };

  const removeUrlInput = (index: number) => {
    if (importUrls.length > 1) {
      setImportUrls(importUrls.filter((_, i) => i !== index));
    }
  };

  const updateUrlInput = (index: number, value: string) => {
    const newUrls = [...importUrls];
    newUrls[index] = value;
    setImportUrls(newUrls);
  };

  // Check if we're on local network (for large file uploads)
  const isLocalNetwork = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.startsWith('172.16.') ||
           hostname.startsWith('172.17.') ||
           hostname.startsWith('172.18.') ||
           hostname.startsWith('172.19.') ||
           hostname.startsWith('172.2') ||
           hostname.startsWith('172.30.') ||
           hostname.startsWith('172.31.');
  };

  // Upload files to terminal session
  const handleTerminalUpload = async (files: File[], targetPath: string) => {
    if (!terminalSessionId) return;

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

    // Use local upload endpoint for large files on local network
    const useLocalUpload = totalSize > SIZE_THRESHOLD && isLocalNetwork();
    const endpoint = useLocalUpload ? 'upload-local' : 'upload';

    if (useLocalUpload) {
      console.log(`Large upload (${(totalSize / 1024 / 1024).toFixed(0)}MB) - using local network endpoint`);
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('target_path', targetPath || 'data');

    try {
      const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        // If local upload fails due to IP check, fall back to regular upload
        if (useLocalUpload && error.detail?.includes('local network')) {
          console.log('Falling back to regular upload (not on local network)');
          const fallbackRes = await fetch(`${getApiUrl()}/ccresearch/sessions/${terminalSessionId}/upload`, {
            method: 'POST',
            body: formData,
          });
          if (!fallbackRes.ok) {
            const fallbackError = await fallbackRes.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(fallbackError.detail || 'Failed to upload files');
          }
          const result = await fallbackRes.json();
          showToast(`Uploaded ${result.uploaded_files?.length || files.length} file(s)`, 'success');
          return;
        }
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

      // Don't auto-select any project - show welcome screen instead
      // User must explicitly select a project
      setSelectedProject(null);
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
      // Don't show toast for empty projects - just set empty array
      console.error('Failed to load text files:', error);
      setTextFiles([]);
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

      {/* Mobile Header */}
      <MobileHeader
        projectName={selectedProject}
        onToggleSidebar={() => setSidebarOpen(true)}
      />

      {/* Desktop Header */}
      <header className="hidden md:block bg-slate-800/50 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <Home size={20} />
            </Link>
            <h1 className="text-xl font-bold text-white">C3 Researcher Workspace</h1>
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

      {/* Mobile Drawer Sidebar */}
      <DrawerOverlay isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <ProjectSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={(name) => {
            setSelectedProject(name);
            setSidebarOpen(false);
          }}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          loading={loadingProjects}
        />
      </DrawerOverlay>

      {/* Mobile File Browser Modal */}
      <FileBrowserModal
        isOpen={mobileFileBrowserOpen && isMobile}
        onClose={() => setMobileFileBrowserOpen(false)}
      >
        {terminalSessionId && (
          <FileBrowser
            sessionId={terminalSessionId}
            workspaceDir={terminalWorkspaceDir}
            autoRefreshInterval={5000}
            onUpload={handleTerminalUpload}
            onCloneRepo={handleTerminalCloneRepo}
          />
        )}
      </FileBrowserModal>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)] md:h-[calc(100vh-60px)] pb-16 md:pb-0">
        {/* Desktop Project Sidebar */}
        <div className="hidden md:block">
          <ProjectSidebar
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            loading={loadingProjects}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {/* Welcome Content - shown when no project selected */}
          {!selectedProject && <WelcomeContent />}

          {/* Notes View */}
          {selectedProject && viewMode === 'notes' && (
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
          )}

          {/* Data View */}
          {selectedProject && viewMode === 'data' && (
            <DataBrowser projectName={selectedProject} />
          )}

          {/* Terminal View - ALWAYS MOUNTED when project selected, hidden with CSS when not active */}
          {/* This prevents losing terminal connection when switching tabs */}
          {selectedProject && (
            <div className={`h-full flex flex-col absolute inset-0 ${viewMode === 'terminal' ? '' : 'invisible pointer-events-none'}`}>
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
                  {/* Import Data - Always visible */}
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded text-sm transition-colors"
                    title="Import data from GitHub, Web URLs, or upload files"
                  >
                    <Download size={14} />
                    Import Data
                  </button>
                  {terminalSessionId && (
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
                        inputRef={terminalInputRef}
                      />
                    </div>
                    {/* File Browser Sidebar - Desktop only */}
                    {showFileBrowser && (
                      <div className="hidden md:block w-80 border-l border-slate-700 bg-slate-900/50 flex-shrink-0 overflow-hidden">
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
                        <div className="text-lg font-bold text-emerald-400">145+</div>
                        <div className="text-xs text-slate-500">Skills</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-blue-400">34</div>
                        <div className="text-xs text-slate-500">MCP Servers</div>
                      </div>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-purple-400">14</div>
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

              {/* Mobile Terminal Input - Only show when terminal is active */}
              {terminalSessionId && (
                <MobileTerminalInput
                  onSendInput={handleMobileTerminalInput}
                  onSendControlSequence={handleMobileTerminalControl}
                  disabled={!terminalConnected}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>

    {/* Import Data Modal */}
    {showImportModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Download size={20} className="text-indigo-400" />
              Import Data
            </h3>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportUrls(['']);
                setImportBranch('');
                setImportFiles([]);
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  importType === 'web'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Globe size={16} />
                Web URL
              </button>
              <button
                onClick={() => setImportType('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  importType === 'upload'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>

            {/* GitHub Import */}
            {importType === 'github' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Repository URLs
                  </label>
                  <div className="space-y-2">
                    {importUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => updateUrlInput(index, e.target.value)}
                          placeholder="https://github.com/user/repo"
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {importUrls.length > 1 && (
                          <button
                            onClick={() => removeUrlInput(index)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addUrlInput}
                    className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add another URL
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Branch (optional, applies to all)
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
                  Repositories will be cloned into the data/ folder. Requires active terminal.
                </p>
              </div>
            )}

            {/* Web URL Import */}
            {importType === 'web' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Web URLs
                  </label>
                  <div className="space-y-2">
                    {importUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => updateUrlInput(index, e.target.value)}
                          placeholder="https://example.com/page"
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {importUrls.length > 1 && (
                          <button
                            onClick={() => removeUrlInput(index)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addUrlInput}
                    className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add another URL
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Page content will be saved as markdown files. Requires active terminal.
                </p>
              </div>
            )}

            {/* File Upload */}
            {importType === 'upload' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Select Files
                  </label>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => setImportFiles(Array.from(e.target.files || []))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>
                {importFiles.length > 0 && (
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-sm text-slate-300 mb-2">{importFiles.length} file(s) selected:</p>
                    <ul className="text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                      {importFiles.map((file, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <FileText size={12} />
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Files will be uploaded to the data/ folder. Works with or without active terminal.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportUrls(['']);
                setImportBranch('');
                setImportFiles([]);
              }}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || (importType !== 'upload' && !importUrls.some(u => u.trim())) || (importType === 'upload' && importFiles.length === 0)}
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

      {/* Mobile Bottom Navigation */}
      <MobileNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToggleSidebar={() => setSidebarOpen(true)}
        onToggleFileBrowser={() => setMobileFileBrowserOpen(!mobileFileBrowserOpen)}
        fileBrowserOpen={mobileFileBrowserOpen}
        hasProject={!!selectedProject}
      />
    </ProtectedRoute>
  );
}

// Wrap with Suspense for useSearchParams (required in Next.js 16)
export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
