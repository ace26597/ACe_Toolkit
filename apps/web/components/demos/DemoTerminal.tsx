'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Terminal, User, Bot, Wrench, CheckCircle } from 'lucide-react';

export interface DemoStep {
  type: 'user' | 'assistant' | 'tool' | 'result';
  content?: string;
  thinking?: string;
  tool?: string;
  input?: string;
  output?: string;
  summary?: string;
}

export interface Demo {
  id: string;
  vertical: string;
  title: string;
  description: string;
  duration: string;
  tags: string[];
  steps: DemoStep[];
  tools_used: string[];
}

interface DemoTerminalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  demo: any; // Accept any JSON import, we'll cast internally
  autoPlay?: boolean;
  speed?: number; // ms between characters
}

export function DemoTerminal({ demo: demoInput, autoPlay = false, speed = 20 }: DemoTerminalProps) {
  // Cast the demo to our type
  const demo = demoInput as Demo;
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isComplete, setIsComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get content for current step
  const getStepContent = (step: DemoStep): string => {
    switch (step.type) {
      case 'user':
        return step.content || '';
      case 'assistant':
        return step.content || '';
      case 'tool':
        return `${step.tool}\n${step.output || ''}`;
      case 'result':
        return step.summary || '';
      default:
        return '';
    }
  };

  // Typewriter effect
  useEffect(() => {
    if (!isPlaying || currentStep >= demo.steps.length) {
      if (currentStep >= demo.steps.length) {
        setIsComplete(true);
      }
      return;
    }

    const step = demo.steps[currentStep];
    const fullContent = getStepContent(step);

    if (displayedContent.length < fullContent.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedContent(fullContent.slice(0, displayedContent.length + 1));
      }, speed);
    } else {
      // Move to next step after a pause
      timeoutRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setDisplayedContent('');
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, currentStep, displayedContent, demo.steps, speed]);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayedContent, currentStep]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setDisplayedContent('');
    setIsComplete(false);
    setIsPlaying(false);
  };

  const handleSkip = () => {
    setCurrentStep(demo.steps.length);
    setIsComplete(true);
    setIsPlaying(false);
  };

  // Render completed steps
  const renderCompletedSteps = () => {
    return demo.steps.slice(0, currentStep).map((step, i) => (
      <div key={i} className="mb-4">
        {renderStep(step, getStepContent(step))}
      </div>
    ));
  };

  // Render a single step
  const renderStep = (step: DemoStep, content: string) => {
    switch (step.type) {
      case 'user':
        return (
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
              <User className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <span className="text-blue-400 font-medium text-sm">You</span>
              <p className="text-slate-200 mt-1">{content}</p>
            </div>
          </div>
        );

      case 'assistant':
        return (
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-purple-400 font-medium text-sm">Claude</span>
              {step.thinking && (
                <p className="text-slate-500 text-sm italic mt-1">{step.thinking}</p>
              )}
              <div className="text-slate-300 mt-1 prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
              </div>
            </div>
          </div>
        );

      case 'tool':
        return (
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-amber-400 font-medium text-sm font-mono">{step.tool}</span>
              {step.input && (
                <div className="mt-1 bg-slate-800/50 rounded px-2 py-1 font-mono text-xs text-slate-400">
                  {step.input}
                </div>
              )}
              {step.output && (
                <div className="mt-2 bg-slate-900/50 rounded p-2 font-mono text-xs text-slate-400 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{step.output}</pre>
                </div>
              )}
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <span className="text-green-400 font-medium text-sm">Result</span>
              <p className="text-green-300 mt-1 font-medium">{content}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 text-sm font-medium">{demo.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{demo.duration}</span>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-slate-400" />
            ) : (
              <Play className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2 flex-wrap">
        {demo.tags.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="p-4 h-96 overflow-y-auto font-mono text-sm"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Completed steps */}
        {renderCompletedSteps()}

        {/* Current step being typed */}
        {currentStep < demo.steps.length && (
          <div className="mb-4">
            {renderStep(demo.steps[currentStep], displayedContent)}
            <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1" />
          </div>
        )}

        {/* Completion message */}
        {isComplete && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Demo complete</span>
              <button
                onClick={handleReset}
                className="ml-auto text-blue-400 hover:text-blue-300 transition-colors"
              >
                Watch again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${((currentStep + (displayedContent.length / (getStepContent(demo.steps[currentStep] || { type: 'user', content: '' }) || ' ').length)) / demo.steps.length) * 100}%`
          }}
        />
      </div>
    </div>
  );
}

export default DemoTerminal;
