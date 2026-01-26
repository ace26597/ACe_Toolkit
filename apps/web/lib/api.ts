// Dynamic API URL - works with multiple domains (orpheuscore.uk, ultronsolar.in, localhost)
export const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side - use env var
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Map frontend domains to API domains
  if (hostname === 'orpheuscore.uk' || hostname === 'www.orpheuscore.uk' || hostname === 'clawd.orpheuscore.uk') {
    return `${protocol}//api.orpheuscore.uk`;
  }
  if (hostname === 'ai.ultronsolar.in') {
    return `${protocol}//api.ultronsolar.in`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Check if hostname is an IP address (local network access)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    // For IP addresses, use port 8000 instead of api subdomain
    return `${protocol}//${hostname}:8000`;
  }

  // Fallback: try api subdomain of current host
  return `${protocol}//api.${hostname}`;
};

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

        // Check if we're on local network for large file uploads
        const isLocalNetwork = () => {
            if (typeof window === 'undefined') return false;
            const hostname = window.location.hostname;
            return hostname === 'localhost' ||
                   hostname === '127.0.0.1' ||
                   hostname.startsWith('192.168.') ||
                   hostname.startsWith('10.') ||
                   /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
        };

        const SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

        for (const file of fileArray) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);

            // Use local upload endpoint for large files on local network
            const useLocalUpload = file.size > SIZE_THRESHOLD && isLocalNetwork();
            const endpoint = useLocalUpload ? 'upload-local' : 'upload';

            if (useLocalUpload) {
                console.log(`Large file (${(file.size / 1024 / 1024).toFixed(0)}MB) - using local network endpoint`);
            }

            const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/${endpoint}`, {
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

    // ============ Unified Sessions ============

    listSessions: async (createdBy?: string): Promise<WorkspaceSession[]> => {
        const params = createdBy ? `?created_by=${encodeURIComponent(createdBy)}` : '';
        const res = await fetch(`${getApiUrl()}/workspace/sessions${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list sessions');
        return res.json();
    },

    getSession: async (sessionId: string): Promise<WorkspaceSession> => {
        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get session');
        return res.json();
    },

    listSessionFiles: async (sessionId: string, path: string = ''): Promise<SessionFile[]> => {
        const params = path ? `?path=${encodeURIComponent(path)}` : '';
        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}/files${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list session files');
        return res.json();
    },

    getSessionFileContent: async (sessionId: string, path: string): Promise<string> => {
        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}/files/content?path=${encodeURIComponent(path)}`, { credentials: 'include' });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to read file' }));
            throw new Error(error.detail || 'Failed to read file');
        }
        return res.text();
    },

    downloadSessionFile: (sessionId: string, path: string): string => {
        return `${getApiUrl()}/workspace/sessions/${sessionId}/files/download?path=${encodeURIComponent(path)}`;
    },

    updateSession: async (sessionId: string, data: { title?: string; tags?: string[]; description?: string }): Promise<void> => {
        const params = new URLSearchParams();
        if (data.title) params.set('title', data.title);
        if (data.description) params.set('description', data.description);
        if (data.tags) params.set('tags', JSON.stringify(data.tags));

        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}?${params}`, {
            method: 'PATCH',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to update session');
    },

    deleteSession: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete session');
    },
};

// Session types
export interface WorkspaceSession {
    id: string;
    title: string;
    created_by: string;
    created_at: string;
    last_accessed: string;
    tags: string[];
    terminal_enabled: boolean;
    description?: string;
    email?: string;
    status: string;
}

export interface SessionFile {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    modified_at: string;
}

// ============ Data Studio API (Legacy) ============

export interface DataFile {
    name: string;
    path: string;
    folder: string;
    size: number;
    modified: string;
    type: string;
}

export interface DataStudioSession {
    session_id: string;
    project_name: string;
    data_files: DataFile[];
}

export interface DashboardInfo {
    id: string;
    name: string;
    widget_count: number;
    updated_at: string;
}

export interface DashboardLayout {
    name: string;
    widgets: DashboardWidget[];
    created_at?: string;
    updated_at?: string;
}

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'table' | 'code' | 'mermaid' | 'stat_card' | 'bar_chart' | 'line_chart' | 'histogram' | 'scatter' | 'pie_chart' | 'heatmap';
    data: any;
    layout: { x: number; y: number; w: number; h: number };
    title?: string;
    description?: string;
    source_file?: string;
    plotly_spec?: any;
    plotly?: any;  // Alternate field name from Claude
    vega_lite_spec?: any;
    stat_value?: string;
    stat_label?: string;
    value?: string;     // Alternate field name from Claude
    subtitle?: string;  // Alternate field name from Claude
    mermaid_code?: string;
}

// Legacy API (kept for backwards compatibility)
export const dataStudioApi = {
    createSession: async (projectName: string): Promise<DataStudioSession> => {
        const res = await fetch(`${getApiUrl()}/data-studio/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ project_name: projectName }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
            throw new Error(error.detail || 'Failed to create session');
        }
        return res.json();
    },

    listSessions: async (): Promise<DataStudioSession[]> => {
        const res = await fetch(`${getApiUrl()}/data-studio/sessions`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list sessions');
        return res.json();
    },

    getSession: async (sessionId: string): Promise<any> => {
        const res = await fetch(`${getApiUrl()}/data-studio/sessions/${sessionId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get session');
        return res.json();
    },

    closeSession: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to close session');
    },

    listDashboards: async (projectName: string): Promise<DashboardInfo[]> => {
        const res = await fetch(`${getApiUrl()}/data-studio/dashboards/${projectName}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list dashboards');
        return res.json();
    },

    getDashboard: async (projectName: string, dashboardId: string): Promise<DashboardLayout> => {
        const res = await fetch(`${getApiUrl()}/data-studio/dashboards/${projectName}/${dashboardId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get dashboard');
        return res.json();
    },

    saveDashboard: async (projectName: string, dashboard: DashboardLayout): Promise<{ id: string }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/dashboards/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dashboard),
        });
        if (!res.ok) throw new Error('Failed to save dashboard');
        return res.json();
    },

    deleteDashboard: async (projectName: string, dashboardId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/dashboards/${projectName}/${dashboardId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete dashboard');
    },

    listProjectFiles: async (projectName: string): Promise<{ files: DataFile[] }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/projects/${projectName}/files`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list files');
        return res.json();
    },

    getWebSocketUrl: (sessionId: string): string => {
        const apiUrl = getApiUrl();
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        return `${wsUrl}/data-studio/ws/${sessionId}`;
    },
};

// ============ Data Studio V2 API (Redesigned) ============

export interface DataStudioProject {
    name: string;
    description?: string;
    created_at: string;
    file_count: number;
    has_analysis: boolean;
    has_dashboard: boolean;
}

export interface ColumnInfo {
    name: string;
    dtype: string;
    original_dtype: string;
    unique_count: number;
    null_count: number;
    null_percentage: number;
    sample_values: any[];
    min_value?: number;
    max_value?: number;
    mean_value?: number;
    median_value?: number;
    std_value?: number;
    distribution?: string;
    categories?: string[];
    category_counts?: Record<string, number>;
    suggested_viz?: string[];
    suggested_role?: string;
}

export interface FileAnalysis {
    filename: string;
    file_path: string;
    file_type: string;
    file_size: number;
    analyzed_at: string;
    row_count: number;
    column_count: number;
    columns: ColumnInfo[];
    total_null_cells: number;
    null_percentage: number;
    duplicate_rows: number;
    sample_data: Record<string, any>[];
    insights: string[];
    data_themes: string[];
    suggested_charts: Array<{
        type: string;
        x?: string;
        y?: string;
        agg?: string;
        title?: string;
        priority?: string;
    }>;
}

export interface ProjectMetadata {
    project_name: string;
    analyzed_at: string;
    summary: {
        total_files: number;
        total_rows: number;
        total_columns: number;
        primary_data_type: string;
        themes: string[];
        domain_detected?: string;
    };
    files: Record<string, FileAnalysis>;
    cross_file_insights: Array<{
        type: string;
        files?: string[];
        columns?: string[];
        description?: string;
    }>;
    common_columns: string[];
    recommended_charts: string[];
}

export interface Dashboard {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at?: string;
    widgets: DashboardWidget[];
    layout_cols?: number;
    theme?: string;
}

export const dataStudioV2Api = {
    // Project management
    listProjects: async (): Promise<DataStudioProject[]> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to list projects');
        return res.json();
    },

    createProject: async (name: string, description?: string): Promise<DataStudioProject> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects`, {
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

    deleteProject: async (name: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    // File management
    listFiles: async (projectName: string): Promise<{ files: DataFile[] }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/files`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to list files');
        return res.json();
    },

    uploadFiles: async (projectName: string, files: FileList | File[], folder: string = ''): Promise<{ uploaded: DataFile[]; count: number }> => {
        const formData = new FormData();
        const fileArray = Array.from(files);
        fileArray.forEach(file => formData.append('files', file));
        if (folder) formData.append('folder', folder);

        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/files`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to upload files' }));
            throw new Error(error.detail || 'Failed to upload files');
        }
        return res.json();
    },

    importFromWorkspace: async (projectName: string, workspaceProject: string, files?: string[]): Promise<{ imported: string[]; count: number }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ workspace_project: workspaceProject, files }),
        });
        if (!res.ok) throw new Error('Failed to import files');
        return res.json();
    },

    deleteFile: async (projectName: string, path: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/files?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete file');
    },

    // Analysis - streaming with SSE
    analyzeProject: async (
        projectName: string,
        options: { force?: boolean; mode?: 'headless' | 'terminal'; analysisMode?: 'combined' | 'separate' } = {},
        onEvent?: (event: { type: string; content: any }) => void
    ): Promise<{ status: string; metadata?: ProjectMetadata }> => {
        const { force = false, mode = 'headless', analysisMode = 'combined' } = options;
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ force, mode, analysis_mode: analysisMode }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Analysis failed' }));
            throw new Error(error.detail || 'Analysis failed');
        }

        // Check if response is SSE stream or JSON
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
            // SSE streaming response
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
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
                                onEvent?.(event);
                            } catch {}
                        }
                    }
                }
            }
            return { status: 'complete' };
        } else {
            // Regular JSON response (cached)
            return res.json();
        }
    },

    getMetadata: async (projectName: string): Promise<ProjectMetadata> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/metadata`, {
            credentials: 'include',
        });
        if (!res.ok) {
            if (res.status === 404) throw new Error('No analysis found');
            throw new Error('Failed to get metadata');
        }
        return res.json();
    },

    // Dashboard management
    listDashboards: async (projectName: string): Promise<DashboardInfo[]> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to list dashboards');
        return res.json();
    },

    getDashboard: async (projectName: string, dashboardId: string): Promise<Dashboard> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards/${encodeURIComponent(dashboardId)}`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to get dashboard');
        return res.json();
    },

    generateDashboard: async (
        projectName: string,
        options: { name?: string; mode?: 'headless' | 'terminal' } = {},
        onEvent?: (event: { type: string; content: any }) => void
    ): Promise<Dashboard | { status: string }> => {
        const { name = 'default', mode = 'headless' } = options;
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, mode }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to generate dashboard' }));
            throw new Error(error.detail || 'Failed to generate dashboard');
        }

        // Check if response is SSE stream
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
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
                                onEvent?.(event);
                            } catch {}
                        }
                    }
                }
            }
            return { status: 'complete' };
        } else {
            return res.json();
        }
    },

    saveDashboard: async (projectName: string, name: string, widgets: DashboardWidget[]): Promise<{ id: string }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, widgets }),
        });
        if (!res.ok) throw new Error('Failed to save dashboard');
        return res.json();
    },

    deleteDashboard: async (projectName: string, dashboardId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards/${encodeURIComponent(dashboardId)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete dashboard');
    },

    // NLP Editing - streaming with SSE
    nlpEdit: async (
        projectName: string,
        request: string,
        options: { dashboardId?: string; targetWidgetId?: string; mode?: 'headless' | 'terminal' } = {},
        onEvent?: (event: { type: string; content: any }) => void
    ): Promise<Dashboard | { status: string }> => {
        const { dashboardId = 'default', targetWidgetId, mode = 'headless' } = options;
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                request,
                dashboard_id: dashboardId,
                target_widget_id: targetWidgetId,
                mode,
            }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Edit failed' }));
            throw new Error(error.detail || 'Edit failed');
        }

        // Check if response is SSE stream
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
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
                                onEvent?.(event);
                            } catch {}
                        }
                    }
                }
            }
            return { status: 'complete' };
        } else {
            return res.json();
        }
    },

    // Get insights
    getInsights: async (projectName: string): Promise<{ insights: string }> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/insights`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to get insights');
        return res.json();
    },

    // Chat WebSocket
    getChatWebSocketUrl: (projectName: string): string => {
        const apiUrl = getApiUrl();
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        return `${wsUrl}/data-studio/v2/projects/${encodeURIComponent(projectName)}/chat`;
    },
};

