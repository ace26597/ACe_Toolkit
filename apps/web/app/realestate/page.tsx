'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building, Home, DollarSign, TrendingUp, Calculator, MapPin,
  FileText, CheckSquare, BarChart3, PieChart, ChevronRight, ArrowRight,
  Sparkles, AlertCircle, Target, Play, Percent
} from 'lucide-react';
import { useAuth, LoginModal } from '@/components/auth';
import { workspaceApi } from '@/lib/api';
import DemoTerminal from '@/components/demos/DemoTerminal';
import demoData from '@/data/demos/realestate/duplex-analysis.json';

const features = [
  {
    icon: <Calculator className="w-6 h-6" />,
    title: 'Deal Analysis',
    description: 'Calculate cap rate, cash-on-cash return, GRM, and DCR for any property.',
    color: 'orange'
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Cash Flow Projections',
    description: 'Build 5-10 year pro formas with rent growth, expense inflation, and appreciation.',
    color: 'green'
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Comps Analysis',
    description: 'Compare properties by price per sqft, GRM, and cap rate to estimate fair value.',
    color: 'blue'
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: 'Market Research',
    description: 'Analyze demographics, employment, rent trends, and economic indicators.',
    color: 'purple'
  },
  {
    icon: <CheckSquare className="w-6 h-6" />,
    title: 'Due Diligence Tracking',
    description: 'Manage inspection deadlines, document checklists, and contingency periods.',
    color: 'cyan'
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Investment Reports',
    description: 'Generate investor presentations, deal summaries, and market analysis reports.',
    color: 'rose'
  }
];

const examplePrompts = [
  {
    prompt: 'Analyze the duplex in properties/ - calculate cap rate, cash flow, and ROI',
    category: 'Deal Analysis'
  },
  {
    prompt: 'Review the comparable sales and estimate fair market value for the property',
    category: 'Comps'
  },
  {
    prompt: 'Create a 5-year cash flow projection with 3% rent growth',
    category: 'Projections'
  },
  {
    prompt: 'Summarize the Austin 78701 market and assess investment viability',
    category: 'Market Research'
  },
  {
    prompt: 'Review the due diligence checklist and identify critical items',
    category: 'Due Diligence'
  },
  {
    prompt: 'What should I offer? Target a 7% cap rate and 1.25 DCR',
    category: 'Negotiation'
  }
];

const templateFiles = [
  { name: 'properties/sample_property.json', desc: 'Duplex deal with full financials' },
  { name: 'properties/comps_analysis.csv', desc: '7 comparable sales' },
  { name: 'financials/proforma_analysis.json', desc: '5-year financial model' },
  { name: 'financials/rent_roll.csv', desc: 'Current tenant data' },
  { name: 'market_data/austin_78701_stats.json', desc: 'Market demographics & stats' },
  { name: 'checklists/due_diligence.md', desc: 'Comprehensive DD checklist' }
];

const keyMetrics = [
  {
    name: 'Cap Rate',
    formula: 'NOI / Purchase Price',
    example: '$24,648 / $425,000 = 5.8%',
    target: '5-10% depending on class'
  },
  {
    name: 'Cash-on-Cash',
    formula: 'Cash Flow / Cash Invested',
    example: '$5,000 / $120,000 = 4.2%',
    target: '8-12% for most deals'
  },
  {
    name: 'GRM',
    formula: 'Price / Annual Rent',
    example: '$425,000 / $39,000 = 10.9',
    target: '<15 for multifamily'
  },
  {
    name: 'DCR',
    formula: 'NOI / Debt Service',
    example: '$24,648 / $30,084 = 0.82',
    target: '>1.25 for lenders'
  }
];

export default function RealEstatePage() {
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
      // Create a new project with realestate template
      const projectName = `realestate-analysis-${Date.now()}`;
      await workspaceApi.createProject(projectName, 'realestate');

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6">
              <Building className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">Real Estate Investment Workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              AI-Powered
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"> Deal Analysis</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Analyze investment properties, run financial projections, compare comps, and
              manage due diligence with AI assistance. Built for investors, brokers, and analysts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartProject}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Real Estate Project
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
          Watch Claude analyze a duplex investment opportunity
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
              <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center text-${feature.color}-400 mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Investment Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keyMetrics.map((metric, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Percent className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">{metric.name}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  <span className="text-slate-500">Formula:</span>{' '}
                  <span className="font-mono text-slate-300">{metric.formula}</span>
                </p>
                <p className="text-slate-400">
                  <span className="text-slate-500">Example:</span>{' '}
                  <span className="font-mono text-slate-300">{metric.example}</span>
                </p>
                <p className="text-slate-400">
                  <span className="text-slate-500">Target:</span>{' '}
                  <span className="text-orange-400">{metric.target}</span>
                </p>
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
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-orange-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-orange-400 font-medium">{item.category}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Sample Deal Analysis */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Sample Analysis Output</h2>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm">Purchase Price</p>
              <p className="text-2xl font-bold text-white">$425,000</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-sm">Cap Rate</p>
              <p className="text-2xl font-bold text-orange-400">5.8%</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-sm">Cash-on-Cash</p>
              <p className="text-2xl font-bold text-red-400">-5.1%</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-sm">DCR</p>
              <p className="text-2xl font-bold text-amber-400">0.82</p>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium">AI Recommendation: HOLD - Marginal Deal</span>
            </div>
            <p className="text-slate-400 text-sm">
              Negative cash flow in Year 1 with DCR below 1.0. However, below-market rents
              provide upside potential. Suggested counter-offer: <strong className="text-white">$395,000</strong> to
              achieve 6.8% stabilized cash-on-cash with 1.25 DCR.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to analyze deals?</h2>
          <p className="text-slate-400 mb-6">
            Start a real estate project and get AI-powered investment analysis in seconds.
          </p>
          <button
            onClick={handleStartProject}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
          >
            <ArrowRight className="w-5 h-5" />
            Start Real Estate Project
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Disclaimer</span>
          </div>
          <p className="text-amber-400/80 text-sm">
            This tool is for educational and informational purposes only.
            Always conduct proper due diligence and consult with real estate professionals,
            attorneys, and accountants before making investment decisions.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-slate-500 text-sm">
          Part of <Link href="/" className="text-orange-400 hover:underline">C3 Researcher</Link> •
          145+ skills • 34+ MCP servers • Powered by Claude Code
        </p>
      </div>

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
