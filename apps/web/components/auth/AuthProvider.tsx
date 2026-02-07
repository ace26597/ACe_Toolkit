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

// Refresh token every 10 minutes to keep session alive
// This ensures tokens are refreshed well before the 15-min minimum expiry
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track if user is logged in using a ref to avoid stale closure in interval
  const isLoggedInRef = useRef<boolean>(false);

  const isTrialExpired = trialInfo?.trial_expired ?? false;

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      // First try to get status (uses access token)
      const status = await authApi.getStatus();
      setUser(status.user as AuthUser);
      setTrialInfo(status.trial);
      isLoggedInRef.current = true;
      return true;
    } catch (error) {
      // Check if it's a trial expiration error
      if (error instanceof Error && error.message === 'trial_expired') {
        setUser(null);
        setTrialInfo({ has_access: false, is_trial: true, trial_expired: true, trial_expires_at: null });
        isLoggedInRef.current = false;
        return false;
      }

      // If status fails, try to refresh the token
      try {
        await authApi.refresh();
        // After refresh, get status again
        const status = await authApi.getStatus();
        setUser(status.user as AuthUser);
        setTrialInfo(status.trial);
        isLoggedInRef.current = true;
        return true;
      } catch (refreshError) {
        // Check if refresh failed due to trial expiration
        if (refreshError instanceof Error && refreshError.message === 'trial_expired') {
          setTrialInfo({ has_access: false, is_trial: true, trial_expired: true, trial_expires_at: null });
        } else {
          setTrialInfo(null);
        }
        // Refresh also failed, user is logged out
        setUser(null);
        isLoggedInRef.current = false;
        return false;
      }
    }
  }, []);

  // Initial auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      await refreshAuth();
      setLoading(false);
    };
    checkAuth();
  }, [refreshAuth]);

  // Set up periodic token refresh - uses ref to avoid stale closure
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      // Use ref instead of state to get current value
      if (isLoggedInRef.current) {
        refreshAuth();
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setUser(response.user as AuthUser);
    setTrialInfo(response.trial);
    isLoggedInRef.current = true;
  };

  const register = async (name: string, email: string, password: string) => {
    await authApi.register(name, email, password);
    // After registration, automatically log in
    await login(email, password);
  };

  const logout = async () => {
    // Always clear local state first, regardless of backend response
    setUser(null);
    setTrialInfo(null);
    isLoggedInRef.current = false;
    try {
      await authApi.logout();
    } catch {
      // Ignore errors - cookies may already be invalid/expired
      // Local state is already cleared which is the important part
    }
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
