'use client';

import Link from 'next/link';
import {
  Database, BarChart3, FileText, Globe, Brain,
  Video, Heart, Code, Bot, ArrowRight,
} from 'lucide-react';

interface Capability {
  icon: React.ReactNode;
  name: string;
  description: string;
  glowClass: string;
  iconBg: string;
}

const capabilities: Capability[] = [
  {
    icon: <Database className="w-5 h-5 text-blue-400" />,
    name: 'Scientific Databases',
    description: '30+ sources including PubMed, ChEMBL, UniProt, AACT',
    glowClass: 'hover:glow-blue',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
    name: 'Data Analysis',
    description: 'Pandas, Plotly, SciPy, statistical modeling',
    glowClass: 'hover:glow-cyan',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: <FileText className="w-5 h-5 text-green-400" />,
    name: 'Document Generation',
    description: 'DOCX, PDF, PPTX, XLSX with templates',
    glowClass: 'hover:glow-green',
    iconBg: 'bg-green-500/10 border-green-500/20',
  },
  {
    icon: <Globe className="w-5 h-5 text-amber-400" />,
    name: 'Web Research',
    description: 'Search, fetch, parse with citations',
    glowClass: 'hover:glow-amber',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: <Brain className="w-5 h-5 text-violet-400" />,
    name: 'ML & AI',
    description: 'HuggingFace models, datasets, training',
    glowClass: 'hover:glow-violet',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: <Video className="w-5 h-5 text-rose-400" />,
    name: 'Video Creation',
    description: 'Remotion rendering with AI direction',
    glowClass: 'hover:glow-rose',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    icon: <Heart className="w-5 h-5 text-red-400" />,
    name: 'Clinical Data',
    description: 'Trials (566K+), NPI, ICD-10 codes',
    glowClass: 'hover:glow-red',
    iconBg: 'bg-red-500/10 border-red-500/20',
  },
  {
    icon: <Code className="w-5 h-5 text-slate-400" />,
    name: 'Code Tools',
    description: 'Git, npm, testing, debugging',
    glowClass: 'hover:glow-blue',
    iconBg: 'bg-slate-500/10 border-slate-500/20',
  },
  {
    icon: <Bot className="w-5 h-5 text-indigo-400" />,
    name: 'AI Agents',
    description: 'Custom workflows, agent factory',
    glowClass: 'hover:glow-indigo',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
  },
];

export function CapabilitiesGrid() {
  return (
    <section className="border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
              Mission Equipment
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            What&apos;s Available
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Every tool, database, and capability available in your Claude Code terminal session.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((cap) => (
            <div
              key={cap.name}
              className={`group p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 transition-all duration-300 ${cap.glowClass}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${cap.iconBg}`}
                >
                  {cap.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm mb-1">{cap.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{cap.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Browse Link */}
        <div className="text-center mt-8">
          <Link
            href="/directory"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
          >
            Browse all 145+ skills
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
