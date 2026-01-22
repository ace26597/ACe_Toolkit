// Dynamic API URL - works with multiple domains (orpheuscore.uk, ultronsolar.in, localhost)
export const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side - use env var
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Map frontend domains to API domains
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk') {
    return `${protocol}//api.orpheuscore.uk`;
  }
  if (hostname === 'ai.ultronsolar.in') {
    return `${protocol}//api.ultronsolar.in`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Fallback: try api subdomain of current host
  return `${protocol}//api.${hostname}`;
};

// Legacy constant for backward compatibility - evaluates lazily
const API_URL = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// ============ Auth API ============

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  trial_expires_at: string | null;
  created_at: string;
}

export interface TrialInfo {
  has_access: boolean;
  is_trial: boolean;
  trial_expired: boolean;
  trial_expires_at: string | null;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    is_approved: boolean;
  };
  trial: TrialInfo;
}

export interface RegisterResponse extends AuthUser {}

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    const res = await fetch(`${getApiUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(error.detail || 'Registration failed');
    }
    return res.json();
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      // Check for trial expired
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Login failed');
    }
    return res.json();
  },

  logout: async (): Promise<void> => {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const res = await fetch(`${getApiUrl()}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  getStatus: async (): Promise<{ user: AuthUser; trial: TrialInfo }> => {
    const res = await fetch(`${getApiUrl()}/auth/me/status`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  refreshToken: async (): Promise<{ message: string; trial: TrialInfo }> => {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Refresh failed' }));
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Refresh failed');
    }
    return res.json();
  },

  // Admin endpoints
  listUsers: async (): Promise<AuthUser[]> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to list users');
    return res.json();
  },

  approveUser: async (userId: string): Promise<{ message: string }> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users/${userId}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to approve user');
    return res.json();
  },

  revokeUser: async (userId: string): Promise<{ message: string }> => {
    const res = await fetch(`${getApiUrl()}/auth/admin/users/${userId}/revoke`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to revoke user');
    return res.json();
  },

  // Alias for refreshToken
  refresh: async (): Promise<{ message: string; trial: TrialInfo }> => {
    const res = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Refresh failed' }));
      if (error.detail === 'trial_expired') {
        throw new Error('trial_expired');
      }
      throw new Error(error.detail || 'Refresh failed');
    }
    return res.json();
  },
};

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Handle unauthorized (optional: redirect to login or clear token)
        localStorage.removeItem('token');
    }

    return response;
}

export const notesApi = {
    getAll: () => fetchWithAuth('/notes/').then(res => res.json()),
    getOne: (id: string) => fetchWithAuth(`/notes/${id}`).then(res => res.json()),
    create: (note: { title: string, content: string }) =>
        fetchWithAuth('/notes/', {
            method: 'POST',
            body: JSON.stringify(note),
        }).then(res => res.json()),
    update: (id: string, note: { title?: string, content?: string }) =>
        fetchWithAuth(`/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(note),
        }).then(res => res.json()),
    delete: (id: string) =>
        fetchWithAuth(`/notes/${id}`, {
            method: 'DELETE',
        }).then(res => res.json()),
};


// Session-based Projects API (no auth required)
export interface Edition {
    id: string;
    code: string;
    description: string;
    updatedAt: string;
}

export interface ChartMetadata {
    description?: string;
    source?: 'manual' | 'markdown' | 'ai';
    sourceFile?: string;
}

export interface DocumentMetadata {
    tags?: string[];
    pinned?: boolean;
    source?: 'manual' | 'upload';
}

export interface Document {
    id: string;
    name: string;
    sourceMarkdown?: string;
    chartIds: string[];
    metadata?: DocumentMetadata;
    createdAt: string;
}

export interface Chart {
    id: string;
    projectId: string;
    documentId?: string;
    name: string;
    code: string;
    editions: Edition[];
    currentEditionId: string;
    metadata?: ChartMetadata;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    charts: Chart[];
    documents: Document[];
    createdAt: string;
    updatedAt: string;
}

export const projectsApi = {
    getAll: async (): Promise<Project[]> => {
        const res = await fetch(`${API_URL}/projects/`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    getOne: async (id: string): Promise<Project> => {
        const res = await fetch(`${API_URL}/projects/${id}`);
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
    },

    create: async (project: { id: string; name: string; description?: string; charts?: Chart[] }): Promise<Project> => {
        const res = await fetch(`${API_URL}/projects/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        });
        if (!res.ok) throw new Error('Failed to create project');
        return res.json();
    },

    update: async (id: string, data: { name?: string; description?: string }): Promise<Project> => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update project');
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    sync: async (projects: Project[]): Promise<Project[]> => {
        const res = await fetch(`${API_URL}/projects/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projects }),
        });
        if (!res.ok) throw new Error('Failed to sync projects');
        return res.json();
    },
};

export const chartsApi = {
    getByProject: async (projectId: string): Promise<Chart[]> => {
        const res = await fetch(`${API_URL}/charts/project/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch charts');
        return res.json();
    },

    getOne: async (id: string): Promise<Chart> => {
        const res = await fetch(`${API_URL}/charts/${id}`);
        if (!res.ok) throw new Error('Failed to fetch chart');
        return res.json();
    },

    create: async (chart: {
        id: string;
        projectId: string;
        name: string;
        code: string;
        documentId?: string;
        editions?: Edition[];
        currentEditionId?: string;
        metadata?: ChartMetadata;
    }): Promise<Chart> => {
        const res = await fetch(`${API_URL}/charts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chart),
        });
        if (!res.ok) throw new Error('Failed to create chart');
        return res.json();
    },

    update: async (id: string, data: {
        name?: string;
        code?: string;
        editions?: Edition[];
        currentEditionId?: string;
        metadata?: ChartMetadata;
    }): Promise<Chart> => {
        const res = await fetch(`${API_URL}/charts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update chart');
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/charts/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete chart');
    },
};

// Research Assistant API (multi-model, LangGraph workflows, file processing, reports)
export interface ResearchConversation {
    id: string;
    session_id: string;
    title: string;
    provider: string;
    model_name: string;
    created_at: string;
}

export interface ResearchMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    synthesis?: string;
    report?: string;
    tokens_used: number;
    created_at: string;
}

export const researchApi = {
    createConversation: async (data: {
        session_id: string;
        title: string;
        provider: string;
        model_name: string;
    }): Promise<ResearchConversation> => {
        const formData = new FormData();
        formData.append('session_id', data.session_id);
        formData.append('title', data.title);
        formData.append('provider', data.provider);
        formData.append('model_name', data.model_name);

        const res = await fetch(`${API_URL}/research/conversations`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to create conversation');
        return res.json();
    },

    listConversations: async (sessionId: string, limit: number = 50): Promise<ResearchConversation[]> => {
        const res = await fetch(`${API_URL}/research/conversations?session_id=${sessionId}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to list conversations');
        const data = await res.json();
        return data.conversations;
    },

    deleteConversation: async (conversationId: string): Promise<void> => {
        const res = await fetch(`${API_URL}/research/conversations/${conversationId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete conversation');
    },

    uploadFiles: async (conversationId: string, files: File[]): Promise<any[]> => {
        const formData = new FormData();
        formData.append('conversation_id', conversationId);
        files.forEach(file => formData.append('files', file));

        const res = await fetch(`${API_URL}/research/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload files');
        const data = await res.json();
        return data.uploaded;
    },

    downloadReport: async (conversationId: string, format: 'md' | 'html' | 'pdf' | 'csv'): Promise<Blob> => {
        const res = await fetch(`${API_URL}/research/reports/${conversationId}?format=${format}`);
        if (!res.ok) throw new Error('Failed to download report');
        return res.blob();
    },

    connectWebSocket: (): WebSocket => {
        const wsUrl = API_URL.replace(/^http/, 'ws') + '/research/stream';
        return new WebSocket(wsUrl);
    }
};

// Mermaid Disk Storage API (SSD export/import)
export interface DiskProject {
    name: string;
    path: string;
    chart_count: number;
    document_count: number;
    exported_at: string;
}

export interface ExportResult {
    name: string;
    path: string;
    chart_files: string[];
    document_files: string[];
    exported_at: string;
}

export const mermaidDiskApi = {
    exportToDisk: async (projectId: string, folderName?: string): Promise<ExportResult> => {
        const res = await fetch(`${API_URL}/projects/${projectId}/export-to-disk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_name: folderName }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to export project' }));
            throw new Error(error.detail || 'Failed to export project');
        }
        return res.json();
    },

    listDiskProjects: async (): Promise<DiskProject[]> => {
        const res = await fetch(`${API_URL}/projects/disk-projects`);
        if (!res.ok) throw new Error('Failed to list disk projects');
        return res.json();
    },

    importFromDisk: async (folderName: string): Promise<Project> => {
        const res = await fetch(`${API_URL}/projects/import-from-disk/${encodeURIComponent(folderName)}`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to import project' }));
            throw new Error(error.detail || 'Failed to import project');
        }
        return res.json();
    },

    deleteDiskProject: async (folderName: string): Promise<void> => {
        const res = await fetch(`${API_URL}/projects/disk-projects/${encodeURIComponent(folderName)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete disk project');
    }
};

// ============ Workspace API (Notes + NAS File Manager) ============

export interface WorkspaceProject {
    name: string;
    createdAt: string;
    updatedAt: string;
    noteCount: number;
    dataSize: string;
}

export interface WorkspaceNote {
    id: string;
    title: string;
    content: string;
    pinned: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceDataItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    sizeFormatted?: string;
    modifiedAt: string;
}

export interface ImageUploadResult {
    filename: string;
    url: string;
    markdown: string;
}

export const workspaceApi = {
    // Projects
    listProjects: async (): Promise<WorkspaceProject[]> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    createProject: async (name: string): Promise<WorkspaceProject> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create project' }));
            throw new Error(error.detail || 'Failed to create project');
        }
        return res.json();
    },

    getProject: async (name: string): Promise<WorkspaceProject> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(name)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch project');
        return res.json();
    },

    renameProject: async (name: string, newName: string): Promise<WorkspaceProject> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ newName }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to rename project' }));
            throw new Error(error.detail || 'Failed to rename project');
        }
        return res.json();
    },

    deleteProject: async (name: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    // Notes
    listNotes: async (project: string): Promise<WorkspaceNote[]> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch notes');
        return res.json();
    },

    getNote: async (project: string, id: string): Promise<WorkspaceNote> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch note');
        return res.json();
    },

    createNote: async (project: string, note: {
        title?: string;
        content?: string;
        tags?: string[];
        pinned?: boolean;
    }): Promise<WorkspaceNote> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to create note');
        return res.json();
    },

    updateNote: async (project: string, id: string, note: {
        title?: string;
        content?: string;
        tags?: string[];
        pinned?: boolean;
    }): Promise<WorkspaceNote> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to update note');
        return res.json();
    },

    deleteNote: async (project: string, id: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete note');
    },

    // Images
    uploadImage: async (project: string, file: File): Promise<ImageUploadResult> => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/images`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
            throw new Error(error.detail || 'Failed to upload image');
        }
        return res.json();
    },

    getImageUrl: (project: string, filename: string): string => {
        return `${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/images/${filename}`;
    },

    deleteImage: async (project: string, filename: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/images/${filename}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete image');
    },

    // Data (NAS)
    listData: async (project: string, path: string = ''): Promise<WorkspaceDataItem[]> => {
        const params = new URLSearchParams(path ? { path } : {});
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
    },

    uploadData: async (project: string, files: FileList | File[], path: string = ''): Promise<any[]> => {
        const results = [];
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);

            const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: 'Failed to upload file' }));
                throw new Error(error.detail || `Failed to upload ${file.name}`);
            }
            results.push(await res.json());
        }
        return results;
    },

    createFolder: async (project: string, path: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/folder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ path }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create folder' }));
            throw new Error(error.detail || 'Failed to create folder');
        }
    },

    downloadData: (project: string, path: string): string => {
        return `${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/download?path=${encodeURIComponent(path)}`;
    },

    deleteData: async (project: string, path: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete');
    },

    // Text files (for Notes view - all readable files in project)
    listTextFiles: async (project: string): Promise<WorkspaceDataItem[]> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/text-files`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch text files');
        return res.json();
    },

    // File content (for preview/edit)
    getFileContent: async (project: string, path: string): Promise<string> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/content?path=${encodeURIComponent(path)}`, { credentials: 'include' });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to read file' }));
            throw new Error(error.detail || 'Failed to read file');
        }
        return res.text();
    },

    saveFileContent: async (project: string, path: string, content: string, create: boolean = false): Promise<void> => {
        const url = `${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/content?path=${encodeURIComponent(path)}${create ? '&create=true' : ''}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            credentials: 'include',
            body: content,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to save file' }));
            throw new Error(error.detail || 'Failed to save file');
        }
    },
};

// ============ Analyst API (Data Analysis with Auth) ============

export interface AnalystProject {
    id: string;
    name: string;
    description?: string;
    data_sources: string[];
    dashboards: string[];
    created_at: string;
    updated_at: string;
}

export interface DataSource {
    id: string;
    project_id: string;
    name: string;
    type: 'csv' | 'excel' | 'json' | 'pdf' | 'postgresql' | 'mysql' | 'sqlite';
    status: string;
    file_path?: string;
    connection_string?: string;
    tables?: string[];
    schema?: string;
    is_aact?: boolean;
    columns?: Array<{ name: string; type: string; sample_values?: any[] }>;
    row_count?: number;
    created_at: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    charts?: any[];
    timestamp: string;
}

export interface ChatResponse {
    response: string;
    code?: string;
    chart_config?: any;
    chart?: any;
    charts?: Array<{ config: any; plotly: any }>;
    query_result?: any;
    error?: string;
}

export const analystApi = {
    // Status check (no auth needed)
    getStatus: async (): Promise<{ status: string; features: Record<string, boolean> }> => {
        const res = await fetch(`${getApiUrl()}/analyst/status`);
        if (!res.ok) throw new Error('Failed to get analyst status');
        return res.json();
    },

    // Project management
    createProject: async (name: string, description?: string): Promise<AnalystProject> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create project' }));
            throw new Error(error.detail || 'Failed to create project');
        }
        return res.json();
    },

    listProjects: async (): Promise<AnalystProject[]> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list projects');
        return res.json();
    },

    getProject: async (projectId: string): Promise<AnalystProject> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get project');
        return res.json();
    },

    deleteProject: async (projectId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    // Data source management
    uploadFile: async (projectId: string, file: File, name?: string): Promise<{ data_source: DataSource; schema: any }> => {
        const formData = new FormData();
        formData.append('file', file);
        if (name) formData.append('name', name);

        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to upload file' }));
            throw new Error(error.detail || 'Failed to upload file');
        }
        return res.json();
    },

    listDataSources: async (projectId: string): Promise<DataSource[]> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/data-sources`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list data sources');
        return res.json();
    },

    getDataSourceSchema: async (projectId: string, dsId: string): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/data-sources/${dsId}/schema`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get schema');
        return res.json();
    },

    previewDataSource: async (projectId: string, dsId: string, limit?: number, tableName?: string): Promise<any> => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', limit.toString());
        if (tableName) params.set('table_name', tableName);

        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/data-sources/${dsId}/preview?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to preview data');
        return res.json();
    },

    // Database connections
    connectDatabase: async (projectId: string, connection: {
        name: string;
        db_type: 'postgresql' | 'mysql' | 'sqlite';
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        connection_string?: string;
    }): Promise<DataSource> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/connect-database`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(connection),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to connect' }));
            throw new Error(error.detail || 'Failed to connect to database');
        }
        return res.json();
    },

    connectAACT: async (projectId: string): Promise<{ data_source: DataSource; message: string; popular_tables: string[] }> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/connect-aact`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to connect to AACT' }));
            throw new Error(error.detail || 'Failed to connect to AACT');
        }
        return res.json();
    },

    // Chat / AI interaction
    chat: async (projectId: string, dataSourceId: string, messages: ConversationMessage[], includeChart?: boolean): Promise<ChatResponse> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                data_source_id: dataSourceId,
                messages,
                include_chart: includeChart ?? true,
            }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Chat failed' }));
            throw new Error(error.detail || 'Chat failed');
        }
        return res.json();
    },

    getConversationHistory: async (projectId: string, dsId: string): Promise<{ messages: ConversationMessage[] }> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/data-sources/${dsId}/conversation`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get conversation history');
        return res.json();
    },

    clearConversationHistory: async (projectId: string, dsId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/data-sources/${dsId}/conversation`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to clear conversation');
    },

    // Query execution
    executeQuery: async (projectId: string, dataSourceId: string, query: string, queryType?: 'sql' | 'natural'): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                data_source_id: dataSourceId,
                query,
                query_type: queryType || 'sql',
            }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Query failed' }));
            throw new Error(error.detail || 'Query failed');
        }
        return res.json();
    },

    // Chart generation
    generateChart: async (projectId: string, dataSourceId: string, chartType: string, options: {
        x_column?: string;
        y_column?: string;
        color_column?: string;
        title?: string;
        query?: string;
    }): Promise<{ chart: any; data_points: number }> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/chart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                data_source_id: dataSourceId,
                chart_type: chartType,
                ...options,
            }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Chart generation failed' }));
            throw new Error(error.detail || 'Chart generation failed');
        }
        return res.json();
    },

    // Dashboards
    createDashboard: async (projectId: string, name: string, description?: string): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/dashboards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ project_id: projectId, name, description }),
        });
        if (!res.ok) throw new Error('Failed to create dashboard');
        return res.json();
    },

    listDashboards: async (projectId: string): Promise<any[]> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/dashboards`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list dashboards');
        return res.json();
    },

    getDashboard: async (projectId: string, dashboardId: string): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/dashboards/${dashboardId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get dashboard');
        return res.json();
    },

    autoGenerateDashboard: async (projectId: string, dataSourceId: string, options?: {
        dashboard_id?: string;
        dashboard_name?: string;
        min_charts?: number;
        max_charts?: number;
    }): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/analyst/projects/${projectId}/auto-generate-dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                project_id: projectId,
                data_source_id: dataSourceId,
                ...options,
            }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Dashboard generation failed' }));
            throw new Error(error.detail || 'Dashboard generation failed');
        }
        return res.json();
    },
};

// ============ Research Assistant API (Claude Code Headless) ============

export interface ResearchAssistantSession {
    id: string;
    user_id: string;
    claude_session_id?: string;
    title: string;
    workspace_dir: string;
    response_format: string;
    status: string;
    turn_count: number;
    share_id?: string;
    shared_at?: string;
    uploaded_files?: string[];
    created_at: string;
    last_activity: string;
}

export interface ResearchAssistantMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    response_format: string;
    tool_calls_json?: string;
    thinking_json?: string;
    input_tokens: number;
    output_tokens: number;
    created_at: string;
}

export interface ResearchStreamEvent {
    type: 'connected' | 'system' | 'thinking' | 'tool_use' | 'tool_result' | 'text' | 'complete' | 'error' | 'pong';
    content?: string;
    name?: string;
    input?: Record<string, any>;
    tool_use_id?: string;
    is_error?: boolean;
    response?: string;
    session_id?: string;
    tool_calls?: any[];
    thinking?: string[];
    usage?: { input_tokens: number; output_tokens: number };
    error?: string;
}

export const researchAssistantApi = {
    // Sessions
    createSession: async (title?: string, responseFormat?: string, files?: File[]): Promise<ResearchAssistantSession> => {
        const formData = new FormData();
        formData.append('title', title || 'New Research');
        formData.append('response_format', responseFormat || 'markdown');
        if (files) {
            files.forEach(file => formData.append('files', file));
        }

        const res = await fetch(`${getApiUrl()}/research-assistant/sessions`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
            throw new Error(error.detail || 'Failed to create session');
        }
        return res.json();
    },

    listSessions: async (): Promise<ResearchAssistantSession[]> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to list sessions');
        return res.json();
    },

    getSession: async (sessionId: string): Promise<ResearchAssistantSession> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to get session');
        return res.json();
    },

    getMessages: async (sessionId: string): Promise<ResearchAssistantMessage[]> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}/messages`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to get messages');
        return res.json();
    },

    uploadFiles: async (sessionId: string, files: File[]): Promise<{ uploaded_files: string[] }> => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload files');
        return res.json();
    },

    updateSession: async (sessionId: string, data: { title?: string; response_format?: string }): Promise<void> => {
        const params = new URLSearchParams();
        if (data.title) params.append('title', data.title);
        if (data.response_format) params.append('response_format', data.response_format);

        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}?${params}`, {
            method: 'PATCH',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to update session');
    },

    deleteSession: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete session');
    },

    // Sharing
    shareSession: async (sessionId: string): Promise<{ share_id: string; share_url: string; shared_at: string }> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}/share`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to share session');
        return res.json();
    },

    revokeShare: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}/share`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to revoke share');
    },

    // Public (no auth)
    getSharedSession: async (shareId: string): Promise<{ id: string; title: string; created_at: string; shared_at: string; message_count: number }> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/shared/${shareId}`);
        if (!res.ok) throw new Error('Shared session not found');
        return res.json();
    },

    getSharedMessages: async (shareId: string): Promise<ResearchAssistantMessage[]> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/shared/${shareId}/messages`);
        if (!res.ok) throw new Error('Failed to get shared messages');
        return res.json();
    },

    // Files
    listFiles: async (sessionId: string): Promise<{ files: Array<{ name: string; path: string; is_dir: boolean; size: number; modified_at: string }> }> => {
        const res = await fetch(`${getApiUrl()}/research-assistant/sessions/${sessionId}/files`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to list files');
        return res.json();
    },

    getFileDownloadUrl: (sessionId: string, path: string): string => {
        return `${getApiUrl()}/research-assistant/sessions/${sessionId}/files/download?path=${encodeURIComponent(path)}`;
    },

    // WebSocket
    connectWebSocket: (sessionId: string): WebSocket => {
        const wsUrl = getApiUrl().replace(/^http/, 'ws') + `/research-assistant/sessions/${sessionId}/stream`;
        return new WebSocket(wsUrl);
    },
};
