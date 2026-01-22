"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Terminal,
  FolderOpen,
  BarChart3,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getApiUrl, WorkspaceSession } from '@/lib/api';
import { useAuth } from '@/components/auth';

// App icons and colors
const APP_CONFIG: Record<string, { icon: typeof Terminal; color: string; bgColor: string; route: string }> = {
  ccresearch: {
    icon: Terminal,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    route: '/ccresearch'
  },
  workspace: {
    icon: FolderOpen,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    route: '/workspace'
  },
  analyst: {
    icon: BarChart3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    route: '/analyst'
  }
};

// CCResearch session interface (from DB)
interface CCResearchSession {
  id: string;
  session_id: string;
  email: string;
  session_number: number;
  title: string;
  workspace_dir: string;
  status: string;
  created_at: string;
  last_activity_at: string;
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get app display name
function getAppName(createdBy: string): string {
  switch (createdBy) {
    case 'ccresearch': return 'CCResearch';
    case 'workspace': return 'Workspace';
    case 'analyst': return 'Analyst';
    default: return createdBy;
  }
}

interface RecentSessionsProps {
  maxSessions?: number;
}

export function RecentSessions({ maxSessions = 5 }: RecentSessionsProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user?.email) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from both sources in parallel
      const [workspaceRes, ccresearchRes] = await Promise.all([
        fetch(`${getApiUrl()}/workspace/sessions`, {
          credentials: 'include'
        }).catch(() => null),
        fetch(`${getApiUrl()}/ccresearch/sessions/by-email?email=${encodeURIComponent(user.email)}`, {
          credentials: 'include'
        }).catch(() => null)
      ]);

      const allSessions: WorkspaceSession[] = [];

      // Process workspace sessions
      if (workspaceRes?.ok) {
        const workspaceData = await workspaceRes.json();
        allSessions.push(...workspaceData);
      }

      // Process CCResearch sessions (convert to WorkspaceSession format)
      if (ccresearchRes?.ok) {
        const ccresearchData: CCResearchSession[] = await ccresearchRes.json();
        const mappedSessions: WorkspaceSession[] = ccresearchData.map(s => ({
          id: s.id,
          title: s.title,
          created_by: 'ccresearch',
          created_at: s.created_at,
          last_accessed: s.last_activity_at,
          tags: [],
          terminal_enabled: true,
          email: s.email,
          status: s.status
        }));
        allSessions.push(...mappedSessions);
      }

      // Deduplicate by ID and sort by last_accessed
      const uniqueSessions = Array.from(
        new Map(allSessions.map(s => [s.id, s])).values()
      );

      const sorted = uniqueSessions
        .sort((a, b) =>
          new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
        )
        .slice(0, maxSessions);

      setSessions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [maxSessions, user?.email]);

  // Don't render anything if not authenticated or no sessions
  if (!loading && sessions.length === 0 && !error) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Recent Sessions
        </h2>
        {!loading && sessions.length > 0 && (
          <button
            onClick={fetchSessions}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          {error}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          {sessions.map((session) => {
            const config = APP_CONFIG[session.created_by] || APP_CONFIG.workspace;
            const Icon = config.icon;

            // Build the link based on app type
            let href = config.route;
            if (session.created_by === 'ccresearch') {
              // CCResearch sessions can be resumed directly
              href = `/ccresearch?session=${session.id}`;
            }

            return (
              <Link
                key={session.id}
                href={href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                {/* App Icon */}
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {session.title}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                      {getAppName(session.created_by)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(session.last_accessed)}</span>
                    {session.email && (
                      <>
                        <span>•</span>
                        <span className="truncate">{session.email}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {!loading && sessions.length > 0 && (
        <div className="mt-2 text-center">
          <Link
            href="/workspace?tab=sessions"
            className="text-xs text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
          >
            View all sessions →
          </Link>
        </div>
      )}
    </div>
  );
}

export default RecentSessions;
