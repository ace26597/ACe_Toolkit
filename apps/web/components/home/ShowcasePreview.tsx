'use client';

import Link from 'next/link';
import { ArrowRight, Video, FileText, Sparkles } from 'lucide-react';

interface FeaturedProject {
  icon: React.ReactNode;
  category: string;
  categoryColor: string;
  title: string;
  description: string;
  href: string;
}

const projects: FeaturedProject[] = [
  {
    icon: <Video className="w-5 h-5 text-violet-400" />,
    category: 'Video Creation',
    categoryColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    title: 'AI-Generated Explainer Videos',
    description:
      'Claude autonomously researched, scripted, and rendered professional explainer videos using Remotion.',
    href: '/showcase',
  },
  {
    icon: <FileText className="w-5 h-5 text-cyan-400" />,
    category: 'Data Analysis',
    categoryColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    title: 'Automated Data Reports',
    description:
      'Upload a CSV, get AI-generated insights, charts, and a full executive summary in minutes.',
    href: '/showcase',
  },
  {
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    category: 'Research',
    categoryColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    title: 'Scientific Literature Reviews',
    description:
      'Comprehensive research documents with PubMed citations, analysis, and DOCX export.',
    href: '/showcase',
  },
];

export function ShowcasePreview() {
  return (
    <section className="border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
              Operations History
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Recent Projects
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Real outputs created by Claude Code using the full C3 Researcher toolkit.
          </p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project.title}
              href={project.href}
              className="group relative p-6 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                {project.icon}
              </div>

              {/* Category Badge */}
              <span
                className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border mb-3 ${project.categoryColor}`}
              >
                {project.category}
              </span>

              {/* Title */}
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-blue-100 transition-colors">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{project.description}</p>

              {/* View Link */}
              <span className="inline-flex items-center gap-1.5 text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
                View
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
          >
            View all projects
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
