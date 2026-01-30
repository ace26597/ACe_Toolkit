'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface DemoLine {
  type: 'input' | 'output' | 'success' | 'info' | 'thinking' | 'error';
  text: string;
  delay?: number;
}

// Accurate demo scripts with detailed prompts to teach users
const demoScripts: Record<string, DemoLine[]> = {
  'remotion-videos': [
    { type: 'input', text: '$ claude "Create an explainer video about Claude Code.', delay: 0 },
    { type: 'input', text: '  Cover: MCP servers, skills, plugins, agents, hooks.', delay: 50 },
    { type: 'input', text: '  Style: Professional with smooth transitions.', delay: 50 },
    { type: 'input', text: '  Duration: 45-60 seconds, 8 scenes max."', delay: 50 },
    { type: 'thinking', text: '● Loading /remotion-best-practices skill...', delay: 600 },
    { type: 'output', text: '  Loaded: TransitionSeries, spring animations', delay: 400 },
    { type: 'thinking', text: '● Researching Claude Code features...', delay: 500 },
    { type: 'output', text: '  Topics identified: MCP, Skills, Plugins, Agents, Hooks', delay: 400 },
    { type: 'thinking', text: '● Designing scene structure...', delay: 500 },
    { type: 'output', text: '  Scene 1: Hook - "What is Claude Code?"', delay: 300 },
    { type: 'output', text: '  Scene 2: MCP Servers - 34 integrations', delay: 250 },
    { type: 'output', text: '  Scene 3: Skills - 145+ capabilities', delay: 250 },
    { type: 'output', text: '  Scene 4: Plugins - Extensibility system', delay: 250 },
    { type: 'output', text: '  Scene 5-8: Agents, Hooks, Demo, CTA', delay: 250 },
    { type: 'thinking', text: '● Writing React/Remotion components...', delay: 500 },
    { type: 'output', text: '  Created: src/ClaudeCodeExplainer/', delay: 300 },
    { type: 'output', text: '  Files: 12 scene components + animations', delay: 300 },
    { type: 'thinking', text: '● Rendering video @ 30fps, 1080p...', delay: 600 },
    { type: 'output', text: '  Progress: [████████████████████] 100%', delay: 800 },
    { type: 'success', text: '✓ Created out/claude-code-explainer.mp4', delay: 400 },
    { type: 'info', text: '  8 scenes | Transitions: flip, slide, wipe, fade', delay: 300 },
  ],
  'clawdbot-research': [
    { type: 'input', text: '$ claude "Research Clawdbot AI assistant comprehensively.', delay: 0 },
    { type: 'input', text: '  Create a dossier covering: architecture, installation,', delay: 50 },
    { type: 'input', text: '  security model, skills ecosystem, configuration.', delay: 50 },
    { type: 'input', text: '  Compare with Claude Code, ChatGPT, Auto-GPT.', delay: 50 },
    { type: 'input', text: '  Generate 20+ project integration ideas."', delay: 50 },
    { type: 'thinking', text: '● Searching web for Clawdbot information...', delay: 600 },
    { type: 'output', text: '  Found: GitHub repo (17K+ stars), docs, community', delay: 400 },
    { type: 'thinking', text: '● Analyzing architecture...', delay: 500 },
    { type: 'output', text: '  Core: Node.js runtime + 565 skills ecosystem', delay: 350 },
    { type: 'output', text: '  Modes: VS Code extension, CLI, API server', delay: 300 },
    { type: 'thinking', text: '● Documenting security model...', delay: 500 },
    { type: 'output', text: '  Permissions: file access, network, shell exec', delay: 300 },
    { type: 'output', text: '  Sandboxing options and best practices', delay: 280 },
    { type: 'thinking', text: '● Building comparison matrix...', delay: 500 },
    { type: 'output', text: '  vs Claude Code: skill count, MCP support', delay: 350 },
    { type: 'output', text: '  vs ChatGPT: local vs cloud, privacy', delay: 300 },
    { type: 'output', text: '  vs Auto-GPT: autonomy levels, cost', delay: 300 },
    { type: 'thinking', text: '● Generating project ideas...', delay: 400 },
    { type: 'output', text: '  27 integration projects identified', delay: 300 },
    { type: 'thinking', text: '● Writing documentation...', delay: 500 },
    { type: 'success', text: '✓ Created 00-index.md (table of contents)', delay: 300 },
    { type: 'success', text: '✓ Created 01-overview.md through 16-templates.md', delay: 300 },
    { type: 'success', text: '✓ Created MARKETPLACES.md (skills analysis)', delay: 250 },
    { type: 'info', text: '  16 documents | ~100KB | 50+ topics covered', delay: 300 },
  ],
  'deep-past-challenge': [
    { type: 'input', text: '$ claude "Develop a winning strategy for the Kaggle', delay: 0 },
    { type: 'input', text: '  Deep Past Challenge - translating 4000-year-old', delay: 50 },
    { type: 'input', text: '  Akkadian cuneiform to English. Prize: $50K.', delay: 50 },
    { type: 'input', text: '  Analyze the data, test baselines, identify what', delay: 50 },
    { type: 'input', text: '  percentage needs neural vs rule-based approaches."', delay: 50 },
    { type: 'thinking', text: '● Loading competition data...', delay: 500 },
    { type: 'output', text: '  Train set: 4,988 cuneiform texts', delay: 400 },
    { type: 'output', text: '  Test set: 1 document (spelling variants)', delay: 350 },
    { type: 'thinking', text: '● Analyzing Akkadian linguistics...', delay: 600 },
    { type: 'output', text: '  Logograms in test: 20.9% of tokens', delay: 350 },
    { type: 'output', text: '  Lexicon coverage: 57.6% of test tokens', delay: 300 },
    { type: 'output', text: '  Discovery: Test = Train #406 with variants', delay: 350 },
    { type: 'thinking', text: '● Testing dictionary baseline...', delay: 500 },
    { type: 'output', text: '  Simple dictionary lookup: score 25.49', delay: 350 },
    { type: 'thinking', text: '● Testing fuzzy matching...', delay: 500 },
    { type: 'output', text: '  Pure fuzzy approach: score 25.85', delay: 350 },
    { type: 'thinking', text: '● Evaluating neural models...', delay: 600 },
    { type: 'output', text: '  mT5-small: 12.90 (underperforms baselines)', delay: 300 },
    { type: 'output', text: '  ByT5-small: 7.54 (severe overfitting)', delay: 300 },
    { type: 'thinking', text: '● Building hybrid pipeline...', delay: 500 },
    { type: 'success', text: '✓ Hybrid+Neural: score 25.87 (BEST)', delay: 400 },
    { type: 'info', text: '  Key insight: Only 15-31% needs neural translation', delay: 350 },
    { type: 'success', text: '✓ Created STRATEGIC_APPROACH.md', delay: 300 },
  ],
  'agentic-workflows': [
    { type: 'input', text: '$ claude "Perform deep technical analysis comparing', delay: 0 },
    { type: 'input', text: '  GPT-Researcher and DeerFlow agentic frameworks.', delay: 50 },
    { type: 'input', text: '  Focus on: LangGraph patterns, state schemas,', delay: 50 },
    { type: 'input', text: '  parallelism strategies, human-in-the-loop.', delay: 50 },
    { type: 'input', text: '  Include architecture diagrams in Mermaid."', delay: 50 },
    { type: 'thinking', text: '● Fetching source code from GitHub...', delay: 500 },
    { type: 'output', text: '  GPT-Researcher: Master-Detail graph pattern', delay: 400 },
    { type: 'output', text: '  DeerFlow: Single StateGraph pattern', delay: 350 },
    { type: 'thinking', text: '● Analyzing state schemas...', delay: 500 },
    { type: 'output', text: '  GPT-R: AgentState with 15+ typed fields', delay: 300 },
    { type: 'output', text: '  DeerFlow: Minimal State with 8 fields', delay: 300 },
    { type: 'thinking', text: '● Comparing edge routing strategies...', delay: 500 },
    { type: 'output', text: '  GPT-R: Conditional routing with functions', delay: 350 },
    { type: 'output', text: '  DeerFlow: Command-based routing', delay: 300 },
    { type: 'thinking', text: '● Documenting parallelism patterns...', delay: 500 },
    { type: 'output', text: '  GPT-R: Send() API for parallel research', delay: 300 },
    { type: 'output', text: '  DeerFlow: asyncio.gather() pattern', delay: 300 },
    { type: 'thinking', text: '● Creating Mermaid diagrams...', delay: 500 },
    { type: 'output', text: '  Generated 10+ architecture flowcharts', delay: 350 },
    { type: 'success', text: '✓ Created agentic-workflow-analysis.md', delay: 400 },
    { type: 'success', text: '✓ Created research-frameworks-analysis.md', delay: 300 },
    { type: 'info', text: '  50+ code examples | 10+ diagrams', delay: 300 },
  ],
  'ultron-solar': [
    { type: 'input', text: '$ claude "Build a complete Next.js website for Ultron', delay: 0 },
    { type: 'input', text: '  Power Systems - a solar energy company in Maharashtra.', delay: 50 },
    { type: 'input', text: '  Include: Home, About, Services, Products, Blog pages.', delay: 50 },
    { type: 'input', text: '  Write 12 SEO-optimized blog articles about solar.', delay: 50 },
    { type: 'input', text: '  Generate architecture docs and deploy to Vercel."', delay: 50 },
    { type: 'thinking', text: '● Scaffolding Next.js 14 project...', delay: 500 },
    { type: 'output', text: '  Stack: Next.js 14 + Tailwind CSS + TypeScript', delay: 400 },
    { type: 'thinking', text: '● Creating page structure...', delay: 500 },
    { type: 'output', text: '  Pages: Home, About, Services, Products, Contact', delay: 350 },
    { type: 'output', text: '  Components: Header, Footer, ContactForm, Hero', delay: 300 },
    { type: 'thinking', text: '● Writing SEO blog articles...', delay: 600 },
    { type: 'output', text: '  1. "Solar Panel Installation Guide for Homeowners"', delay: 300 },
    { type: 'output', text: '  2. "Government Solar Subsidies in Maharashtra 2026"', delay: 280 },
    { type: 'output', text: '  3. "Net Metering: How to Sell Power Back to Grid"', delay: 280 },
    { type: 'output', text: '  4. "Commercial Solar: ROI Calculator"', delay: 260 },
    { type: 'output', text: '  ... 8 more articles', delay: 250 },
    { type: 'thinking', text: '● Generating technical documentation...', delay: 500 },
    { type: 'output', text: '  Architecture diagrams, API routes, user flows', delay: 350 },
    { type: 'thinking', text: '● Configuring Vercel deployment...', delay: 400 },
    { type: 'success', text: '✓ Deployed to ultronsolar.in', delay: 400 },
    { type: 'info', text: '  10+ pages | 12 blog articles | 4 doc files', delay: 300 },
  ],
  'trading-tracker': [
    { type: 'input', text: '$ claude "Create a crypto portfolio tracker for my', delay: 0 },
    { type: 'input', text: '  holdings: BTC, ETH, SOL, USDC. Include real-time', delay: 50 },
    { type: 'input', text: '  prices, P&L calculations, Fear & Greed index.', delay: 50 },
    { type: 'input', text: '  Track my SOL swing trade with trailing stop.', delay: 50 },
    { type: 'input', text: '  Define strategy rules for dip buying and exits."', delay: 50 },
    { type: 'thinking', text: '● Fetching current crypto prices...', delay: 500 },
    { type: 'output', text: '  BTC: $82,322 | ETH: $2,743 | SOL: $115', delay: 400 },
    { type: 'thinking', text: '● Calculating portfolio value...', delay: 400 },
    { type: 'output', text: '  BTC: 0.0158 × $82,322 = $1,299.62 (+$132)', delay: 300 },
    { type: 'output', text: '  ETH: 0.294 × $2,743 = $805.28 (-$46)', delay: 280 },
    { type: 'output', text: '  SOL: 0.778 × $115 = $89.18 (-$10)', delay: 280 },
    { type: 'output', text: '  USDC: $642.30 (reserve)', delay: 250 },
    { type: 'success', text: '✓ Total Portfolio: $2,836.38 (+2.7%)', delay: 400 },
    { type: 'thinking', text: '● Fetching market sentiment...', delay: 400 },
    { type: 'output', text: '  Fear & Greed Index: 16 (Extreme Fear)', delay: 350 },
    { type: 'thinking', text: '● Tracking swing trade position...', delay: 400 },
    { type: 'output', text: '  SOL swing: Entry $126.98 → Current $114.62', delay: 350 },
    { type: 'output', text: '  P&L: -9.73% | Stop: $114.00 | Target: $140', delay: 300 },
    { type: 'thinking', text: '● Defining strategy rules...', delay: 400 },
    { type: 'output', text: '  Rule 1: Dip Buy when F&G < 25 or -5% drop', delay: 300 },
    { type: 'output', text: '  Rule 2: Take Profit when F&G > 75', delay: 280 },
    { type: 'output', text: '  Rule 3: Trailing stop at +5% from entry', delay: 280 },
    { type: 'success', text: '✓ Created Trading_data.md', delay: 400 },
    { type: 'info', text: '  Auto-updates via Alfred automation', delay: 300 },
  ],
  'data-studio': [
    { type: 'input', text: '$ claude "Analyze benchmark.json - MongoDB performance', delay: 0 },
    { type: 'input', text: '  metrics. Identify latency patterns, throughput', delay: 50 },
    { type: 'input', text: '  trends, and operation breakdowns. Generate an', delay: 50 },
    { type: 'input', text: '  interactive Plotly dashboard with 5 widgets.', delay: 50 },
    { type: 'input', text: '  Include P95/P99 latency analysis."', delay: 50 },
    { type: 'thinking', text: '● Loading /data-studio-analyst skill...', delay: 500 },
    { type: 'output', text: '  Tools: pandas, plotly, scipy, numpy', delay: 400 },
    { type: 'thinking', text: '● Reading benchmark.json (478 KB)...', delay: 500 },
    { type: 'output', text: '  Detected: MongoDB performance metrics', delay: 350 },
    { type: 'output', text: '  Rows: 12,847 | Columns: 8', delay: 300 },
    { type: 'thinking', text: '● Analyzing data patterns...', delay: 500 },
    { type: 'output', text: '  Found: Latency spikes during peak hours', delay: 350 },
    { type: 'output', text: '  Found: Throughput degradation pattern', delay: 300 },
    { type: 'output', text: '  P95 latency: 245ms | P99: 512ms', delay: 300 },
    { type: 'thinking', text: '● Generating visualizations...', delay: 500 },
    { type: 'output', text: '  Widget 1: Latency distribution (histogram)', delay: 300 },
    { type: 'output', text: '  Widget 2: Throughput over time (line chart)', delay: 280 },
    { type: 'output', text: '  Widget 3: Operations breakdown (pie chart)', delay: 280 },
    { type: 'output', text: '  Widget 4: P95/P99 comparison (bar chart)', delay: 280 },
    { type: 'output', text: '  Widget 5: Hourly heatmap (correlation)', delay: 280 },
    { type: 'thinking', text: '● Building interactive dashboard...', delay: 400 },
    { type: 'success', text: '✓ Created .dashboards/benchmark_dashboard.json', delay: 400 },
    { type: 'info', text: '  5 interactive Plotly widgets | NLP editing enabled', delay: 300 },
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
        className="p-4 h-72 overflow-y-auto font-mono text-sm leading-relaxed"
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
