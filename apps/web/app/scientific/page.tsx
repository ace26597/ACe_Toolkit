"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Terminal as TerminalIcon,
  BookOpen,
  History,
  Search,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  MessageSquare
} from 'lucide-react';
import { skillsApi, Skill, SkillExecution, MCPStatus } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import ChatInterface from '@/components/scientific/ChatInterface';

// Dynamic import for Terminal component (client-only)
const Terminal = dynamic(() => import('@/components/scientific/Terminal'), {
  ssr: false,
  loading: () => <div className="h-[600px] flex items-center justify-center text-gray-400">Loading terminal...</div>
});

type TabType = 'chat' | 'terminal' | 'skills' | 'history';

export default function ScientificPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [executionHistory, setExecutionHistory] = useState<SkillExecution[]>([]);
  const [mcpStatus, setMCPStatus] = useState<MCPStatus | null>(null);
  const [sessionId] = useState(() => {
    // Generate session ID for this browser session
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  });

  // Get API URL from environment
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const wsUrl = apiUrl.replace(/^http/, 'ws') + '/skills/terminal';

  // Load skills on mount
  useEffect(() => {
    loadSkills();
    loadMCPStatus();
    loadExecutionHistory();

    // Refresh history every 10 seconds
    const interval = setInterval(() => {
      if (activeTab === 'history') {
        loadExecutionHistory();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const loadSkills = async () => {
    try {
      const data = await skillsApi.listSkills();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
      showToast({ message: 'Failed to load skills', type: 'error' });
    }
  };

  const loadMCPStatus = async () => {
    try {
      const status = await skillsApi.getStatus();
      setMCPStatus(status);
    } catch (error) {
      console.error('Failed to load MCP status:', error);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const history = await skillsApi.getHistory(sessionId);
      setExecutionHistory(history);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(skills.map(s => s.category))];

  // Filter skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copySkillCommand = (skill: Skill) => {
    const paramNames = Object.keys(skill.parameters);
    const paramPlaceholders = paramNames.map(p => `--${p} <value>`).join(' ');
    const command = `${skill.name} ${paramPlaceholders}`;

    navigator.clipboard.writeText(command);
    showToast({ message: `Copied: ${skill.name}`, type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🧪</span>
                Scientific Skills Terminal
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Access 140+ scientific computing tools from your browser
              </p>
            </div>

            {/* MCP Status */}
            {mcpStatus && (
              <div className="flex items-center gap-3 bg-gray-800/50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${mcpStatus.running ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-300">
                    {mcpStatus.running ? 'MCP Running' : 'MCP Offline'}
                  </span>
                </div>
                {mcpStatus.running && (
                  <>
                    <div className="w-px h-6 bg-gray-600" />
                    <span className="text-xs text-gray-400">
                      {mcpStatus.skills_count} skills • {mcpStatus.memory_mb}MB
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'terminal'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'skills'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Skills Browser ({skills.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <History className="w-4 h-4" />
              Execution History ({executionHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-[600px] bg-gray-800/30 rounded-lg border border-gray-700">
            <ChatInterface
              conversationId={null}
              sessionId={sessionId}
              onConversationCreated={(id) => {
                console.log('New conversation created:', id);
              }}
            />
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="bg-gray-800/30 rounded-lg border border-gray-700 overflow-hidden">
            <Terminal websocketUrl={wsUrl} className="h-[600px]" />
          </div>
        )}

        {/* Skills Browser Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.name}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{skill.name}</h3>
                      <span className="text-xs text-gray-400">{skill.category}</span>
                    </div>
                    <button
                      onClick={() => copySkillCommand(skill)}
                      className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                      title="Copy command"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{skill.description}</p>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Parameters:</div>
                    {Object.entries(skill.parameters).map(([name, type]) => (
                      <div key={name} className="text-xs font-mono text-gray-400">
                        --{name} <span className="text-blue-400">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredSkills.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No skills found matching your search.
              </div>
            )}
          </div>
        )}

        {/* Execution History Tab */}
        {activeTab === 'history' && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Skill
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Output
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {executionHistory.map((execution) => (
                    <tr key={execution.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(execution.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono text-blue-400">
                          {execution.skill_name}
                        </div>
                        <div className="text-xs font-mono text-gray-500 truncate max-w-xs">
                          {execution.command}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {execution.status === 'success' ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {execution.execution_time_ms}ms
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {execution.output ? (
                          <div className="text-xs font-mono text-gray-300 max-w-md truncate">
                            {execution.output}
                          </div>
                        ) : execution.error ? (
                          <div className="text-xs font-mono text-red-400 max-w-md truncate">
                            {execution.error}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {executionHistory.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No execution history yet. Run some skills in the terminal!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
