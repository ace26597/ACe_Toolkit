'use client';

import Link from 'next/link';
import { Cpu } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo + Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-white">C3 Researcher</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              AI-powered research workspace. Full Claude Code terminal with 145+ skills,
              34 MCP servers, and access to 30+ scientific databases.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2">
              {[
                { href: '/workspace', label: 'Workspace' },
                { href: '/data-studio', label: 'Data Studio' },
                { href: '/video-studio', label: 'Video Studio' },
                { href: '/directory', label: 'Directory' },
                { href: '/showcase', label: 'Showcase' },
                { href: '/ccresearch/tips', label: 'Tips & Guides' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Powered By */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Platform
            </h3>
            <div className="space-y-2 text-sm text-slate-500">
              <p>Powered by Claude Code</p>
              <p>Built with Next.js & FastAPI</p>
              <p>Deployed via Cloudflare Tunnel</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Claude Code Custom Researcher
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 pulse-dot" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
