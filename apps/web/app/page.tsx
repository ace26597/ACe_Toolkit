"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col">
        <h1 className="text-4xl font-bold mb-8 text-indigo-600">ACe Toolkit</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Your personal productivity apps - no login required</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link
            href="/mermaid"
            className="group rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-5 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-lg md:col-span-2"
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">
              Mermaid Studio
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create diagrams, take notes, and organize markdown documents.
              Mermaid code blocks are automatically extracted as editable diagrams.
            </p>
          </Link>

          <Link
            href="/research"
            className="group rounded-lg border border-blue-200 dark:border-blue-700 px-6 py-5 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                🔬 Research Assistant
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
              </h2>
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Multi-model AI research with GPT-4o and Claude. Upload files, search the web with Tavily,
              run LangGraph workflows, and generate comprehensive reports in PDF/Markdown/HTML/CSV.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              ✨ Multi-modal files • 🌐 Web search • 🧠 LangGraph workflows • 📊 Multiple report formats
            </p>
          </Link>

          <Link
            href="/medresearch"
            className="group rounded-lg border border-emerald-200 dark:border-emerald-700 px-6 py-5 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-lg md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                🔬 MedResearch Terminal
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
              </h2>
              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Web-based Claude Code terminal for medical research QA.
              Each session has isolated workspace with 140+ scientific skills via MCP.
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              🖥️ Full PTY terminal • 🧬 Scientific MCP skills • 📁 Isolated workspaces • ⏱️ 24h sessions
            </p>
          </Link>

          <div className="opacity-40 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-5">
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">
              Drive
              <span className="text-xs ml-2 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">Soon</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              File storage and sharing
            </p>
          </div>

          <div className="opacity-40 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-5">
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">
              Tasks
              <span className="text-xs ml-2 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">Soon</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Task management and to-do lists
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
