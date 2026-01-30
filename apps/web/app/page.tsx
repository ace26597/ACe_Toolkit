"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  User, LogOut, Shield, Clock, Cpu, Zap,
  Database, FileText, Video, ChevronRight, Star,
  Server, Terminal, ArrowRight, Sparkles, ExternalLink
} from 'lucide-react';
import { useAuth, LoginModal, ExperimentalBanner } from '@/components/auth';
import { MobileMenu } from '@/components/ui/MobileMenu';
import { TerminalDemo } from '@/components/home/TerminalDemo';

export default function Home() {
  const { user, loading, logout, trialInfo } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTrialText = () => {
    if (!trialInfo || !trialInfo.is_trial || !trialInfo.trial_expires_at) return null;
    const expiresAt = new Date(trialInfo.trial_expires_at);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return hoursLeft > 0 ? `${hoursLeft}h trial` : 'Trial expired';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <ExperimentalBanner />

      {/* Compact Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-md flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">C3 Researcher</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/workspace" className="text-slate-400 hover:text-white transition-colors">Workspace</Link>
            <Link href="/directory" className="text-slate-400 hover:text-white transition-colors">Directory</Link>
            <Link href="/showcase" className="text-slate-400 hover:text-white transition-colors">Showcase</Link>
            <Link href="/ccresearch/tips" className="text-slate-400 hover:text-white transition-colors">Tips</Link>
          </nav>

          <MobileMenu links={[
            { href: '/workspace', label: 'Workspace' },
            { href: '/directory', label: 'Directory' },
            { href: '/showcase', label: 'Showcase' },
            { href: '/ccresearch/tips', label: 'Tips' },
            { href: '/changelog', label: 'Changelog' },
            { href: '/status', label: 'Status' },
          ]} />

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-7 h-7 animate-pulse bg-slate-800 rounded-full" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.name}</span>
                  {user.is_admin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                  {trialInfo?.is_trial && (
                    <span className="text-xs text-amber-500">{getTrialText()}</span>
                  )}
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                      <div className="px-3 py-2 border-b border-slate-700">
                        <p className="text-sm text-white truncate">{user.email}</p>
                      </div>
                      {user.is_admin && (
                        <Link href="/admin" onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-slate-700">
                          <Shield className="w-4 h-4" /> Admin
                        </Link>
                      )}
                      <button onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">
                Try Free
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero - Two Column */}
      <section className="relative border-b border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Text */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Claude Code with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  145+ Skills
                </span>
              </h1>
              <p className="text-lg text-slate-400 mb-6 max-w-xl">
                Full terminal access to research tools, MCP servers, and plugins.
                Data analysis, document generation, web research, and more.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {user ? (
                  <Link href="/workspace"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-md transition-colors inline-flex items-center gap-2">
                    Open Workspace <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button onClick={() => setShowLoginModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-md transition-colors inline-flex items-center gap-2">
                    Try Free <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <Link href="/showcase"
                  className="text-slate-400 hover:text-white font-medium px-4 py-2.5 transition-colors inline-flex items-center gap-2">
                  View Showcase <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right - Terminal Demo */}
            <div className="lg:pl-4">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row - Inline */}
      <section className="border-b border-slate-800/50 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-white font-medium">145+</span>
              <span className="text-slate-500">Skills</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-medium">34</span>
              <span className="text-slate-500">MCP Servers</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span className="text-white font-medium">14</span>
              <span className="text-slate-500">Plugins</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="text-white font-medium">30+</span>
              <span className="text-slate-500">Databases</span>
            </div>
            <Link href="/directory" className="text-blue-400 hover:text-blue-300 ml-auto hidden md:flex items-center gap-1">
              Browse all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Apps - Horizontal List */}
      <section className="py-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Applications</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/workspace" className="group flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Terminal className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">C3 Workspace</h3>
                  <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">MAIN</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Full Claude Code terminal with all skills</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link href="/data-studio" className="group flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white">Data Studio</h3>
                <p className="text-sm text-slate-500 mt-0.5">AI data analysis & dashboards</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </Link>

            <Link href="/video-studio" className="group flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Video Studio</h3>
                  <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-medium">NEW</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Remotion video generation</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400 transition-colors" />
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities - Compact Table Style */}
      <section className="py-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Capabilities</h2>
            <Link href="/directory" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Full directory <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {[
              { icon: '📊', name: 'Data Analysis', desc: 'Pandas, Plotly, stats' },
              { icon: '📄', name: 'Document Gen', desc: 'DOCX, PDF, PPTX, XLSX' },
              { icon: '🔍', name: 'Web Search', desc: 'Research & citations' },
              { icon: '🤗', name: 'HuggingFace', desc: 'ML models & datasets' },
              { icon: '🎬', name: 'Remotion', desc: 'Video generation' },
              { icon: '💻', name: 'Code Tools', desc: 'Git, npm, testing' },
              { icon: '🔬', name: 'Scientific DBs', desc: 'PubMed, ChEMBL, more' },
              { icon: '🏥', name: 'Clinical Data', desc: 'Trials, NPI, ICD-10' },
              { icon: '🧠', name: 'AI Agents', desc: 'Custom workflows' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
                <span className="text-lg">{item.icon}</span>
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-slate-500 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 mt-4">
            + 30 more databases, 145+ skills, 14 plugins...{' '}
            <Link href="/directory" className="text-blue-400 hover:underline">see all</Link>
          </p>
        </div>
      </section>

      {/* Showcase Preview - Compact List */}
      <section className="py-8 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Recent Projects</h2>
            <Link href="/showcase" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-2">
            {[
              { icon: <Video className="w-4 h-4 text-violet-400" />, title: 'AI-Generated Explainer Videos', tag: 'Video', desc: 'Claude researched, scripted, and rendered' },
              { icon: <FileText className="w-4 h-4 text-cyan-400" />, title: 'Automated Data Reports', tag: 'Analysis', desc: 'CSV to insights in minutes' },
              { icon: <Sparkles className="w-4 h-4 text-amber-400" />, title: 'Research Documents', tag: 'Docs', desc: 'DOCX, PDF with citations' },
            ].map((item, i) => (
              <Link key={i} href="/showcase" className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-900/50 transition-colors group">
                <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{item.title}</span>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{item.tag}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Start Exploring</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Free access to all skills, MCP servers, and plugins. No credit card required.
          </p>
          {user ? (
            <Link href="/workspace"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-md transition-colors inline-flex items-center gap-2">
              Open Workspace <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button onClick={() => setShowLoginModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-md transition-colors inline-flex items-center gap-2">
              Try Free <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-slate-800/50 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded flex items-center justify-center">
              <Cpu className="w-3 h-3 text-white" />
            </div>
            <span>C3 Researcher</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/showcase" className="hover:text-white transition-colors">Showcase</Link>
            <Link href="/directory" className="hover:text-white transition-colors">Directory</Link>
            <Link href="/ccresearch/tips" className="hover:text-white transition-colors">Tips</Link>
          </div>
          <span className="text-slate-600">Powered by Claude</span>
        </div>
      </footer>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
