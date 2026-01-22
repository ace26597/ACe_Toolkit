"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Puzzle, Server, Cpu, BookOpen, Upload, Play, Sparkles, Github, FileCode, Wrench } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';

function CustomizeC3Content() {
  const [selectedType, setSelectedType] = useState<'skill' | 'plugin' | 'mcp' | 'agent' | null>(null);

  const extensionTypes = [
    {
      id: 'skill' as const,
      name: 'Skill',
      icon: Sparkles,
      color: 'emerald',
      description: 'Create a new skill for Claude Code - a focused capability for specific tasks',
      examples: ['Data analysis skill', 'API integration skill', 'File processing skill'],
    },
    {
      id: 'plugin' as const,
      name: 'Plugin',
      icon: Puzzle,
      color: 'purple',
      description: 'Build a plugin with multiple skills, agents, and custom workflows',
      examples: ['Scientific research plugin', 'DevOps automation plugin', 'Content creation plugin'],
    },
    {
      id: 'mcp' as const,
      name: 'MCP Server',
      icon: Server,
      color: 'blue',
      description: 'Create a Model Context Protocol server for database or API access',
      examples: ['Database connector', 'REST API bridge', 'File system server'],
    },
    {
      id: 'agent' as const,
      name: 'Agent',
      icon: Cpu,
      color: 'amber',
      description: 'Design an autonomous agent with specialized reasoning and tools',
      examples: ['Research agent', 'Code review agent', 'Data pipeline agent'],
    },
  ];

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; hover: string }> = {
      emerald: {
        border: selected ? 'border-emerald-500' : 'border-emerald-200 dark:border-emerald-800',
        bg: selected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-white dark:bg-gray-800',
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:border-emerald-400',
      },
      purple: {
        border: selected ? 'border-purple-500' : 'border-purple-200 dark:border-purple-800',
        bg: selected ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-white dark:bg-gray-800',
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:border-purple-400',
      },
      blue: {
        border: selected ? 'border-blue-500' : 'border-blue-200 dark:border-blue-800',
        bg: selected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800',
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:border-blue-400',
      },
      amber: {
        border: selected ? 'border-amber-500' : 'border-amber-200 dark:border-amber-800',
        bg: selected ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-white dark:bg-gray-800',
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:border-amber-400',
      },
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
          <h1 className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Customize C3
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Extend Claude Code Capabilities
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create custom skills, plugins, MCP servers, and agents for C3 Researcher.
            Claude will help you research existing solutions, fetch latest documentation,
            and guide you through the creation process.
          </p>
        </div>

        {/* Extension Type Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            What do you want to create?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {extensionTypes.map((type) => {
              const colors = getColorClasses(type.color, selectedType === type.id);
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg} ${colors.hover} transition-all text-left`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                    <span className="font-semibold text-gray-900 dark:text-white">{type.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {type.description}
                  </p>
                  <div className="space-y-1">
                    {type.examples.map((ex, i) => (
                      <div key={i} className="text-xs text-gray-500 dark:text-gray-500">
                        • {ex}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Section */}
        {selectedType && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Start Creating Your {extensionTypes.find(t => t.id === selectedType)?.name}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Start Fresh */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Start Fresh</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Open a Claude Code session with specialized guidance for creating {selectedType}s.
                  Claude will research existing options and help you build from scratch.
                </p>
                <Link
                  href={`/workspace?mode=customize&type=${selectedType}`}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Session
                </Link>
              </div>

              {/* Option 2: From Example */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Github className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-gray-900 dark:text-white">From Template</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Clone an existing {selectedType} template from GitHub and customize it.
                  Great for learning the structure and best practices.
                </p>
                <Link
                  href={`/workspace?mode=customize&type=${selectedType}&template=true`}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FileCode className="w-4 h-4" />
                  Use Template
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Resources Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Documentation & Resources
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://docs.anthropic.com/en/docs/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Claude Code Docs</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Official Claude Code documentation</p>
            </a>

            <a
              href="https://modelcontextprotocol.io/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">MCP Specification</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Model Context Protocol docs</p>
            </a>

            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Claude Code GitHub</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Examples and community plugins</p>
            </a>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <strong>How it works:</strong> When you start a session, Claude Code will have a specialized CLAUDE.md
            focused on extension development. It will help you research existing solutions, understand the architecture,
            fetch latest documentation, and guide you through creating production-ready extensions.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function CustomizeC3Page() {
  return (
    <ProtectedRoute>
      <CustomizeC3Content />
    </ProtectedRoute>
  );
}
