'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import Comments from '@/components/blog/Comments';

// Initialize mermaid
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: '#1f2937',
      primaryColor: '#3b82f6',
      primaryTextColor: '#f3f4f6',
      primaryBorderColor: '#4b5563',
      lineColor: '#6b7280',
      secondaryColor: '#1e3a5f',
      tertiaryColor: '#374151',
    },
  });
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  content: string;
  tags: string[];
  coverImage?: string;
}

// Mermaid diagram component
function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!ref.current) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        setError('Failed to render diagram');
        console.error('Mermaid error:', err);
      }
    };
    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 my-4">
        <p className="text-red-400 text-sm">{error}</p>
        <pre className="text-xs text-gray-400 mt-2 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className="my-6 flex justify-center bg-gray-800/50 rounded-lg p-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
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
      <div className="max-w-4xl mx-auto px-4 py-12">
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
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
                h2: ({children}) => <h2 className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-gray-700">{children}</h2>,
                h3: ({children}) => <h3 className="text-xl font-medium mt-6 mb-3">{children}</h3>,
                p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc list-outside ml-6 mb-4 text-gray-300 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-outside ml-6 mb-4 text-gray-300 space-y-1">{children}</ol>,
                li: ({children}) => <li className="mb-1">{children}</li>,
                blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4">{children}</blockquote>,
                a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>{children}</a>,
                hr: () => <hr className="border-gray-700 my-8" />,
                strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({children}) => <em className="italic text-gray-300">{children}</em>,
                
                // Table styling
                table: ({children}) => (
                  <div className="overflow-x-auto my-6">
                    <table className="min-w-full border-collapse border border-gray-700 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({children}) => <thead className="bg-gray-800">{children}</thead>,
                tbody: ({children}) => <tbody className="divide-y divide-gray-700">{children}</tbody>,
                tr: ({children}) => <tr className="hover:bg-gray-800/50 transition-colors">{children}</tr>,
                th: ({children}) => <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-gray-600">{children}</th>,
                td: ({children}) => <td className="px-4 py-3 text-sm text-gray-300 border-b border-gray-700/50">{children}</td>,
                
                // Code blocks with Mermaid support
                code: ({className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const lang = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');
                  
                  // Mermaid diagrams
                  if (lang === 'mermaid') {
                    return <MermaidDiagram chart={codeString} />;
                  }
                  
                  // Inline code
                  if (!className) {
                    return <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-blue-300" {...props}>{children}</code>;
                  }
                  
                  // Code blocks
                  return (
                    <code className={`${className} block`} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({children}) => (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4 text-sm">
                    {children}
                  </pre>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
          
          {/* Comments Section */}
          <Comments slug={post.slug} title={post.title} />
        </article>
      </div>
    </div>
  );
}
