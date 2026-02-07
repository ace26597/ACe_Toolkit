import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PUBLISHED_DIR = path.join(process.cwd(), 'data/blog/published');
const DRAFTS_DIR = path.join(process.cwd(), 'data/blog/drafts');

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }
    
    const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
    const publishPath = path.join(PUBLISHED_DIR, `${slug}.md`);
    
    if (!fs.existsSync(draftPath)) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    // Ensure published directory exists
    if (!fs.existsSync(PUBLISHED_DIR)) {
      fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
    }
    
    // Move from drafts to published
    fs.renameSync(draftPath, publishPath);
    
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 });
  }
}
