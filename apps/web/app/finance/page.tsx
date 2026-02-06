'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, PieChart, FileText, Search, DollarSign, Building2,
  BarChart3, Users, LineChart, Database, ChevronRight, ArrowRight,
  Sparkles, Target, AlertCircle, Calendar, Download, Play
} from 'lucide-react';
import { useAuth, LoginModal } from '@/components/auth';
import { workspaceApi } from '@/lib/api';
import DemoTerminal from '@/components/demos/DemoTerminal';
import demoData from '@/data/demos/finance/portfolio-analysis.json';

const features = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'SEC EDGAR Integration',
    description: 'Access 10-K, 10-Q, 8-K filings directly. Search full-text content, extract XBRL financials.',
    iconClass: 'bg-blue-500/10 text-blue-400'
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Real-Time Market Data',
    description: 'Yahoo Finance integration for current prices, historical data, and analyst ratings.',
    iconClass: 'bg-green-500/10 text-green-400'
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Insider Tracking',
    description: 'Monitor Form 4 filings for insider buying/selling activity across your watchlist.',
    iconClass: 'bg-purple-500/10 text-purple-400'
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Portfolio Analysis',
    description: 'Track performance, calculate P&L, compare to benchmarks with natural language.',
    iconClass: 'bg-amber-500/10 text-amber-400'
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Company Research',
    description: 'Deep dive into any public company - financials, risk factors, competitive analysis.',
    iconClass: 'bg-cyan-500/10 text-cyan-400'
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Valuation Models',
    description: 'Run DCF models, compare multiples, analyze fair value with AI assistance.',
    iconClass: 'bg-rose-500/10 text-rose-400'
  }
];

const examplePrompts = [
  {
    prompt: 'Analyze my portfolio performance - compare current prices to cost basis',
    category: 'Portfolio'
  },
  {
    prompt: 'Research Tesla (TSLA) - get SEC filings, financials, and analyst ratings',
    category: 'Research'
  },
  {
    prompt: "Summarize Apple's latest 10-K - focus on revenue growth and risk factors",
    category: 'Filings'
  },
  {
    prompt: 'Show me insider buying activity in NVDA over the last 30 days',
    category: 'Insider'
  },
  {
    prompt: 'Find all 10-K filings that mention "artificial intelligence" in risk factors',
    category: 'Search'
  },
  {
    prompt: 'Run a DCF model on Microsoft using the assumptions in models/',
    category: 'Valuation'
  }
];

const templateFiles = [
  { name: 'portfolios/sample_portfolio.csv', desc: '10-stock portfolio with cost basis' },
  { name: 'portfolios/watchlist.json', desc: 'Watchlist with target prices' },
  { name: 'market_data/sector_allocation.json', desc: 'Target sector allocation' },
  { name: 'models/dcf_assumptions.json', desc: 'DCF model template' }
];

const mcpTools = [
  { name: 'SEC EDGAR', tools: ['search_companies', 'get_company_filings', 'get_filing_content', 'get_company_facts', 'get_insider_transactions'] },
  { name: 'Yahoo Finance', tools: ['get_stock_info', 'get_historical_stock_prices', 'get_financial_statement', 'get_recommendations'] }
];

export default function FinancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartProject = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a new project with finance template
      const projectName = `finance-research-${Date.now()}`;
      await workspaceApi.createProject(projectName, 'finance');

      // Navigate to workspace with the new project
      router.push(`/workspace?project=${projectName}&tab=terminal`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Finance Research Workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              AI-Powered
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Financial Research</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Analyze SEC filings, track portfolios, research companies, and build valuation models
              with natural language. All data sources integrated, no API keys required for SEC EDGAR.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartProject}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Finance Project
                  </>
                )}
              </button>

              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white px-6 py-4 rounded-xl font-medium transition-all"
              >
                Open Workspace
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Demo Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">See It In Action</h2>
        <p className="text-slate-400 text-center mb-8">
          Watch Claude analyze a portfolio using real market data
        </p>
        <DemoTerminal demo={demoData} autoPlay={false} speed={15} />
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Capabilities</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-all"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.iconClass} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MCP Tools Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Integrated Data Sources</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mcpTools.map((source, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">{source.name}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {source.tools.map((tool, j) => (
                  <span key={j} className="px-3 py-1 bg-slate-700/50 rounded-lg text-sm text-slate-300 font-mono">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Example Prompts</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examplePrompts.map((item, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-blue-400 font-medium">{item.category}</span>
                  <p className="text-slate-300 mt-1 group-hover:text-white transition-colors">
                    "{item.prompt}"
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Files */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Included Template Data</h2>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templateFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <FileText className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-slate-300 font-mono text-sm">{file.name}</p>
                  <p className="text-slate-500 text-xs">{file.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to analyze?</h2>
          <p className="text-slate-400 mb-6">
            Start a finance research project and get AI-powered insights in seconds.
          </p>
          <button
            onClick={handleStartProject}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
          >
            <ArrowRight className="w-5 h-5" />
            Start Finance Project
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-slate-500 text-sm">
          Part of <Link href="/" className="text-blue-400 hover:underline">C3 Researcher</Link> •
          145+ skills • 34+ MCP servers • Powered by Claude Code
        </p>
      </div>

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
