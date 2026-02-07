import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const COMMENTS_DIR = path.join(process.cwd(), 'data', 'blog', 'comments');

interface Comment {
  id: string;
  name: string;
  message: string;
  timestamp: string;
}

async function getCommentsPath(slug: string): Promise<string> {
  await fs.mkdir(COMMENTS_DIR, { recursive: true });
  return path.join(COMMENTS_DIR, `${slug}.json`);
}

async function loadComments(slug: string): Promise<Comment[]> {
  try {
    const filePath = await getCommentsPath(slug);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveComments(slug: string, comments: Comment[]): Promise<void> {
  const filePath = await getCommentsPath(slug);
  await fs.writeFile(filePath, JSON.stringify(comments, null, 2));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const comments = await loadComments(slug);
  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const body = await request.json();
    const { name, message } = body;

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message required' }, { status: 400 });
    }

    const comments = await loadComments(slug);
    
    const newComment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.slice(0, 100), // Limit name length
      message: message.slice(0, 2000), // Limit message length
      timestamp: new Date().toISOString(),
    };

    comments.push(newComment);
    await saveComments(slug, comments);

    return NextResponse.json({ comments, success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
}
