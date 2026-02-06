'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  content: string;
  tags: string[];
  coverImage?: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/blog/posts/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then(data => {
        setPost(data.post);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl mb-4">Post not found</h1>
        <Link href="/blog" className="text-blue-400 hover:underline">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-blue-400 hover:underline mb-8 inline-block">
          ← Back to blog
        </Link>
        
        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-gray-400">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{new Date(post.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
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
          </header>
          
          {post.coverImage && (
            <div className="relative w-full aspect-video mb-8">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="rounded-lg object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
                priority
                unoptimized
              />
            </div>
          )}
          
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({children}) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
                h2: ({children}) => <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>,
                h3: ({children}) => <h3 className="text-xl font-medium mt-4 mb-2">{children}</h3>,
                p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc list-inside mb-4 text-gray-300">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-4 text-gray-300">{children}</ol>,
                li: ({children}) => <li className="mb-1">{children}</li>,
                blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4">{children}</blockquote>,
                code: ({children}) => <code className="bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>,
                pre: ({children}) => <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>,
                hr: () => <hr className="border-gray-700 my-8" />,
                strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
