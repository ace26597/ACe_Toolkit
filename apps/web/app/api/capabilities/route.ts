import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'medresearch-capabilities.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    // Return default data if file not found
    return NextResponse.json({
      version: "2.17.0",
      plugins: { installed: [], summary: { total: 0, active: 0, with_mcp: 0 } },
      mcp_servers: { active: [], summary: { running: 0, available: 0 } },
      scientific_skills: { total: 140, categories: {} },
      security: { sandbox_enabled: true, sandbox_type: "bubblewrap", isolation_features: [] }
    });
  }
}
