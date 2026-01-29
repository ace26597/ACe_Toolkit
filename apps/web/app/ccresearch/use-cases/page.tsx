"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FlaskConical,
  Cpu,
  Globe,
  Code,
  FileText,
  Microscope,
  Dna,
  Pill,
  Brain,
  BarChart3,
  Sparkles,
  Terminal,
  Search,
  Play,
  Server,
  Wrench,
  Palette,
  GitBranch,
  Upload,
  FileUp
} from 'lucide-react';

// Import data from JSON
import useCasesData from '@/data/ccresearch/use-cases.json';
import capabilitiesData from '@/data/ccresearch/capabilities.json';

// Types
interface UseCaseExample {
  id: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  skill?: string;
  mcp?: string;
  plugin?: string;
  output?: string;
  verified?: boolean;
}

interface CategorySection {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  description: string;
  examples: UseCaseExample[];
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Database: <Database className="w-5 h-5" />,
  Dna: <Dna className="w-5 h-5" />,
  Pill: <Pill className="w-5 h-5" />,
  Brain: <Brain className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Server: <Server className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Code: <Code className="w-5 h-5" />,
  Upload: <Upload className="w-5 h-5" />,
  FileUp: <FileUp className="w-5 h-5" />,
};

const colorMap: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  pink: 'text-pink-400',
  purple: 'text-purple-400',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  emerald: 'text-emerald-400',
};

// Copy button component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-gray-700 transition-colors"
      title="Copy prompt"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
};

// Example card component
const ExampleCard: React.FC<{ example: UseCaseExample }> = ({ example }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white">{example.title}</h4>
              {example.verified && (
                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">{example.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {example.skill && (
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                  Skill: {example.skill}
                </span>
              )}
              {example.mcp && (
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                  MCP: {example.mcp}
                </span>
              )}
              {example.plugin && (
                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded">
                  Plugin: {example.plugin}
                </span>
              )}
              {example.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-600/50 text-gray-300 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt box */}
        <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
          <div className="flex items-start justify-between gap-2">
            <code className="text-green-400 whitespace-pre-wrap break-words flex-1">
              {example.prompt}
            </code>
            <CopyButton text={example.prompt} />
          </div>
        </div>

        {/* Expandable output section */}
        {example.output && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>View example output</span>
            </button>
            {expanded && (
              <div className="mt-2 bg-gray-900/50 rounded-lg p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {example.output}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Category section component
const CategoryCard: React.FC<{ section: CategorySection; defaultOpen?: boolean }> = ({ section, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const icon = iconMap[section.icon] || <Database className="w-5 h-5" />;
  const colorClass = colorMap[section.iconColor] || 'text-gray-400';

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gray-700/50 rounded-lg ${colorClass}`}>
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            <p className="text-sm text-gray-400">{section.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{section.examples.length} examples</span>
          {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 grid gap-4 md:grid-cols-2">
          {section.examples.map(example => (
            <ExampleCard key={example.id} example={example} />
          ))}
        </div>
      )}
    </div>
  );
};

// Main page component
export default function UseCasesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Load categories from JSON
  const categories: CategorySection[] = useCasesData.categories;
  const stats = capabilitiesData.stats;

  // Filter examples based on search
  const filteredCategories = categories.map(cat => ({
    ...cat,
    examples: cat.examples.filter(ex =>
      searchQuery === '' ||
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ex.skill && ex.skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ex.mcp && ex.mcp.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ex.plugin && ex.plugin.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(cat => cat.examples.length > 0);

  const totalExamples = categories.reduce((sum, cat) => sum + cat.examples.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/workspace"
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-6 h-6 text-blue-400" />
                  C3 Researcher Use Cases
                </h1>
                <p className="text-sm text-gray-400">
                  {totalExamples} example prompts across {categories.length} categories
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Updated: {useCasesData.lastUpdated}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search examples, skills, MCP servers, plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Scientific Skills</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalSkills}+</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Server className="w-4 h-4" />
              <span className="text-sm font-medium">MCP Servers</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalMcpServers}</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Wrench className="w-4 h-4" />
              <span className="text-sm font-medium">Plugins</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalPlugins}</p>
          </div>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Databases</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalDatabases}+</p>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-4">
          {filteredCategories.map((section, index) => (
            <CategoryCard
              key={section.id}
              section={section}
              defaultOpen={index === 0}
            />
          ))}
        </div>

        {/* No results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No matching examples</h3>
            <p className="text-gray-400">Try a different search term</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            These examples demonstrate C3 Researcher Workspace capabilities. Copy prompts and use them in the terminal.
          </p>
          <p className="mt-2">
            <span className="text-green-400">Verified</span> examples have been tested and confirmed working.
          </p>
          <p className="mt-4 text-xs">
            Data source: <code className="bg-gray-800 px-1 rounded">apps/web/data/ccresearch/</code>
          </p>
        </div>
      </main>
    </div>
  );
}
