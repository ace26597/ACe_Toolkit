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
