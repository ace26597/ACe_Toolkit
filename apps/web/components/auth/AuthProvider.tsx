'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, AuthUser, TrialInfo } from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  trialInfo: TrialInfo | null;
  loading: boolean;
  isTrialExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Refresh token every 12 hours to keep session alive
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isTrialExpired = trialInfo?.trial_expired ?? false;

  const refreshAuth = useCallback(async () => {
    try {
      // First try to get status (uses access token)
      const status = await authApi.getStatus();
      setUser(status.user as AuthUser);
      setTrialInfo(status.trial);
      return true;
    } catch {
      // If status fails, try to refresh the token
      try {
        await authApi.refresh();
        // After refresh, get status again
        const status = await authApi.getStatus();
        setUser(status.user as AuthUser);
        setTrialInfo(status.trial);
        return true;
      } catch {
        // Refresh also failed, user is logged out
        setUser(null);
        setTrialInfo(null);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      await refreshAuth();
      setLoading(false);
    };

    checkAuth();

    // Set up periodic token refresh for logged-in users
    refreshIntervalRef.current = setInterval(() => {
      if (user) {
        refreshAuth();
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setUser(response.user as AuthUser);
    setTrialInfo(response.trial);
  };

  const register = async (name: string, email: string, password: string) => {
    const newUser = await authApi.register(name, email, password);
    // After registration, automatically log in
    await login(email, password);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setTrialInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        trialInfo,
        loading,
        isTrialExpired,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
