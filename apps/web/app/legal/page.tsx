'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scale, FileText, Search, Shield, BookOpen, Clock,
  CheckSquare, AlertTriangle, Users, Gavel, ChevronRight, ArrowRight,
  Sparkles, AlertCircle, FileCheck, Play
} from 'lucide-react';
import { useAuth, LoginModal } from '@/components/auth';
import { workspaceApi } from '@/lib/api';
import DemoTerminal from '@/components/demos/DemoTerminal';
import demoData from '@/data/demos/legal/nda-review.json';

const features = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Contract Analysis',
    description: 'Review NDAs, service agreements, and other contracts for risks, missing clauses, and negotiation points.',
    color: 'emerald'
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Clause Extraction',
    description: 'Identify key clauses like termination, indemnification, IP assignment, and limitation of liability.',
    color: 'blue'
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Risk Identification',
    description: 'Flag potential issues, unfair terms, missing protections, and compliance gaps.',
    color: 'amber'
  },
  {
    icon: <CheckSquare className="w-6 h-6" />,
    title: 'Due Diligence Tracking',
    description: 'Manage checklists, deadlines, and document status across transactions.',
    color: 'purple'
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Case Timeline',
    description: 'Track litigation events, deadlines, and procedural milestones.',
    color: 'cyan'
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Document Generation',
    description: 'Generate demand letters, memos, and summaries from templates.',
    color: 'rose'
  }
];

const examplePrompts = [
  {
    prompt: 'Review the NDA in contracts/ - identify key risks and missing clauses',
    category: 'Contract Review'
  },
  {
    prompt: 'Compare termination clauses across all contracts in this folder',
    category: 'Clause Analysis'
  },
  {
    prompt: 'Extract all indemnification provisions and assess liability exposure',
    category: 'Risk Assessment'
  },
  {
    prompt: 'Generate a contract summary for the service agreement',
    category: 'Summarization'
  },
  {
    prompt: 'Create a case timeline from the events in case_files/',
    category: 'Litigation'
  },
  {
    prompt: 'Draft a demand letter based on the template and case facts',
    category: 'Document Gen'
  }
];

const templateFiles = [
  { name: 'contracts/sample_nda.md', desc: 'Full NDA with 10 sections' },
  { name: 'contracts/sample_service_agreement.md', desc: 'Professional services agreement' },
  { name: 'case_files/case_timeline.csv', desc: 'Litigation event tracker' },
  { name: 'templates/demand_letter.md', desc: 'Demand letter template' }
];

const reviewChecklist = [
  'Parties and Effective Date',
  'Definition of Confidential Information',
  'Exclusions from Confidentiality',
  'Permitted Disclosures',
  'Term and Survival Period',
  'Return/Destruction of Information',
  'Remedies and Injunctive Relief',
  'Governing Law and Jurisdiction',
  'Assignment and Amendment Provisions'
];

export default function LegalPage() {
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
      // Create a new project with legal template
      const projectName = `legal-research-${Date.now()}`;
      await workspaceApi.createProject(projectName, 'legal');

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Legal Research Workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              AI-Powered
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Contract Analysis</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Review contracts, identify risks, extract key clauses, and manage legal documents
              with AI assistance. Built for attorneys, paralegals, and legal operations teams.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartProject}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Legal Project
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
          Watch Claude review an NDA and identify risks
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

      {/* Contract Review Checklist */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Contract Review Checklist</h2>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <p className="text-slate-400 mb-6 text-center">
            The AI follows a systematic checklist when reviewing contracts:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reviewChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Example Prompts</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examplePrompts.map((item, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-emerald-400 font-medium">{item.category}</span>
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
                <FileCheck className="w-5 h-5 text-slate-400" />
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
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to analyze contracts?</h2>
          <p className="text-slate-400 mb-6">
            Start a legal research project and get AI-powered contract analysis in seconds.
          </p>
          <button
            onClick={handleStartProject}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
          >
            <ArrowRight className="w-5 h-5" />
            Start Legal Project
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Disclaimer</span>
          </div>
          <p className="text-amber-400/80 text-sm">
            This tool provides AI-assisted analysis for informational purposes only.
            It does not constitute legal advice. Always consult with a qualified attorney
            for legal matters.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-slate-500 text-sm">
          Part of <Link href="/" className="text-emerald-400 hover:underline">C3 Researcher</Link> •
          145+ skills • 34+ MCP servers • Powered by Claude Code
        </p>
      </div>

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
