"use client";

import Link from 'next/link';
import {
  ArrowRight, Terminal, BarChart3, FileText,
  Video, Upload, Zap, GitBranch,
  Layers, Palette, Play, Film, Wand2,
  SquareStack, Database, Clock,
} from 'lucide-react';
import { useAuth, ExperimentalBanner } from '@/components/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { AppSection } from '@/components/home/AppSection';
import { CapabilitiesGrid } from '@/components/home/CapabilitiesGrid';
import { ShowcasePreview } from '@/components/home/ShowcasePreview';
import { ExperimentalSection } from '@/components/home/ExperimentalSection';
import { WhatsNewSection } from '@/components/home/WhatsNewSection';

/* ============================================================
   Inline Visual Components for App Sections
   ============================================================ */

/** Workspace Visual: A styled terminal window with floating capability badges */
function WorkspaceVisual() {
  return (
    <div className="relative">
      {/* Floating badges */}
      <div className="absolute -top-3 -left-3 z-10 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium backdrop-blur-sm">
        PubMed
      </div>
      <div className="absolute -top-2 right-8 z-10 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 font-medium backdrop-blur-sm">
        ChEMBL
      </div>
      <div className="absolute top-16 -right-3 z-10 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium backdrop-blur-sm">
        HuggingFace
      </div>
      <div className="absolute bottom-16 -left-4 z-10 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium backdrop-blur-sm">
        AACT
      </div>
      <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium backdrop-blur-sm">
        145+ Skills
      </div>

      {/* Terminal window */}
      <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/90 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[11px] text-slate-500 ml-2 font-mono">claude-code &mdash; workspace</span>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-[13px] leading-relaxed space-y-1">
          <div className="text-cyan-400">$ claude &quot;Search PubMed for CRISPR gene editing&quot;</div>
          <div className="text-amber-400">
            <span className="inline-block animate-pulse">&#9679;</span> Searching PubMed...
          </div>
          <div className="text-slate-400 pl-2">Found 2,847 results</div>
          <div className="text-slate-400 pl-2">Filtering by relevance and date...</div>
          <div className="text-green-400">&#10003; Retrieved top 25 papers with abstracts</div>
          <div className="h-3" />
          <div className="text-cyan-400">$ claude &quot;Generate a literature review document&quot;</div>
          <div className="text-amber-400">
            <span className="inline-block animate-pulse">&#9679;</span> Writing review...
          </div>
          <div className="text-green-400">&#10003; Created CRISPR_Review_2026.docx</div>
          <div className="mt-1">
            <span className="w-2 h-4 bg-cyan-400 inline-block animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Data Studio Visual: A mock dashboard with chart shapes */
function DataStudioVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/90 shadow-2xl">
      {/* Dashboard header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-white font-medium">Sales Analysis Dashboard</span>
        </div>
        <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          Auto-generated
        </span>
      </div>

      {/* Dashboard content */}
      <div className="p-4 space-y-4">
        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Revenue', value: '$2.4M', color: 'text-cyan-400' },
            { label: 'Growth Rate', value: '+47%', color: 'text-green-400' },
            { label: 'Active Users', value: '12.8K', color: 'text-violet-400' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Bar chart mock */}
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
          <p className="text-[10px] text-slate-500 mb-3">Revenue by Month</p>
          <div className="flex items-end gap-2 h-24">
            {[40, 55, 35, 65, 50, 80, 70, 90, 75, 85, 95, 100].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-cyan-500 to-cyan-400 transition-all"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[8px] text-slate-600">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart + table row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mini donut */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
            <p className="text-[10px] text-slate-500 mb-2">Segments</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-violet-400 border-r-green-400 flex-shrink-0" />
              <div className="space-y-1 text-[9px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-cyan-400" />
                  <span className="text-slate-400">Enterprise 62%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-violet-400" />
                  <span className="text-slate-400">SMB 28%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-green-400" />
                  <span className="text-slate-400">Startup 10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini table */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
            <p className="text-[10px] text-slate-500 mb-2">Top Products</p>
            <div className="space-y-1.5 text-[9px]">
              {['Widget Pro', 'Data Suite', 'API Plus'].map((item, i) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-slate-400">{item}</span>
                  <span className="text-white font-medium">
                    ${['2.4M', '1.8M', '1.2M'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Video Studio Visual: A video player frame with filmstrip elements */
function VideoStudioVisual() {
  return (
    <div className="space-y-4">
      {/* Main video player */}
      <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/90 shadow-2xl">
        {/* Player header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-white font-medium">Remotion Studio</span>
          </div>
          <span className="text-[10px] text-violet-400 font-medium flex items-center gap-1">
            <Film className="w-3 h-3" /> 8 scenes
          </span>
        </div>

        {/* Video area */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 flex items-center justify-center">
          {/* Grid pattern */}
          <div className="absolute inset-0 dot-grid opacity-20" />

          {/* Play button */}
          <div className="relative z-10 w-16 h-16 rounded-full bg-violet-600/20 border-2 border-violet-400/50 flex items-center justify-center backdrop-blur-sm group cursor-pointer hover:bg-violet-600/30 transition-all hover:scale-105">
            <Play className="w-7 h-7 text-violet-300 ml-1" />
          </div>

          {/* Scene labels */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-violet-300 font-medium">AI-Generated</span>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 backdrop-blur-sm">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-300">2:34</span>
          </div>
        </div>
      </div>

      {/* Filmstrip */}
      <div className="flex gap-2 overflow-hidden">
        {[
          { label: 'Intro', color: 'border-violet-500/30 bg-violet-500/5' },
          { label: 'MCP', color: 'border-blue-500/30 bg-blue-500/5' },
          { label: 'Skills', color: 'border-cyan-500/30 bg-cyan-500/5' },
          { label: 'Plugins', color: 'border-green-500/30 bg-green-500/5' },
          { label: 'Agents', color: 'border-amber-500/30 bg-amber-500/5' },
          { label: 'Outro', color: 'border-rose-500/30 bg-rose-500/5' },
        ].map((scene) => (
          <div
            key={scene.label}
            className={`flex-1 rounded-lg border p-2 text-center ${scene.color} min-w-0`}
          >
            <div className="h-8 rounded bg-slate-800/50 mb-1.5 flex items-center justify-center">
              <SquareStack className="w-3 h-3 text-slate-600" />
            </div>
            <span className="text-[9px] text-slate-500 font-medium">{scene.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Main Landing Page
   ============================================================ */

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <ExperimentalBanner />
      <Header variant="transparent" />

      {/* Hero */}
      <HeroSection />

      {/* App Sections */}
      <AppSection
        name="C3 Workspace"
        tagline="Research Station"
        description="Full Claude Code terminal with all 145+ skills, 34 MCP servers, and 15 plugins. Run research queries, analyze datasets, generate documents, and manage projects from one unified workspace."
        features={[
          { icon: <Terminal className="w-4 h-4" />, text: 'Real Claude Code terminal with full PTY access and session persistence' },
          { icon: <Database className="w-4 h-4" />, text: '30+ databases: PubMed, ChEMBL, AACT (566K+ trials), UniProt, and more' },
          { icon: <FileText className="w-4 h-4" />, text: 'Generate DOCX, PDF, PPTX, XLSX documents with professional templates' },
          { icon: <Layers className="w-4 h-4" />, text: 'Project-based workspace with notes, files, and terminal in one place' },
          { icon: <GitBranch className="w-4 h-4" />, text: 'Git integration, GitHub clone, and version control built in' },
        ]}
        accentColor="blue"
        badge="MAIN"
        href="/workspace"
        visual={<WorkspaceVisual />}
      />

      <AppSection
        name="Data Studio"
        tagline="Analysis Deck"
        description="Upload your data and let Claude Code do the rest. Automatic analysis, AI-generated dashboards, and natural language editing. From CSV to executive summary in minutes."
        features={[
          { icon: <Upload className="w-4 h-4" />, text: 'Upload CSV, JSON, Excel, or Parquet files for instant analysis' },
          { icon: <BarChart3 className="w-4 h-4" />, text: 'Auto-generated dashboards with 5-10 Plotly widgets per dataset' },
          { icon: <Wand2 className="w-4 h-4" />, text: 'Natural language editing: "Add a pie chart for customer segments"' },
          { icon: <Zap className="w-4 h-4" />, text: 'Real-time analysis progress with live Claude Code terminal output' },
        ]}
        accentColor="cyan"
        href="/data-studio"
        reverse
        visual={<DataStudioVisual />}
      />

      <AppSection
        name="Video Studio"
        tagline="Production Bay"
        description="Create professional videos with AI. Describe your idea and Claude Code will research, plan, build, and render complete Remotion video compositions autonomously."
        features={[
          { icon: <Video className="w-4 h-4" />, text: 'Full Remotion rendering pipeline with React-based compositions' },
          { icon: <Palette className="w-4 h-4" />, text: 'Professional transitions, spring animations, and scene design' },
          { icon: <Terminal className="w-4 h-4" />, text: 'Real PTY terminal with all skills and MCP servers available' },
          { icon: <Film className="w-4 h-4" />, text: 'Video gallery with playback, download, and project management' },
        ]}
        accentColor="violet"
        badge="NEW"
        href="/video-studio"
        visual={<VideoStudioVisual />}
      />

      {/* Capabilities */}
      <CapabilitiesGrid />

      {/* Showcase */}
      <ShowcasePreview />

      {/* Experimental Lab - OpenClaw agents, blog, diary */}
      <ExperimentalSection />

      {/* What's New - Latest updates */}
      <WhatsNewSection />

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 pulse-dot" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Ready for Launch
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Ready to Launch?
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Full access to all skills, MCP servers, and plugins. Start researching, analyzing,
            and creating with AI.
          </p>
          {user ? (
            <Link
              href="/workspace"
              className="group bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/25 inline-flex items-center gap-2.5 text-lg"
            >
              Open Workspace
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="group bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/25 inline-flex items-center gap-2.5 text-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
