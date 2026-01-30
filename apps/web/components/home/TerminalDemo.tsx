'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface DemoLine {
  type: 'input' | 'output' | 'success' | 'info' | 'thinking';
  text: string;
  delay?: number; // ms before showing this line
}

const demoScript: DemoLine[] = [
  { type: 'input', text: '$ claude "Analyze sales.csv - identify top products, best', delay: 0 },
  { type: 'input', text: '  performing months, and customer segments. Create an', delay: 50 },
  { type: 'input', text: '  executive summary report with charts."', delay: 50 },
  { type: 'thinking', text: '● Reading sales.csv...', delay: 800 },
  { type: 'output', text: '  Found 12,847 rows, 8 columns', delay: 400 },
  { type: 'output', text: '  Date range: Jan 2024 - Dec 2025', delay: 300 },
  { type: 'thinking', text: '● Analyzing revenue patterns...', delay: 600 },
  { type: 'output', text: '  Top product: Widget Pro ($2.4M revenue)', delay: 400 },
  { type: 'output', text: '  Best month: November 2025 (+47% YoY)', delay: 300 },
  { type: 'output', text: '  Customer segments: Enterprise 62%, SMB 38%', delay: 300 },
  { type: 'thinking', text: '● Generating visualizations...', delay: 500 },
  { type: 'success', text: '✓ Created report.md with executive summary', delay: 400 },
  { type: 'success', text: '✓ Created charts/revenue_by_month.png', delay: 300 },
  { type: 'success', text: '✓ Created charts/customer_segments.png', delay: 300 },
  { type: 'info', text: '', delay: 400 },
  { type: 'input', text: '$ claude "Convert report.md to PowerPoint. Use modern', delay: 1000 },
  { type: 'input', text: '  business template, include all charts, add speaker', delay: 50 },
  { type: 'input', text: '  notes for each slide."', delay: 50 },
  { type: 'thinking', text: '● Loading /pptx skill...', delay: 600 },
  { type: 'output', text: '  Template: business-modern', delay: 400 },
  { type: 'thinking', text: '● Building presentation...', delay: 500 },
  { type: 'output', text: '  Slide 1: Executive Summary', delay: 300 },
  { type: 'output', text: '  Slide 2: Revenue Trends (with chart)', delay: 250 },
  { type: 'output', text: '  Slide 3: Top Products Analysis', delay: 250 },
  { type: 'output', text: '  Slide 4: Customer Segmentation', delay: 250 },
  { type: 'output', text: '  Slide 5: Key Recommendations', delay: 250 },
  { type: 'success', text: '✓ Created Sales_Report_2025.pptx', delay: 400 },
  { type: 'info', text: '  5 slides with speaker notes', delay: 300 },
];

export function TerminalDemo() {
  const [lines, setLines] = useState<DemoLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying || currentIndex >= demoScript.length) {
      if (currentIndex >= demoScript.length) {
        // Auto-restart after 3 seconds
        const timeout = setTimeout(() => {
          setLines([]);
          setCurrentIndex(0);
        }, 3000);
        return () => clearTimeout(timeout);
      }
      return;
    }

    const line = demoScript[currentIndex];
    const timeout = setTimeout(() => {
      setLines(prev => [...prev, line]);
      setCurrentIndex(prev => prev + 1);

      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, line.delay || 300);

    return () => clearTimeout(timeout);
  }, [isPlaying, currentIndex]);

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
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/80 backdrop-blur shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-slate-500 ml-2 hidden sm:inline">claude-code — workspace</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
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
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="p-4 h-64 sm:h-72 overflow-y-auto font-mono text-sm leading-relaxed"
      >
        {lines.map((line, i) => (
          <div key={i} className={`${getLineClass(line.type)} ${line.type === 'info' ? 'h-4' : ''}`}>
            {line.type === 'thinking' && (
              <span className="inline-block animate-pulse">{line.text}</span>
            )}
            {line.type !== 'thinking' && line.text}
          </div>
        ))}
        {isPlaying && currentIndex < demoScript.length && (
          <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5" />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {currentIndex >= demoScript.length ? 'Demo complete • Restarting...' : 'Live demo simulation'}
        </span>
        <span className="text-xs text-slate-600">
          {Math.min(currentIndex, demoScript.length)}/{demoScript.length}
        </span>
      </div>
    </div>
  );
}
