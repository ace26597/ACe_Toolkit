"use client";

import Link from 'next/link';
import { ArrowLeft, Sparkles, Bug, Wrench, Zap, Package } from 'lucide-react';

interface ChangelogEntry {
  date: string;
  version?: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'breaking';
    title: string;
    description?: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: '2026-01-29',
    version: '2.5.0',
    changes: [
      { type: 'feature', title: 'Dark/Light Theme Toggle', description: 'Switch between dark and light modes with persistent preference' },
      { type: 'feature', title: 'Loading Skeletons', description: 'Improved loading states with skeleton animations' },
      { type: 'feature', title: 'Changelog Page', description: 'Track all updates and improvements' },
      { type: 'feature', title: 'Status Page', description: 'Monitor service health in real-time' },
      { type: 'improvement', title: 'SEO Enhancements', description: 'Added sitemap, meta descriptions, and page-specific metadata' },
      { type: 'improvement', title: 'Mobile Responsiveness', description: 'Better layout on smaller screens' },
    ],
  },
  {
    date: '2026-01-28',
    version: '2.4.0',
    changes: [
      { type: 'feature', title: 'Remotion Video Studio', description: 'Real PTY terminal for AI video creation with full Claude access' },
      { type: 'breaking', title: 'Video Factory Removed', description: 'Replaced by the new Video Studio with better capabilities' },
    ],
  },
  {
    date: '2026-01-23',
    version: '2.3.0',
    changes: [
      { type: 'feature', title: 'Data Studio V2', description: 'Claude Code-first data analysis with auto-generated dashboards' },
      { type: 'feature', title: 'Multi-file Analysis', description: 'Analyze multiple files with combined or separate modes' },
      { type: 'feature', title: 'NLP Dashboard Editing', description: 'Edit charts using natural language commands' },
      { type: 'fix', title: 'Empty Stat Cards', description: 'Fixed display issues with alternate field names' },
    ],
  },
  {
    date: '2026-01-22',
    version: '2.2.0',
    changes: [
      { type: 'feature', title: 'C3 Researcher Workspace', description: 'Unified workspace with terminal, notes, and file browser' },
      { type: 'feature', title: 'Welcome Page', description: 'Comprehensive capabilities overview when no project selected' },
      { type: 'improvement', title: 'Import Data', description: 'Multi-URL support and file upload in workspace' },
      { type: 'fix', title: 'GitHub Clone Error', description: 'Fixed Python 3.13 re module scoping issue' },
    ],
  },
  {
    date: '2026-01-21',
    version: '2.1.0',
    changes: [
      { type: 'feature', title: 'Session Sharing', description: 'Public read-only share links for research sessions' },
      { type: 'feature', title: 'Session Rename', description: 'Rename sessions without changing directories' },
      { type: 'fix', title: 'AACT Password', description: 'Fixed URL encoding for special characters' },
    ],
  },
  {
    date: '2026-01-20',
    version: '2.0.0',
    changes: [
      { type: 'feature', title: 'Unified Auth System', description: '24-hour trial with admin approval workflow' },
      { type: 'feature', title: 'Per-user Data Isolation', description: 'Separate data directories for each user' },
      { type: 'breaking', title: 'Authentication Required', description: 'All apps now require login' },
    ],
  },
];

const typeConfig = {
  feature: { icon: Sparkles, color: 'text-green-400', bg: 'bg-green-400/10', label: 'New' },
  fix: { icon: Bug, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Fix' },
  improvement: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Improved' },
  breaking: { icon: Wrench, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Breaking' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Changelog</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">What&apos;s New</h1>
          <p className="text-slate-400">Track all updates, improvements, and fixes to C3 Researcher.</p>
        </div>

        <div className="space-y-8">
          {changelog.map((entry, i) => (
            <div key={i} className="relative">
              {/* Timeline line */}
              {i < changelog.length - 1 && (
                <div className="absolute left-[7px] top-8 bottom-0 w-px bg-slate-800" />
              )}

              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-950 z-10" />
                <time className="text-sm font-medium text-slate-400">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </time>
                {entry.version && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    v{entry.version}
                  </span>
                )}
              </div>

              {/* Changes */}
              <div className="ml-7 space-y-3">
                {entry.changes.map((change, j) => {
                  const config = typeConfig[change.type];
                  const Icon = config.icon;
                  return (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                      <div className={`p-1.5 rounded-md ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          <h3 className="font-medium text-white">{change.title}</h3>
                        </div>
                        {change.description && (
                          <p className="text-sm text-slate-400 mt-1">{change.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-blue-400 hover:text-blue-300">C3 Researcher</Link>
          {' '}&middot;{' '}
          <Link href="/status" className="hover:text-slate-400">Status</Link>
        </div>
      </footer>
    </div>
  );
}
