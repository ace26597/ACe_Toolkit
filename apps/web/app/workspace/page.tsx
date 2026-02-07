'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Search, FolderOpen, FileText, RefreshCw, Home, X, ChevronRight, ChevronDown, Terminal, Plus, Lightbulb, Database, Server, Sparkles, Wrench, Dna, Pill, Brain, BarChart3, BookOpen, Zap, Copy, Check, Key, Play, Loader2, Beaker, Menu } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import ProjectSidebar from '@/components/workspace/ProjectSidebar';
import DataBrowser from '@/components/workspace/DataBrowser';
import { MobileNav, MobileHeader, DrawerOverlay } from '@/components/workspace/MobileNav';
import { useIsMobile } from '@/hooks/useWorkspaceState';
import { workspaceApi, WorkspaceProject } from '@/lib/api';
import TerminalView from '@/components/workspace/TerminalView';
import NotesView from '@/components/workspace/NotesView';

// Import capabilities data for welcome view
import capabilitiesData from '@/data/ccresearch/capabilities.json';
import useCasesData from '@/data/ccresearch/use-cases.json';

type ViewMode = 'notes' | 'data' | 'terminal';

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
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  Quick Start
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: 'Create Project', desc: 'Click "New Project" in sidebar', icon: <FolderOpen className="w-5 h-5" />, glowClass: 'from-emerald-500/50 to-emerald-500/0', iconBgClass: 'bg-emerald-500/20 text-emerald-400' },
                    { step: 2, title: 'Start Terminal', desc: 'Open Terminal tab, click Start', icon: <Terminal className="w-5 h-5" />, glowClass: 'from-blue-500/50 to-blue-500/0', iconBgClass: 'bg-blue-500/20 text-blue-400' },
                    { step: 3, title: 'Ask Questions', desc: 'Type natural language queries', icon: <Sparkles className="w-5 h-5" />, glowClass: 'from-purple-500/50 to-purple-500/0', iconBgClass: 'bg-purple-500/20 text-purple-400' },
                    { step: 4, title: 'Review Results', desc: 'View in Notes & Files tabs', icon: <FileText className="w-5 h-5" />, glowClass: 'from-amber-500/50 to-amber-500/0', iconBgClass: 'bg-amber-500/20 text-amber-400' },
                  ].map((item) => (
                    <div key={item.step} className="relative group">
                      <div className={`absolute -inset-0.5 bg-gradient-to-r ${item.glowClass} rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.iconBgClass} mb-4`}>
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
                      { key: 'Up/Down', desc: 'History navigation' },
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

              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  Featured Databases
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'PubMed', count: '36M+', desc: 'Biomedical literature', cardClass: 'from-blue-500/10 to-transparent border-blue-500/20', blurClass: 'bg-blue-500/10', countClass: 'text-blue-400' },
                    { name: 'ChEMBL', count: '2.4M', desc: 'Bioactive compounds', cardClass: 'from-pink-500/10 to-transparent border-pink-500/20', blurClass: 'bg-pink-500/10', countClass: 'text-pink-400' },
                    { name: 'AACT', count: '566K+', desc: 'Clinical trials', cardClass: 'from-emerald-500/10 to-transparent border-emerald-500/20', blurClass: 'bg-emerald-500/10', countClass: 'text-emerald-400' },
                  ].map((db) => (
                    <div key={db.name} className={`relative overflow-hidden bg-gradient-to-br ${db.cardClass} rounded-xl p-5`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 ${db.blurClass} rounded-full blur-2xl`} />
                      <div className="relative">
                        <h3 className="font-bold text-white text-lg mb-1">{db.name}</h3>
                        <div className={`text-2xl font-bold ${db.countClass} mb-2`}>{db.count}</div>
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

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile(768);
  const { user } = useAuth();

  // Projects state
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('terminal');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New note modal
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteFilename, setNewNoteFilename] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Restore state from URL params (priority) or localStorage on mount
  useEffect(() => {
    const urlProject = searchParams.get('project');
    const urlTab = searchParams.get('tab');

    const savedProject = localStorage.getItem('workspace_selected_project');
    const savedViewMode = localStorage.getItem('workspace_view_mode');
    const savedSidebarCollapsed = localStorage.getItem('workspace_sidebar_collapsed');

    if (urlProject) {
      setSelectedProject(urlProject);
    } else if (savedProject) {
      setSelectedProject(savedProject);
    }

    if (urlTab && ['terminal', 'notes', 'data'].includes(urlTab)) {
      setViewMode(urlTab as ViewMode);
    } else if (savedViewMode && ['terminal', 'notes', 'data'].includes(savedViewMode)) {
      setViewMode(savedViewMode as ViewMode);
    }

    if (savedSidebarCollapsed === 'true') {
      setSidebarCollapsed(true);
    }
  }, [searchParams]);

  // Update URL and localStorage when project or viewMode changes
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('workspace_selected_project', selectedProject);
    } else {
      localStorage.removeItem('workspace_selected_project');
    }
    localStorage.setItem('workspace_view_mode', viewMode);
    localStorage.setItem('workspace_sidebar_collapsed', sidebarCollapsed.toString());

    const params = new URLSearchParams();
    if (selectedProject) params.set('project', selectedProject);
    if (viewMode !== 'terminal') params.set('tab', viewMode);

    const newUrl = params.toString() ? `?${params.toString()}` : '/workspace';
    window.history.replaceState({}, '', newUrl);
  }, [selectedProject, viewMode, sidebarCollapsed]);

  // Close sidebar when project is selected on mobile
  useEffect(() => {
    if (isMobile && selectedProject) {
      setSidebarOpen(false);
    }
  }, [selectedProject, isMobile]);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await workspaceApi.listProjects();
      setProjects(data);

      setSelectedProject(prev => {
        if (prev) {
          const projectExists = data.some(p => p.name === prev);
          if (projectExists) {
            return prev;
          }
          localStorage.removeItem('workspace_selected_project');
        }
        return null;
      });
    } catch (error) {
      showToast('Failed to load projects', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Create project
  const handleCreateProject = async (name: string) => {
    try {
      const project = await workspaceApi.createProject(name);
      setProjects(prev => [project, ...prev]);
      setSelectedProject(project.name);
      showToast('Project created');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create project', 'error');
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
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete project', 'error');
    }
  };

  // Create new note
  const handleCreateNewNote = async () => {
    if (!selectedProject) {
      showToast('Select a project first', 'error');
      return;
    }

    let filename = newNoteFilename.trim();
    if (!filename) {
      showToast('Enter a filename', 'error');
      return;
    }

    if (!filename.includes('.')) {
      filename += '.md';
    }

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
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create note', 'error');
    } finally {
      setIsCreatingNote(false);
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Content <span className="text-slate-500 font-normal">(optional - paste or type)</span>
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder={"# My Note\n\nStart writing here... or paste content from elsewhere."}
                  rows={10}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-mono text-sm"
                />
              </div>

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

            <Link
              href="/ccresearch/tips"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 rounded-lg transition-colors text-sm"
              title="Prompting tips & best practices"
            >
              <Lightbulb size={16} />
              <span className="hidden sm:inline">Tips</span>
            </Link>

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

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)] h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] pb-16 md:pb-0">
        {/* Desktop Project Sidebar */}
        <div className="hidden md:block h-full">
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
            <NotesView
              selectedProject={selectedProject}
              searchQuery={searchQuery}
              showToast={showToast}
              onShowNewNoteModal={() => setShowNewNoteModal(true)}
            />
          )}

          {/* Data View */}
          {selectedProject && viewMode === 'data' && (
            <DataBrowser projectName={selectedProject} />
          )}

          {/* Terminal View - ALWAYS MOUNTED when project selected, hidden with CSS when not active */}
          {selectedProject && (
            <div className={`h-full absolute inset-0 ${viewMode === 'terminal' ? '' : 'invisible pointer-events-none'}`}>
              <TerminalView
                key={selectedProject}
                selectedProject={selectedProject}
                userEmail={user?.email}
                showToast={showToast}
                isMobile={isMobile}
              />
            </div>
          )}
        </main>
      </div>
    </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToggleSidebar={() => setSidebarOpen(true)}
        onToggleFileBrowser={() => {}}
        fileBrowserOpen={false}
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
