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

