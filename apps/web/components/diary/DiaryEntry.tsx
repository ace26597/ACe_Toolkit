'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, BookOpen, Brain, Dice6 } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

interface DiaryEntryProps {
  date: string;
  onClose: () => void;
}

interface SingleEntry {
  agent: string;
  file: string;
  title: string;
  content: string;
  wordCount: number;
  frontmatter: {
    tags?: string[];
    mood?: string;
  };
}

interface EntryData {
  date: string;
  entries: SingleEntry[];
  count: number;
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-gray-200">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 rounded-lg p-4 my-4 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-900 px-1.5 py-0.5 rounded text-emerald-400 text-sm">$1</code>')
    .replace(/^---$/gm, '<hr class="border-gray-700 my-6" />')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-400 hover:underline" target="_blank">$1</a>')
    .replace(/^(?!<[hl]|<pre|<li|<hr)(.+)$/gm, '<p class="mb-4 leading-relaxed">$1</p>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>');
}

export default function DiaryEntry({ date, onClose }: DiaryEntryProps) {
  const [data, setData] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetch(`/api/diary/entries/${date}`)
      .then(res => {
        if (!res.ok) throw new Error('Entry not found');
        return res.json();
      })
      .then(responseData => {
        setData(responseData);
        if (responseData.entries?.length > 0) {
          setActiveAgent(responseData.entries[0].agent);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [date]);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const activeEntry = data?.entries?.find(e => e.agent === activeAgent);
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">{formatDate(date)}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Agent tabs (if multiple entries) */}
        {data && data.entries.length > 1 && (
          <div className="flex gap-2 p-4 border-b border-gray-800">
            {data.entries.map(entry => (
              <button
                key={entry.agent}
                onClick={() => setActiveAgent(entry.agent)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeAgent === entry.agent
                    ? entry.agent === 'alfred' 
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-purple-900/50 text-purple-400'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {entry.agent === 'alfred' ? (
                  <Brain className="w-4 h-4" />
                ) : (
                  <Dice6 className="w-4 h-4" />
                )}
                <span className="capitalize">{entry.agent}</span>
                <span className="text-xs opacity-60">{entry.wordCount}w</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-gray-400">
              <p>{error}</p>
            </div>
          ) : activeEntry ? (
            <div className="prose prose-invert max-w-none">
              {/* Agent badge for single entry */}
              {data?.entries.length === 1 && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-6 ${
                  activeEntry.agent === 'alfred' 
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : 'bg-purple-900/50 text-purple-400'
                }`}>
                  {activeEntry.agent === 'alfred' ? <Brain className="w-4 h-4" /> : <Dice6 className="w-4 h-4" />}
                  <span className="capitalize">{activeEntry.agent}</span>
                </div>
              )}
              <div 
                className="text-gray-300"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(activeEntry.content), { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) }}
              />
            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        {activeEntry && (
          <div className="p-4 border-t border-gray-800 flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{activeEntry.wordCount} words</span>
            </div>
            {activeEntry.frontmatter?.tags && activeEntry.frontmatter.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>{activeEntry.frontmatter.tags.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
