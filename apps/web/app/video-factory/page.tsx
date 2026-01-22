'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Wand2,
  Loader2,
  Check,
  X,
  Film,
  Clock,
  Edit3,
  Eye,
  Sparkles,
  Copy,
  ExternalLink,
  Youtube,
  Instagram,
  Hash,
  Zap,
  TrendingUp,
  CheckCircle2,
  Circle,
  BarChart3
} from 'lucide-react';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { getApiUrl } from '@/lib/api';

// Simple API client
const api = {
  defaults: { baseURL: '' },
  get: async (url: string) => {
    const baseUrl = getApiUrl();
    api.defaults.baseURL = baseUrl;
    const res = await fetch(`${baseUrl}${url}`);
    return { data: await res.json() };
  },
  post: async (url: string, data?: any) => {
    const baseUrl = getApiUrl();
    api.defaults.baseURL = baseUrl;
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: await res.json() };
  },
  put: async (url: string, data?: any) => {
    const baseUrl = getApiUrl();
    api.defaults.baseURL = baseUrl;
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: await res.json() };
  },
  delete: async (url: string) => {
    const baseUrl = getApiUrl();
    api.defaults.baseURL = baseUrl;
    const res = await fetch(`${baseUrl}${url}`, { method: 'DELETE' });
    return { data: await res.json() };
  },
};

// TikTok icon component
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Types
interface Platform {
  platform: string;
  posted: boolean;
  posted_at?: string;
  url?: string;
  views: number;
  likes: number;
  comments: number;
}

interface ContentIdea {
  id: string;
  title: string;
  topic: string;
  hook: string;
  script: string;
  cta: string;
  hashtags: string[];
  status: string;
  platforms: Platform[];
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ContentProject {
  id: string;
  email: string;
  name: string;
  niche: string;
  ideas_count: number;
  ideas?: ContentIdea[];
  created_at: string;
  updated_at: string;
}

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500',
    script_ready: 'bg-blue-500',
    recorded: 'bg-purple-500',
    posted_partial: 'bg-yellow-500',
    posted_all: 'bg-green-500',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    script_ready: 'Ready',
    recorded: 'Recorded',
    posted_partial: 'Partial',
    posted_all: 'Posted',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${colors[status] || 'bg-gray-500'}`}>
      {labels[status] || status}
    </span>
  );
};

// Platform Icon Component
const PlatformIcon = ({ platform, posted }: { platform: string; posted: boolean }) => {
  const icons: Record<string, React.ReactNode> = {
    youtube_shorts: <Youtube className="w-4 h-4" />,
    tiktok: <TikTokIcon />,
    instagram_reels: <Instagram className="w-4 h-4" />,
  };

  return (
    <div className={`p-1.5 rounded ${posted ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
      {icons[platform] || <Film className="w-4 h-4" />}
    </div>
  );
};

// Content Card Component
const ContentCard = ({
  idea,
  onEdit,
  onMarkPosted,
  onDelete,
  onImproveHook
}: {
  idea: ContentIdea;
  onEdit: (idea: ContentIdea) => void;
  onMarkPosted: (ideaId: string, platform: string) => void;
  onDelete: (ideaId: string) => void;
  onImproveHook: (ideaId: string) => void;
}) => {
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-white mb-1 line-clamp-1">{idea.title}</h3>
          <p className="text-xs text-gray-500">{idea.topic}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <StatusBadge status={idea.status} />
          <button
            onClick={() => onDelete(idea.id)}
            className="text-gray-500 hover:text-red-400 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hook - Most Important */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-purple-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> HOOK (First 3 seconds)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onImproveHook(idea.id)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" /> Improve
            </button>
            <button
              onClick={() => copyToClipboard(idea.hook, 'hook')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {copied === 'hook' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <p className="text-sm text-white font-medium">"{idea.hook}"</p>
      </div>

      {/* Script Toggle */}
      <button
        onClick={() => setShowScript(!showScript)}
        className="w-full text-left text-xs text-gray-400 hover:text-white flex items-center gap-1 mb-2"
      >
        <Eye className="w-3 h-3" />
        {showScript ? 'Hide Script' : 'Show Full Script'}
      </button>

      {showScript && (
        <div className="bg-gray-900 rounded-lg p-3 mb-3 text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {idea.script}
          <button
            onClick={() => copyToClipboard(idea.script, 'script')}
            className="mt-2 text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> {copied === 'script' ? 'Copied!' : 'Copy Script'}
          </button>
        </div>
      )}

      {/* CTA */}
      <div className="text-xs text-gray-400 mb-3">
        <span className="text-gray-500">CTA:</span> {idea.cta}
      </div>

      {/* Hashtags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {idea.hashtags.slice(0, 5).map((tag, i) => (
          <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            #{tag.replace('#', '')}
          </span>
        ))}
        <button
          onClick={() => copyToClipboard(idea.hashtags.map(t => `#${t.replace('#', '')}`).join(' '), 'hashtags')}
          className="text-xs text-gray-500 hover:text-white"
        >
          {copied === 'hashtags' ? 'Copied!' : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Platform Status */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <div className="flex gap-2">
          {idea.platforms.map((p) => (
            <button
              key={p.platform}
              onClick={() => !p.posted && onMarkPosted(idea.id, p.platform)}
              className="relative group"
              title={p.posted ? `Posted${p.views ? ` - ${p.views} views` : ''}` : 'Click to mark as posted'}
            >
              <PlatformIcon platform={p.platform} posted={p.posted} />
              {p.posted && p.views > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-green-500 text-white rounded px-1">
                  {p.views > 1000 ? `${(p.views/1000).toFixed(1)}k` : p.views}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => onEdit(idea)}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> Edit
        </button>
      </div>
    </div>
  );
};

// Main Component
function ContentFactoryContent() {
  const { user } = useAuth();
  const email = user?.email || '';

  // Projects state
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null);
  const [loading, setLoading] = useState(false);

  // Create project modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectNiche, setNewProjectNiche] = useState('');

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateStyle, setGenerateStyle] = useState('educational');
  const [generateCount, setGenerateCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit modal
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null);

  // Alternative hooks modal
  const [alternativeHooks, setAlternativeHooks] = useState<string[]>([]);
  const [showHooksModal, setShowHooksModal] = useState(false);
  const [loadingHooks, setLoadingHooks] = useState(false);

  // Load projects on mount when user is available
  useEffect(() => {
    if (email) {
      loadProjects(email);
    }
  }, [email]);

  // Load projects
  const loadProjects = async (userEmail?: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/video-factory/projects?email=${encodeURIComponent(userEmail || email)}`);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load project details
  const loadProjectDetails = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}`);
      setSelectedProject(response.data);
    } catch (error) {
      console.error('Failed to load project details:', error);
    }
  };

  // Create project
  const createProject = async () => {
    if (!newProjectName || !newProjectNiche) return;

    try {
      const response = await api.post('/video-factory/projects', {
        email,
        name: newProjectName,
        niche: newProjectNiche
      });

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectNiche('');
      loadProjects();
      loadProjectDetails(response.data.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Delete project
  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      await api.delete(`/video-factory/projects/${projectId}`);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Generate content ideas
  const generateIdeas = async () => {
    if (!selectedProject || !generateTopic) return;

    setIsGenerating(true);
    try {
      await api.post(`/video-factory/projects/${selectedProject.id}/generate-ideas`, {
        topic: generateTopic,
        count: generateCount
      });

      setShowGenerateModal(false);
      setGenerateTopic('');
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to generate ideas:', error);
      alert('Failed to generate ideas. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate single script
  const generateScript = async () => {
    if (!selectedProject || !generateTopic) return;

    setIsGenerating(true);
    try {
      await api.post(`/video-factory/projects/${selectedProject.id}/generate-script`, {
        topic: generateTopic,
        style: generateStyle
      });

      setShowGenerateModal(false);
      setGenerateTopic('');
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to generate script:', error);
      alert('Failed to generate script. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Improve hook
  const improveHook = async (ideaId: string) => {
    if (!selectedProject) return;

    setLoadingHooks(true);
    setShowHooksModal(true);
    try {
      const response = await api.post(`/video-factory/projects/${selectedProject.id}/ideas/${ideaId}/improve-hook`);
      setAlternativeHooks(response.data.hooks || []);
    } catch (error) {
      console.error('Failed to improve hook:', error);
      setAlternativeHooks([]);
    } finally {
      setLoadingHooks(false);
    }
  };

  // Mark as posted
  const markPosted = async (ideaId: string, platform: string) => {
    if (!selectedProject) return;

    const url = prompt('Enter the post URL (optional):');

    try {
      await api.post(`/video-factory/projects/${selectedProject.id}/ideas/${ideaId}/mark-posted`, {
        platform,
        url: url || undefined
      });
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to mark as posted:', error);
    }
  };

  // Delete idea
  const deleteIdea = async (ideaId: string) => {
    if (!selectedProject) return;
    if (!confirm('Delete this content idea?')) return;

    try {
      await api.delete(`/video-factory/projects/${selectedProject.id}/ideas/${ideaId}`);
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  // Save edited idea
  const saveEditedIdea = async () => {
    if (!selectedProject || !editingIdea) return;

    try {
      await api.put(`/video-factory/projects/${selectedProject.id}/ideas/${editingIdea.id}`, {
        title: editingIdea.title,
        hook: editingIdea.hook,
        script: editingIdea.script,
        cta: editingIdea.cta,
        hashtags: editingIdea.hashtags,
        notes: editingIdea.notes
      });
      setEditingIdea(null);
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to save idea:', error);
    }
  };

  // Main interface
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white">
              <Home className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">Shorts Factory</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{email}</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Channel
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Project List */}
        <div className="w-72 bg-gray-800/50 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Channels</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No channels yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-purple-400 hover:text-purple-300"
                >
                  Create your first channel
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => loadProjectDetails(project.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-purple-600/30 border border-purple-500'
                        : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-gray-700 px-2 py-0.5 rounded">{project.niche}</span>
                      <span>{project.ideas_count} ideas</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedProject ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a channel or create a new one</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Project Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                  <p className="text-gray-400">Niche: {selectedProject.niche}</p>
                </div>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center gap-2 font-medium"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Content
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold">{selectedProject.ideas?.length || 0}</div>
                  <div className="text-xs text-gray-500">Total Ideas</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedProject.ideas?.filter(i => i.status === 'script_ready').length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Ready to Record</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">
                    {selectedProject.ideas?.filter(i => i.status === 'posted_partial').length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Partially Posted</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {selectedProject.ideas?.filter(i => i.status === 'posted_all').length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Fully Posted</div>
                </div>
              </div>

              {/* Content Ideas Grid */}
              {selectedProject.ideas && selectedProject.ideas.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedProject.ideas.map((idea) => (
                    <ContentCard
                      key={idea.id}
                      idea={idea}
                      onEdit={setEditingIdea}
                      onMarkPosted={markPosted}
                      onDelete={deleteIdea}
                      onImproveHook={improveHook}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No content ideas yet</p>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
                  >
                    Generate Your First Ideas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Channel</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., AI Tips Daily"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Niche</label>
                <select
                  value={newProjectNiche}
                  onChange={(e) => setNewProjectNiche(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select a niche</option>
                  <option value="AI & Tech">AI & Tech</option>
                  <option value="Finance">Finance</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Programming">Programming</option>
                  <option value="Science">Science</option>
                  <option value="News">News</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectName || !newProjectNiche}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Content Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Generate Content Ideas</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Topic</label>
                <input
                  type="text"
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  placeholder="e.g., Best AI tools for productivity"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Style</label>
                <select
                  value={generateStyle}
                  onChange={(e) => setGenerateStyle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="educational">Educational - Teach something valuable</option>
                  <option value="listicle">Listicle - Quick tips or facts</option>
                  <option value="tutorial">Tutorial - Step-by-step how-to</option>
                  <option value="reaction">Reaction - Hot take on news/trend</option>
                  <option value="storytime">Storytime - Mini-story with lesson</option>
                  <option value="controversial">Controversial - Bold stance (debate)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Number of Ideas</label>
                <select
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>1 detailed script</option>
                  <option value={3}>3 ideas (quick batch)</option>
                  <option value={5}>5 ideas (content week)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={generateCount === 1 ? generateScript : generateIdeas}
                disabled={!generateTopic || isGenerating}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Idea Modal */}
      {editingIdea && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Content</h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editingIdea.title}
                  onChange={(e) => setEditingIdea({...editingIdea, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Hook (First 3 seconds)</label>
                <textarea
                  value={editingIdea.hook}
                  onChange={(e) => setEditingIdea({...editingIdea, hook: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Script</label>
                <textarea
                  value={editingIdea.script}
                  onChange={(e) => setEditingIdea({...editingIdea, script: e.target.value})}
                  rows={8}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Call to Action</label>
                <input
                  type="text"
                  value={editingIdea.cta}
                  onChange={(e) => setEditingIdea({...editingIdea, cta: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Hashtags (comma separated)</label>
                <input
                  type="text"
                  value={editingIdea.hashtags.join(', ')}
                  onChange={(e) => setEditingIdea({...editingIdea, hashtags: e.target.value.split(',').map(t => t.trim())})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={editingIdea.notes}
                  onChange={(e) => setEditingIdea({...editingIdea, notes: e.target.value})}
                  rows={2}
                  placeholder="Recording tips, ideas, etc."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingIdea(null)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedIdea}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Hooks Modal */}
      {showHooksModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Alternative Hooks</h2>

            {loadingHooks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : alternativeHooks.length > 0 ? (
              <div className="space-y-2">
                {alternativeHooks.map((hook, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 flex items-center justify-between"
                    onClick={() => {
                      navigator.clipboard.writeText(hook);
                      alert('Hook copied!');
                    }}
                  >
                    <span className="text-sm">"{hook}"</span>
                    <Copy className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No alternative hooks generated</p>
            )}

            <button
              onClick={() => setShowHooksModal(false)}
              className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentFactoryPage() {
  return (
    <ProtectedRoute>
      <ContentFactoryContent />
    </ProtectedRoute>
  );
}
