'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface DemoLine {
  type: 'input' | 'output' | 'success' | 'info' | 'thinking' | 'error';
  text: string;
  delay?: number;
}

// Accurate demo scripts based on actual project data
const demoScripts: Record<string, DemoLine[]> = {
  'remotion-videos': [
    { type: 'input', text: '$ claude "Create an explainer video about Claude Code"', delay: 0 },
    { type: 'thinking', text: '● Loading /remotion-best-practices skill...', delay: 600 },
    { type: 'output', text: '  Skill loaded: TransitionSeries, spring animations', delay: 400 },
    { type: 'thinking', text: '● Researching Claude Code features...', delay: 500 },
    { type: 'output', text: '  Topics: MCP, Skills, Plugins, Agents, Hooks', delay: 400 },
    { type: 'thinking', text: '● Designing 8 scenes with transitions...', delay: 500 },
    { type: 'output', text: '  Scene 1: Hook - "What is Claude Code?"', delay: 300 },
    { type: 'output', text: '  Scene 2: MCP Servers - 34 integrations', delay: 250 },
    { type: 'output', text: '  Scene 3: Skills - 145+ capabilities', delay: 250 },
    { type: 'output', text: '  Scene 4: Plugins - Extensibility', delay: 250 },
    { type: 'thinking', text: '● Writing React/Remotion components...', delay: 500 },
    { type: 'output', text: '  Created: src/ClaudeCodeExplainer/', delay: 300 },
    { type: 'output', text: '  Components: 12 scene files + animations', delay: 300 },
    { type: 'thinking', text: '● Rendering video @ 30fps...', delay: 600 },
    { type: 'output', text: '  Progress: [████████████████████] 100%', delay: 800 },
    { type: 'success', text: '✓ Created claude-code-explainer.mp4 (18.5 MB)', delay: 400 },
    { type: 'info', text: '  Duration: 45s | Scenes: 8 | Transitions: flip, slide, wipe', delay: 300 },
  ],
  'clawdbot-research': [
    { type: 'input', text: '$ claude "Research Clawdbot - comprehensive dossier"', delay: 0 },
    { type: 'thinking', text: '● Searching web for Clawdbot information...', delay: 600 },
    { type: 'output', text: '  Found: GitHub (17K+ stars), docs, community', delay: 400 },
    { type: 'thinking', text: '● Analyzing architecture...', delay: 500 },
    { type: 'output', text: '  Core: Node.js + 565 skills ecosystem', delay: 350 },
    { type: 'output', text: '  Integration: VS Code, CLI, API modes', delay: 300 },
    { type: 'thinking', text: '● Documenting security model...', delay: 500 },
    { type: 'output', text: '  Permissions: file access, network, exec', delay: 300 },
    { type: 'thinking', text: '● Comparing with alternatives...', delay: 500 },
    { type: 'output', text: '  vs Claude Code, ChatGPT, Auto-GPT, Cursor', delay: 350 },
    { type: 'thinking', text: '● Generating project ideas...', delay: 400 },
    { type: 'output', text: '  Ideas: 27 integration projects identified', delay: 300 },
    { type: 'thinking', text: '● Writing documentation...', delay: 500 },
    { type: 'success', text: '✓ Created 00-index.md (table of contents)', delay: 300 },
    { type: 'success', text: '✓ Created 01-overview.md to 16-templates.md', delay: 250 },
    { type: 'success', text: '✓ Created MARKETPLACES.md (skills ecosystem)', delay: 250 },
    { type: 'info', text: '  Total: 16 documents | ~100KB | 50+ topics', delay: 300 },
  ],
  'deep-past-challenge': [
    { type: 'input', text: '$ claude "Develop strategy for Akkadian translation"', delay: 0 },
    { type: 'thinking', text: '● Loading competition data...', delay: 500 },
    { type: 'output', text: '  Train: 4,988 texts | Test: 1 document', delay: 400 },
    { type: 'output', text: '  Prize: $50,000 | Deadline: Mar 2026', delay: 300 },
    { type: 'thinking', text: '● Analyzing Akkadian linguistics...', delay: 600 },
    { type: 'output', text: '  Logograms: 20.9% of test tokens', delay: 350 },
    { type: 'output', text: '  Lexicon coverage: 57.6% tokens', delay: 300 },
    { type: 'thinking', text: '● Testing dictionary baseline...', delay: 500 },
    { type: 'output', text: '  Dictionary lookup: score 25.49', delay: 350 },
    { type: 'thinking', text: '● Testing fuzzy matching...', delay: 500 },
    { type: 'output', text: '  Pure fuzzy: score 25.85 (best non-neural)', delay: 350 },
    { type: 'thinking', text: '● Training hybrid model...', delay: 600 },
    { type: 'output', text: '  mT5-small: 12.90 (underperforms)', delay: 300 },
    { type: 'output', text: '  ByT5-small: 7.54 (overfitting)', delay: 300 },
    { type: 'success', text: '✓ Hybrid+Neural: score 25.87 (BEST)', delay: 400 },
    { type: 'info', text: '  Key insight: Only 15-31% needs neural translation', delay: 350 },
    { type: 'success', text: '✓ Created STRATEGIC_APPROACH.md (23.6 KB)', delay: 300 },
  ],
  'agentic-workflows': [
    { type: 'input', text: '$ claude "Analyze GPT-Researcher vs DeerFlow architectures"', delay: 0 },
    { type: 'thinking', text: '● Fetching source code...', delay: 500 },
    { type: 'output', text: '  GPT-Researcher: Master-Detail graph pattern', delay: 400 },
    { type: 'output', text: '  DeerFlow: Single StateGraph pattern', delay: 350 },
    { type: 'thinking', text: '● Analyzing state schemas...', delay: 500 },
    { type: 'output', text: '  GPT-R: AgentState with 15+ fields', delay: 300 },
    { type: 'output', text: '  DeerFlow: State with 8 typed fields', delay: 300 },
    { type: 'thinking', text: '● Comparing edge routing...', delay: 500 },
    { type: 'output', text: '  Conditional routing vs Command-based', delay: 350 },
    { type: 'thinking', text: '● Documenting parallelism strategies...', delay: 500 },
    { type: 'output', text: '  GPT-R: Send() API for parallel research', delay: 300 },
    { type: 'output', text: '  DeerFlow: asyncio.gather() pattern', delay: 300 },
    { type: 'thinking', text: '● Creating architecture diagrams...', delay: 500 },
    { type: 'output', text: '  Mermaid diagrams: 10+ flowcharts', delay: 350 },
    { type: 'success', text: '✓ Created agentic-workflow-analysis.md (36 KB)', delay: 400 },
    { type: 'success', text: '✓ Created research-frameworks-analysis.md (11 KB)', delay: 300 },
    { type: 'info', text: '  Code examples: 50+ | Diagrams: 10+', delay: 300 },
  ],
  'ultron-solar': [
    { type: 'input', text: '$ claude "Build website for Ultron Power Systems"', delay: 0 },
    { type: 'thinking', text: '● Scaffolding Next.js project...', delay: 500 },
    { type: 'output', text: '  Framework: Next.js 14 + Tailwind CSS', delay: 400 },
    { type: 'thinking', text: '● Creating page structure...', delay: 500 },
    { type: 'output', text: '  Pages: Home, About, Services, Products, Blog', delay: 350 },
    { type: 'output', text: '  Components: Header, Footer, ContactForm', delay: 300 },
    { type: 'thinking', text: '● Writing SEO blog articles...', delay: 600 },
    { type: 'output', text: '  Article 1: "Solar Panel Installation Guide"', delay: 300 },
    { type: 'output', text: '  Article 2: "Solar Subsidies in Maharashtra"', delay: 280 },
    { type: 'output', text: '  Article 3: "Net Metering Explained"', delay: 280 },
    { type: 'output', text: '  ... 9 more articles', delay: 250 },
    { type: 'thinking', text: '● Generating documentation...', delay: 500 },
    { type: 'output', text: '  Architecture diagrams, user flows', delay: 350 },
    { type: 'thinking', text: '● Configuring Vercel deployment...', delay: 400 },
    { type: 'success', text: '✓ Deployed to ultronsolar.in', delay: 400 },
    { type: 'info', text: '  Pages: 10+ | Blog: 12 articles | Docs: 4 files', delay: 300 },
  ],
  'trading-tracker': [
    { type: 'input', text: '$ claude "Create crypto portfolio tracker"', delay: 0 },
    { type: 'thinking', text: '● Fetching current prices...', delay: 500 },
    { type: 'output', text: '  BTC: $82,322 | ETH: $2,743 | SOL: $115', delay: 400 },
    { type: 'thinking', text: '● Calculating portfolio value...', delay: 400 },
    { type: 'output', text: '  BTC: 0.0158 × $82,322 = $1,299.62', delay: 300 },
    { type: 'output', text: '  ETH: 0.294 × $2,743 = $805.28', delay: 280 },
    { type: 'output', text: '  SOL: 0.778 × $115 = $89.18', delay: 280 },
    { type: 'output', text: '  USDC: $642.30 reserve', delay: 250 },
    { type: 'success', text: '✓ Total Portfolio: $2,836.38 (+2.7%)', delay: 400 },
    { type: 'thinking', text: '● Fetching Fear & Greed Index...', delay: 400 },
    { type: 'output', text: '  Market Sentiment: 😱 Extreme Fear (16)', delay: 350 },
    { type: 'thinking', text: '● Checking swing trade status...', delay: 400 },
    { type: 'output', text: '  SOL swing: Entry $127 → Current $115 (-9.73%)', delay: 350 },
    { type: 'output', text: '  Stop loss: $114.00 | Target: $140', delay: 300 },
    { type: 'success', text: '✓ Updated Trading_data.md', delay: 400 },
    { type: 'info', text: '  Auto-updates via Alfred automation', delay: 300 },
  ],
  'data-studio': [
    { type: 'input', text: '$ claude "Analyze benchmark.json and create dashboard"', delay: 0 },
    { type: 'thinking', text: '● Loading /data-studio-analyst skill...', delay: 500 },
    { type: 'output', text: '  Skill loaded: pandas, plotly, analysis', delay: 400 },
    { type: 'thinking', text: '● Reading benchmark.json (478 KB)...', delay: 500 },
    { type: 'output', text: '  Found: MongoDB performance metrics', delay: 350 },
    { type: 'output', text: '  Rows: 12,847 | Columns: 8', delay: 300 },
    { type: 'thinking', text: '● Analyzing patterns...', delay: 500 },
    { type: 'output', text: '  Identified: latency spikes, throughput trends', delay: 350 },
    { type: 'thinking', text: '● Generating visualizations...', delay: 500 },
    { type: 'output', text: '  Chart 1: Latency distribution (histogram)', delay: 300 },
    { type: 'output', text: '  Chart 2: Throughput over time (line)', delay: 280 },
    { type: 'output', text: '  Chart 3: Operations breakdown (pie)', delay: 280 },
    { type: 'output', text: '  Chart 4: P95/P99 latencies (bar)', delay: 280 },
    { type: 'thinking', text: '● Building dashboard...', delay: 400 },
    { type: 'success', text: '✓ Created .dashboards/benchmark_dashboard.json', delay: 400 },
    { type: 'success', text: '✓ Dashboard ready with 5 interactive widgets', delay: 300 },
    { type: 'info', text: '  NLP editing enabled: "Add a pie chart for..."', delay: 300 },
  ],
};

interface ShowcaseDemoProps {
  projectId: string;
  className?: string;
}

export function ShowcaseDemo({ projectId, className = '' }: ShowcaseDemoProps) {
  const script = demoScripts[projectId] || demoScripts['remotion-videos'];
  const [lines, setLines] = useState<DemoLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset when projectId changes
    setLines([]);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [projectId]);

  useEffect(() => {
    if (!isPlaying || currentIndex >= script.length) {
      if (currentIndex >= script.length) {
        const timeout = setTimeout(() => {
          setLines([]);
          setCurrentIndex(0);
        }, 4000);
        return () => clearTimeout(timeout);
      }
      return;
    }

    const line = script[currentIndex];
    const timeout = setTimeout(() => {
      setLines(prev => [...prev, line]);
      setCurrentIndex(prev => prev + 1);

      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, line.delay || 300);

    return () => clearTimeout(timeout);
  }, [isPlaying, currentIndex, script]);

  const restart = () => {
    setLines([]);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const getLineClass = (type: DemoLine['type']) => {
    switch (type) {
      case 'input': return 'text-cyan-400 font-medium';
      case 'output': return 'text-slate-400';
      case 'success': return 'text-green-400';
      case 'info': return 'text-slate-500';
      case 'thinking': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/80 ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-slate-500 ml-2">claude-code — project</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <button
            onClick={restart}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="p-4 h-64 overflow-y-auto font-mono text-sm leading-relaxed"
      >
        {lines.map((line, i) => (
          <div key={i} className={getLineClass(line.type)}>
            {line.type === 'thinking' && (
              <span className="inline-block animate-pulse">{line.text}</span>
            )}
            {line.type !== 'thinking' && line.text}
          </div>
        ))}
        {isPlaying && currentIndex < script.length && (
          <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {currentIndex >= script.length ? 'Demo complete' : 'Live recreation'}
        </span>
        <span className="text-xs text-slate-600">
          {Math.min(currentIndex, script.length)}/{script.length}
        </span>
      </div>
    </div>
  );
}
