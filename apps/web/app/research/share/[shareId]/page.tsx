'use client';

import { useState, useEffect, use } from 'react';
import { researchAssistantApi, type ResearchAssistantMessage } from '@/lib/api';
import MessageBubble from '@/components/research-assistant/MessageBubble';
import { MessageSquare, Calendar, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SharedSessionInfo {
  id: string;
  title: string;
  created_at: string;
  shared_at: string;
  message_count: number;
}

export default function SharedResearchPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const resolvedParams = use(params);
  const [session, setSession] = useState<SharedSessionInfo | null>(null);
  const [messages, setMessages] = useState<ResearchAssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedSession();
  }, [resolvedParams.shareId]);

  const loadSharedSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load session info
      const sessionInfo = await researchAssistantApi.getSharedSession(resolvedParams.shareId);
      setSession(sessionInfo);

      // Load messages
      const messagesData = await researchAssistantApi.getSharedMessages(resolvedParams.shareId);
      setMessages(messagesData);
    } catch (err: any) {
      console.error('Failed to load shared session:', err);
      setError(err.message || 'Failed to load shared session');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading shared research...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Session Not Found</h1>
          <p className="text-gray-400 mb-6">
            {error || 'This shared session may have been deleted or the link is invalid.'}
          </p>
          <Link
            href="/research"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Research
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Shared Research Session</span>
              </div>
              <h1 className="text-xl font-bold text-white">{session.title}</h1>
            </div>
            <Link
              href="/research"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Start your own</span>
            </Link>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(session.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{session.message_count} messages</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No messages in this session</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                format={msg.response_format}
                timestamp={msg.created_at}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/80 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-sm mb-3">
            This is a read-only view of a shared research session.
          </p>
          <Link
            href="/research"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Start Your Own Research
          </Link>
        </div>
      </footer>
    </div>
  );
}
