"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Terminal,
  Lightbulb,
  MessageSquare,
  Zap,
  Settings,
  BookOpen,
  AlertTriangle,
  Code,
  Sparkles,
  FileText,
  Server,
  Command,
  Brain,
  GitBranch,
  RefreshCw,
  Target,
  Wrench,
  Search,
  Smartphone,
  Keyboard,
  History,
  Menu
} from 'lucide-react';

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
      title="Copy"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
};

// Code block component
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'bash' }) => (
  <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm my-3">
    <div className="flex items-start justify-between gap-2">
      <code className="text-green-400 whitespace-pre-wrap break-words flex-1">
        {code}
      </code>
      <CopyButton text={code} />
    </div>
  </div>
);

// Tip card component
const TipCard: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'tip' | 'warning' | 'info';
}> = ({ title, children, icon, type = 'tip' }) => {
  const colors = {
    tip: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };
  const iconColors = {
    tip: 'text-green-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[type]}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColors[type]}`}>
          {icon || <Lightbulb className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-2">{title}</h4>
          <div className="text-gray-300 text-sm space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Collapsible section component
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, iconColor, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gray-700/50 rounded-lg ${iconColor}`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Main page component
export default function TipsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                  <BookOpen className="w-6 h-6 text-amber-400" />
                  C3 Researcher Workspace Tips
                </h1>
                <p className="text-sm text-gray-400">
                  Get the most out of Claude Code with these prompting tips
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Quick Overview */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-blue-400" />
            How Claude Code Works
          </h2>
          <div className="text-gray-300 space-y-3">
            <p>
              Claude Code is an <strong>agentic coding assistant</strong> that runs in your terminal. Unlike chat interfaces,
              it can <strong>read files, execute commands, search code, and make changes</strong> directly in your workspace.
            </p>
            <p>
              When you give Claude a task, it will:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Read relevant files to understand context</li>
              <li>Plan the approach (if complex)</li>
              <li>Execute actions (edit files, run commands)</li>
              <li>Verify results and iterate if needed</li>
            </ol>
            <p className="text-sm text-gray-400 mt-3">
              In CCResearch sessions, Claude has access to 140+ scientific skills, 26 MCP servers, and specialized plugins.
            </p>
          </div>
        </div>

        {/* Section 1: Writing Effective Prompts */}
        <Section
          title="Writing Effective Prompts"
          icon={<MessageSquare className="w-5 h-5" />}
          iconColor="text-green-400"
          defaultOpen={true}
        >
          <TipCard title="Be Specific and Detailed" icon={<Target className="w-5 h-5" />}>
            <p>Vague prompts lead to vague results. Include context, constraints, and desired output format.</p>
            <div className="mt-3 space-y-2">
              <p className="text-red-400 text-xs font-medium">BAD:</p>
              <CodeBlock code="check my code" />
              <p className="text-green-400 text-xs font-medium">GOOD:</p>
              <CodeBlock code="Review UserAuth.js for security vulnerabilities, focusing on JWT handling. List any issues found with severity ratings." />
            </div>
          </TipCard>

          <TipCard title="Use Thinking Keywords for Complex Tasks" icon={<Brain className="w-5 h-5" />}>
            <p>For complex problems, use keywords to allocate more computational resources:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="bg-gray-800 px-1.5 rounded text-amber-300">think</code> - Standard analysis</li>
              <li><code className="bg-gray-800 px-1.5 rounded text-amber-300">think hard</code> - Deeper reasoning</li>
              <li><code className="bg-gray-800 px-1.5 rounded text-amber-300">think harder</code> - Extended analysis</li>
              <li><code className="bg-gray-800 px-1.5 rounded text-amber-300">ultrathink</code> - Maximum reasoning effort</li>
            </ul>
            <CodeBlock code="Think hard about the best architecture for a real-time data pipeline that needs to handle 10k events/second" />
          </TipCard>

          <TipCard title="Break Down Large Tasks" icon={<Zap className="w-5 h-5" />}>
            <p>Instead of one massive prompt, break complex tasks into smaller steps:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>First, explore the codebase to understand the structure</li>
              <li>Create a plan and verify it with me</li>
              <li>Implement changes incrementally</li>
              <li>Test and verify each change</li>
            </ol>
          </TipCard>

          <TipCard title="Provide Examples When Possible" icon={<Code className="w-5 h-5" />}>
            <p>If you want a specific format or style, show an example:</p>
            <CodeBlock code={`Create a function similar to this pattern:
\`\`\`python
def process_data(input: pd.DataFrame) -> pd.DataFrame:
    """Process the input data with validation."""
    validate(input)
    result = transform(input)
    return result
\`\`\``} />
          </TipCard>
        </Section>

        {/* Section 2: Using Skills and MCP */}
        <Section
          title="Calling Skills, MCP Servers & Plugins"
          icon={<Sparkles className="w-5 h-5" />}
          iconColor="text-purple-400"
        >
          <TipCard title="Slash Commands for Skills" icon={<Command className="w-5 h-5" />}>
            <p>Skills are invoked with slash commands. Claude will recognize and execute them:</p>
            <CodeBlock code="/pubmed search for CRISPR gene editing papers from 2024" />
            <CodeBlock code="/chembl find compounds that target EGFR with IC50 &lt; 100nM" />
            <CodeBlock code="/aact query clinical trials for pembrolizumab in lung cancer" />
            <p className="text-gray-400 text-xs mt-2">
              Type <code className="bg-gray-800 px-1 rounded">/</code> to see available skills, or ask Claude what skills are available.
            </p>
          </TipCard>

          <TipCard title="MCP Servers for External Data" icon={<Server className="w-5 h-5" />}>
            <p>MCP (Model Context Protocol) servers connect Claude to external data sources:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>PubMed</strong> - Search medical literature</li>
              <li><strong>bioRxiv</strong> - Access preprints</li>
              <li><strong>ChEMBL</strong> - Drug & compound data</li>
              <li><strong>Clinical Trials</strong> - ClinicalTrials.gov data</li>
              <li><strong>Memory</strong> - Persistent knowledge graph</li>
              <li><strong>Playwright</strong> - Browser automation</li>
            </ul>
            <p className="mt-3">Claude automatically uses MCP servers when relevant. You can also be explicit:</p>
            <CodeBlock code="Use the PubMed MCP to find recent meta-analyses on statins and cardiovascular outcomes" />
          </TipCard>

          <TipCard title="Discovering Available Tools" icon={<Search className="w-5 h-5" />}>
            <p>Ask Claude what tools are available for your task:</p>
            <CodeBlock code="What MCP servers and skills do you have for analyzing protein structures?" />
            <CodeBlock code="List the scientific databases I can query" />
            <CodeBlock code="What tools can help me with cheminformatics?" />
          </TipCard>

          <TipCard title="Combining Multiple Tools" icon={<Wrench className="w-5 h-5" />}>
            <p>Claude can chain multiple tools together for complex analyses:</p>
            <CodeBlock code={`Search PubMed for papers on CAR-T therapy in leukemia, then:
1. Extract the key findings from the top 5 papers
2. Query ClinicalTrials.gov for active CAR-T trials
3. Create a summary report comparing research findings with ongoing trials`} />
          </TipCard>
        </Section>

        {/* Section 3: Workflow Best Practices */}
        <Section
          title="Workflow Best Practices"
          icon={<GitBranch className="w-5 h-5" />}
          iconColor="text-cyan-400"
        >
          <TipCard title="Explore-Plan-Execute-Verify Cycle" icon={<RefreshCw className="w-5 h-5" />}>
            <p>For complex tasks, follow this pattern:</p>
            <ol className="list-decimal list-inside mt-2 space-y-2">
              <li><strong>Explore:</strong> "Read the relevant files and understand the current implementation"</li>
              <li><strong>Plan:</strong> "Create a detailed plan for implementing X. Don't write code yet."</li>
              <li><strong>Execute:</strong> "Implement the plan step by step"</li>
              <li><strong>Verify:</strong> "Run the tests and verify everything works"</li>
            </ol>
          </TipCard>

          <TipCard title="Start Fresh for New Topics" icon={<Terminal className="w-5 h-5" />}>
            <p>
              Context is like milk - it's best served fresh. As conversations get longer, performance can degrade.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use <code className="bg-gray-800 px-1.5 rounded text-cyan-300">/clear</code> to start fresh between unrelated tasks</li>
              <li>Create handoff notes before switching topics</li>
              <li>Keep conversations focused on one goal</li>
            </ul>
          </TipCard>

          <TipCard title="Let Claude Read Files First" icon={<FileText className="w-5 h-5" />}>
            <p>Before asking Claude to modify code, let it understand the context:</p>
            <CodeBlock code="Read the files in src/auth/ and understand how authentication works before making any changes" />
            <p className="text-gray-400 text-xs mt-2">
              This prevents Claude from making assumptions and improves the quality of changes.
            </p>
          </TipCard>

          <TipCard title="Use Visual Feedback" icon={<Lightbulb className="w-5 h-5" />}>
            <p>For UI/design tasks, provide visual context:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Upload screenshots or design mocks</li>
              <li>Describe the visual outcome you want</li>
              <li>Ask Claude to verify results match expectations</li>
            </ul>
          </TipCard>
        </Section>

        {/* Section 4: Common Mistakes */}
        <Section
          title="Common Mistakes to Avoid"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor="text-amber-400"
        >
          <TipCard title="Don't Be Too Vague" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Vague prompts lead to misunderstandings and wasted iterations:</p>
            <div className="mt-2 space-y-1">
              <p className="text-red-400 text-xs">AVOID:</p>
              <p className="text-gray-400 italic">"Fix the bug"</p>
              <p className="text-gray-400 italic">"Make it better"</p>
              <p className="text-gray-400 italic">"Add some tests"</p>
            </div>
            <p className="mt-2">Instead, describe what bug, what aspect to improve, or what tests to add.</p>
          </TipCard>

          <TipCard title="Don't Skip File Specification" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Explicitly mention which files Claude should work with:</p>
            <CodeBlock code="Edit src/components/UserProfile.tsx to add a loading state" />
            <p className="text-gray-400 text-xs mt-2">
              Without file paths, Claude may work on the wrong files.
            </p>
          </TipCard>

          <TipCard title="Don't Let Context Bloat" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Long conversations accumulate irrelevant context that can degrade performance:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use <code className="bg-gray-800 px-1.5 rounded">/clear</code> between tasks</li>
              <li>Use <code className="bg-gray-800 px-1.5 rounded">/compact</code> to summarize and reduce context</li>
              <li>Start new sessions for unrelated work</li>
            </ul>
          </TipCard>

          <TipCard title="Don't Over-Supervise OR Under-Supervise" type="info" icon={<Settings className="w-5 h-5" />}>
            <p>Find the right balance:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Over-supervising:</strong> Interrupting every action slows progress</li>
              <li><strong>Under-supervising:</strong> Letting Claude run without checks can lead to wrong directions</li>
            </ul>
            <p className="mt-2">
              Best practice: Set clear expectations upfront, then let Claude work with periodic check-ins.
            </p>
          </TipCard>
        </Section>

        {/* Section 5: Quick Reference */}
        <Section
          title="Quick Reference Commands"
          icon={<Command className="w-5 h-5" />}
          iconColor="text-blue-400"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/help</code>
              <p className="text-gray-400 text-xs mt-1">Show all available commands</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/clear</code>
              <p className="text-gray-400 text-xs mt-1">Clear conversation history</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/compact</code>
              <p className="text-gray-400 text-xs mt-1">Summarize and reduce context</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/mcp</code>
              <p className="text-gray-400 text-xs mt-1">List MCP servers and tools</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/skills</code>
              <p className="text-gray-400 text-xs mt-1">List available skills</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/usage</code>
              <p className="text-gray-400 text-xs mt-1">Check token usage and limits</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/doctor</code>
              <p className="text-gray-400 text-xs mt-1">Diagnose configuration issues</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Escape key</code>
              <p className="text-gray-400 text-xs mt-1">Interrupt Claude's current action</p>
            </div>
          </div>
        </Section>

        {/* Mobile Usage Section */}
        <Section
          title="Using on Mobile Devices"
          icon={<Smartphone className="w-5 h-5" />}
          iconColor="text-emerald-400"
        >
          <TipCard title="Mobile Navigation" icon={<Menu className="w-5 h-5" />}>
            <p>C3 Researcher Workspace is fully responsive for iPhone, Android, and iPad:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Bottom tabs</strong> - Switch between Terminal, Notes, Data, and Files</li>
              <li><strong>Hamburger menu</strong> - Tap to open project sidebar drawer</li>
              <li><strong>Minimum width</strong> - Works on screens 390px+ (iPhone 12 and up)</li>
            </ul>
          </TipCard>

          <TipCard title="Mobile Terminal Input" icon={<Keyboard className="w-5 h-5" />}>
            <p>A special input bar appears below the terminal on mobile devices:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Text input</strong> - Type commands using your soft keyboard</li>
              <li><strong>Ctrl+C button</strong> - Interrupt running processes</li>
              <li><strong>Tab button</strong> - Autocomplete file/command names</li>
              <li><strong>Up/Down arrows</strong> - Navigate command history</li>
              <li><strong>Quick commands</strong> - ls, cd, cat shortcuts</li>
            </ul>
          </TipCard>

          <TipCard title="Command History on Mobile" icon={<History className="w-5 h-5" />}>
            <p>Your command history is saved locally and persists across sessions:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Tap the <strong>History button</strong> to see recent commands</li>
              <li>Tap any command to insert it</li>
              <li>Up to 50 commands are saved</li>
              <li>Works offline - stored in browser localStorage</li>
            </ul>
          </TipCard>

          <TipCard title="State Persistence" icon={<RefreshCw className="w-5 h-5" />}>
            <p>Your workspace state is remembered across page refreshes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Selected project</li>
              <li>Current view (Terminal, Notes, or Data)</li>
              <li>Terminal mode (Claude Code or SSH)</li>
              <li>File browser visibility</li>
            </ul>
            <p className="text-gray-400 text-xs mt-2">
              Switching tabs keeps the terminal connected - no need to restart sessions.
            </p>
          </TipCard>
        </Section>

        {/* Example Prompts Section */}
        <Section
          title="Example Prompts for C3 Researcher"
          icon={<Sparkles className="w-5 h-5" />}
          iconColor="text-pink-400"
        >
          <div className="space-y-3">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Scientific Literature Review</p>
              <CodeBlock code="Search PubMed for recent papers on CRISPR base editing. Summarize the top 5 papers, extract key methods, and create a comparison table." />
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Drug Discovery Research</p>
              <CodeBlock code="Use ChEMBL to find all known inhibitors of JAK2. Filter for IC50 < 100nM, then analyze their structural features and create a summary report." />
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Clinical Trials Analysis</p>
              <CodeBlock code="Query ClinicalTrials.gov for Phase 3 trials of checkpoint inhibitors in melanoma. Create a table comparing primary endpoints, enrollment status, and sponsors." />
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Data Analysis</p>
              <CodeBlock code="Read the CSV file I uploaded. Perform exploratory data analysis, identify correlations, and create visualizations. Save the report as analysis_report.md." />
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Code Generation</p>
              <CodeBlock code="Create a Python script that processes the protein sequences in sequences.fasta, calculates molecular weights, and outputs results to a CSV file." />
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            These tips are compiled from Anthropic's official best practices and community experience.
          </p>
          <p className="mt-2">
            Sources:{' '}
            <a href="https://www.anthropic.com/engineering/claude-code-best-practices" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Anthropic Engineering Blog
            </a>
            {' | '}
            <a href="https://github.com/ykdojo/claude-code-tips" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Claude Code Tips Repo
            </a>
          </p>
          <div className="mt-6">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              <Terminal className="w-4 h-4" />
              Open C3 Researcher Workspace
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
