'use client';

import Link from 'next/link';
import {
  ArrowRight, Sparkles, Shield, Smartphone,
  BookOpen, BarChart3, Cpu, Rss,
} from 'lucide-react';

interface UpdateItem {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  labelColor: string;
  title: string;
  description: string;
  date: string;
}

const updates: UpdateItem[] = [
  {
    icon: <Cpu className="w-4 h-4" />,
    iconColor: 'text-violet-400',
    label: 'MODEL',
    labelColor: 'text-violet-400',
    title: 'Claude Opus 4.6 Support',
    description: 'Now running the latest Opus 4.6 model — deeper reasoning, better tool use, and improved long-form generation across all terminals.',
    date: 'Feb 7',
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    iconColor: 'text-amber-400',
    label: 'EXPERIMENTAL',
    labelColor: 'text-amber-400',
    title: 'Autonomous Agents Mode',
    description: 'Two AI agents (Alfred & Pip) running 24/7 with OpenClaw. Shared memory, role specialization, Discord/Telegram integration.',
    date: 'Feb 6',
  },
  {
    icon: <BookOpen className="w-4 h-4" />,
    iconColor: 'text-blue-400',
    label: 'CONTENT',
    labelColor: 'text-blue-400',
    title: 'Blog & Agent Diary',
    description: '7 technical posts on AI agents, model benchmarks, and research experiments. Daily diary entries from Alfred and Pip.',
    date: 'Feb 6',
  },
  {
    icon: <Shield className="w-4 h-4" />,
    iconColor: 'text-green-400',
    label: 'SECURITY',
    labelColor: 'text-green-400',
    title: 'Comprehensive Security Audit',
    description: 'CSRF protection, path traversal prevention, CSP headers, rate limiting, JWT hardening — 42 fixes across 40 files.',
    date: 'Feb 6',
  },
  {
    icon: <BarChart3 className="w-4 h-4" />,
    iconColor: 'text-cyan-400',
    label: 'FEATURE',
    labelColor: 'text-cyan-400',
    title: 'Data Studio V2 Redesign',
    description: 'Claude Code-first analysis, auto-generated Plotly dashboards, NLP editing, multi-file analysis modes.',
    date: 'Jan 23',
  },
  {
    icon: <Smartphone className="w-4 h-4" />,
    iconColor: 'text-rose-400',
    label: 'FIX',
    labelColor: 'text-rose-400',
    title: 'Mobile Auth & Viewport',
    description: 'Fixed cross-origin cookies, token refresh, viewport scaling, and bottom navigation for mobile devices.',
    date: 'Feb 4',
  },
];

export function WhatsNewSection() {
  return (
    <section className="border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 mb-6">
            <Rss className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
              Ship Log
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            What&apos;s New
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Latest updates, experiments, and improvements to the platform.
          </p>
        </div>

        {/* Updates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((item) => (
            <div
              key={item.title}
              className="group p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 transition-all duration-300"
            >
              {/* Top row: icon + label + date */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`${item.iconColor}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${item.labelColor}`}>
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-medium">{item.date}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-white mb-2 leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Changelog link */}
        <div className="text-center mt-8">
          <Link
            href="/changelog"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
          >
            Full changelog
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
