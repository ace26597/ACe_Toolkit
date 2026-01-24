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
  BarChart3,
  Play,
  Download,
  Video,
  Palette,
  Music,
  Image,
  Search,
  Mic,
  Type,
  Volume2
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

interface RenderJob {
  job_id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  project_id: string;
  idea_id: string;
  composition: string;
  output_path?: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

interface RenderOptions {
  composition: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  background_image?: string;
  music_url?: string;
  voiceover_url?: string;
  caption_pages?: any[];
  enhanced?: boolean;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

interface ResearchResult {
  topic: string;
  statistics: string[];
  facts: string[];
  quotes: string[];
  trends: string[];
  key_points: string[];
  suggested_hook?: string;
}

interface ExistingRender {
  filename: string;
  composition: string;
  size_mb: number;
  created_at: number;
  download_url: string;
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
  projectId,
  onEdit,
  onMarkPosted,
  onDelete,
  onImproveHook,
  onRenderVideo,
  onPreviewVideo,
  onResearch
}: {
  idea: ContentIdea;
  projectId: string;
  onEdit: (idea: ContentIdea) => void;
  onMarkPosted: (ideaId: string, platform: string) => void;
  onDelete: (ideaId: string) => void;
  onImproveHook: (ideaId: string) => void;
  onRenderVideo: (idea: ContentIdea) => void;
  onPreviewVideo: (url: string, title: string) => void;
  onResearch: (ideaId: string) => void;
}) => {
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [renders, setRenders] = useState<ExistingRender[]>([]);
  const [loadingRenders, setLoadingRenders] = useState(true);

  // Fetch existing renders for this idea
  useEffect(() => {
    const fetchRenders = async () => {
      try {
        const response = await api.get(`/video-factory/projects/${projectId}/ideas/${idea.id}/renders`);
        setRenders(response.data.renders || []);
      } catch (error) {
        console.error('Failed to fetch renders:', error);
      } finally {
        setLoadingRenders(false);
      }
    };
    if (projectId && idea.id) {
      fetchRenders();
    }
  }, [projectId, idea.id]);

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

      {/* Existing Renders */}
      {renders.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
          <div className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
            <Video className="w-3 h-3" /> Rendered Videos ({renders.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {renders.map((render) => (
              <div key={render.filename} className="flex items-center gap-1">
                <button
                  onClick={() => onPreviewVideo(
                    `${api.defaults.baseURL}${render.download_url}`,
                    `${idea.title} (${render.composition})`
                  )}
                  className="flex items-center gap-1.5 px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs text-white transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>{render.composition}</span>
                </button>
                <a
                  href={`${api.defaults.baseURL}${render.download_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
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

      {/* Actions Row */}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => onResearch(idea.id)}
            className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1.5 rounded-lg flex items-center gap-1 border border-blue-500/30"
            title="Research topic for facts and statistics"
          >
            <Search className="w-3 h-3" /> Research
          </button>
          <button
            onClick={() => onRenderVideo(idea)}
            className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium"
          >
            <Video className="w-3 h-3" /> Render Video
          </button>
          <button
            onClick={() => onEdit(idea)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        </div>
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

  // Render video modal
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [renderingIdea, setRenderingIdea] = useState<ContentIdea | null>(null);
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    composition: 'ShortVideo',
    background_color: '#0a0a0a',
    text_color: '#ffffff',
    accent_color: '#8b5cf6',
    enhanced: true,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [activeRenderJob, setActiveRenderJob] = useState<RenderJob | null>(null);

  // Video preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [previewVideoTitle, setPreviewVideoTitle] = useState('');

  // Voiceover state
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [voiceoverResult, setVoiceoverResult] = useState<{url: string; captions: any[]} | null>(null);

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [showResearchModal, setShowResearchModal] = useState(false);

  // Enhanced script generation
  const [useResearch, setUseResearch] = useState(true);

  // Open video preview
  const openPreview = (url: string, title: string) => {
    setPreviewVideoUrl(url);
    setPreviewVideoTitle(title);
    setShowPreviewModal(true);
  };

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

  // Open render modal
  const openRenderModal = (idea: ContentIdea) => {
    setRenderingIdea(idea);
    setShowRenderModal(true);
    setActiveRenderJob(null);
    setVoiceoverResult(null);
    // Reset render options but keep enhanced and colors
    setRenderOptions({
      ...renderOptions,
      voiceover_url: undefined,
      caption_pages: undefined,
    });
  };

  // Start video render
  const startRender = async () => {
    if (!selectedProject || !renderingIdea) return;

    setIsRendering(true);
    try {
      const response = await api.post(
        `/video-factory/projects/${selectedProject.id}/ideas/${renderingIdea.id}/render`,
        renderOptions
      );

      const job: RenderJob = {
        job_id: response.data.job_id,
        status: 'pending',
        project_id: selectedProject.id,
        idea_id: renderingIdea.id,
        composition: renderOptions.composition,
      };
      setActiveRenderJob(job);

      // Poll for status
      pollRenderStatus(response.data.job_id);
    } catch (error) {
      console.error('Failed to start render:', error);
      alert('Failed to start render. Please try again.');
      setIsRendering(false);
    }
  };

  // Poll render job status
  const pollRenderStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await api.get(`/video-factory/render-jobs/${jobId}`);
        const job = response.data as RenderJob;
        job.job_id = jobId;
        setActiveRenderJob(job);

        if (job.status === 'pending' || job.status === 'rendering') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setIsRendering(false);
        }
      } catch (error) {
        console.error('Failed to get render status:', error);
        setIsRendering(false);
      }
    };
    poll();
  };

  // Download rendered video
  const downloadVideo = async () => {
    if (!activeRenderJob?.job_id) return;

    const baseUrl = getApiUrl();
    window.open(`${baseUrl}/video-factory/render-jobs/${activeRenderJob.job_id}/download`, '_blank');
  };

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await api.get('/video-factory/voices');
        setVoices(response.data.voices || []);
        setSelectedVoice(response.data.default || 'alloy');
      } catch (error) {
        console.error('Failed to load voices:', error);
        // Set default voices if API fails
        setVoices([
          { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
          { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
          { id: 'fable', name: 'Fable', description: 'Expressive, dynamic' },
          { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
          { id: 'nova', name: 'Nova', description: 'Friendly, upbeat' },
          { id: 'shimmer', name: 'Shimmer', description: 'Clear, professional' },
        ]);
      }
    };
    loadVoices();
  }, []);

  // Generate voiceover for an idea
  const generateVoiceover = async () => {
    if (!selectedProject || !renderingIdea) return;

    setIsGeneratingVoiceover(true);
    try {
      const response = await api.post(
        `/video-factory/projects/${selectedProject.id}/ideas/${renderingIdea.id}/voiceover`,
        { voice: selectedVoice, speed: 1.0 }
      );

      if (response.data.success) {
        setVoiceoverResult({
          url: response.data.voiceover_url,
          captions: response.data.caption_pages || [],
        });
        // Update render options with voiceover
        setRenderOptions({
          ...renderOptions,
          voiceover_url: response.data.voiceover_url,
          caption_pages: response.data.caption_pages,
        });
      } else {
        alert('Failed to generate voiceover: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to generate voiceover:', error);
      alert('Failed to generate voiceover. Please try again.');
    } finally {
      setIsGeneratingVoiceover(false);
    }
  };

  // Research topic for an idea
  const researchTopic = async (ideaId: string) => {
    if (!selectedProject) return;

    setIsResearching(true);
    setShowResearchModal(true);
    setResearchResult(null);
    try {
      const response = await api.post(
        `/video-factory/projects/${selectedProject.id}/ideas/${ideaId}/research`,
        { style: generateStyle, depth: 'basic' }
      );

      if (response.data.success) {
        setResearchResult(response.data.research);
      } else {
        alert('Research failed. Please try again.');
        setShowResearchModal(false);
      }
    } catch (error) {
      console.error('Failed to research topic:', error);
      alert('Research failed. Please try again.');
      setShowResearchModal(false);
    } finally {
      setIsResearching(false);
    }
  };

  // Generate enhanced script with research
  const generateEnhancedScript = async () => {
    if (!selectedProject || !generateTopic) return;

    setIsGenerating(true);
    try {
      // Create idea first if needed, then generate enhanced script
      const scriptResponse = await api.post(
        `/video-factory/projects/${selectedProject.id}/generate-script`,
        { topic: generateTopic, style: generateStyle }
      );

      if (scriptResponse.data.success && useResearch) {
        // Get the idea ID from response
        const ideaId = scriptResponse.data.idea?.id;
        if (ideaId) {
          // Generate enhanced script with research
          await api.post(
            `/video-factory/projects/${selectedProject.id}/ideas/${ideaId}/generate-enhanced-script`,
            { duration: 60, style: generateStyle, use_research: true }
          );
        }
      }

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
              <div className="p-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Video Factory</h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">AI-Powered Short Video Creation</p>
              </div>
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

              {/* Pipeline Features Banner */}
              <div className="bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-orange-900/30 border border-purple-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Search className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-blue-300">Web Research</div>
                        <div className="text-[10px] text-gray-500">Claude Code</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                        <Mic className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-indigo-300">AI Voiceover</div>
                        <div className="text-[10px] text-gray-500">OpenAI TTS</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-500/20 rounded-lg">
                        <Type className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-purple-300">TikTok Captions</div>
                        <div className="text-[10px] text-gray-500">Word-by-word</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-500/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-green-300">Pro Animations</div>
                        <div className="text-[10px] text-gray-500">Spring Physics</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Powered by</div>
                    <div className="text-sm font-medium bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">Remotion</div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold">{selectedProject.ideas?.length || 0}</div>
                  <div className="text-xs text-gray-500">Total Ideas</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {selectedProject.ideas?.filter(i => i.status === 'script_ready').length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Ready to Render</div>
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
                      projectId={selectedProject.id}
                      onEdit={setEditingIdea}
                      onMarkPosted={markPosted}
                      onDelete={deleteIdea}
                      onImproveHook={improveHook}
                      onRenderVideo={openRenderModal}
                      onPreviewVideo={openPreview}
                      onResearch={researchTopic}
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

              {/* Research Toggle */}
              {generateCount === 1 && (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-blue-300">Web Research</span>
                        <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded">Claude Code</span>
                        <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">Recommended</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        AI-powered web search finds statistics, facts, and expert quotes automatically
                      </p>
                    </div>
                    <button
                      onClick={() => setUseResearch(!useResearch)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        useResearch ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                          useResearch ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={generateCount === 1 ? (useResearch ? generateEnhancedScript : generateScript) : generateIdeas}
                disabled={!generateTopic || isGenerating}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {useResearch && generateCount === 1 ? 'Researching & Generating...' : 'Generating...'}
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

      {/* Render Video Modal */}
      {showRenderModal && renderingIdea && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Render Video</h2>
                <p className="text-sm text-gray-400 truncate max-w-sm">{renderingIdea.title}</p>
              </div>
            </div>

            {!activeRenderJob ? (
              <>
                {/* Render Options */}
                <div className="space-y-4">
                  {/* Enhanced Mode Toggle */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="font-medium text-purple-300">Enhanced Mode</span>
                          <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">Recommended</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Smooth transitions, spring animations, keyword emphasis
                        </p>
                      </div>
                      <button
                        onClick={() => setRenderOptions({ ...renderOptions, enhanced: !renderOptions.enhanced })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          renderOptions.enhanced ? 'bg-purple-500' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                            renderOptions.enhanced ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Format Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Video Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'ShortVideo', label: 'Vertical 60s', desc: 'TikTok, Reels, Shorts' },
                        { id: 'ShortVideo30', label: 'Vertical 30s', desc: 'Short clips' },
                        { id: 'SquareVideo', label: 'Square 60s', desc: 'Instagram Feed' },
                      ].map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setRenderOptions({ ...renderOptions, composition: format.id })}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            renderOptions.composition === format.id
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-sm font-medium">{format.label}</div>
                          <div className="text-xs text-gray-500">{format.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Options */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        <Palette className="w-3 h-3 inline mr-1" />Background
                      </label>
                      <input
                        type="color"
                        value={renderOptions.background_color}
                        onChange={(e) => setRenderOptions({ ...renderOptions, background_color: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={renderOptions.text_color}
                        onChange={(e) => setRenderOptions({ ...renderOptions, text_color: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Accent</label>
                      <input
                        type="color"
                        value={renderOptions.accent_color}
                        onChange={(e) => setRenderOptions({ ...renderOptions, accent_color: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Voiceover Section */}
                  <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium text-indigo-300">AI Voiceover</span>
                      {voiceoverResult && (
                        <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" /> Generated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Voice</label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                        >
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={generateVoiceover}
                        disabled={isGeneratingVoiceover}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 mt-4"
                      >
                        {isGeneratingVoiceover ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>

                    {voiceoverResult && (
                      <div className="bg-gray-800 rounded p-2 text-xs">
                        <div className="flex items-center gap-2 text-green-400">
                          <Check className="w-3 h-3" />
                          <span>Voiceover ready with {voiceoverResult.captions.length} caption pages</span>
                        </div>
                        <p className="text-gray-500 mt-1">TikTok-style animated captions will be included in the video</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Uses OpenAI TTS. Captions are auto-generated with word-level timing.
                    </p>
                  </div>

                  {/* Optional Media */}
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" /> Optional: Background Image URL
                    </div>
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={renderOptions.background_image || ''}
                      onChange={(e) => setRenderOptions({ ...renderOptions, background_image: e.target.value || undefined })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for solid color background</p>
                  </div>

                  {/* Render Time Warning */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                    <p className="text-yellow-400 font-medium">Rendering on Raspberry Pi</p>
                    <p className="text-yellow-300/70 text-xs mt-1">
                      Estimated time: {renderOptions.composition === 'ShortVideo' ? '2-3 minutes' :
                        renderOptions.composition === 'ShortVideo30' ? '1-2 minutes' : '2-3 minutes'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowRenderModal(false)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startRender}
                    disabled={isRendering}
                    className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg flex items-center justify-center gap-2 font-medium"
                  >
                    <Play className="w-4 h-4" />
                    Start Render
                  </button>
                </div>
              </>
            ) : (
              /* Render Progress */
              <div className="text-center py-6">
                {activeRenderJob.status === 'pending' && (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-yellow-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">Queued</p>
                    <p className="text-sm text-gray-400">Preparing to render...</p>
                  </>
                )}
                {activeRenderJob.status === 'rendering' && (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">Rendering Video</p>
                    <p className="text-sm text-gray-400">This may take a few minutes...</p>
                    <div className="mt-4 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-500 h-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </>
                )}
                {activeRenderJob.status === 'completed' && (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-green-400">Render Complete!</p>
                    <p className="text-sm text-gray-400 mb-4">Your video is ready to download</p>
                    <button
                      onClick={downloadVideo}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg flex items-center justify-center gap-2 mx-auto font-medium"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </button>
                  </>
                )}
                {activeRenderJob.status === 'failed' && (
                  <>
                    <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-red-400">Render Failed</p>
                    <p className="text-sm text-gray-400 mb-2">{activeRenderJob.error || 'An error occurred'}</p>
                    <button
                      onClick={() => setActiveRenderJob(null)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Try Again
                    </button>
                  </>
                )}

                {activeRenderJob.status !== 'completed' && activeRenderJob.status !== 'failed' && (
                  <button
                    onClick={() => {
                      setShowRenderModal(false);
                      setActiveRenderJob(null);
                      setIsRendering(false);
                    }}
                    className="mt-6 text-sm text-gray-400 hover:text-white"
                  >
                    Close (render continues in background)
                  </button>
                )}
                {(activeRenderJob.status === 'completed' || activeRenderJob.status === 'failed') && (
                  <button
                    onClick={() => {
                      setShowRenderModal(false);
                      setActiveRenderJob(null);
                    }}
                    className="mt-4 text-sm text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setShowPreviewModal(false)}>
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2"
            >
              <X className="w-6 h-6" />
              <span className="text-sm">Close (Esc)</span>
            </button>

            {/* Title */}
            <h3 className="text-white text-lg font-medium mb-3 truncate">{previewVideoTitle}</h3>

            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full max-h-[80vh]"
                style={{ aspectRatio: '9/16', maxWidth: '400px', margin: '0 auto', display: 'block' }}
              >
                Your browser does not support video playback.
              </video>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <a
                href={previewVideoUrl}
                download
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 text-white"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <a
                href={previewVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 text-white"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
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

      {/* Research Results Modal */}
      {showResearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Research Results</h2>
                <p className="text-sm text-gray-400">{researchResult?.topic || 'Researching...'}</p>
              </div>
            </div>

            {isResearching ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-gray-800 rounded-full">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
                <p className="text-gray-300 font-medium">Claude Code is searching the web...</p>
                <p className="text-gray-500 text-sm mt-1">Finding statistics, facts, and quotes</p>
                <div className="mt-4 text-xs text-gray-600 bg-gray-800 px-3 py-1.5 rounded-full">
                  No external API - Built-in web search
                </div>
              </div>
            ) : researchResult ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Suggested Hook */}
                {researchResult.suggested_hook && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-purple-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> SUGGESTED HOOK
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(researchResult.suggested_hook || '');
                          alert('Hook copied!');
                        }}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <p className="text-sm text-white">"{researchResult.suggested_hook}"</p>
                  </div>
                )}

                {/* Statistics */}
                {researchResult.statistics.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" /> Statistics ({researchResult.statistics.length})
                    </h3>
                    <div className="space-y-2">
                      {researchResult.statistics.map((stat, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-700/50 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(stat);
                            alert('Statistic copied!');
                          }}
                        >
                          {stat}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facts */}
                {researchResult.facts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Key Facts ({researchResult.facts.length})
                    </h3>
                    <div className="space-y-2">
                      {researchResult.facts.map((fact, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-700/50 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(fact);
                            alert('Fact copied!');
                          }}
                        >
                          {fact}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quotes */}
                {researchResult.quotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                      <FileText className="w-4 h-4" /> Notable Quotes ({researchResult.quotes.length})
                    </h3>
                    <div className="space-y-2">
                      {researchResult.quotes.map((quote, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-700/50 rounded text-sm text-gray-300 italic cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(quote);
                            alert('Quote copied!');
                          }}
                        >
                          "{quote}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Points */}
                {researchResult.key_points.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Key Points ({researchResult.key_points.length})
                    </h3>
                    <div className="space-y-2">
                      {researchResult.key_points.map((point, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-700/50 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            navigator.clipboard.writeText(point);
                            alert('Point copied!');
                          }}
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {researchResult.statistics.length === 0 &&
                 researchResult.facts.length === 0 &&
                 researchResult.quotes.length === 0 &&
                 researchResult.key_points.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No research findings available</p>
                    <p className="text-sm">Try a more specific topic</p>
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={() => {
                setShowResearchModal(false);
                setResearchResult(null);
              }}
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
