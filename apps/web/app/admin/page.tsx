"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Shield, Clock, CheckCircle, XCircle,
  UserCheck, UserX, Trash2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/components/auth';

interface UserData {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_approved: boolean;
  is_trial: boolean;
  trial_expires_at: string | null;
  created_at: string;
  last_login: string | null;
}

interface AdminStats {
  total_users: number;
  approved_users: number;
  trial_users: number;
  admin_users: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else if (!user.is_admin) {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/admin/users`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`${API_BASE}/auth/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to approve user');
      }
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`${API_BASE}/auth/admin/users/${userId}/revoke`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to revoke access');
      }
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      return;
    }
    setActionLoading(userId);
    try {
      const response = await fetch(`${API_BASE}/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete user');
      }
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTrialStatus = (user: UserData) => {
    if (!user.is_trial || !user.trial_expires_at) return null;
    const expiresAt = new Date(user.trial_expires_at);
    const now = new Date();
    const hoursLeft = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursLeft > 0) {
      return { text: `${hoursLeft}h left`, expired: false };
    }
    return { text: 'Expired', expired: true };
  };

  if (authLoading || (!user?.is_admin && !loading)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              <span className="text-lg font-bold text-white">Admin Dashboard</span>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_users}</p>
                  <p className="text-xs text-gray-400">Total Users</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.approved_users}</p>
                  <p className="text-xs text-gray-400">Approved</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.trial_users}</p>
                  <p className="text-xs text-gray-400">Trial Users</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.admin_users}</p>
                  <p className="text-xs text-gray-400">Admins</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Users</h2>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Login</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((u) => {
                    const trialStatus = getTrialStatus(u);
                    const isCurrentUser = u.id === user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-300">
                                {u.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                {u.name}
                                {u.is_admin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                                {isCurrentUser && <span className="text-xs text-gray-500">(you)</span>}
                              </p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {u.is_approved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Approved
                              </span>
                            ) : u.is_trial ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                                trialStatus?.expired
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                <Clock className="w-3 h-3" />
                                Trial {trialStatus?.text}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                                <XCircle className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(u.last_login)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {!u.is_approved && !u.is_admin && (
                              <button
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading === u.id}
                                className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors disabled:opacity-50"
                                title="Approve user"
                              >
                                {actionLoading === u.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {u.is_approved && !u.is_admin && (
                              <button
                                onClick={() => handleRevoke(u.id)}
                                disabled={actionLoading === u.id}
                                className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded transition-colors disabled:opacity-50"
                                title="Revoke access"
                              >
                                {actionLoading === u.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserX className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {!u.is_admin && !isCurrentUser && (
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={actionLoading === u.id}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                {actionLoading === u.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {u.is_admin && (
                              <span className="text-xs text-gray-500 px-2">Admin</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
