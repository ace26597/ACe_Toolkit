import { getApiUrl, CSRF_HEADERS } from './client';

// ============ Auth Types ============

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  trial_expires_at: string | null;
  created_at: string;
}

export interface TrialInfo {
  has_access: boolean;
  is_trial: boolean;
  trial_expired: boolean;
  trial_expires_at: string | null;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    is_approved: boolean;
  };
  trial: TrialInfo;
}

export interface RegisterResponse extends AuthUser {}

// ============ Auth API ============

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    const res = await fetch(`${getApiUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(error.detail || 'Registration failed');
    }
    return res.json();
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      // Check for trial expired
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Login failed');
    }
    return res.json();
  },

  logout: async (): Promise<void> => {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const res = await fetch(`${getApiUrl()}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Not authenticated' }));
      // Pass through specific error messages from backend
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Not authenticated');
    }
    return res.json();
  },

  getStatus: async (): Promise<{ user: AuthUser; trial: TrialInfo }> => {
    const res = await fetch(`${getApiUrl()}/auth/me/status`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Not authenticated' }));
      // Pass through specific error messages (trial_expired, etc.)
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Not authenticated');
    }
    return res.json();
  },

  // Admin endpoints
  listUsers: async (): Promise<AuthUser[]> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to list users');
    return res.json();
  },

  approveUser: async (userId: string): Promise<{ message: string }> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to approve user');
    return res.json();
  },

  revokeUser: async (userId: string): Promise<{ message: string }> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users/${userId}/revoke`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to revoke user');
    return res.json();
  },

  // Alias for refreshToken
  refresh: async (): Promise<{ message: string; trial: TrialInfo }> => {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Refresh failed' }));
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Refresh failed');
    }
    return res.json();
  },
};
