'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  isDraft: boolean;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchDrafts = () => {
    fetch('/api/blog/posts?drafts=true')
      .then(res => res.json())
      .then(data => {
        setDrafts((data.posts || []).filter((p: BlogPost) => p.isDraft));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handlePublish = async (slug: string) => {
    if (!confirm(`Publish "${slug}"?`)) return;
    
    setPublishing(slug);
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      
      if (res.ok) {
        alert('Published successfully!');
        fetchDrafts();
      } else {
        alert('Failed to publish');
      }
    } catch {
      alert('Error publishing');
    }
    setPublishing(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-12">
          <Link href="/blog" className="text-blue-400 hover:underline mb-4 inline-block">
            ← Back to blog
          </Link>
          <h1 className="text-4xl font-bold mb-4">📝 Drafts for Review</h1>
          <p className="text-gray-400">
            Review and approve diary entries before publishing.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No drafts pending review.</p>
        ) : (
          <div className="space-y-6">
            {drafts.map((draft) => (
              <div 
                key={draft.slug}
                className="bg-gray-800/50 rounded-lg p-6 border border-yellow-500/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded mb-2 inline-block">
                      DRAFT
                    </span>
                    <h2 className="text-xl font-semibold">{draft.title}</h2>
                    <p className="text-gray-400 text-sm">
                      {new Date(draft.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      href={`/blog/${draft.slug}?draft=true`}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      Preview
                    </Link>
                    <button
                      onClick={() => handlePublish(draft.slug)}
                      disabled={publishing === draft.slug}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {publishing === draft.slug ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">{draft.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
