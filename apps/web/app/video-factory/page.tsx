'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  Trash2,
  Loader2,
  Film,
  Sparkles,
  FileJson,
  Play,
  Download,
  RefreshCw,
  Check,
  X,
  Wand2,
  ChevronRight,
  FileText,
  Edit3,
  Layers,
  Clock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { getApiUrl } from '@/lib/api';
import {
  ContextPanel,
  PlanPreview,
  SceneEditor,
  RecommendationsPanel,
  StepIndicator,
  VisualPreview,
  VideoPopup,
  VIDEO_STUDIO_STEPS,
  Scene,
} from '@/components/video-studio';

// API client
const api = {
  get: async (url: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, { credentials: 'include' });
    return { data: await res.json() };
  },
  post: async (url: string, data?: any) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: await res.json() };
  },
  put: async (url: string, data: any) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return { data: await res.json() };
  },
  delete: async (url: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return { data: await res.json() };
  },
  uploadForm: async (url: string, formData: FormData) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return { data: await res.json() };
  },
  stream: (url: string, data: any) => {
    const baseUrl = getApiUrl();
    return fetch(`${baseUrl}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  },
};

// Types
interface ContentProject {
  id: string;
  email: string;
  name: string;
  niche: string;
  ideas_count: number;
  created_at: string;
  updated_at: string;
}

interface Recommendations {
  rec_id: string;
  idea: string;
  generated_at: string;
  genres: any[];
  styles: any[];
  animation_presets: any[];
  research_sources: any[];
  hook_suggestions: any[];
  scene_structure: any[];
  selected_options?: { [key: string]: string };
}

interface Plan {
  plan_id: string;
  idea: string;
  research_summary?: string;
  research_findings?: any[];
  selected_options?: any;
  hook?: { concept: string; type: string; text?: string };
  scenes: any[];
  cta?: { message: string; style: string };
  total_duration_estimate?: string;
  total_duration_seconds?: number;
  notes?: string;
}

interface VideoScript {
  id: string;
  title?: string;
  scene_count: number;
  modified_at: number;
}

interface ScriptData {
  title?: string;
  scenes: Scene[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

interface VideoRender {
  filename: string;
  path: string;
  size: number;
  created_at: number;
}

// View states for v4.0 flow
type ViewState = 'idea' | 'recommendations' | 'planning' | 'preview' | 'edit' | 'render';

// Map view state to step index
const viewToStep: { [key in ViewState]: number } = {
  idea: 0,
  recommendations: 1,
  planning: 2,
  preview: 3,
  edit: 3,
  render: 4,
};

// Main Component
function VideoStudioContent() {
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

  // View state (v4.0 flow)
  const [currentView, setCurrentView] = useState<ViewState>('idea');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Idea input
  const [ideaInput, setIdeaInput] = useState('');

  // Context state
  const [context, setContext] = useState<any>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [recsLog, setRecsLog] = useState<string[]>([]);

  // Plan state
  const [plans, setPlans] = useState<Array<{ id: string; idea: string; scene_count: number; modified_at: number }>>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planLog, setPlanLog] = useState<string[]>([]);

  // Script state
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<ScriptData | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptLog, setScriptLog] = useState<string[]>([]);

  // Scene editing
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  // Render state
  const [renders, setRenders] = useState<VideoRender[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    if (email) {
      loadProjects(email);
    }
  }, [email]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [recsLog, planLog, scriptLog]);

  // Load data when project changes
  useEffect(() => {
    if (selectedProject) {
      loadContext(selectedProject.id);
      loadPlans(selectedProject.id);
      loadScripts(selectedProject.id);
      loadRenders(selectedProject.id);
      loadRecommendations(selectedProject.id);
    }
  }, [selectedProject]);

  // API Functions
  const loadProjects = async (userEmail?: string) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/video-factory/projects?email=${encodeURIComponent(userEmail || email)}`
      );
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}`);
      setSelectedProject(response.data);
      setCurrentView('idea');
      setCompletedSteps([]);
      setRecommendations(null);
      setSelectedPlan(null);
      setSelectedPlanId(null);
      setSelectedScript(null);
      setSelectedScriptId(null);
      setIdeaInput('');
    } catch (error) {
      console.error('Failed to load project details:', error);
    }
  };

  const loadContext = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}/context`);
      setContext(response.data);
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

  const loadRecommendations = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}/recommendations`);
      if (response.data.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadPlans = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const loadScripts = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}/scripts`);
      setScripts(response.data.scripts || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  };

  const loadRenders = async (projectId: string) => {
    try {
      const response = await api.get(`/video-factory/projects/${projectId}/renders`);
      setRenders(response.data.renders || []);
    } catch (error) {
      console.error('Failed to load renders:', error);
    }
  };

  // Project CRUD
  const createProject = async () => {
    if (!newProjectName || !newProjectNiche) return;

    try {
      const response = await api.post('/video-factory/projects', {
        email,
        name: newProjectName,
        niche: newProjectNiche,
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

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this channel? This cannot be undone.')) return;

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

  // Reset session for fresh start
  const resetSession = async () => {
    if (!selectedProject) return;
    try {
      await api.delete(`/video-factory/projects/${selectedProject.id}/session`);
      setRecommendations(null);
      setSelectedPlan(null);
      setSelectedPlanId(null);
      setCompletedSteps([]);
      setCurrentView('idea');
    } catch (error) {
      console.error('Failed to reset session:', error);
    }
  };

  // Context Management
  const handleUploadContext = async (files: FileList, notes?: string) => {
    if (!selectedProject) return;

    const formData = new FormData();
    if (notes) {
      formData.append('notes', notes);
    }
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    await api.uploadForm(`/video-factory/projects/${selectedProject.id}/context`, formData);
    loadContext(selectedProject.id);
  };

  const handleImportWorkspace = async (projectName: string) => {
    if (!selectedProject || !user) return;

    await api.post(`/video-factory/projects/${selectedProject.id}/context/import`, {
      workspace_project: projectName,
      user_id: user.id,
    });
    loadContext(selectedProject.id);
  };

  const handleDeleteContextItem = async (type: string, name: string) => {
    if (!selectedProject) return;

    await api.delete(
      `/video-factory/projects/${selectedProject.id}/context/${type}/${encodeURIComponent(name)}`
    );
    loadContext(selectedProject.id);
  };

  // Step 1: Generate Recommendations
  const generateRecommendations = async () => {
    if (!ideaInput.trim() || !selectedProject || generatingRecs) return;

    setGeneratingRecs(true);
    setRecsLog(['Starting recommendations generation...']);
    setCurrentView('recommendations');

    try {
      const response = await api.stream(
        `/video-factory/projects/${selectedProject.id}/recommendations`,
        { idea: ideaInput }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                setRecsLog((prev) => [...prev, `[Status] ${event.message}`]);
              } else if (event.type === 'text') {
                const text = event.content?.slice(0, 300);
                if (text) {
                  setRecsLog((prev) => [...prev, text]);
                }
              } else if (event.type === 'tool') {
                setRecsLog((prev) => [...prev, `[Tool] ${event.tool}`]);
              } else if (event.type === 'complete') {
                if (event.success) {
                  setRecsLog((prev) => [...prev, `[Success] Recommendations ready`]);
                  setRecommendations(event.recommendations);
                  setCompletedSteps([0]);
                } else {
                  setRecsLog((prev) => [...prev, `[Error] ${event.error}`]);
                }
              } else if (event.type === 'error') {
                setRecsLog((prev) => [...prev, `[Error] ${event.error}`]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Recommendations generation failed:', error);
      setRecsLog((prev) => [...prev, `[Error] ${error}`]);
    } finally {
      setGeneratingRecs(false);
    }
  };

  // Handle recommendation selections
  const handleRecsSelect = async (selections: { [key: string]: string }) => {
    if (!selectedProject || !recommendations) return;

    try {
      await api.put(
        `/video-factory/projects/${selectedProject.id}/recommendations/${recommendations.rec_id}`,
        { selections }
      );
      setRecommendations({ ...recommendations, selected_options: selections });
    } catch (error) {
      console.error('Failed to update recommendations:', error);
    }
  };

  // Step 2: Generate Plan (after recommendations)
  const generatePlanFromRecs = async () => {
    if (!selectedProject || !recommendations || generatingPlan) return;

    setGeneratingPlan(true);
    setPlanLog(['Starting plan generation with research...']);
    setCurrentView('planning');

    try {
      const response = await api.stream(
        `/video-factory/projects/${selectedProject.id}/plan`,
        { idea: ideaInput, use_continue: true }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                setPlanLog((prev) => [...prev, `[Status] ${event.message}`]);
              } else if (event.type === 'text') {
                const text = event.content?.slice(0, 300);
                if (text) {
                  setPlanLog((prev) => [...prev, text]);
                }
              } else if (event.type === 'tool') {
                setPlanLog((prev) => [...prev, `[Tool] ${event.tool}`]);
              } else if (event.type === 'complete') {
                if (event.success) {
                  setPlanLog((prev) => [...prev, `[Success] Plan created: ${event.plan_id}`]);
                  setSelectedPlan(event.plan);
                  setSelectedPlanId(event.plan_id);
                  setCompletedSteps([0, 1, 2]);
                  loadPlans(selectedProject.id);
                  setCurrentView('preview');
                } else {
                  setPlanLog((prev) => [...prev, `[Error] ${event.error}`]);
                }
              } else if (event.type === 'error') {
                setPlanLog((prev) => [...prev, `[Error] ${event.error}`]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Plan generation failed:', error);
      setPlanLog((prev) => [...prev, `[Error] ${error}`]);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const loadPlan = async (planId: string) => {
    if (!selectedProject) return;

    try {
      const response = await api.get(
        `/video-factory/projects/${selectedProject.id}/plans/${planId}`
      );
      setSelectedPlan(response.data.plan);
      setSelectedPlanId(planId);
      setCurrentView('preview');
    } catch (error) {
      console.error('Failed to load plan:', error);
    }
  };

  const updatePlan = async (updates: Partial<Plan>) => {
    if (!selectedProject || !selectedPlanId) return;

    await api.put(`/video-factory/projects/${selectedProject.id}/plans/${selectedPlanId}`, {
      updates,
    });
    const response = await api.get(
      `/video-factory/projects/${selectedProject.id}/plans/${selectedPlanId}`
    );
    setSelectedPlan(response.data.plan);
  };

  // Step 3: Generate Script from Plan
  const generateScriptFromPlan = async () => {
    if (!selectedProject || !selectedPlanId || generatingScript) return;

    setGeneratingScript(true);
    setScriptLog(['Starting script generation from plan...']);

    try {
      const response = await api.stream(
        `/video-factory/projects/${selectedProject.id}/plans/${selectedPlanId}/generate`,
        {}
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                setScriptLog((prev) => [...prev, `[Status] ${event.message}`]);
              } else if (event.type === 'text') {
                const text = event.content?.slice(0, 300);
                if (text) {
                  setScriptLog((prev) => [...prev, text]);
                }
              } else if (event.type === 'tool') {
                setScriptLog((prev) => [...prev, `[Tool] ${event.tool}`]);
              } else if (event.type === 'complete') {
                if (event.success) {
                  setScriptLog((prev) => [
                    ...prev,
                    `[Success] Script generated: ${event.script_id}`,
                  ]);
                  setSelectedScript(event.script);
                  setSelectedScriptId(event.script_id);
                  setCompletedSteps([0, 1, 2, 3]);
                  loadScripts(selectedProject.id);
                  setCurrentView('edit');
                } else {
                  setScriptLog((prev) => [...prev, `[Error] ${event.error}`]);
                }
              } else if (event.type === 'error') {
                setScriptLog((prev) => [...prev, `[Error] ${event.error}`]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Script generation failed:', error);
      setScriptLog((prev) => [...prev, `[Error] ${error}`]);
    } finally {
      setGeneratingScript(false);
    }
  };

  const loadScript = async (scriptId: string) => {
    if (!selectedProject) return;

    try {
      const response = await api.get(
        `/video-factory/projects/${selectedProject.id}/scripts/${scriptId}`
      );
      setSelectedScript(response.data.script);
      setSelectedScriptId(scriptId);
      setCurrentView('edit');
    } catch (error) {
      console.error('Failed to load script:', error);
    }
  };

  const saveScene = async (scene: Scene) => {
    if (!selectedProject || !selectedScriptId || !selectedScript) return;

    const sceneIndex = selectedScript.scenes.findIndex((s) => s.id === scene.id);
    if (sceneIndex >= 0) {
      const newScenes = [...selectedScript.scenes];
      newScenes[sceneIndex] = scene;
      const newScript = { ...selectedScript, scenes: newScenes };

      await api.put(
        `/video-factory/projects/${selectedProject.id}/scripts/${selectedScriptId}`,
        { script: newScript }
      );
      setSelectedScript(newScript);
    }
    setEditingScene(null);
  };

  const deleteScene = async (sceneId: string) => {
    if (!selectedProject || !selectedScriptId) return;

    await api.delete(
      `/video-factory/projects/${selectedProject.id}/scripts/${selectedScriptId}/scenes/${sceneId}`
    );
    if (selectedScript) {
      setSelectedScript({
        ...selectedScript,
        scenes: selectedScript.scenes.filter((s) => s.id !== sceneId),
      });
    }
    setEditingScene(null);
  };

  // Render
  const renderVideo = async () => {
    if (!selectedProject || !selectedScriptId || rendering) return;

    setRendering(true);
    setRenderStatus('Starting render...');
    setCurrentView('render');

    try {
      const response = await api.post(
        `/video-factory/projects/${selectedProject.id}/scripts/${selectedScriptId}/render`,
        { composition: 'EnhancedVideo' }
      );

      if (response.data.status === 'started') {
        setRenderStatus('Rendering video... This may take a minute.');

        const pollInterval = setInterval(async () => {
          const rendersResponse = await api.get(
            `/video-factory/projects/${selectedProject.id}/renders`
          );
          const newRenders = rendersResponse.data.renders || [];

          if (newRenders.length > renders.length) {
            clearInterval(pollInterval);
            setRenders(newRenders);
            setRenderStatus('Video rendered successfully!');
            setCompletedSteps([0, 1, 2, 3, 4]);
            setTimeout(() => {
              setRendering(false);
              // Auto-play the newest video
              if (newRenders[0]) {
                setPlayingVideo(newRenders[0].filename);
              }
            }, 1000);
          }
        }, 5000);

        setTimeout(() => {
          clearInterval(pollInterval);
          if (rendering) {
            setRenderStatus('Render taking longer than expected. Check renders list.');
            setRendering(false);
            loadRenders(selectedProject.id);
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Render failed:', error);
      setRenderStatus(`Error: ${error}`);
      setRendering(false);
    }
  };

  // Helpers
  const formatDate = (dateStr: string | number) => {
    const date = new Date(typeof dateStr === 'number' ? dateStr * 1000 : dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVideoUrl = (filename: string) => {
    if (!selectedProject) return '';
    const baseUrl = getApiUrl();
    return `${baseUrl}/video-factory/projects/${selectedProject.id}/renders/${filename}`;
  };

  const downloadRender = (filename: string) => {
    window.open(getVideoUrl(filename), '_blank');
  };

  // Handle step navigation
  const handleStepClick = (stepIndex: number) => {
    const viewMap: ViewState[] = ['idea', 'recommendations', 'planning', 'preview', 'render'];
    if (stepIndex <= Math.max(...completedSteps, viewToStep[currentView])) {
      setCurrentView(viewMap[stepIndex]);
    }
  };

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
                <h1 className="text-xl font-bold">Video Studio</h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">
                  v4.0 - Idea → Options → Plan → Preview → Render
                </p>
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
        {/* Sidebar */}
        <div className="w-72 bg-gray-800/50 border-r border-gray-700 overflow-y-auto flex flex-col">
          {/* Channels */}
          <div className="p-4 flex-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">
              Channels
            </h2>

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
                      <span className="bg-gray-700 px-2 py-0.5 rounded">
                        {project.niche}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scripts & Renders (when project selected) */}
          {selectedProject && (
            <div className="border-t border-gray-700 p-4">
              {/* Scripts */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Scripts ({scripts.length})
              </h3>
              <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                {scripts.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => loadScript(script.id)}
                    className={`w-full text-left p-2 rounded text-sm hover:bg-gray-700 flex items-center gap-2 ${
                      selectedScriptId === script.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <FileJson className="w-4 h-4 text-purple-400" />
                    <span className="truncate">{script.title || script.id}</span>
                  </button>
                ))}
              </div>

              {/* Renders */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Videos ({renders.length})
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {renders.map((render) => (
                  <button
                    key={render.filename}
                    onClick={() => setPlayingVideo(render.filename)}
                    className="w-full text-left p-2 rounded text-sm hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 text-green-400" />
                    <span className="truncate">{render.filename}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedProject ? (
            <WelcomeView onCreateChannel={() => setShowCreateModal(true)} />
          ) : (
            <>
              {/* Step Indicator */}
              <StepIndicator
                steps={VIDEO_STUDIO_STEPS}
                currentStep={viewToStep[currentView]}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />

              <div className="p-6">
                {/* Step 1: Idea Input */}
                {currentView === 'idea' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                        <p className="text-gray-400">Enter your video idea to get started</p>
                      </div>
                      {(recommendations || plans.length > 0) && (
                        <button
                          onClick={resetSession}
                          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Start Fresh
                        </button>
                      )}
                    </div>

                    {/* Idea Input */}
                    <div className="bg-gray-800 rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        Video Idea
                      </h3>
                      <textarea
                        value={ideaInput}
                        onChange={(e) => setIdeaInput(e.target.value)}
                        placeholder="Describe your video idea...

Example: '5 AI tools that will save you 10 hours per week'
or 'Why most people fail at productivity'"
                        className="w-full h-32 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                        disabled={generatingRecs}
                      />
                      <button
                        onClick={generateRecommendations}
                        disabled={!ideaInput.trim() || generatingRecs}
                        className="mt-3 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingRecs ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        Get Recommendations
                      </button>
                    </div>

                    {/* Context Panel */}
                    <ContextPanel
                      projectId={selectedProject.id}
                      context={context || { notes: null, images: [], files: [], references: [] }}
                      onContextUpdate={() => loadContext(selectedProject.id)}
                      onUpload={handleUploadContext}
                      onImportWorkspace={handleImportWorkspace}
                      onDeleteItem={handleDeleteContextItem}
                    />

                    {/* Existing Plans */}
                    {plans.length > 0 && (
                      <div className="mt-6 bg-gray-800 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">
                          Previous Plans
                        </h3>
                        <div className="space-y-2">
                          {plans.map((plan) => (
                            <button
                              key={plan.id}
                              onClick={() => loadPlan(plan.id)}
                              className="w-full text-left p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium truncate">{plan.idea}</p>
                                <p className="text-xs text-gray-500">
                                  {plan.scene_count} scenes • {formatDate(plan.modified_at)}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Recommendations */}
                {currentView === 'recommendations' && (
                  <div className="max-w-2xl mx-auto">
                    {generatingRecs ? (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                          Analyzing Your Idea...
                        </h3>
                        <div
                          ref={logRef}
                          className="bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto font-mono text-xs"
                        >
                          {recsLog.map((line, i) => (
                            <div key={i} className="text-gray-400 mb-1">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : recommendations ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold">Choose Your Options</h2>
                            <p className="text-gray-400">
                              Select the style and approach for your video
                            </p>
                          </div>
                          <button
                            onClick={() => setCurrentView('idea')}
                            className="text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                        </div>

                        <RecommendationsPanel
                          recommendations={recommendations}
                          onSelect={handleRecsSelect}
                          onContinue={generatePlanFromRecs}
                          loading={generatingPlan}
                        />
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                          No Recommendations Yet
                        </h3>
                        <p>Enter a video idea first to get recommendations.</p>
                        <button
                          onClick={() => setCurrentView('idea')}
                          className="mt-4 text-purple-400 hover:text-purple-300"
                        >
                          Go back to idea input
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Planning (shows log while generating) */}
                {currentView === 'planning' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        Researching & Planning...
                      </h3>
                      <div
                        ref={logRef}
                        className="bg-gray-900 rounded-lg p-3 max-h-96 overflow-y-auto font-mono text-xs"
                      >
                        {planLog.map((line, i) => (
                          <div key={i} className="text-gray-400 mb-1">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Visual Preview */}
                {currentView === 'preview' && (
                  <div className="max-w-3xl mx-auto">
                    {selectedPlan ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold">Visual Preview</h2>
                            <p className="text-gray-400">
                              Review the plan and generate the full script
                            </p>
                          </div>
                          <button
                            onClick={() => setCurrentView('recommendations')}
                            className="text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Options
                          </button>
                        </div>

                        <VisualPreview
                          plan={selectedPlan}
                          onEditScene={(index) => {
                            // For now, just show plan preview editing
                            // In a full implementation, this would open a plan scene editor
                          }}
                          onGenerate={generateScriptFromPlan}
                          generating={generatingScript}
                        />

                        {/* Script Generation Log */}
                        {generatingScript && scriptLog.length > 0 && (
                          <div className="mt-6 bg-gray-800 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-400 mb-2">
                              Generation Log
                            </h3>
                            <div
                              ref={logRef}
                              className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs"
                            >
                              {scriptLog.map((line, i) => (
                                <div key={i} className="text-gray-400 mb-1">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                          No Plan Selected
                        </h3>
                        <p>Generate a plan from the recommendations first.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Edit (Scene Editor) */}
                {currentView === 'edit' && (
                  <div className="max-w-4xl mx-auto">
                    {selectedScript ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold">
                              {selectedScript.title || 'Untitled Script'}
                            </h2>
                            <p className="text-gray-400">
                              {selectedScript.scenes?.length || 0} scenes •{' '}
                              {(
                                (selectedScript.scenes?.reduce(
                                  (acc, s) => acc + (s.duration || 90),
                                  0
                                ) || 0) / 30
                              ).toFixed(1)}
                              s total
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentView('preview')}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back
                            </button>
                            <button
                              onClick={renderVideo}
                              disabled={rendering}
                              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                              {rendering ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Play className="w-5 h-5" />
                              )}
                              Render Video
                            </button>
                          </div>
                        </div>

                        {/* Scene Timeline */}
                        <div className="space-y-3">
                          {selectedScript.scenes?.map((scene, index) => (
                            <div
                              key={scene.id}
                              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 cursor-pointer"
                              onClick={() => setEditingScene(scene)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-500 w-6">
                                    {index + 1}
                                  </span>
                                  <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 text-xs rounded">
                                    {scene.type}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {(scene.duration / 30).toFixed(1)}s
                                  </span>
                                </div>
                                <Edit3 className="w-4 h-4 text-gray-400" />
                              </div>
                              {scene.title && (
                                <p className="font-medium text-purple-400 mb-1">
                                  {scene.title}
                                </p>
                              )}
                              {scene.text && (
                                <p className="text-sm text-gray-300 line-clamp-2">
                                  {scene.text}
                                </p>
                              )}
                              {scene.bullets && (
                                <ul className="text-sm text-gray-400 mt-1">
                                  {scene.bullets.slice(0, 2).map((b: string, i: number) => (
                                    <li key={i}>• {b}</li>
                                  ))}
                                  {scene.bullets.length > 2 && (
                                    <li className="text-gray-500">
                                      +{scene.bullets.length - 2} more
                                    </li>
                                  )}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Raw JSON toggle */}
                        <details className="mt-6">
                          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            View Raw JSON
                          </summary>
                          <pre className="mt-2 p-4 bg-gray-800 rounded-lg text-xs overflow-x-auto max-h-96">
                            {JSON.stringify(selectedScript, null, 2)}
                          </pre>
                        </details>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileJson className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                          No Script Selected
                        </h3>
                        <p>Generate a script from a plan or select an existing one.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Render View */}
                {currentView === 'render' && (
                  <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Rendered Videos</h2>

                    {renderStatus && (
                      <div
                        className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                          renderStatus.includes('Error')
                            ? 'bg-red-500/20 text-red-300'
                            : renderStatus.includes('success')
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {rendering && <Loader2 className="w-5 h-5 animate-spin" />}
                        {renderStatus.includes('success') && (
                          <Check className="w-5 h-5" />
                        )}
                        {renderStatus}
                      </div>
                    )}

                    {renders.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                          No Videos Yet
                        </h3>
                        <p>Edit a script and click "Render Video" to create a video.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {renders.map((render) => (
                          <div
                            key={render.filename}
                            className="bg-gray-800 rounded-lg overflow-hidden"
                          >
                            <div className="aspect-[9/16] bg-gray-900 flex items-center justify-center max-h-64">
                              <button
                                onClick={() => setPlayingVideo(render.filename)}
                                className="p-4 bg-purple-600/30 rounded-full hover:bg-purple-600/50"
                              >
                                <Play className="w-8 h-8" />
                              </button>
                            </div>
                            <div className="p-3">
                              <p className="font-medium truncate">{render.filename}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(render.size)} • {formatDate(render.created_at)}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => setPlayingVideo(render.filename)}
                                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm flex items-center justify-center gap-1"
                                >
                                  <Play className="w-4 h-4" />
                                  Play
                                </button>
                                <button
                                  onClick={() => downloadRender(render.filename)}
                                  className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-1"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
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

      {/* Scene Editor Modal */}
      {editingScene && (
        <SceneEditor
          scene={editingScene}
          onSave={saveScene}
          onDelete={() => deleteScene(editingScene.id)}
          onClose={() => setEditingScene(null)}
        />
      )}

      {/* Video Popup (compact player) */}
      {playingVideo && (
        <VideoPopup
          src={getVideoUrl(playingVideo)}
          filename={playingVideo}
          onClose={() => setPlayingVideo(null)}
          onDownload={() => downloadRender(playingVideo)}
        />
      )}
    </div>
  );
}

// Welcome View
function WelcomeView({ onCreateChannel }: { onCreateChannel: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-gray-500 max-w-lg">
        <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl inline-block mb-4">
          <Film className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Video Studio v4.0</h2>
        <p className="mb-6 text-gray-400">
          Interactive video creation with recommendations, research, and visual previews.
        </p>

        <div className="bg-gray-800 rounded-lg p-4 text-left mb-6">
          <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            New v4.0 Workflow
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400">
                1
              </div>
              <div>
                <p className="font-medium text-white">Enter Idea + Context</p>
                <p className="text-xs text-gray-500">
                  Upload images, files, and describe your video concept
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400">
                2
              </div>
              <div>
                <p className="font-medium text-white">Get Recommendations</p>
                <p className="text-xs text-gray-500">
                  Claude suggests genre, style, animations, and hooks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400">
                3
              </div>
              <div>
                <p className="font-medium text-white">Research & Plan</p>
                <p className="text-xs text-gray-500">
                  Claude researches facts and creates detailed plan with image suggestions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400">
                4
              </div>
              <div>
                <p className="font-medium text-white">Visual Preview</p>
                <p className="text-xs text-gray-500">
                  Review scene cards with gradient previews and thumbnails
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-400">
                5
              </div>
              <div>
                <p className="font-medium text-white">Edit & Render</p>
                <p className="text-xs text-gray-500">
                  Fine-tune scenes and render your video with Remotion
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onCreateChannel}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 mx-auto"
        >
          <Plus className="w-5 h-5" />
          Create Your First Channel
        </button>
      </div>
    </div>
  );
}

export default function VideoFactoryPage() {
  return (
    <ProtectedRoute>
      <VideoStudioContent />
    </ProtectedRoute>
  );
}
