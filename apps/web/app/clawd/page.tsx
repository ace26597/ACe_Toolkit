'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { Shield, AlertTriangle, ExternalLink, MessageSquare, Bot, Settings } from 'lucide-react';
import Link from 'next/link';

function ClawdContent() {
  const { user } = useAuth();
  const [token, setToken] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  
  // Clawdbot gateway URL - proxied through backend for security
  const CLAWD_GATEWAY = '/api/clawd';
  
  // Check if user is admin
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Admin Access Required</h2>
          <p className="text-zinc-400 mb-6">
            This page is restricted to administrators only.
          </p>
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Clawdbot Control</h1>
              <p className="text-xs text-zinc-500">AI Assistant Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              Logged in as <span className="text-blue-400">{user.email}</span>
            </span>
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-200 text-sm">
              <strong>Alfred</strong> is your AI assistant running on this system. 
              You can chat with Alfred via WhatsApp or use this dashboard for direct control.
            </p>
          </div>
        </div>

        {/* Dashboard Embed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              Control Panel
            </h2>
            <a
              href="http://localhost:18789"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Open in new tab <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          {/* Iframe for Clawdbot Dashboard */}
          <div className="relative" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
            <iframe
              src="http://127.0.0.1:18789"
              className="w-full h-full border-0"
              title="Clawdbot Dashboard"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              WhatsApp
            </h3>
            <p className="text-sm text-zinc-400">
              Chat with Alfred directly via WhatsApp for quick tasks.
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              Capabilities
            </h3>
            <p className="text-sm text-zinc-400">
              Browser automation, file management, system control, and more.
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              Security
            </h3>
            <p className="text-sm text-zinc-400">
              All actions are logged. Admin access required for this dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ClawdPage() {
  return (
    <ProtectedRoute>
      <ClawdContent />
    </ProtectedRoute>
  );
}
