'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { TerminalDemo } from '@/components/home/TerminalDemo';

const stats = [
  { value: '145+', label: 'Skills', color: 'bg-blue-400' },
  { value: '34', label: 'MCP Servers', color: 'bg-cyan-400' },
  { value: '15', label: 'Plugins', color: 'bg-violet-400' },
  { value: '30+', label: 'Databases', color: 'bg-amber-400' },
];

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden">
      {/* Animated dot grid background */}
      <div className="absolute inset-0 dot-grid grid-animate" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-cyan-600/5" />

      {/* Subtle scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent scan-line" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 w-full">
        <div className="text-center max-w-3xl mx-auto">
          {/* System Online Badge */}
          <div className="fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
              System Online
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="fade-in-up-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Command Center for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400">
              AI Research
            </span>
          </h1>

          {/* Subheading */}
          <p className="fade-in-up-delay-2 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Full Claude Code terminal with 145+ skills, 34 MCP servers, and access to 30+ databases.
            Research, analyze, and create — all from one interface.
          </p>

          {/* CTAs */}
          <div className="fade-in-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            {user ? (
              <Link
                href="/workspace"
                className="group bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/25 inline-flex items-center gap-2.5 text-base"
              >
                Launch Workspace
                <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="group bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/25 inline-flex items-center gap-2.5 text-base"
              >
                Launch Workspace
                <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            <Link
              href="/showcase"
              className="group text-slate-300 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all inline-flex items-center gap-2 text-base"
            >
              View Showcase
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </Link>
          </div>

          {/* Mission Indicator Stats */}
          <div className="fade-in-up-delay-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${stat.color} pulse-dot`} />
                <span className="text-white font-bold text-lg tabular-nums">{stat.value}</span>
                <span className="text-slate-500 text-sm">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Demo with glow */}
        <div className="max-w-3xl mx-auto fade-in-up-delay-4">
          <div className="relative">
            {/* Glow effect behind terminal */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl glow-pulse" />
            <div className="relative">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
