import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DIARY_BASE = path.join(process.cwd(), 'data/diary');
const AGENTS = ['alfred', 'pip'];

interface EntryResult {
  agent: string;
  file: string;
  content: string;
}

function findEntriesForDate(targetDate: string): EntryResult[] {
  const results: EntryResult[] = [];
  
  for (const agent of AGENTS) {
    const diaryDir = path.join(DIARY_BASE, agent);
    if (!fs.existsSync(diaryDir)) continue;
    
    const files = fs.readdirSync(diaryDir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      // Check exact match
      if (file === `${targetDate}.md`) {
        results.push({ 
          agent, 
          file, 
          content: fs.readFileSync(path.join(diaryDir, file), 'utf-8') 
        });
        continue;
      }
      
      // Check range format (2026-02-01-to-06.md)
      const rangeMatch = file.match(/(\d{4}-\d{2}-(\d{2}))-to-(\d{2})\.md/);
      if (rangeMatch) {
        const [, startDate, startDay, endDay] = rangeMatch;
        const [targetYear, targetMonth, targetDay] = targetDate.split('-');
        const [startYear, startMonth] = startDate.split('-');
        
        if (targetYear === startYear && targetMonth === startMonth) {
          const day = parseInt(targetDay);
          if (day >= parseInt(startDay) && day <= parseInt(endDay)) {
            results.push({ 
              agent, 
              file, 
              content: fs.readFileSync(path.join(diaryDir, file), 'utf-8') 
            });
          }
        }
      }
    }
  }
  
  return results;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }
  
  const results = findEntriesForDate(date);
  
  if (results.length === 0) {
    return NextResponse.json({ error: 'No entry for this date', date }, { status: 404 });
  }
  
  // Return all entries for this date (could be both Alfred and Pip)
  const entries = results.map(({ agent, file, content: rawContent }) => {
    const { data, content } = matter(rawContent);
    return {
      agent,
      file,
      title: data.title || `${agent === 'alfred' ? '🧠 Alfred' : '🎲 Pip'}: ${date}`,
      content,
      frontmatter: data,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  });
  
  return NextResponse.json({
    date,
    entries,
    count: entries.length,
  });
}
