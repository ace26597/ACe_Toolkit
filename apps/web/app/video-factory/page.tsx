'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  Trash2,
  Loader2,
  Film,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { getApiUrl } from '@/lib/api';

// Simple API client
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
  delete: async (url: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return { data: await res.json() };
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

// Main Component
function VideoFactoryContent() {
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

  // Load projects on mount
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

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
                <h1 className="text-xl font-bold">Video Factory</h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Starting Fresh - Channel Management</p>
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
              <div className="text-center text-gray-500 max-w-md">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">Video Factory 2.0</h2>
                <p className="mb-4">Starting fresh with channel management.</p>
                <p className="text-sm mb-6">Select a channel or create a new one to get started.</p>

                {/* Coming Soon Features */}
                <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Coming Soon
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      AI script generation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Web research integration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Voiceover generation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      TikTok-style captions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      Remotion video rendering
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Project Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                <p className="text-gray-400">Niche: {selectedProject.niche}</p>
              </div>

              {/* Project Info */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Channel Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Created</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(selectedProject.created_at)}
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">Last Updated</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(selectedProject.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Placeholder for future content */}
                <div className="mt-6 text-center py-12 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500 opacity-50" />
                  <p className="text-gray-400 mb-2">Content features coming soon</p>
                  <p className="text-sm text-gray-500">
                    AI script generation, video rendering, and more...
                  </p>
                </div>
              </div>
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
    </div>
  );
}

export default function VideoFactoryPage() {
  return (
    <ProtectedRoute>
      <VideoFactoryContent />
    </ProtectedRoute>
  );
}
