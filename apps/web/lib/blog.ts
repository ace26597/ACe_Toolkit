import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'data/blog');
const PUBLISHED_DIR = path.join(BLOG_DIR, 'published');
const DRAFTS_DIR = path.join(BLOG_DIR, 'drafts');

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage?: string;
  isDraft: boolean;
}

export function getAllPosts(includeDrafts = false): BlogPost[] {
  const posts: BlogPost[] = [];
  
  // Get published posts
  if (fs.existsSync(PUBLISHED_DIR)) {
    const publishedFiles = fs.readdirSync(PUBLISHED_DIR).filter(f => f.endsWith('.md'));
    for (const file of publishedFiles) {
      const post = getPostBySlug(file.replace('.md', ''), false);
      if (post) posts.push(post);
    }
  }
  
  // Get drafts if requested
  if (includeDrafts && fs.existsSync(DRAFTS_DIR)) {
    const draftFiles = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of draftFiles) {
      const post = getPostBySlug(file.replace('.md', ''), true);
      if (post) posts.push(post);
    }
  }
  
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string, isDraft = false): BlogPost | null {
  const dir = isDraft ? DRAFTS_DIR : PUBLISHED_DIR;
  const filePath = path.join(dir, `${slug}.md`);
  
  if (!fs.existsSync(filePath)) return null;
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString(),
    author: data.author || 'Alfred',
    excerpt: data.excerpt || content.slice(0, 200) + '...',
    content,
    tags: data.tags || [],
    coverImage: data.coverImage,
    isDraft,
  };
}

export function publishDraft(slug: string): boolean {
  const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
  const publishPath = path.join(PUBLISHED_DIR, `${slug}.md`);
  
  if (!fs.existsSync(draftPath)) return false;
  
  fs.renameSync(draftPath, publishPath);
  return true;
}

export function saveDraft(slug: string, content: string, frontmatter: Record<string, any>): void {
  const fullContent = matter.stringify(content, frontmatter);
  const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
  
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(draftPath, fullContent);
}
