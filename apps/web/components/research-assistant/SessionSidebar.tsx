'use client';

import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  Share2,
  Link,
  Loader2,
} from 'lucide-react';
import type { ResearchAssistantSession } from '@/lib/api';

interface SessionSidebarProps {
  sessions: ResearchAssistantSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onShareSession: (sessionId: string) => void;
  isLoading?: boolean;
}

// Group sessions by date
function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (date > weekAgo) return 'This Week';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onShareSession,
  isLoading,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Group sessions by date
  const groupedSessions = React.useMemo(() => {
    const groups: Record<string, ResearchAssistantSession[]> = {};
    sessions.forEach((session) => {
      const group = getDateGroup(session.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(session);
    });
    return groups;
  }, [sessions]);

  const handleStartEdit = (session: ResearchAssistantSession) => {
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameSession(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') handleCancelEdit();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewSession}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Research
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sessions yet</p>
            <p className="text-xs mt-1">Start a new research session</p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([group, groupSessions]) => (
            <div key={group} className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 mb-2">
                {group}
              </h3>
              <div className="space-y-1">
                {groupSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-lg transition-colors ${
                      activeSessionId === session.id
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    {editingId === session.id ? (
                      <div className="flex items-center gap-1 p-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 hover:bg-gray-700 rounded text-green-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-gray-700 rounded text-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectSession(session.id)}
                        className="w-full text-left p-3 pr-24"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                activeSessionId === session.id
                                  ? 'text-white'
                                  : 'text-gray-200'
                              }`}
                            >
                              {session.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{session.turn_count} turns</span>
                              {session.share_id && (
                                <span className="flex items-center gap-0.5 text-green-400">
                                  <Link className="w-3 h-3" />
                                  Shared
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Action buttons */}
                    {editingId !== session.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareSession(session.id);
                          }}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-blue-400"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(session);
                          }}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {showDeleteConfirm === session.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                                setShowDeleteConfirm(null);
                              }}
                              className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white"
                              title="Confirm delete"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(null);
                              }}
                              className="p-1.5 hover:bg-gray-700 rounded text-gray-400"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(session.id);
                            }}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
