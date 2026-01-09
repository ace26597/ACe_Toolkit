"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col">
        <h1 className="text-4xl font-bold mb-8 text-indigo-600">Mermaid Monorepo Hub</h1>

        <div className="grid grid-cols-1 gap-6">
          <Link
            href="/mermaid"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Mermaid Editor{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Create, edit, and export flowcharts and diagrams.
            </p>
          </Link>

          <div className="opacity-50 pointer-events-none group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Notes (Coming Soon)
            </h2>
          </div>
          <div className="opacity-50 pointer-events-none group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Drive (Coming Soon)
            </h2>
          </div>
        </div>
      </div>
    </main>
  );
}
