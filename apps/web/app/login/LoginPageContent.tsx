'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth';
import {
  Cpu,
  Terminal,
  Database,
  FileText,
  BarChart3,
  Mail,
  Lock,
  User,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

const features = [
  {
    icon: Terminal,
    label: '145+ Skills',
    description: 'Full Claude Code terminal access',
    color: 'blue',
  },
  {
    icon: Database,
    label: '34 MCP Servers',
    description: 'PubMed, ChEMBL, clinical trials, and more',
    color: 'cyan',
  },
  {
    icon: FileText,
    label: 'Document Generation',
    description: 'DOCX, PDF, PPTX, XLSX output',
    color: 'violet',
  },
  {
    icon: BarChart3,
    label: 'Data Analysis',
    description: 'AI-powered dashboards with Plotly',
    color: 'emerald',
  },
] as const;

const featureColors: Record<string, { border: string; icon: string }> = {
  blue: { border: 'border-l-blue-500', icon: 'text-blue-400' },
  cyan: { border: 'border-l-cyan-500', icon: 'text-cyan-400' },
  violet: { border: 'border-l-violet-500', icon: 'text-violet-400' },
  emerald: { border: 'border-l-emerald-500', icon: 'text-emerald-400' },
};

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function LoginPageContent() {
  const { user, loading: authLoading, login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/workspace';
  const oauthError = searchParams.get('error');

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [trialExpiredMessage, setTrialExpiredMessage] = useState(false);

  // Map OAuth error codes to user-friendly messages
  useEffect(() => {
    if (!oauthError) return;
    const errorMessages: Record<string, string> = {
      oauth_denied: 'Google login was cancelled or denied.',
      oauth_invalid: 'Invalid OAuth request. Please try again.',
      oauth_invalid_state: 'Login session expired. Please try again.',
      oauth_token_failed: 'Failed to authenticate with Google. Please try again.',
      oauth_userinfo_failed: 'Could not retrieve your Google account info. Please try again.',
      oauth_no_email: 'No email found in your Google account. Please use email/password login.',
      oauth_server_error: 'A server error occurred during login. Please try again.',
      trial_expired: '',
    };
    if (oauthError === 'trial_expired') {
      setTrialExpiredMessage(true);
    } else {
      setError(errorMessages[oauthError] || 'Login failed. Please try again.');
    }
  }, [oauthError]);

  // If already logged in, redirect
  useEffect(() => {
    if (user && !authLoading) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTrialExpiredMessage(false);
    setFormLoading(true);

    try {
      await login(email, password);
      router.replace(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message === 'trial_expired') {
        setTrialExpiredMessage(true);
      } else {
        setError(message);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setFormLoading(false);
      return;
    }

    if (password.length < 12) {
      setError(
        'Password must be at least 12 characters with uppercase, lowercase, digit, and special character'
      );
      setFormLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in, show nothing while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* LEFT PANEL - Visual branding (hidden on mobile/tablet) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
        style={{
          backgroundColor: '#0f172a',
          backgroundImage:
            'radial-gradient(circle, rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-600/5 animate-pulse" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              C3 Researcher
            </span>
          </div>

          {/* Tagline */}
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            Command Center for
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AI Research
            </span>
          </h1>
          <p className="text-slate-400 mb-10 text-lg">
            A unified research workspace powered by Claude Code
          </p>

          {/* Feature cards */}
          <div className="space-y-3 text-left">
            {features.map((feature) => {
              const colors = featureColors[feature.color];
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className={`flex items-center gap-4 bg-slate-800/50 backdrop-blur-sm border-l-2 ${colors.border} rounded-lg px-4 py-3`}
                >
                  <Icon className={`w-5 h-5 ${colors.icon} shrink-0`} />
                  <div>
                    <p className="text-white font-medium text-sm">
                      {feature.label}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer text */}
          <p className="mt-10 text-slate-500 text-sm">
            Powered by Claude Code
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo (visible only on mobile/tablet) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              C3 Researcher
            </span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Trial expired message */}
          {trialExpiredMessage && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-500 font-medium">Trial Expired</p>
                  <p className="text-amber-500/70 text-sm mt-1">
                    Your 24-hour trial has ended. Please contact the admin for
                    continued access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !trialExpiredMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-950 text-slate-500">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google${redirectTo !== '/workspace' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 rounded-lg transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </a>

              {/* Switch to signup */}
              <p className="text-center text-sm text-slate-400 mt-4">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Trial info banner */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>24-hour free trial</strong> - Full access to all
                  features. Admin approval required for continued access.
                </p>
              </div>

              {/* Experimental disclaimer */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-500/80 text-xs">
                  <strong>Disclaimer:</strong> This is a non-commercial,
                  experimental platform for personal research. We make no
                  warranties, guarantees about data security, or service
                  availability. By signing up, you agree to use this at your own
                  risk.
                </p>
              </div>

              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Your name"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Min. 12 characters"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-sm text-slate-400 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-950 text-slate-500">
                    or sign up with
                  </span>
                </div>
              </div>

              {/* Google Sign-In */}
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google${redirectTo !== '/workspace' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 rounded-lg transition-colors"
              >
                <GoogleIcon />
                Sign up with Google
              </a>

              {/* Switch to login */}
              <p className="text-center text-sm text-slate-400 mt-4">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
