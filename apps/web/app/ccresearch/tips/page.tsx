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
      className="p-1.5 rounded hover:bg-slate-700 transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
};

// Code block component
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'bash' }) => (
  <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm my-3">
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
          <div className="text-slate-300 text-sm space-y-2">
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
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-slate-700/50 rounded-lg ${iconColor}`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/workspace"
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-amber-400" />
                  C3 Researcher Workspace Tips
                </h1>
                <p className="text-sm text-slate-400">
                  Get the most out of Claude Code with these prompting tips
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Updated: Jan 2026
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
          <div className="text-slate-300 space-y-3">
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
            <p className="text-sm text-slate-400 mt-3">
              In CCResearch sessions, Claude has access to 145+ scientific skills, 34 MCP servers, and 14 plugins.
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

          <TipCard title="Extended Thinking Modes" icon={<Brain className="w-5 h-5" />}>
            <p>Trigger extended thinking with specific keywords that allocate more tokens:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="bg-slate-800 px-1.5 rounded text-amber-300">think</code> - 4K thinking tokens</li>
              <li><code className="bg-slate-800 px-1.5 rounded text-amber-300">think hard</code> / <code className="bg-slate-800 px-1.5 rounded text-amber-300">megathink</code> - 10K tokens</li>
              <li><code className="bg-slate-800 px-1.5 rounded text-amber-300">ultrathink</code> - 32K tokens (use sparingly)</li>
            </ul>
            <p className="text-slate-400 text-xs mt-2">Best for: architecture decisions, complex debugging, unfamiliar codebases. Note: Uses significant tokens.</p>
            <CodeBlock code="Ultrathink about the best architecture for a real-time data pipeline handling 10k events/second" />
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
            <p className="text-slate-400 text-xs mt-2">
              Type <code className="bg-slate-800 px-1 rounded">/</code> to see available skills, or ask Claude what skills are available.
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
              <li>Use <code className="bg-slate-800 px-1.5 rounded text-cyan-300">/clear</code> to start fresh between unrelated tasks</li>
              <li>Create handoff notes before switching topics</li>
              <li>Keep conversations focused on one goal</li>
            </ul>
          </TipCard>

          <TipCard title="Let Claude Read Files First" icon={<FileText className="w-5 h-5" />}>
            <p>Before asking Claude to modify code, let it understand the context:</p>
            <CodeBlock code="Read the files in src/auth/ and understand how authentication works before making any changes" />
            <p className="text-slate-400 text-xs mt-2">
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

          <TipCard title="Use Subagents for Parallel Work" icon={<Zap className="w-5 h-5" />}>
            <p>Claude can spawn parallel subagents (up to 7 simultaneously) for faster work:</p>
            <CodeBlock code="Use 5 parallel subagents to: 1) Search for auth implementations, 2) Find API endpoints, 3) Check test coverage, 4) Review dependencies, 5) Analyze error handling" />
            <p className="text-slate-400 text-xs mt-2">
              Be explicit: "Use parallel tasks" or "Use 5 subagents" triggers parallelization.
            </p>
          </TipCard>

          <TipCard title="Use CLI Tools for External Services" icon={<Terminal className="w-5 h-5" />}>
            <p>Tell Claude to use CLI tools - they're the most context-efficient way to interact with services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="bg-slate-800 px-1.5 rounded">gh</code> - GitHub (PRs, issues, comments)</li>
              <li><code className="bg-slate-800 px-1.5 rounded">aws</code> / <code className="bg-slate-800 px-1.5 rounded">gcloud</code> - Cloud services</li>
              <li><code className="bg-slate-800 px-1.5 rounded">npm</code> / <code className="bg-slate-800 px-1.5 rounded">pip</code> - Package management</li>
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
              <p className="text-slate-400 italic">"Fix the bug"</p>
              <p className="text-slate-400 italic">"Make it better"</p>
              <p className="text-slate-400 italic">"Add some tests"</p>
            </div>
            <p className="mt-2">Instead, describe what bug, what aspect to improve, or what tests to add.</p>
          </TipCard>

          <TipCard title="Don't Skip File Specification" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Explicitly mention which files Claude should work with:</p>
            <CodeBlock code="Edit src/components/UserProfile.tsx to add a loading state" />
            <p className="text-slate-400 text-xs mt-2">
              Without file paths, Claude may work on the wrong files.
            </p>
          </TipCard>

          <TipCard title="Don't Let Context Bloat" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Long conversations accumulate irrelevant context that can degrade performance:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use <code className="bg-slate-800 px-1.5 rounded">/clear</code> between tasks</li>
              <li>Use <code className="bg-slate-800 px-1.5 rounded">/compact</code> to summarize and reduce context</li>
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

        {/* Section 5: Keyboard Shortcuts */}
        <Section
          title="Keyboard Shortcuts"
          icon={<Keyboard className="w-5 h-5" />}
          iconColor="text-green-400"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Esc</code>
              <p className="text-slate-400 text-xs mt-1">Interrupt Claude's current action</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Esc + Esc</code>
              <p className="text-slate-400 text-xs mt-1">Open rewind menu (undo actions)</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">@</code>
              <p className="text-slate-400 text-xs mt-1">Mention files or folders</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">!</code>
              <p className="text-slate-400 text-xs mt-1">Bash mode prefix (run shell commands)</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Ctrl+V</code>
              <p className="text-slate-400 text-xs mt-1">Paste image from clipboard</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Ctrl+R</code>
              <p className="text-slate-400 text-xs mt-1">Show full output/context</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Tab</code>
              <p className="text-slate-400 text-xs mt-1">Auto-complete files/commands</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">Shift+Tab</code>
              <p className="text-slate-400 text-xs mt-1">Auto-accept mode (YOLO)</p>
            </div>
          </div>
        </Section>

        {/* Section 6: Quick Reference Commands */}
        <Section
          title="Slash Commands Reference"
          icon={<Command className="w-5 h-5" />}
          iconColor="text-blue-400"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/help</code>
              <p className="text-slate-400 text-xs mt-1">Show all available commands</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/clear</code>
              <p className="text-slate-400 text-xs mt-1">Reset conversation and context</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/compact [instructions]</code>
              <p className="text-slate-400 text-xs mt-1">Summarize conversation to reduce context</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/context</code>
              <p className="text-slate-400 text-xs mt-1">Visualize current context usage</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/cost</code>
              <p className="text-slate-400 text-xs mt-1">Show session cost and duration</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/mcp</code>
              <p className="text-slate-400 text-xs mt-1">List MCP servers and tools</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/memory</code>
              <p className="text-slate-400 text-xs mt-1">Open CLAUDE.md files for editing</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/model</code>
              <p className="text-slate-400 text-xs mt-1">Switch Claude model</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/doctor</code>
              <p className="text-slate-400 text-xs mt-1">Diagnose configuration issues</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/rewind</code>
              <p className="text-slate-400 text-xs mt-1">Undo recent actions</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/agents</code>
              <p className="text-slate-400 text-xs mt-1">Manage custom subagents</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-cyan-400">/init</code>
              <p className="text-slate-400 text-xs mt-1">Initialize project CLAUDE.md</p>
            </div>
          </div>
        </Section>

        {/* CLAUDE.md Best Practices */}
        <Section
          title="CLAUDE.md Best Practices"
          icon={<FileText className="w-5 h-5" />}
          iconColor="text-amber-400"
        >
          <TipCard title="What is CLAUDE.md?" icon={<FileText className="w-5 h-5" />}>
            <p>CLAUDE.md is automatically loaded into context when Claude starts. Use it for:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Project context</strong> - What this codebase does</li>
              <li><strong>Conventions</strong> - Coding standards, naming, architecture</li>
              <li><strong>Commands</strong> - How to build, test, deploy</li>
              <li><strong>Gotchas</strong> - Known issues, workarounds</li>
            </ul>
          </TipCard>

          <TipCard title="Keep it Concise" type="warning" icon={<AlertTriangle className="w-5 h-5" />}>
            <p>Long CLAUDE.md files get ignored. Rules:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>If Claude already does it correctly, don't document it</li>
              <li>Focus on project-specific quirks, not general practices</li>
              <li>Use bullet points, not paragraphs</li>
              <li>Under 500 lines is ideal</li>
            </ul>
          </TipCard>

          <TipCard title="Example Structure" icon={<Code className="w-5 h-5" />}>
            <CodeBlock code={`# Project Name

## Quick Start
npm run dev    # Start development
npm run test   # Run tests

## Architecture
- /src/api - FastAPI backend
- /src/web - Next.js frontend

## Conventions
- Use snake_case for Python
- Use camelCase for TypeScript
- Commits: type: subject (feat, fix, docs)

## Known Issues
- Port 3000 conflicts with X - use 3001`} />
          </TipCard>
        </Section>

        {/* Hooks & Automation */}
        <Section
          title="Hooks & Automation"
          icon={<Wrench className="w-5 h-5" />}
          iconColor="text-purple-400"
        >
          <TipCard title="What are Hooks?" icon={<Wrench className="w-5 h-5" />}>
            <p>Hooks run shell commands when Claude performs actions. Define in <code className="bg-slate-800 px-1.5 rounded">.claude/settings.json</code>:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>PreToolUse</strong> - Before a tool runs</li>
              <li><strong>PostToolUse</strong> - After a tool completes</li>
              <li><strong>Notification</strong> - For alerts (e.g., Slack)</li>
            </ul>
          </TipCard>

          <TipCard title="Example: Auto-format on Edit" icon={<Code className="w-5 h-5" />}>
            <CodeBlock code={`{
  "hooks": {
    "PostToolUse": [{
      "tool": "Edit",
      "command": "prettier --write $FILE_PATH"
    }]
  }
}`} />
            <p className="text-slate-400 text-xs mt-2">
              This runs Prettier after every file edit.
            </p>
          </TipCard>

          <TipCard title="Headless Mode for CI/CD" icon={<Terminal className="w-5 h-5" />}>
            <p>Use Claude in scripts and pipelines:</p>
            <CodeBlock code={`# One-shot query
claude -p "Fix lint errors in src/" --output-format json

# With streaming
claude -p "Generate tests" --output-format stream-json

# In pre-commit hook
claude -p "Review this diff for security issues" < diff.txt`} />
          </TipCard>
        </Section>

        {/* Git Worktrees */}
        <Section
          title="Git Worktrees Pattern"
          icon={<GitBranch className="w-5 h-5" />}
          iconColor="text-cyan-400"
        >
          <TipCard title="Parallel Development" icon={<GitBranch className="w-5 h-5" />}>
            <p>Use git worktrees to run multiple Claude sessions on different branches:</p>
            <CodeBlock code={`# Create worktree for a feature
git worktree add ../my-project-feature feature-branch

# Run Claude in main
cd my-project && claude

# Run Claude in feature (separate terminal)
cd ../my-project-feature && claude`} />
            <p className="text-slate-400 text-xs mt-2">
              Each worktree is isolated - no branch switching needed.
            </p>
          </TipCard>

          <TipCard title="When to Use Worktrees" icon={<Lightbulb className="w-5 h-5" />}>
            <ul className="list-disc list-inside space-y-1">
              <li>Working on feature while fixing urgent bug</li>
              <li>Running tests on one branch while developing on another</li>
              <li>Comparing implementations side-by-side</li>
              <li>Parallel Claude sessions for different tasks</li>
            </ul>
          </TipCard>
        </Section>

        {/* Checkpointing & Recovery */}
        <Section
          title="Checkpointing & Recovery"
          icon={<RefreshCw className="w-5 h-5" />}
          iconColor="text-red-400"
        >
          <TipCard title="Rewind Changes" icon={<RefreshCw className="w-5 h-5" />}>
            <p>Made a mistake? Use rewind to undo:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="bg-slate-800 px-1.5 rounded">Esc + Esc</code> - Open rewind menu</li>
              <li><code className="bg-slate-800 px-1.5 rounded">/rewind</code> - Same as above</li>
              <li>Select a checkpoint to restore to that state</li>
            </ul>
            <p className="text-slate-400 text-xs mt-2">
              Claude auto-creates checkpoints before major changes.
            </p>
          </TipCard>

          <TipCard title="Manual Checkpoints" icon={<Target className="w-5 h-5" />}>
            <p>Create explicit save points:</p>
            <CodeBlock code="Before you make changes, create a checkpoint so I can rewind if needed" />
            <p className="text-slate-400 text-xs mt-2">
              Useful before risky refactors or experiments.
            </p>
          </TipCard>

          <TipCard title="Git as Backup" type="info" icon={<GitBranch className="w-5 h-5" />}>
            <p>For extra safety:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Commit before major Claude sessions</li>
              <li>Use branches for experimental changes</li>
              <li><code className="bg-slate-800 px-1.5 rounded">git stash</code> to save uncommitted work</li>
            </ul>
          </TipCard>
        </Section>

        {/* Mobile Usage Section */}
        <Section
          title="Using on Mobile Devices"
          icon={<Smartphone className="w-5 h-5" />}
          iconColor="text-blue-400"
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
            <p className="text-slate-400 text-xs mt-2">
              Switching tabs keeps the terminal connected - no need to restart sessions.
            </p>
          </TipCard>
        </Section>

        {/* Example Prompts Section */}
        <Section
          title="Example Prompts"
          icon={<Sparkles className="w-5 h-5" />}
          iconColor="text-pink-400"
        >
          <div className="space-y-3">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Data Analysis</p>
              <CodeBlock code="Read the CSV file I uploaded. Perform exploratory data analysis, identify correlations, create visualizations with Plotly, and save a report to output/analysis.md" />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Document Generation</p>
              <CodeBlock code="Create a professional report in DOCX format summarizing my data analysis. Include charts, tables, and executive summary. Save to output/report.docx" />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Web Research</p>
              <CodeBlock code="Research the latest trends in AI agents for 2026. Search the web, compile findings, and create a summary with citations." />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">HuggingFace Models</p>
              <CodeBlock code="Search HuggingFace for the best text classification models under 500MB. Compare their benchmarks and show how to use the top one." />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Video Generation (Remotion)</p>
              <CodeBlock code="Create a 60-second explainer video about machine learning using Remotion. Research the topic, write a script, and render the video." />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Financial Data</p>
              <CodeBlock code="Get stock data for AAPL, GOOGL, MSFT from Yahoo Finance. Compare their performance over the last year and create a visualization." />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Scientific Literature</p>
              <CodeBlock code="Search PubMed for recent papers on CRISPR. Summarize the top 5, extract methods, and create a comparison table in markdown." />
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Code Refactoring</p>
              <CodeBlock code="Read src/utils.py and refactor for clarity. Improve naming, add type hints, reduce complexity, and ensure all tests still pass." />
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>
            Tips compiled from official docs and community experience. Last updated January 2026.
          </p>
          <p className="mt-2 space-x-2">
            <a href="https://www.anthropic.com/engineering/claude-code-best-practices" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Anthropic Best Practices
            </a>
            <span>•</span>
            <a href="https://github.com/Njengah/claude-code-cheat-sheet" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Cheat Sheet
            </a>
            <span>•</span>
            <a href="https://claudelog.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              ClaudeLog Docs
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
