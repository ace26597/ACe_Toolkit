'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';
import { Loader2, Lock, Clock, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isTrialExpired, trialInfo } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-zinc-400 mt-3">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">
            You need to be logged in to access this page. Sign up for a free 24-hour trial or login to continue.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Login / Sign Up
          </button>
        </div>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </div>
    );
  }

  // Show trial expired message
  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Trial Expired</h2>
          <p className="text-zinc-400 mb-4">
            Your 24-hour free trial has ended. Please contact the admin for continued access.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-zinc-400">
              <strong className="text-white">Account:</strong> {user.email}
            </p>
            {trialInfo?.trial_expires_at && (
              <p className="text-sm text-zinc-400 mt-1">
                <strong className="text-white">Expired:</strong>{' '}
                {new Date(trialInfo.trial_expires_at).toLocaleString()}
              </p>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            The admin will review your request and may grant extended access.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has access
  return <>{children}</>;
}
