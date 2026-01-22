"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth';
import {
  Home,
  Upload,
  Database,
  FileSpreadsheet,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Settings,
  Trash2,
  Download,
  Edit3,
  Play,
  Server,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Zap,
  Brain,
  Wand2,
  Send
} from 'lucide-react';

// Dynamic API URL
function getApiUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  const hostname = window.location.hostname;
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk') {
    return 'https://api.orpheuscore.uk';
  }
  if (hostname === 'ai.ultronsolar.in' || hostname === 'www.ultronsolar.in') {
    return 'https://api.ultronsolar.in';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

// Types
interface DataSource {
  id: string;
  name: string;
  type: 'csv' | 'excel' | 'sqlite' | 'postgresql' | 'pdf' | 'aact' | 'json';
  status: 'connected' | 'disconnected' | 'error';
  tables?: string[];
  rowCount?: number;
  columns?: string[];
  createdAt: string;
}

interface AnalystProject {
  id: string;
  name: string;
  description?: string;
  dataSources: DataSource[];
  dashboards: string[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  overview?: string;
  theme?: string;
  chart_config?: any;
  chart_data?: any;
  data_source_id?: string;
}

interface Dashboard {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

// Feature card component
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}> = ({ icon, title, description, color }) => (
  <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 hover:border-gray-600 transition-all group">
    <div className={`p-3 rounded-lg bg-gray-700/50 w-fit mb-4 ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

// Data source type card
const DataSourceTypeCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ icon, title, description, color, onClick }) => (
  <button
    onClick={onClick}
    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-800 transition-all text-left group w-full"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-gray-700/50 ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  </button>
);

// AI Processing Status Component
const AIProcessingStatus: React.FC<{ stage: string }> = ({ stage }) => {
  const stages = [
    { id: 'connecting', label: 'Connecting to Claude Code...' },
    { id: 'analyzing', label: 'Analyzing your data...' },
    { id: 'generating', label: 'Generating insights & charts...' },
    { id: 'finalizing', label: 'Preparing response...' }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-blue-500/20 rounded-full">
          <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Claude is thinking...</h3>
          <p className="text-sm text-gray-400">{stage}</p>
        </div>
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              s.id === stage ? 'bg-blue-400 animate-pulse' :
              stages.findIndex(st => st.id === stage) > i ? 'bg-green-400' : 'bg-gray-600'
            }`} />
            <span className={`text-sm ${
              s.id === stage ? 'text-white' :
              stages.findIndex(st => st.id === stage) > i ? 'text-green-400' : 'text-gray-500'
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Project Workspace Component
const ProjectWorkspace: React.FC<{
  project: AnalystProject;
  onBack: () => void;
}> = ({ project, onBack }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'ai' | 'dashboard'>('dashboard');

  // AI Chat
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiProcessingStage, setAiProcessingStage] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dashboard
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showNewDashboardModal, setShowNewDashboardModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [dashboardEditPrompt, setDashboardEditPrompt] = useState('');
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // PDF Extraction
  const [pdfExtraction, setPdfExtraction] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data sources and dashboards on mount
  useEffect(() => {
    loadDataSources();
    loadDashboards();
  }, [project.id]);

  // Auto-create default dashboard if none exists
  useEffect(() => {
    if (dashboards.length === 0 && dataSources.length > 0) {
      createDefaultDashboard();
    }
  }, [dashboards, dataSources]);

  const createDefaultDashboard = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/dashboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Main Dashboard'
        })
      });
      if (res.ok) {
        const dashboard = await res.json();
        setDashboards([dashboard]);
        setSelectedDashboard(dashboard);
      }
    } catch (error) {
      console.error('Error creating default dashboard:', error);
    }
  };

  const loadDataSources = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources`, {
        credentials: 'include'
      });
      if (res.ok) {
        const sources = await res.json();
        setDataSources(sources);
        if (sources.length > 0 && !selectedSource) {
          setSelectedSource(sources[0]);
          loadSourceSchema(sources[0].id);
          loadPreview(sources[0].id);
          loadConversationHistory(sources[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data sources:', error);
    }
  };

  // Load conversation history for a data source
  const loadConversationHistory = async (dsId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources/${dsId}/conversation`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Connect to AACT Clinical Trials database
  const connectToAACT = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/connect-aact`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        // Refresh data sources to show the new AACT connection
        loadDataSources();
        // If tables are returned, the data source is ready
        if (result.tables && result.tables.length > 0) {
          alert(`Connected to AACT! Available tables: ${result.tables.slice(0, 5).join(', ')}...`);
        }
      } else {
        const error = await res.json();
        alert(`Failed to connect to AACT: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('AACT connection error:', error);
      alert('Failed to connect to AACT database');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboards = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/dashboards`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDashboards(data);
        if (data.length > 0 && !selectedDashboard) {
          setSelectedDashboard(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
    }
  };

  const createDashboard = async () => {
    if (!newDashboardName.trim()) return;
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/dashboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newDashboardName.trim()
        })
      });
      if (res.ok) {
        const dashboard = await res.json();
        setDashboards([...dashboards, dashboard]);
        setSelectedDashboard(dashboard);
        setNewDashboardName('');
        setShowNewDashboardModal(false);
      }
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  const addChartsToDashboard = async (charts: any[]) => {
    if (!selectedDashboard || !selectedSource || charts.length === 0) return;

    try {
      for (const chart of charts) {
        await fetch(`${getApiUrl()}/analyst/projects/${project.id}/dashboards/${selectedDashboard.id}/widgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'chart',
            title: chart.title || chart.chart_config?.title || 'Chart',
            data_source_id: selectedSource.id,
            chart_config: chart.chart_config,
            chart_data: chart.chart
          })
        });
      }
      loadDashboards();
    } catch (error) {
      console.error('Error adding charts to dashboard:', error);
    }
  };

  const removeWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;
    try {
      await fetch(`${getApiUrl()}/analyst/projects/${project.id}/dashboards/${selectedDashboard.id}/widgets/${widgetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      loadDashboards();
    } catch (error) {
      console.error('Error removing widget:', error);
    }
  };

  const extractPdfContent = async () => {
    if (!selectedSource || selectedSource.type !== 'pdf') return;
    setIsExtracting(true);
    setPdfExtraction(null);
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources/${selectedSource.id}/extract-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (res.ok) {
        const result = await res.json();
        setPdfExtraction(result);
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const convertTableToDataSource = async (tableMarkdown: string, tableName: string) => {
    if (!selectedSource) return;
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources/${selectedSource.id}/pdf-to-table?table_name=${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ table_markdown: tableMarkdown })
      });
      if (res.ok) {
        loadDataSources();
      }
    } catch (error) {
      console.error('Table conversion error:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          setDataSources(prev => [...prev, result.data_source]);
          setSelectedSource(result.data_source);
          if (result.schema) {
            setSchema(result.schema);
          }
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadSourceSchema = async (sourceId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources/${sourceId}/schema`, {
        credentials: 'include'
      });
      if (res.ok) {
        const schemaData = await res.json();
        setSchema(schemaData);
      }
    } catch (error) {
      console.error('Error loading schema:', error);
    }
  };

  const loadPreview = async (sourceId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/data-sources/${sourceId}/preview?limit=100`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceSelect = (source: DataSource) => {
    setSelectedSource(source);
    loadSourceSchema(source.id);
    loadPreview(source.id);
    loadConversationHistory(source.id);
  };

  const sendChatMessage = async () => {
    if (!selectedSource || !chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setIsLoading(true);
    setAiResponse(null);
    setAiProcessingStage('connecting');

    try {
      // Simulate stages for better UX
      setTimeout(() => setAiProcessingStage('analyzing'), 1500);
      setTimeout(() => setAiProcessingStage('generating'), 4000);

      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data_source_id: selectedSource.id,
          question: chatInput.trim(),
          include_chart: true
        })
      });

      setAiProcessingStage('finalizing');

      if (res.ok) {
        const result = await res.json();
        setChatMessages([...newMessages, { role: 'assistant', content: result.response }]);
        setAiResponse(result);

        // Auto-add charts to dashboard if multiple were generated
        if (result.charts && result.charts.length > 0) {
          // Transform charts to the expected format
          const chartsForDashboard = result.charts.map((c: any) => ({
            title: c.config?.title || 'Generated Chart',
            chart_config: c.config,
            chart: c.plotly
          }));
          addChartsToDashboard(chartsForDashboard);
        } else if (result.chart) {
          // Single chart - add to dashboard
          addChartsToDashboard([{
            title: result.chart_config?.title || 'Generated Chart',
            chart_config: result.chart_config,
            chart: result.chart
          }]);
        }

        // Scroll to bottom
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
      setAiProcessingStage('');
    }
  };

  const editDashboardWithAI = async () => {
    if (!selectedDashboard || !dashboardEditPrompt.trim() || !selectedSource) return;

    setIsEditingDashboard(true);
    setAiProcessingStage('analyzing');

    try {
      // Ask AI to generate charts based on the prompt
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data_source_id: selectedSource.id,
          question: `Create a dashboard with: ${dashboardEditPrompt}. Generate multiple charts that would form a comprehensive dashboard.`,
          include_chart: true
        })
      });

      if (res.ok) {
        const result = await res.json();

        // Add generated charts to dashboard
        if (result.charts && result.charts.length > 0) {
          addChartsToDashboard(result.charts);
        } else if (result.chart) {
          addChartsToDashboard([{
            title: result.chart_config?.title || 'Generated Chart',
            chart_config: result.chart_config,
            chart: result.chart
          }]);
        }
      }
    } catch (error) {
      console.error('Dashboard edit error:', error);
    } finally {
      setIsEditingDashboard(false);
      setDashboardEditPrompt('');
      setAiProcessingStage('');
    }
  };

  // Auto-generate charts and add to selected dashboard (or create new)
  const autoGenerateDashboard = async () => {
    if (!selectedSource) {
      alert('Please select a data source first');
      return;
    }

    setIsAutoGenerating(true);

    try {
      const res = await fetch(`${getApiUrl()}/analyst/projects/${project.id}/auto-generate-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data_source_id: selectedSource.id,
          dashboard_id: selectedDashboard?.id || null, // Add to existing if selected
          dashboard_name: selectedDashboard ? undefined : `Analysis: ${selectedSource.name}`,
          min_charts: 5,
          max_charts: 8
        })
      });

      if (res.ok) {
        const result = await res.json();

        if (result.is_new_dashboard) {
          // New dashboard - add to list
          setDashboards(prev => [...prev, result.dashboard]);
        } else {
          // Updated existing dashboard - update in list
          setDashboards(prev => prev.map(d =>
            d.id === result.dashboard.id ? result.dashboard : d
          ));
        }

        setSelectedDashboard(result.dashboard);
      } else {
        const error = await res.json();
        alert(`Failed to generate charts: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Auto-generate dashboard error:', error);
      alert('Failed to generate charts. Please try again.');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h1 className="font-semibold text-white">{project.name}</h1>
            </div>
          </div>

          {/* Dashboard Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-1.5">
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <select
                value={selectedDashboard?.id || ''}
                onChange={(e) => {
                  const dash = dashboards.find(d => d.id === e.target.value);
                  setSelectedDashboard(dash || null);
                }}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                {dashboards.length === 0 && (
                  <option value="">No dashboards</option>
                )}
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewDashboardModal(true)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="New Dashboard"
              >
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.json"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </button>
            <button
              onClick={autoGenerateDashboard}
              disabled={isAutoGenerating || !selectedSource}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              title={!selectedSource ? "Select a data source first" : "Generate complete dashboard with 5-8 charts"}
            >
              {isAutoGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Auto Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Data Sources */}
        <aside className="w-64 border-r border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">Data Sources</h2>
            <button
              onClick={connectToAACT}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors"
              title="Connect to AACT Clinical Trials Database"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Globe className="w-3 h-3" />
              )}
              AACT
            </button>
          </div>
          {dataSources.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No data sources yet</p>
              <p className="text-xs text-gray-600">Upload a file or connect to AACT</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dataSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedSource?.id === source.id
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {source.type === 'csv' && <FileSpreadsheet className="w-4 h-4 text-green-400" />}
                    {source.type === 'excel' && <Table className="w-4 h-4 text-emerald-400" />}
                    {source.type === 'json' && <Layers className="w-4 h-4 text-amber-400" />}
                    {source.type === 'pdf' && <FileText className="w-4 h-4 text-orange-400" />}
                    {source.type === 'postgresql' && <Database className="w-4 h-4 text-blue-400" />}
                    {source.type === 'aact' && <Globe className="w-4 h-4 text-purple-400" />}
                    {source.type === 'sqlite' && <Server className="w-4 h-4 text-cyan-400" />}
                    <span className="text-sm font-medium text-white truncate">{source.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {source.rowCount ? `${source.rowCount.toLocaleString()} rows` : source.type}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main Area */}
        <main className="flex-1 flex flex-col">
          {selectedSource ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-800 px-4">
                <div className="flex gap-1">
                  {(['dashboard', 'ai', 'data'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab
                          ? 'text-blue-400 border-blue-400'
                          : 'text-gray-400 border-transparent hover:text-white'
                      }`}
                    >
                      {tab === 'dashboard' && '📊 Dashboard'}
                      {tab === 'ai' && '✨ Ask AI'}
                      {tab === 'data' && 'Data Preview'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4">
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  <div className="h-full flex flex-col">
                    {/* Dashboard AI Edit Bar */}
                    <div className="mb-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Wand2 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={dashboardEditPrompt}
                            onChange={(e) => setDashboardEditPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && editDashboardWithAI()}
                            placeholder="Describe the dashboard you want... e.g., 'Sales metrics with revenue trend, top products, and regional breakdown'"
                            className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none"
                            disabled={isEditingDashboard}
                          />
                        </div>
                        <button
                          onClick={editDashboardWithAI}
                          disabled={isEditingDashboard || !dashboardEditPrompt.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                          {isEditingDashboard ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Generate
                        </button>
                      </div>
                      {isEditingDashboard && (
                        <div className="mt-3 text-sm text-purple-300">
                          <Brain className="w-4 h-4 inline mr-2 animate-pulse" />
                          Claude is designing your dashboard...
                        </div>
                      )}
                    </div>

                    {/* Dashboard Content */}
                    {selectedDashboard ? (
                      selectedDashboard.widgets?.length > 0 ? (
                        <div className="flex-1 overflow-auto">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {selectedDashboard.widgets.map((widget: any) => (
                              <div
                                key={widget.id}
                                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 relative group"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium text-white">{widget.title}</h4>
                                    {widget.theme && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        {widget.theme}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeWidget(widget.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                  >
                                    <X className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                                {widget.overview && (
                                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                    {widget.overview}
                                  </p>
                                )}
                                {widget.chart_data && (
                                  <PlotlyChart data={widget.chart_data} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center max-w-md">
                            <LayoutDashboard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-white mb-2">Empty Dashboard</h3>
                            <p className="text-gray-400 text-sm mb-6">
                              Auto-generate a complete dashboard, or describe what you want.
                            </p>

                            {/* Auto-Generate Button */}
                            <button
                              onClick={autoGenerateDashboard}
                              disabled={isAutoGenerating || !selectedSource}
                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl transition-all mx-auto mb-6 font-medium"
                            >
                              {isAutoGenerating ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Generating 5-8 Charts...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-5 h-5" />
                                  Auto-Generate Complete Dashboard
                                </>
                              )}
                            </button>

                            {!selectedSource && (
                              <p className="text-amber-500 text-xs mb-4">
                                Select a data source first to enable auto-generation
                              </p>
                            )}

                            <p className="text-gray-500 text-xs mb-3">Or describe what you want:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {[
                                "Overview dashboard with key metrics",
                                "Sales performance breakdown",
                                "Data distribution analysis"
                              ].map((suggestion, i) => (
                                <button
                                  key={i}
                                  onClick={() => setDashboardEditPrompt(suggestion)}
                                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:border-purple-500/50 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <LayoutDashboard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-white mb-2">No Dashboard Selected</h3>
                          <p className="text-gray-400 text-sm mb-4">Create a dashboard to get started</p>
                          <button
                            onClick={() => setShowNewDashboardModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            Create Dashboard
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New Dashboard Modal */}
                    {showNewDashboardModal && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
                          <h3 className="text-lg font-semibold text-white mb-4">Create Dashboard</h3>
                          <input
                            type="text"
                            value={newDashboardName}
                            onChange={(e) => setNewDashboardName(e.target.value)}
                            placeholder="Dashboard name"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4"
                            autoFocus
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowNewDashboardModal(false)}
                              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={createDashboard}
                              disabled={!newDashboardName.trim()}
                              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg"
                            >
                              Create
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Chat Tab */}
                {activeTab === 'ai' && (
                  <div className="h-full flex flex-col">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-auto space-y-4 mb-4">
                      {chatMessages.length === 0 && !isLoading ? (
                        <div className="text-center py-12">
                          <Sparkles className="w-12 h-12 text-blue-400/50 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-white mb-2">Ask AI About Your Data</h3>
                          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                            Ask questions in natural language. Claude will analyze your data,
                            run calculations, and generate visualizations that get added to your dashboard.
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {[
                              "What are the key insights in this data?",
                              "Show me a breakdown by category",
                              "Create a comprehensive dashboard",
                              "Find any outliers or anomalies"
                            ].map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setChatInput(suggestion);
                                }}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:border-blue-500/50 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {chatMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-3xl rounded-lg px-4 py-3 ${
                                  msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 border border-gray-700 text-gray-200'
                                }`}
                              >
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              </div>
                            </div>
                          ))}

                          {/* AI Processing Status */}
                          {isLoading && aiProcessingStage && (
                            <AIProcessingStatus stage={aiProcessingStage} />
                          )}
                        </>
                      )}
                      <div ref={chatEndRef} />

                      {/* AI Response extras (chart, code result) */}
                      {aiResponse && !isLoading && (
                        <div className="space-y-4">
                          {aiResponse.query_result && (
                            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-white mb-2">Query Result</h4>
                              {aiResponse.query_result.value ? (
                                <div className="text-lg font-mono text-blue-400">
                                  {aiResponse.query_result.value}
                                </div>
                              ) : aiResponse.query_result.data && (
                                <div className="overflow-x-auto max-h-64">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-800">
                                        {aiResponse.query_result.columns?.map((col: string) => (
                                          <th key={col} className="px-2 py-1 text-left text-gray-400">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {aiResponse.query_result.data.slice(0, 20).map((row: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-800">
                                          {aiResponse.query_result.columns?.map((col: string) => (
                                            <td key={col} className="px-2 py-1 text-gray-300">{row[col]?.toString() || '-'}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Display multiple charts if available */}
                          {aiResponse.charts && aiResponse.charts.length > 0 ? (
                            <div className="space-y-4">
                              {aiResponse.charts.map((chartItem: any, idx: number) => (
                                <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-white">
                                      {chartItem.config?.title || `Chart ${idx + 1}`}
                                    </h4>
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Added to dashboard
                                    </span>
                                  </div>
                                  {chartItem.config?.description && (
                                    <p className="text-xs text-gray-400 mb-3">{chartItem.config.description}</p>
                                  )}
                                  <PlotlyChart data={chartItem.plotly} />
                                </div>
                              ))}
                            </div>
                          ) : aiResponse.chart && (
                            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-white">Generated Chart</h4>
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Added to dashboard
                                </span>
                              </div>
                              <PlotlyChart data={aiResponse.chart} />
                            </div>
                          )}

                          {aiResponse.code && (
                            <details className="bg-gray-900/50 border border-gray-700 rounded-lg">
                              <summary className="px-4 py-2 text-sm text-gray-400 cursor-pointer hover:text-white">
                                View generated code
                              </summary>
                              <pre className="px-4 py-3 text-xs text-green-400 overflow-x-auto border-t border-gray-700">
                                {aiResponse.code}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                          placeholder="Ask about your data or describe the charts you want..."
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          disabled={isLoading}
                        />
                        <button
                          onClick={sendChatMessage}
                          disabled={isLoading || !chatInput.trim()}
                          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Charts are automatically added to your dashboard. Ask for multiple charts at once!
                      </p>
                    </div>
                  </div>
                )}

                {/* Data Preview Tab */}
                {activeTab === 'data' && (
                  <div className="space-y-4">
                    {/* PDF Extraction UI */}
                    {selectedSource?.type === 'pdf' && (
                      <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-400" />
                            <h3 className="text-sm font-medium text-white">PDF Document</h3>
                          </div>
                          <button
                            onClick={extractPdfContent}
                            disabled={isExtracting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                          >
                            {isExtracting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Extract with Claude Vision
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Use Claude's vision capabilities to extract text, tables, and data from this PDF.
                        </p>

                        {/* Extraction Results */}
                        {pdfExtraction && (
                          <div className="mt-4 space-y-4">
                            {pdfExtraction.text_content && (
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <h4 className="text-xs font-medium text-gray-300 mb-2">Extracted Text</h4>
                                <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-auto">
                                  {pdfExtraction.text_content}
                                </pre>
                              </div>
                            )}

                            {pdfExtraction.tables_found?.length > 0 && (
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <h4 className="text-xs font-medium text-gray-300 mb-2">
                                  Tables Found ({pdfExtraction.tables_found.length})
                                </h4>
                                {pdfExtraction.tables_found.map((table: any, i: number) => (
                                  <div key={i} className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gray-500">Table from page {table.page}</span>
                                      <button
                                        onClick={() => convertTableToDataSource(table.markdown, `Table_${i+1}`)}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                      >
                                        Convert to Data Source
                                      </button>
                                    </div>
                                    <pre className="text-xs text-gray-400 bg-gray-900 p-2 rounded overflow-x-auto">
                                      {table.markdown}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Schema */}
                    {schema && schema.columns && (
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          Schema ({schema.columns.length} columns, {schema.row_count?.toLocaleString()} rows)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {schema.columns.map((col: any) => (
                            <span
                              key={col.name}
                              className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                              title={`Type: ${col.type}`}
                            >
                              {col.name}
                              <span className="text-gray-500 ml-1">({col.type})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                      </div>
                    ) : previewData && previewData.data ? (
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-800">
                                {previewData.columns.map((col: string) => (
                                  <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-300 border-b border-gray-700">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.data.slice(0, 50).map((row: any, i: number) => (
                                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                                  {previewData.columns.map((col: string) => (
                                    <td key={col} className="px-3 py-2 text-gray-400 truncate max-w-[200px]">
                                      {row[col]?.toString() || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-3 py-2 bg-gray-800/50 text-xs text-gray-500">
                          Showing {Math.min(50, previewData.data.length)} of {previewData.total_rows.toLocaleString()} rows
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Select a data source to preview
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Data Source Selected</h3>
                <p className="text-gray-400 mb-4">Upload a file or select a data source to begin</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Plotly Chart Component (dynamic import to avoid SSR issues)
const PlotlyChart: React.FC<{ data: any }> = ({ data }) => {
  const [Plot, setPlot] = useState<any>(null);

  useEffect(() => {
    // Dynamic import on client side only
    import('react-plotly.js').then((mod) => {
      setPlot(() => mod.default);
    });
  }, []);

  if (!Plot) {
    return (
      <div className="h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <Plot
      data={data.data}
      layout={{
        ...data.layout,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#9ca3af' },
        margin: { t: 40, r: 20, b: 40, l: 50 },
        autosize: true,
      }}
      config={{
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      }}
      style={{ width: '100%', height: '320px' }}
    />
  );
};

function AnalystPageContent() {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projects, setProjects] = useState<AnalystProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AnalystProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // New project form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/analyst/projects`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Landing page view (no project selected)
  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <Home className="w-5 h-5 text-gray-400" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Data Analyst</h1>
                    <p className="text-xs text-gray-400">AI-Powered Data Analysis & Visualization</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/ccresearch/tips"
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg transition-colors text-sm"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="hidden sm:inline">Tips</span>
                </Link>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Analysis
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Powered by Claude Code
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Analyze Any Data with
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Natural Language</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Connect to databases, upload files, or scan documents. Ask questions in plain English and get
              instant visualizations, insights, and dashboards.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg shadow-blue-500/25"
              >
                <Zap className="w-5 h-5" />
                Start Analyzing
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Existing Projects */}
          {projects.length > 0 && (
            <div className="mb-16">
              <h3 className="text-xl font-semibold text-white text-center mb-6">Your Projects</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-left hover:border-blue-500/50 hover:bg-gray-800 transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{proj.name}</h4>
                        <p className="text-xs text-gray-500">
                          {proj.dataSources?.length || 0} data sources
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    {proj.description && (
                      <p className="text-xs text-gray-400 truncate">{proj.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources Grid */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-white text-center mb-8">Connect to Any Data Source</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-green-500/50 transition-colors group">
                <FileSpreadsheet className="w-8 h-8 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">CSV</p>
                <p className="text-xs text-gray-500">Upload files</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-emerald-500/50 transition-colors group">
                <Table className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">Excel</p>
                <p className="text-xs text-gray-500">XLSX/XLS</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-blue-500/50 transition-colors group">
                <Database className="w-8 h-8 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">PostgreSQL</p>
                <p className="text-xs text-gray-500">Connect DB</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-cyan-500/50 transition-colors group">
                <Server className="w-8 h-8 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">SQLite</p>
                <p className="text-xs text-gray-500">Local DB</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-amber-500/50 transition-colors group">
                <Layers className="w-8 h-8 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">JSON</p>
                <p className="text-xs text-gray-500">API Data</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-orange-500/50 transition-colors group">
                <FileText className="w-8 h-8 text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">PDF</p>
                <p className="text-xs text-gray-500">OCR & Extract</p>
              </div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-center hover:border-purple-500/50 transition-colors group">
                <Globe className="w-8 h-8 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-white font-medium">AACT</p>
                <p className="text-xs text-gray-500">Clinical Trials</p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Natural Language Queries"
              description="Ask questions in plain English. Claude understands your intent and generates the right SQL or pandas operations."
              color="text-blue-400"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Auto-Generated Dashboards"
              description="Describe what you want and get complete dashboards with multiple charts instantly."
              color="text-purple-400"
            />
            <FeatureCard
              icon={<Wand2 className="w-6 h-6" />}
              title="AI Dashboard Editor"
              description="Edit dashboards with natural language. Add, remove, or modify charts just by asking."
              color="text-green-400"
            />
            <FeatureCard
              icon={<LayoutDashboard className="w-6 h-6" />}
              title="Multi-Chart Generation"
              description="Ask for comprehensive analysis and get multiple related charts added to your dashboard at once."
              color="text-amber-400"
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="PDF & Scanned Docs"
              description="Extract tables from PDFs, including scanned documents. Claude's vision handles OCR automatically."
              color="text-orange-400"
            />
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Database Connections"
              description="Connect to PostgreSQL, SQLite, MySQL, or use the built-in AACT clinical trials database."
              color="text-cyan-400"
            />
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              Create Your First Analysis
            </button>
            <p className="text-gray-500 text-sm mt-4">No API keys needed. Uses your Claude Code access.</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>Data Analyst is part of ACe_Toolkit. Powered by Claude Code.</p>
          </div>
        </footer>

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  New Analysis
                </h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Sales Analysis Q4 2024"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="What do you want to analyze?"
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const res = await fetch(`${getApiUrl()}/analyst/projects`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            name: newProjectName.trim() || 'Untitled Analysis',
                            description: newProjectDescription.trim() || null
                          })
                        });
                        if (res.ok) {
                          const project = await res.json();
                          setProjects(prev => [...prev, project]);
                          setSelectedProject(project);
                          setNewProjectName('');
                          setNewProjectDescription('');
                        }
                      } catch (error) {
                        console.error('Error creating project:', error);
                      } finally {
                        setIsLoading(false);
                        setShowNewProjectModal(false);
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Project view (when a project is selected)
  return (
    <ProjectWorkspace
      project={selectedProject}
      onBack={() => setSelectedProject(null)}
    />
  );
}

export default function AnalystPage() {
  return (
    <ProtectedRoute>
      <AnalystPageContent />
    </ProtectedRoute>
  );
}
