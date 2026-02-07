import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const PUBLISHED_DIR = path.join(process.cwd(), 'data/blog/published');
const DRAFTS_DIR = path.join(process.cwd(), 'data/blog/drafts');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isDraft = searchParams.get('draft') === 'true';
  
  const dir = isDraft ? DRAFTS_DIR : PUBLISHED_DIR;
  const filePath = path.join(dir, `${slug}.md`);
  
  // Also check the other directory if not found
  let actualPath = filePath;
  let actualIsDraft = isDraft;
  
  if (!fs.existsSync(filePath)) {
    const altDir = isDraft ? PUBLISHED_DIR : DRAFTS_DIR;
    const altPath = path.join(altDir, `${slug}.md`);
    if (fs.existsSync(altPath)) {
      actualPath = altPath;
      actualIsDraft = !isDraft;
    } else {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
  }
  
  const fileContent = fs.readFileSync(actualPath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  return NextResponse.json({
    post: {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      author: data.author || 'Alfred',
      content,
      tags: data.tags || [],
      coverImage: data.coverImage,
      isDraft: actualIsDraft,
    }
  });
}
