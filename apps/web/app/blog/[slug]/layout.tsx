import { Metadata } from 'next';
import { getPostBySlug, getAllPosts } from '@/lib/blog';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found | ACe_Toolkit Blog' };
  }

  const url = `https://orpheuscore.uk/blog/${slug}`;

  return {
    title: `${post.title} | ACe_Toolkit Blog`,
    description: post.excerpt,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      siteName: 'ACe_Toolkit',
      ...(post.coverImage && { images: [{ url: post.coverImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

function buildJsonLd(slug: string) {
  const post = getPostBySlug(slug);
  if (!post) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    datePublished: post.date,
    url: `https://orpheuscore.uk/blog/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'ACe_Toolkit',
      url: 'https://orpheuscore.uk',
    },
    keywords: post.tags,
    ...(post.coverImage && { image: post.coverImage }),
  };
}

export default async function BlogPostLayout({ params, children }: Props) {
  const { slug } = await params;
  const jsonLd = buildJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify of our own server-side data is XSS-safe
          // This is the standard Next.js pattern for JSON-LD structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
