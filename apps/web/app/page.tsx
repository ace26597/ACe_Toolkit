"use client";

import { useState } from 'react';
import Link from 'next/link';
import { User, LogOut, Shield, Clock } from 'lucide-react';
import { useAuth, LoginModal, ExperimentalBanner } from '@/components/auth';
import { RecentSessions } from '@/components/home/RecentSessions';

export default function Home() {
  const { user, loading, logout, trialInfo } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Format trial expiry date
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Experimental Banner */}
      <ExperimentalBanner />

      {/* Auth Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-indigo-600">BlestLabs</div>

          {loading ? (
            <div className="w-8 h-8 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-full" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                {user.is_admin && (
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      {trialInfo?.is_trial && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <p className="text-xs text-amber-500">{getTrialText()}</p>
                        </div>
                      )}
                      {user.is_approved && !user.is_admin && (
                        <p className="text-xs text-green-500 mt-1">Approved account</p>
                      )}
                      {user.is_admin && (
                        <p className="text-xs text-amber-500 mt-1">Administrator</p>
                      )}
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-indigo-600 text-center">BlestLabs</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 text-center">
            Your personal productivity platform
            {!user && <span className="text-indigo-500"> - Sign up for a 24-hour free trial</span>}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">
            <Link
              href="/ccresearch"
              className="group rounded-lg border border-emerald-200 dark:border-emerald-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                  CCResearch Terminal
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                </h2>
                <span className="text-[10px] sm:text-xs bg-emerald-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">AUTH</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                Claude Code Research Platform with web-based terminal.
                140+ scientific skills, 26 MCP servers, 13 plugins.
              </p>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Email auto-filled from login - per-user session tracking
              </p>
            </Link>

            <Link
              href="/workspace"
              className="group rounded-lg border border-indigo-200 dark:border-indigo-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                  Workspace
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                </h2>
                <span className="text-[10px] sm:text-xs bg-indigo-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">AUTH</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                Notes and file storage organized by projects.
                Markdown editor with Mermaid diagram support.
              </p>
              <p className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Requires login - per-user data isolation
              </p>
            </Link>

            <Link
              href="/analyst"
              className="group rounded-lg border border-blue-200 dark:border-blue-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                  Data Analyst
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                </h2>
                <span className="text-[10px] sm:text-xs bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">AUTH</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                AI-powered data analysis and visualization. Connect to any data source - CSV, Excel, PostgreSQL, or AACT clinical trials.
              </p>
              <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">
                Requires login - per-user data isolation
              </p>
            </Link>

            <Link
              href="/video-factory"
              className="group rounded-lg border border-purple-200 dark:border-purple-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                  Video Factory
                  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                </h2>
                <span className="text-[10px] sm:text-xs bg-purple-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">AUTH</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                AI-powered video production pipeline. Generate scripts, create clips with Sora 2, and assemble final videos automatically.
              </p>
              <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium">
                Requires login - per-user data isolation
              </p>
            </Link>

            <div className="opacity-40 rounded-lg border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-5">
              <h2 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                Drive
                <span className="text-[10px] sm:text-xs ml-2 bg-gray-200 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded">Soon</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                File storage and sharing
              </p>
            </div>

            <div className="opacity-40 rounded-lg border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-5">
              <h2 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                Tasks
                <span className="text-[10px] sm:text-xs ml-2 bg-gray-200 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded">Soon</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Task management and to-do lists
              </p>
            </div>
          </div>

          {/* Recent Sessions - shows sessions from all apps */}
          {user && <RecentSessions maxSessions={5} />}
        </div>
      </main>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
