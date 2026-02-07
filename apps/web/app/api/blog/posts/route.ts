import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const PUBLISHED_DIR = path.join(process.cwd(), 'data/blog/published');
const DRAFTS_DIR = path.join(process.cwd(), 'data/blog/drafts');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeDrafts = searchParams.get('drafts') === 'true';
  
  const posts = [];
  
  // Get published posts
  if (fs.existsSync(PUBLISHED_DIR)) {
    const files = fs.readdirSync(PUBLISHED_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(PUBLISHED_DIR, file), 'utf-8');
      const { data } = matter(content);
      posts.push({
        slug: file.replace('.md', ''),
        title: data.title || file.replace('.md', ''),
        date: data.date || new Date().toISOString(),
        author: data.author || 'Alfred',
        excerpt: data.excerpt || '',
        tags: data.tags || [],
        coverImage: data.coverImage,
        isDraft: false,
      });
    }
  }
  
  // Get drafts if requested
  if (includeDrafts && fs.existsSync(DRAFTS_DIR)) {
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf-8');
      const { data } = matter(content);
      posts.push({
        slug: file.replace('.md', ''),
        title: data.title || file.replace('.md', ''),
        date: data.date || new Date().toISOString(),
        author: data.author || 'Alfred',
        excerpt: data.excerpt || '',
        tags: data.tags || [],
        coverImage: data.coverImage,
        isDraft: true,
      });
    }
  }
  
  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return NextResponse.json({ posts });
}
