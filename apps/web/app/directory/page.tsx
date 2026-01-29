"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Server, Puzzle, Zap, ExternalLink, Copy, Check,
  Database, Brain, Beaker, FileText, Globe, Code, Cpu, ChevronDown,
  ChevronRight, Filter, BookOpen, Terminal
} from 'lucide-react';

// MCP Servers with accurate sources
const mcpServers = [
  // Medical/Life Sciences - deepsense.ai
  {
    id: 'biorxiv',
    name: 'bioRxiv / medRxiv',
    description: 'Preprint server for biological and medical sciences (260K+ preprints)',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/biorxiv/mcp',
    source: 'https://docs.mcp.deepsense.ai/guides/biorxiv.html',
    provider: 'deepsense.ai',
    tools: ['search_preprints', 'get_preprint', 'get_categories', 'search_published_preprints'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'chembl',
    name: 'ChEMBL',
    description: 'Bioactive compounds and drug data (2.4M+ compounds, EMBL-EBI)',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/chembl/mcp',
    source: 'https://docs.mcp.deepsense.ai/guides/chembl.html',
    provider: 'deepsense.ai',
    tools: ['compound_search', 'get_bioactivity', 'target_search', 'get_mechanism', 'drug_search'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'clinical-trials',
    name: 'ClinicalTrials.gov',
    description: 'NIH clinical trial registry API v2',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/clinical_trials/mcp',
    source: 'https://docs.mcp.deepsense.ai/guides/clinical_trials.html',
    provider: 'deepsense.ai',
    tools: ['search_trials', 'get_trial_details', 'search_by_sponsor', 'analyze_endpoints'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'cms-coverage',
    name: 'CMS Medicare Coverage',
    description: 'Medicare Coverage Database (NCDs, LCDs)',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/cms_coverage/mcp',
    source: 'https://docs.mcp.deepsense.ai/',
    provider: 'deepsense.ai',
    tools: ['search_national_coverage', 'search_local_coverage', 'get_coverage_document'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'npi-registry',
    name: 'NPI Registry',
    description: 'US National Provider Identifier lookup',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/npi_registry/mcp',
    source: 'https://docs.mcp.deepsense.ai/',
    provider: 'deepsense.ai',
    tools: ['npi_validate', 'npi_lookup', 'npi_search'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'icd-10-codes',
    name: 'ICD-10 Codes',
    description: 'ICD-10-CM/PCS diagnosis and procedure codes (2026)',
    category: 'Medical',
    endpoint: 'https://mcp.deepsense.ai/icd10_codes/mcp',
    source: 'https://docs.mcp.deepsense.ai/',
    provider: 'deepsense.ai',
    tools: ['lookup_code', 'search_codes', 'validate_code', 'get_hierarchy'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'aact',
    name: 'AACT Database',
    description: 'ClinicalTrials.gov PostgreSQL database (566K+ studies)',
    category: 'Medical',
    endpoint: 'uvx mcp-server-aact',
    source: 'https://pypi.org/project/mcp-server-aact/',
    provider: 'PyPI',
    tools: ['list_tables', 'describe_table', 'read_query'],
    install: 'uvx mcp-server-aact',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'Search biomedical literature and citations',
    category: 'Medical',
    endpoint: 'https://pubmed.mcp.claude.com/mcp',
    source: 'https://www.anthropic.com/news/mcp',
    provider: 'Anthropic',
    tools: ['search_articles', 'get_article_metadata', 'find_related_articles'],
    install: 'MCP Endpoint (HTTP)',
  },
  // AI/ML
  {
    id: 'hugging-face',
    name: 'HuggingFace Hub',
    description: 'Access models, datasets, Spaces, and papers',
    category: 'AI/ML',
    endpoint: 'https://huggingface.co/mcp',
    source: 'https://huggingface.co/docs/hub/mcp',
    provider: 'HuggingFace',
    tools: ['model_search', 'dataset_search', 'paper_search', 'space_search'],
    install: 'MCP Endpoint (HTTP)',
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Up-to-date documentation lookup for any library',
    category: 'Development',
    endpoint: 'npx @anthropic/context7-mcp',
    source: 'https://github.com/anthropics/context7-mcp',
    provider: 'Anthropic',
    tools: ['resolve-library-id', 'query-docs'],
    install: 'npx @anthropic/context7-mcp',
  },
  {
    id: 'scholar-gateway',
    name: 'Scholar Gateway',
    description: 'Semantic search across academic literature',
    category: 'Research',
    endpoint: 'https://connector.scholargateway.ai/mcp',
    source: 'https://scholargateway.ai/',
    provider: 'Scholar Gateway',
    tools: ['semanticSearch'],
    install: 'MCP Endpoint (HTTP)',
  },
  // Utility
  {
    id: 'memory',
    name: 'Memory',
    description: 'Knowledge graph for persistent information storage',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-memory',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['create_entities', 'search_nodes', 'read_graph', 'add_observations'],
    install: 'npx @anthropic/mcp-server-memory',
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Sandboxed file operations within workspace',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-filesystem',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
    install: 'npx @anthropic/mcp-server-filesystem /path/to/workspace',
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Version control operations',
    category: 'Development',
    endpoint: 'npx @anthropic/mcp-server-git',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['git_status', 'git_diff', 'git_log', 'git_commit', 'git_add'],
    install: 'npx @anthropic/mcp-server-git',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Database queries and analytics',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-sqlite',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['read_query', 'write_query', 'list_tables', 'describe_table'],
    install: 'npx @anthropic/mcp-server-sqlite /path/to/db.sqlite',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation and web scraping',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-playwright',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['browser_navigate', 'browser_snapshot', 'browser_click', 'browser_type'],
    install: 'npx @anthropic/mcp-server-playwright',
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'HTTP requests and web content retrieval',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-fetch',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['fetch'],
    install: 'npx @anthropic/mcp-server-fetch',
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Complex multi-step reasoning and problem solving',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-sequential-thinking',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['sequentialthinking'],
    install: 'npx @anthropic/mcp-server-sequential-thinking',
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Timezone conversions and time utilities',
    category: 'Utility',
    endpoint: 'npx @anthropic/mcp-server-time',
    source: 'https://github.com/anthropics/mcp-servers',
    provider: 'Anthropic',
    tools: ['get_current_time', 'convert_time'],
    install: 'npx @anthropic/mcp-server-time',
  },
  {
    id: 'remotion',
    name: 'Remotion',
    description: 'Programmatic video creation documentation',
    category: 'Development',
    endpoint: 'npx @remotion/mcp@latest',
    source: 'https://github.com/remotion-dev/remotion',
    provider: 'Remotion',
    tools: ['remotion-documentation'],
    install: 'npx @remotion/mcp@latest',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'MongoDB database operations',
    category: 'Utility',
    endpoint: 'npx mongodb-mcp-server',
    source: 'https://github.com/mongodb/mongodb-mcp-server',
    provider: 'MongoDB',
    tools: ['find', 'aggregate', 'list-collections', 'collection-schema'],
    install: 'npx mongodb-mcp-server --readOnly',
  },
  // Finance
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    description: 'Stock quotes, historical prices, financials, news (FREE, no API key)',
    category: 'Finance',
    endpoint: 'npx -y yahoo-finance-mcp-server',
    source: 'https://github.com/danishashko/yahoo-finance-mcp',
    provider: 'Community',
    tools: ['get_stock_quote', 'get_historical_prices', 'get_company_info', 'get_financials', 'get_news'],
    install: 'npx -y yahoo-finance-mcp-server',
  },
  {
    id: 'alpaca',
    name: 'Alpaca Trading',
    description: 'Trade stocks, ETFs, crypto, options + market data (FREE paper trading)',
    category: 'Finance',
    endpoint: 'uvx alpaca-mcp-server serve',
    source: 'https://github.com/alpacahq/alpaca-mcp-server',
    provider: 'Alpaca',
    tools: ['get_account', 'get_positions', 'place_order', 'get_market_data', 'get_bars'],
    install: 'uvx alpaca-mcp-server serve (requires free API key from alpaca.markets)',
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    description: 'Crypto prices, market data, 8M+ tokens, 200+ chains (FREE, official MCP)',
    category: 'Finance',
    endpoint: 'https://mcp.api.coingecko.com/mcp',
    source: 'https://docs.coingecko.com/docs/mcp-server',
    provider: 'CoinGecko (Official)',
    tools: ['get_price', 'get_market_data', 'get_coin_info', 'search_coins', 'get_trending'],
    install: 'npx -y mcp-remote https://mcp.api.coingecko.com/mcp',
  },
];

// Plugins with sources
const plugins = [
  {
    id: 'scientific-skills',
    name: 'Scientific Skills',
    description: '145+ scientific tools for research (PubMed, UniProt, RDKit, PyTorch, Plotly)',
    skillsCount: 145,
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install scientific-skills@claude-scientific-skills',
  },
  {
    id: 'document-skills',
    name: 'Document Skills',
    description: 'PDF, Word, Excel, PowerPoint creation and manipulation',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install document-skills@anthropic-agent-skills',
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Up-to-date documentation lookup for any library via MCP',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install context7@claude-plugins-official',
  },
  {
    id: 'frontend-design',
    name: 'Frontend Design',
    description: 'Production-grade UI/UX component design',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install frontend-design@claude-plugins-official',
  },
  {
    id: 'feature-dev',
    name: 'Feature Development',
    description: 'Guided feature implementation workflows with code review',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install feature-dev@claude-plugins-official',
  },
  {
    id: 'plugin-dev',
    name: 'Plugin Development',
    description: 'Create and validate Claude Code plugins',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install plugin-dev@claude-plugins-official',
  },
  {
    id: 'code-simplifier',
    name: 'Code Simplifier',
    description: 'Code refactoring and clarity improvements',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install code-simplifier@claude-plugins-official',
  },
  {
    id: 'ralph-loop',
    name: 'Ralph Loop',
    description: 'Iterative refinement workflow for complex tasks',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install ralph-loop@claude-plugins-official',
  },
  {
    id: 'huggingface-skills',
    name: 'HuggingFace Skills',
    description: 'HuggingFace model training, datasets, and Spaces',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install huggingface-skills@claude-plugins-official',
  },
  {
    id: 'agent-sdk-dev',
    name: 'Agent SDK Dev',
    description: 'Claude Agent SDK development and verification tools',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install agent-sdk-dev@claude-code-plugins',
  },
  {
    id: 'claude-md-management',
    name: 'CLAUDE.md Management',
    description: 'Audit and improve CLAUDE.md files',
    source: 'https://github.com/anthropics/claude-code-plugins',
    provider: 'Anthropic',
    install: 'claude plugins install claude-md-management@claude-plugins-official',
  },
];

// Scientific Skills categories
const skillCategories = [
  {
    id: 'databases',
    name: 'Scientific Databases',
    count: 28,
    icon: <Database className="w-5 h-5" />,
    skills: [
      { name: 'pubmed-database', description: 'PubMed literature search' },
      { name: 'uniprot-database', description: 'Protein sequences & annotations' },
      { name: 'chembl-database', description: 'Bioactive molecules' },
      { name: 'pdb-database', description: '3D protein structures' },
      { name: 'kegg-database', description: 'Pathways and metabolism' },
      { name: 'reactome-database', description: 'Biological pathways' },
      { name: 'clinicaltrials-database', description: 'Clinical trials data' },
      { name: 'drugbank-database', description: 'Drug information' },
      { name: 'ensembl-database', description: 'Genome annotations' },
      { name: 'opentargets-database', description: 'Drug target platform' },
    ],
  },
  {
    id: 'bioinformatics',
    name: 'Bioinformatics & Genomics',
    count: 20,
    icon: <Beaker className="w-5 h-5" />,
    skills: [
      { name: 'biopython', description: 'Molecular biology toolkit' },
      { name: 'scanpy', description: 'Single-cell RNA-seq analysis' },
      { name: 'anndata', description: 'Annotated data matrices' },
      { name: 'pysam', description: 'BAM/SAM file handling' },
      { name: 'gget', description: 'Query 20+ genomic databases' },
      { name: 'scvi-tools', description: 'Deep generative models for single-cell' },
      { name: 'pydeseq2', description: 'Differential expression analysis' },
    ],
  },
  {
    id: 'cheminformatics',
    name: 'Drug Discovery & Chemistry',
    count: 15,
    icon: <Brain className="w-5 h-5" />,
    skills: [
      { name: 'rdkit', description: 'Cheminformatics toolkit' },
      { name: 'deepchem', description: 'Deep learning for chemistry' },
      { name: 'diffdock', description: 'Molecular docking' },
      { name: 'datamol', description: 'Molecular data manipulation' },
      { name: 'medchem', description: 'Medicinal chemistry filters' },
      { name: 'pytdc', description: 'Therapeutics Data Commons' },
    ],
  },
  {
    id: 'ml',
    name: 'Machine Learning & AI',
    count: 25,
    icon: <Cpu className="w-5 h-5" />,
    skills: [
      { name: 'scikit-learn', description: 'ML algorithms' },
      { name: 'pytorch-lightning', description: 'Deep learning framework' },
      { name: 'transformers', description: 'HuggingFace models' },
      { name: 'shap', description: 'Model interpretability' },
      { name: 'statsmodels', description: 'Statistical models' },
      { name: 'stable-baselines3', description: 'Reinforcement learning' },
    ],
  },
  {
    id: 'visualization',
    name: 'Data Analysis & Visualization',
    count: 17,
    icon: <FileText className="w-5 h-5" />,
    skills: [
      { name: 'plotly', description: 'Interactive charts' },
      { name: 'seaborn', description: 'Statistical visualization' },
      { name: 'matplotlib', description: 'Publication plots' },
      { name: 'polars', description: 'Fast DataFrames' },
      { name: 'networkx', description: 'Graph analysis' },
      { name: 'exploratory-data-analysis', description: 'EDA on 200+ formats' },
    ],
  },
  {
    id: 'documents',
    name: 'Document Processing',
    count: 14,
    icon: <FileText className="w-5 h-5" />,
    skills: [
      { name: 'pdf', description: 'PDF extraction & creation' },
      { name: 'docx', description: 'Word documents' },
      { name: 'xlsx', description: 'Excel spreadsheets' },
      { name: 'pptx', description: 'PowerPoint presentations' },
      { name: 'latex-posters', description: 'Research posters' },
    ],
  },
  {
    id: 'medical',
    name: 'Medical & Clinical',
    count: 15,
    icon: <Beaker className="w-5 h-5" />,
    skills: [
      { name: 'pyhealth', description: 'Healthcare AI toolkit' },
      { name: 'neurokit2', description: 'Biosignal processing' },
      { name: 'pydicom', description: 'DICOM medical images' },
      { name: 'histolab', description: 'Histopathology' },
      { name: 'treatment-plans', description: 'Clinical treatment plans' },
      { name: 'clinical-reports', description: 'Clinical report writing' },
    ],
  },
];

export default function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'mcp' | 'plugins' | 'skills'>('mcp');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMcpServers = mcpServers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || server.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredPlugins = plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mcpCategories = [...new Set(mcpServers.map(s => s.category))];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              <span className="text-lg font-bold text-white">Directory</span>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {mcpServers.length} MCP Servers • {plugins.length} Plugins • 145+ Skills
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            MCP Servers, Plugins & Skills Directory
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Complete list of everything installed on C3 Researcher with source links and installation commands.
            Copy configs directly to your <code className="text-blue-400">claude_desktop_config.json</code>.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search MCP servers, plugins, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'mcp'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Server className="w-4 h-4" />
            MCP Servers ({mcpServers.length})
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'plugins'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            Plugins ({plugins.length})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'skills'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Skills (145+)
          </button>
        </div>

        {/* MCP Servers Tab */}
        {activeTab === 'mcp' && (
          <>
            {/* Category Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {mcpCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    categoryFilter === cat
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredMcpServers.map(server => (
                <div key={server.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          server.category === 'Medical' ? 'bg-red-500/20 text-red-400' :
                          server.category === 'AI/ML' ? 'bg-purple-500/20 text-purple-400' :
                          server.category === 'Development' ? 'bg-blue-500/20 text-blue-400' :
                          server.category === 'Research' ? 'bg-amber-500/20 text-amber-400' :
                          server.category === 'Finance' ? 'bg-green-500/20 text-green-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {server.category}
                        </span>
                        <span className="text-xs text-slate-500">by {server.provider}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{server.description}</p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {server.tools.slice(0, 5).map(tool => (
                          <span key={tool} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-mono">
                            {tool}
                          </span>
                        ))}
                        {server.tools.length > 5 && (
                          <span className="px-2 py-0.5 text-slate-500 text-xs">
                            +{server.tools.length - 5} more
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-800 px-3 py-1.5 rounded text-sm text-blue-400 font-mono overflow-x-auto">
                          {server.install}
                        </code>
                        <button
                          onClick={() => copyToClipboard(server.install, server.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          title="Copy install command"
                        >
                          {copiedId === server.id ? (
                            <Check className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <a
                      href={server.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                      title="View source"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Plugins Tab */}
        {activeTab === 'plugins' && (
          <div className="grid gap-4">
            {filteredPlugins.map(plugin => (
              <div key={plugin.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{plugin.name}</h3>
                      {plugin.skillsCount && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {plugin.skillsCount}+ skills
                        </span>
                      )}
                      <span className="text-xs text-slate-500">by {plugin.provider}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{plugin.description}</p>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-800 px-3 py-1.5 rounded text-sm text-purple-400 font-mono overflow-x-auto">
                        {plugin.install}
                      </code>
                      <button
                        onClick={() => copyToClipboard(plugin.install, plugin.id)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        title="Copy install command"
                      >
                        {copiedId === plugin.id ? (
                          <Check className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <a
                    href={plugin.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                    title="View source"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm mb-4">
              Skills are included via the <span className="text-blue-400">scientific-skills</span> plugin.
              Use <code className="text-purple-400">/skill-name</code> in Claude Code to invoke them.
            </p>

            {skillCategories.map(category => (
              <div key={category.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      <p className="text-sm text-slate-400">{category.count} skills</p>
                    </div>
                  </div>
                  {expandedCategory === category.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedCategory === category.id && (
                  <div className="border-t border-slate-800 p-4">
                    <div className="grid sm:grid-cols-2 gap-2">
                      {category.skills.map(skill => (
                        <div key={skill.name} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded">
                          <code className="text-blue-400 text-sm font-mono">/{skill.name}</code>
                          <span className="text-slate-400 text-sm">- {skill.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Config Example */}
        <div className="mt-12 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Example Configuration
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Add MCP servers to your <code className="text-blue-400">~/.claude.json</code> or project settings:
          </p>
          <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto text-sm">
            <code className="text-slate-300">{`{
  "mcpServers": {
    "biorxiv": {
      "type": "http",
      "url": "https://mcp.deepsense.ai/biorxiv/mcp"
    },
    "chembl": {
      "type": "http",
      "url": "https://mcp.deepsense.ai/chembl/mcp"
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["@anthropic/mcp-server-memory"]
    }
  }
}`}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(`{
  "mcpServers": {
    "biorxiv": {
      "type": "http",
      "url": "https://mcp.deepsense.ai/biorxiv/mcp"
    },
    "chembl": {
      "type": "http",
      "url": "https://mcp.deepsense.ai/chembl/mcp"
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["@anthropic/mcp-server-memory"]
    }
  }
}`, 'config-example')}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            {copiedId === 'config-example' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy Configuration
          </button>
        </div>

        {/* Resources */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <a
            href="https://github.com/punkpeye/awesome-mcp-servers"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors group"
          >
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">Awesome MCP Servers</h3>
            <p className="text-sm text-slate-400">Community curated list</p>
          </a>
          <a
            href="https://docs.mcp.deepsense.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors group"
          >
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">deepsense.ai MCP Docs</h3>
            <p className="text-sm text-slate-400">Healthcare & Life Sciences</p>
          </a>
          <a
            href="https://github.com/anthropics/mcp-servers"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors group"
          >
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">Anthropic MCP Servers</h3>
            <p className="text-sm text-slate-400">Official reference implementations</p>
          </a>
        </div>
      </main>
    </div>
  );
}
