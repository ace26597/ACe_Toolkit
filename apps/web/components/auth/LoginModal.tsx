'use client';

import React, { useState } from 'react';
import { X, User, Mail, Lock, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export function LoginModal({ isOpen, onClose, defaultTab = 'login' }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trialExpiredMessage, setTrialExpiredMessage] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTrialExpiredMessage(false);
    setLoading(true);

    try {
      await login(email, password);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message === 'trial_expired') {
        setTrialExpiredMessage(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters with uppercase, lowercase, digit, and special character');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setTrialExpiredMessage(false);
  };

  const switchTab = (tab: 'login' | 'signup') => {
    resetForm();
    setActiveTab(tab);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab('signup')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'signup'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-6">
          {/* Trial expired message */}
          {trialExpiredMessage && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-amber-500 font-medium">Trial Expired</p>
                  <p className="text-amber-500/70 text-sm mt-1">
                    Your 24-hour trial has ended. Please contact the admin for continued access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !trialExpiredMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-zinc-500">or continue with</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Trial info banner */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>24-hour free trial</strong> - Full access to all features.
                  Admin approval required for continued access.
                </p>
              </div>

              {/* Experimental disclaimer */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-500/80 text-xs">
                  <strong>Disclaimer:</strong> This is a non-commercial, experimental platform
                  for personal research. We make no warranties, guarantees about data security,
                  or service availability. By signing up, you agree to use this at your own risk.
                </p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Min. 12 characters"
                    required
                    minLength={12}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Creating account...' : 'Start Free Trial'}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-zinc-500">or sign up with</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
