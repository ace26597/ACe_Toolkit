'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cpu, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { MobileMenu } from '@/components/ui/MobileMenu';

interface HeaderProps {
  variant?: 'default' | 'transparent';
}

const navLinks = [
  { href: '/workspace', label: 'Workspace' },
  { href: '/directory', label: 'Directory' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/blog', label: 'Blog' },
];

const mobileLinks = [
  ...navLinks,
  { href: '/diary', label: 'Diary' },
  { href: '/ccresearch/tips', label: 'Tips' },
  { href: '/changelog', label: 'Changelog' },
];

export function Header({ variant = 'default' }: HeaderProps) {
  const { user, loading, logout, trialInfo } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTrialText = () => {
    if (!trialInfo || !trialInfo.is_trial || !trialInfo.trial_expires_at) return null;
    const expiresAt = new Date(trialInfo.trial_expires_at);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return hoursLeft > 0 ? `${hoursLeft}h trial` : 'Trial expired';
  };

  const isTransparent = variant === 'transparent';

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isTransparent
          ? 'border-slate-800/30 bg-slate-950/70'
          : 'border-slate-800/50 bg-slate-950/90'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">
            C3 Researcher
          </span>
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-green-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
            Live
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/50 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu */}
          <MobileMenu links={mobileLinks} />

          {/* Auth */}
          {loading ? (
            <div className="w-8 h-8 animate-pulse bg-slate-800 rounded-full" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800/50"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                {user.is_admin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                {trialInfo?.is_trial && (
                  <span className="text-xs text-amber-500 font-medium">{getTrialText()}</span>
                )}
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <p className="text-sm text-white font-medium truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    {user.is_admin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:bg-slate-700/50 transition-colors"
                      >
                        <Shield className="w-4 h-4" /> Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
