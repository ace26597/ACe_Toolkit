"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  User, LogOut, Shield, Clock, Cpu, Globe, Users, Zap,
  Database, FileText, Video, ChevronRight, Star,
  Smartphone, Server, DollarSign, Lock
} from 'lucide-react';
import { useAuth, LoginModal, ExperimentalBanner } from '@/components/auth';
import { RecentSessions } from '@/components/home/RecentSessions';

export default function Home() {
  const { user, loading, logout, trialInfo } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTrialText = () => {
    if (!trialInfo || !trialInfo.is_trial || !trialInfo.trial_expires_at) return null;
    const expiresAt = new Date(trialInfo.trial_expires_at);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
    if (hoursLeft > 0) {
      return `${hoursLeft}h trial remaining`;
    }
    return 'Trial expired';
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <ExperimentalBanner />

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">C3 Researcher</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/showcase"
              className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors text-sm"
            >
              <Star className="w-4 h-4" />
              <span>Showcase</span>
            </Link>
            <Link
              href="/directory"
              className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-sm"
            >
              <Server className="w-4 h-4" />
              <span>Directory</span>
            </Link>

            {loading ? (
              <div className="w-8 h-8 animate-pulse bg-gray-800 rounded-full" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300 hidden sm:inline">{user.name}</span>
                  {user.is_admin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                      <div className="px-4 py-3 border-b border-gray-700">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                        {trialInfo?.is_trial && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <p className="text-xs text-amber-500">{getTrialText()}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        {user.is_admin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => { logout(); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="text-emerald-400 text-sm font-medium">145+ Skills</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm">34 MCP Servers</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm">14 Plugins</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Explore Claude Code
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"> Skills & MCP Servers</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Try Claude Code with 145+ scientific skills, 34 MCP servers, and 14 plugins — all for free.
              Experiment with AI-powered research, data analysis, and video creation.
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
                href="/showcase"
                className="w-full sm:w-auto border border-gray-700 hover:border-gray-600 text-white font-medium px-8 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                View Showcase
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400">145+</div>
              <div className="text-sm text-gray-400 mt-1">Scientific Skills</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-teal-400">34</div>
              <div className="text-sm text-gray-400 mt-1">MCP Servers</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-cyan-400">14</div>
              <div className="text-sm text-gray-400 mt-1">Plugins</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-400">30+</div>
              <div className="text-sm text-gray-400 mt-1">Databases</div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Can Explore */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">What You Can Explore</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Full access to Claude Code with skills, MCP servers, and plugins. Try everything for free.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">145+ Skills</h3>
              <p className="text-gray-400 text-sm">
                Scientific research, drug discovery, genomics, data analysis, document generation,
                and more — all accessible via slash commands.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-teal-500/50 transition-colors">
              <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center mb-4">
                <Server className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">34 MCP Servers</h3>
              <p className="text-gray-400 text-sm">
                PubMed, ChEMBL, Clinical Trials, ICD-10, NPI Registry, HuggingFace,
                Memory, Playwright, and more — direct database access.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">14 Plugins</h3>
              <p className="text-gray-400 text-sm">
                Scientific Skills, Frontend Design, Feature Dev, Document Skills,
                HuggingFace integration, and more — extend Claude's capabilities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="py-16 sm:py-24 bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Three Powerful Apps</h2>
            <p className="text-gray-400">All powered by Claude Code with full terminal access</p>
          </div>

          <div className="grid gap-6">
            {/* C3 Researcher Workspace - Featured */}
            <Link
              href="/workspace"
              className="group bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-6 sm:p-8 hover:border-emerald-500/60 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">C3 Researcher Workspace</h3>
                    <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">MAIN</span>
                  </div>
                  <p className="text-gray-400 mb-4">
                    Full Claude Code terminal with 145+ scientific skills. Literature search, drug discovery,
                    clinical trials, genomics, medical coding, and more.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">PubMed</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">ChEMBL</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">566K+ Clinical Trials</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">ICD-10</span>
                    <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-1 rounded">Mobile Ready</span>
                  </div>
                </div>
                <ChevronRight className="w-8 h-8 text-emerald-400 group-hover:translate-x-2 transition-transform hidden md:block" />
              </div>
            </Link>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Data Studio */}
              <Link
                href="/data-studio"
                className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">C3 Data Studio</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Upload data files. AI analyzes patterns and generates interactive dashboards.
                  Edit with natural language.
                </p>
                <div className="flex items-center text-cyan-400 text-sm group-hover:gap-2 transition-all">
                  <span>Explore</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Video Studio */}
              <Link
                href="/video-studio"
                className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Remotion Video Studio</h3>
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Describe a video idea. Watch Claude research, design, code, and render it.
                  Full Remotion integration.
                </p>
                <div className="flex items-center text-purple-400 text-sm group-hover:gap-2 transition-all">
                  <span>Explore</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Experimentation Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Experiment & Build</h2>
            <p className="text-gray-400">Explore what's possible with Claude Code and the MCP ecosystem</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">C3 Researcher</h3>
              <p className="text-emerald-400 text-sm mb-3">This Platform</p>
              <p className="text-gray-400 text-sm">Full Claude Code terminal with all skills, MCP servers, and plugins</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Clawdbot</h3>
              <p className="text-purple-400 text-sm mb-3">Installed • Private Beta</p>
              <p className="text-gray-400 text-sm">Multi-agent orchestration with skill sharing and collaborative AI workflows</p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Preview */}
      <section className="py-16 sm:py-24 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">See What's Been Built</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Real projects created using C3 Researcher — from AI videos to clinical trials research.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">AI-Generated Videos</h3>
              <p className="text-gray-400 text-sm">Claude researched, scripted, and rendered explainer videos using Remotion</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Clinical Trials Analysis</h3>
              <p className="text-gray-400 text-sm">917 Parkinson's trials analyzed using AACT database access</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Deep Research</h3>
              <p className="text-gray-400 text-sm">100KB+ research dossiers with comparisons, strategies, and project ideas</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              View All Projects
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Free Access */}
      <section className="py-16 sm:py-24 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Try Everything Free</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Explore Claude Code skills, MCP servers, and plugins without any cost.
            Create an account and start experimenting in seconds.
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md mx-auto">
            <div className="text-3xl font-bold text-white mb-2">Free</div>
            <div className="text-gray-400 mb-6">No credit card required</div>
            <ul className="text-left space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-300">
                <Star className="w-4 h-4 text-emerald-400" />
                Full Claude Code terminal
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Star className="w-4 h-4 text-emerald-400" />
                145+ scientific skills
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Star className="w-4 h-4 text-emerald-400" />
                34 MCP servers
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Star className="w-4 h-4 text-emerald-400" />
                14 plugins
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Star className="w-4 h-4 text-emerald-400" />
                Mobile access
              </li>
            </ul>
            <button
              onClick={() => setShowLoginModal(true)}
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer"
            >
              Try Free
            </button>
          </div>
        </div>
      </section>

      {/* Recent Sessions (for logged in users) */}
      {user && (
        <section className="py-16 border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-4">
            <RecentSessions maxSessions={5} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-400">C3 Researcher</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/showcase" className="hover:text-white transition-colors">Showcase</Link>
              <Link href="/directory" className="hover:text-white transition-colors">Directory</Link>
              <Link href="/ccresearch/tips" className="hover:text-white transition-colors">Tips</Link>
              <Link href="/ccresearch/use-cases" className="hover:text-white transition-colors">Use Cases</Link>
            </div>
            <div className="text-sm text-gray-500">
              Built for researchers. Powered by Claude.
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
