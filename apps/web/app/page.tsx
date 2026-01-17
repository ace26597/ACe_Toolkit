"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-gray-50 dark:bg-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-indigo-600 text-center">ACe Toolkit</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 text-center">Your personal productivity apps - no login required</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">
          <Link
            href="/mermaid"
            className="group rounded-lg border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-lg md:col-span-2"
          >
            <h2 className="mb-2 text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              Mermaid Studio
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Create diagrams, take notes, and organize markdown documents.
              Mermaid code blocks are automatically extracted as editable diagrams.
            </p>
          </Link>

          <Link
            href="/research"
            className="group rounded-lg border border-blue-200 dark:border-blue-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10"
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                🔬 Research Assistant
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
              </h2>
              <span className="text-[10px] sm:text-xs bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
              Multi-model AI research with GPT-4o and Claude. Upload files, search the web with Tavily,
              run LangGraph workflows, and generate comprehensive reports.
            </p>
            <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">
              ✨ Multi-modal files • 🌐 Web search • 🧠 LangGraph • 📊 Reports
            </p>
          </Link>

          <Link
            href="/ccresearch"
            className="group rounded-lg border border-emerald-200 dark:border-emerald-700 px-4 sm:px-6 py-4 sm:py-5 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10"
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                🔬 CCResearch Terminal
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
              </h2>
              <span className="text-[10px] sm:text-xs bg-emerald-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
              Claude Code Research Platform with web-based terminal.
              Each session has isolated workspace with 140+ scientific skills.
            </p>
            <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              🖥️ PTY terminal • 🧬 Scientific MCP • 📁 Workspaces • ⏱️ 24h sessions
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
      </div>
    </main>
  );
}
