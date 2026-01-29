"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Video, Database, Brain, FlaskConical, Workflow, Globe,
  TrendingUp, BarChart3, ChevronRight, ChevronLeft, Play,
  ExternalLink, Cpu, Star, Clock, FileText, Code, Beaker
} from 'lucide-react';
import { useAuth, LoginModal } from '@/components/auth';

interface ShowcaseProject {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  description: string;
  longDescription: string;
  highlights: string[];
  skillsUsed: string[];
  mcpServers?: string[];
  outputs: { name: string; type: string; size?: string }[];
  stats?: { label: string; value: string }[];
  icon: React.ReactNode;
}

const showcaseProjects: ShowcaseProject[] = [
  {
    id: 'remotion-videos',
    title: 'AI-Generated Explainer Videos',
    category: 'Video Creation',
    categoryColor: 'purple',
    description: 'Claude autonomously researched, scripted, coded, and rendered professional explainer videos using Remotion.',
    longDescription: 'Using the Video Studio, Claude was given simple prompts and autonomously created complete video productions. It researched the topics, designed scene structures, wrote React/Remotion components with animations, and rendered the final MP4 files.',
    highlights: [
      'Claude Code Explainer: 8 scenes covering MCP, Skills, Plugins, Agents, Hooks, Architecture',
      'Pythagorean Theorem: 6 scenes with animated geometric proofs',
      'Professional transitions (slide, wipe, flip, fade)',
      'Spring animations for smooth motion'
    ],
    skillsUsed: ['/remotion-best-practices', 'TypeScript', 'React', 'TransitionSeries'],
    outputs: [
      { name: 'claude-code-explainer.mp4', type: 'Video', size: '13.7 MB' },
      { name: 'pythagorean-theorem.mp4', type: 'Video', size: '2.8 MB' }
    ],
    stats: [
      { label: 'Videos Created', value: '2' },
      { label: 'Total Scenes', value: '14' },
      { label: 'Components Built', value: '20+' }
    ],
    icon: <Video className="w-6 h-6" />
  },
  {
    id: 'clawdbot-research',
    title: 'Clawdbot Deep Research',
    category: 'AI Research',
    categoryColor: 'blue',
    description: 'Comprehensive research dossier on Clawdbot, a 17K+ star AI assistant, with installation guides, security analysis, and integration strategies.',
    longDescription: 'Claude conducted extensive research on the Clawdbot ecosystem, producing 16 detailed documents covering architecture, installation, security, 565+ skills, configuration, and comparison with other AI tools like Claude Code, ChatGPT, and Auto-GPT.',
    highlights: [
      '16 comprehensive research documents (~100KB)',
      'Complete security analysis and best practices',
      '27 project ideas for integration',
      'Cost optimization strategies (40-70% savings)',
      'Comparison matrix with Claude Code, ChatGPT, Auto-GPT'
    ],
    skillsUsed: ['WebSearch', 'Document Organization', 'Technical Analysis'],
    mcpServers: ['fetch', 'memory'],
    outputs: [
      { name: '00-index.md', type: 'Index' },
      { name: '01-overview.md to 16-templates.md', type: 'Research Docs' },
      { name: 'MARKETPLACES.md', type: 'Analysis' }
    ],
    stats: [
      { label: 'Documents', value: '16' },
      { label: 'Topics Covered', value: '50+' },
      { label: 'Code Examples', value: '200+' }
    ],
    icon: <Brain className="w-6 h-6" />
  },
  {
    id: 'deep-past-challenge',
    title: 'Kaggle: Ancient Text Translation',
    category: 'Machine Learning',
    categoryColor: 'amber',
    description: '$50K Kaggle competition to build AI that translates 4,000-year-old Akkadian cuneiform tablets to English.',
    longDescription: 'Claude helped develop a hybrid translation system for ancient Akkadian texts. The approach combines dictionary lookup, fuzzy matching, and neural translation (mT5, ByT5) to achieve competitive results on this challenging historical linguistics task.',
    highlights: [
      'Hybrid pipeline: Dictionary + Fuzzy + Neural',
      'Best validation score: 25.87',
      'Strategic approach validated with experiments',
      'Remote GPU training via WSL2 + RTX 3080',
      'Only 15-31% needs neural translation'
    ],
    skillsUsed: ['PyTorch', 'Transformers', 'pandas', 'Strategic Planning'],
    outputs: [
      { name: 'STRATEGIC_APPROACH.md', type: 'Strategy', size: '23.6 KB' },
      { name: 'PROJECT_OVERVIEW.md', type: 'Documentation', size: '9.6 KB' },
      { name: 'models/', type: 'Trained Models' }
    ],
    stats: [
      { label: 'Prize Pool', value: '$50K' },
      { label: 'Validation Score', value: '25.87' },
      { label: 'Deadline', value: 'Mar 2026' }
    ],
    icon: <Beaker className="w-6 h-6" />
  },
  {
    id: 'agentic-workflows',
    title: 'Agentic Workflow Analysis',
    category: 'Architecture',
    categoryColor: 'cyan',
    description: 'Deep technical analysis comparing GPT-Researcher and DeerFlow multi-agent architectures built on LangGraph.',
    longDescription: 'Claude produced an extensive technical analysis of two leading agentic workflow frameworks, documenting their graph patterns, state designs, parallelism strategies, and human-in-the-loop implementations.',
    highlights: [
      'LangGraph architecture deep-dive',
      'Master-Detail vs Single StateGraph patterns',
      'State schema comparisons with code examples',
      'Edge routing strategies (conditional vs command)',
      'Human loop integration analysis'
    ],
    skillsUsed: ['Technical Research', 'Mermaid Diagrams', 'Architecture Analysis'],
    outputs: [
      { name: 'agentic-workflow-analysis.md', type: 'Analysis', size: '36 KB' },
      { name: 'research-frameworks-analysis.md', type: 'Comparison', size: '11 KB' }
    ],
    stats: [
      { label: 'Frameworks Analyzed', value: '2' },
      { label: 'Architecture Diagrams', value: '10+' },
      { label: 'Code Examples', value: '50+' }
    ],
    icon: <Workflow className="w-6 h-6" />
  },
  {
    id: 'ultron-solar',
    title: 'Business Website Builder',
    category: 'Web Development',
    categoryColor: 'green',
    description: 'Complete Next.js business website for a solar energy company with SEO-optimized blog, user flows, and technical documentation.',
    longDescription: 'Claude built a full production website for Ultron Power Systems (ultronsolar.in), a solar energy company in Maharashtra. Includes 12+ SEO blog articles, architecture docs, user flow diagrams, API routes, and deployment config for Vercel.',
    highlights: [
      'Next.js + Tailwind CSS production site',
      '12+ SEO-optimized blog articles',
      'Complete architecture documentation',
      'User flow diagrams and technical specs',
      'Vercel deployment configuration'
    ],
    skillsUsed: ['Next.js', 'Tailwind CSS', 'SEO Writing', 'Technical Documentation'],
    outputs: [
      { name: 'ultronsolar.in', type: 'Live Website' },
      { name: 'blog/', type: '12 Articles' },
      { name: 'ARCHITECTURE.md', type: 'Documentation', size: '15 KB' }
    ],
    stats: [
      { label: 'Blog Articles', value: '12+' },
      { label: 'Pages Built', value: '10+' },
      { label: 'Docs Generated', value: '4' }
    ],
    icon: <Globe className="w-6 h-6" />
  },
  {
    id: 'trading-tracker',
    title: 'Crypto Portfolio Tracker',
    category: 'Finance',
    categoryColor: 'orange',
    description: 'Real-time cryptocurrency portfolio tracking with swing trade monitoring, Fear & Greed index, and automated strategy rules.',
    longDescription: 'Claude created an auto-updating portfolio tracker that monitors BTC, ETH, SOL holdings with real-time prices, calculates P&L, tracks swing trades with trailing stops, and integrates market sentiment indicators.',
    highlights: [
      'Real-time portfolio valuation',
      'Swing trade monitoring with stop-loss',
      'Fear & Greed index integration',
      'Strategy rules with triggers',
      'Auto-updated by Alfred automation'
    ],
    skillsUsed: ['Data Analysis', 'Markdown Tables', 'Financial Calculations'],
    outputs: [
      { name: 'Trading_data.md', type: 'Dashboard' },
      { name: 'stocks/', type: 'Historical Data' }
    ],
    stats: [
      { label: 'Assets Tracked', value: '4' },
      { label: 'Update Frequency', value: 'Real-time' },
      { label: 'Strategy Rules', value: '3' }
    ],
    icon: <TrendingUp className="w-6 h-6" />
  },
  {
    id: 'data-studio',
    title: 'Data Studio Dashboards',
    category: 'Analytics',
    categoryColor: 'pink',
    description: 'Auto-generated Plotly dashboards from benchmark data and pharma alert configurations using Claude Code analysis.',
    longDescription: 'Using the Data Studio, Claude analyzed various datasets and generated interactive Plotly dashboards. Projects include MongoDB benchmark visualization, file navigation performance analysis, and pharmaceutical alert system configurations.',
    highlights: [
      'MongoDB benchmark analysis (478 KB dataset)',
      'File navigation performance metrics',
      'Pharma alert prompts (AI, RNA, Regulatory, DrugOme)',
      'Auto-generated Python analysis scripts',
      'Interactive Plotly visualizations'
    ],
    skillsUsed: ['/data-studio-analyst', 'Plotly', 'pandas', 'Python'],
    outputs: [
      { name: 'generate_dashboard.py', type: 'Script' },
      { name: '.dashboards/', type: 'Plotly Specs' },
      { name: 'Pharma Alert Prompts', type: '4 Configs' }
    ],
    stats: [
      { label: 'Projects', value: '3' },
      { label: 'Datasets', value: '5+' },
      { label: 'Alert Configs', value: '4' }
    ],
    icon: <BarChart3 className="w-6 h-6" />
  }
];

const categoryColors: Record<string, string> = {
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
};

const iconColors: Record<string, string> = {
  purple: 'bg-purple-500/20 text-purple-400',
  blue: 'bg-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/20 text-amber-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  green: 'bg-green-500/20 text-green-400',
  orange: 'bg-orange-500/20 text-orange-400',
  pink: 'bg-pink-500/20 text-pink-400',
};

export default function ShowcasePage() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const selected = showcaseProjects.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">C3 Researcher</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              Home
            </Link>
            {user ? (
              <Link
                href="/workspace"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Open Workspace
              </Link>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Try Free
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Real Projects Built with C3 Researcher</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Showcase
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            See what's possible when Claude Code has access to 145+ skills, 26 MCP servers, and 12 plugins.
            These are real projects created using C3 Researcher.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {selectedProject && selected ? (
          /* Detail View */
          <div>
            <button
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to all projects
            </button>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${iconColors[selected.categoryColor]}`}>
                    {selected.icon}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${categoryColors[selected.categoryColor]} mb-2`}>
                      {selected.category}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{selected.title}</h1>
                  </div>
                </div>

                <p className="text-gray-300 text-lg leading-relaxed">
                  {selected.longDescription}
                </p>

                {/* Highlights */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Key Highlights</h3>
                  <ul className="space-y-3">
                    {selected.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Outputs */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Generated Outputs</h3>
                  <div className="space-y-2">
                    {selected.outputs.map((output, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{output.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{output.type}</span>
                          {output.size && (
                            <span className="text-xs text-gray-600">{output.size}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Stats */}
                {selected.stats && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Project Stats</h3>
                    <div className="space-y-4">
                      {selected.stats.map((stat, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-gray-400">{stat.label}</span>
                          <span className="text-white font-semibold">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Used */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Skills & Tools Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.skillsUsed.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* MCP Servers */}
                {selected.mcpServers && selected.mcpServers.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">MCP Servers Used</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.mcpServers.map((server, i) => (
                        <span key={i} className="px-2 py-1 bg-teal-500/10 text-teal-400 text-xs rounded-lg border border-teal-500/30">
                          {server}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl p-6 text-center">
                  <h3 className="text-white font-semibold mb-2">Want to build something similar?</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Get access to all skills, MCP servers, and plugins.
                  </p>
                  {user ? (
                    <Link
                      href="/workspace"
                      className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      Open Workspace
                    </Link>
                  ) : (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      Try Free
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcaseProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className="group bg-gray-900 border border-gray-800 rounded-xl p-6 text-left hover:border-gray-700 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColors[project.categoryColor]}`}>
                    {project.icon}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${categoryColors[project.categoryColor]}`}>
                    {project.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {project.title}
                </h3>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>

                {project.stats && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                    {project.stats.slice(0, 2).map((stat, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-gray-500">{stat.label}: </span>
                        <span className="text-white font-medium">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center text-emerald-400 text-sm">
                  <span>View details</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="py-16 border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Build Your Own Projects?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            All these projects were built using C3 Researcher with Claude Code.
            Get access to the same skills, MCP servers, and plugins for free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                href="/workspace"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Open Workspace
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Try Free
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <Link
              href="/"
              className="w-full sm:w-auto border border-gray-700 hover:border-gray-600 text-white font-medium px-8 py-3 rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-400">C3 Researcher</span>
            </div>
            <div className="text-sm text-gray-500">
              Real projects. Real capabilities. Try it free.
            </div>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
