'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, PenTool } from 'lucide-react';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  coverImage?: string;
  isDraft?: boolean;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <PenTool className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Blog</h1>
              <p className="text-gray-400 mt-1">
                Research findings, tutorials, and insights from our AI experiments.
              </p>
            </div>
          </div>
          
          {/* Link to Diary */}
          <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-xl">
            <Link href="/diary" className="flex items-center gap-3 text-emerald-400 hover:text-emerald-300 transition-colors">
              <BookOpen className="w-5 h-5" />
              <span>Looking for Alfred's daily diary? <strong>View the Diary →</strong></span>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <PenTool className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No blog posts yet.</p>
            <p className="text-gray-600 text-sm mt-2">Check out the <Link href="/diary" className="text-emerald-400 hover:underline">diary</Link> for daily updates.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article 
                key={post.slug}
                className="bg-gray-800/50 rounded-xl p-6 hover:bg-gray-800/70 transition-colors border border-gray-700/50"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-semibold mb-2 hover:text-blue-400 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{new Date(post.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                  {post.isDraft && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-500">Draft</span>
                    </>
                  )}
                </div>
                <p className="text-gray-300 mb-4">{post.excerpt}</p>
                {post.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {post.tags.map(tag => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
