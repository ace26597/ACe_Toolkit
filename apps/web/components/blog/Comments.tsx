'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  name: string;
  message: string;
  timestamp: string;
}

interface CommentsProps {
  slug: string;
  title: string;
}

export default function Comments({ slug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/comments/${slug}`)
      .then(res => res.json())
      .then(data => setComments(data.comments || []))
      .catch(() => setComments([]));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog/comments/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setName('');
        setMessage('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to submit comment');
    }
    setSubmitting(false);
  };

  return (
    <section className="mt-16 pt-8 border-t border-gray-700">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        💬 Comments & Questions
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-800/50 rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Your name"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
            placeholder="Your comment or question..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded font-medium transition-colors"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
        {success && (
          <span className="ml-4 text-green-400">✓ Comment posted!</span>
        )}
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-blue-400">{comment.name}</span>
                <span className="text-gray-500 text-sm">
                  {new Date(comment.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-300">{comment.message}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
