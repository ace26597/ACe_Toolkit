import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DIARY_BASE = path.join(process.cwd(), 'data/diary');
const AGENTS = ['alfred', 'pip'];

interface DiaryEntry {
  date: string;
  title: string;
  excerpt: string;
  wordCount: number;
  tags: string[];
  mood?: string;
  agent: string;
}

function extractExcerpt(content: string, maxLength: number = 150): string {
  const cleaned = content
    .replace(/^#.*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/---/g, '')
    .trim();
  
  const firstPara = cleaned.split('\n\n')[0] || cleaned;
  return firstPara.length > maxLength 
    ? firstPara.substring(0, maxLength) + '...' 
    : firstPara;
}

function parseDateFromFilename(filename: string): string[] {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})(?:-to-(\d{2}))?\.md/);
  if (!match) return [];
  
  const startDate = match[1];
  if (match[2]) {
    const [year, month, startDay] = startDate.split('-');
    const endDay = parseInt(match[2]);
    const dates: string[] = [];
    for (let d = parseInt(startDay); d <= endDay; d++) {
      dates.push(`${year}-${month}-${String(d).padStart(2, '0')}`);
    }
    return dates;
  }
  return [startDate];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentFilter = searchParams.get('agent'); // Optional: filter by agent
  
  const entries: DiaryEntry[] = [];
  const calendar: Record<string, { hasEntry: boolean; wordCount: number; tags: string[]; agents: string[] }> = {};
  
  const agentsToCheck = agentFilter ? [agentFilter] : AGENTS;
  
  for (const agent of agentsToCheck) {
    const diaryDir = path.join(DIARY_BASE, agent);
    
    if (!fs.existsSync(diaryDir)) continue;
    
    const files = fs.readdirSync(diaryDir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(diaryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: body } = matter(content);
      
      const dates = parseDateFromFilename(file);
      const wordCount = body.split(/\s+/).filter(Boolean).length;
      const excerpt = extractExcerpt(body);
      
      // Auto-detect tags
      const tags: string[] = data.tags || [];
      if (!tags.length) {
        if (/crypto|btc|eth|bitcoin/i.test(body)) tags.push('crypto');
        if (/unity|game|detectai/i.test(body)) tags.push('gamedev');
        if (/learn|lesson|realized/i.test(body)) tags.push('learning');
        if (/openclaw|pip|alfred/i.test(body)) tags.push('agents');
        if (/claude.?code|terminal|coding/i.test(body)) tags.push('claude-code');
      }
      
      const entry: DiaryEntry = {
        date: dates[0] || file.replace('.md', ''),
        title: data.title || `${agent === 'alfred' ? '🧠' : '🎲'} ${dates.join(' to ')}`,
        excerpt,
        wordCount,
        tags,
        mood: data.mood,
        agent,
      };
      
      entries.push(entry);
      
      // Map each date in range to calendar
      for (const d of dates) {
        if (!calendar[d]) {
          calendar[d] = { hasEntry: true, wordCount: 0, tags: [], agents: [] };
        }
        calendar[d].wordCount += wordCount;
        calendar[d].tags = [...new Set([...calendar[d].tags, ...tags])];
        if (!calendar[d].agents.includes(agent)) {
          calendar[d].agents.push(agent);
        }
      }
    }
  }
  
  // Sort by date descending
  entries.sort((a, b) => b.date.localeCompare(a.date));
  
  return NextResponse.json({ 
    entries, 
    calendar,
    agents: AGENTS,
  });
}
