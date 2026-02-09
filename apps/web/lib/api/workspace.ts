import { getApiUrl, CSRF_HEADERS } from './client';

// ============ Workspace Types ============

export interface WorkspaceProject {
    name: string;
    createdAt: string;
    updatedAt: string;
    noteCount: number;
    dataSize: string;
    projectType?: string;  // "claude" (default) or "ssh"
    sshConfig?: { working_directory?: string };
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

// ============ Workspace API (Notes + NAS File Manager) ============

export const workspaceApi = {
    // Projects
    listProjects: async (): Promise<WorkspaceProject[]> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },

    createProject: async (name: string, options?: string | {
        template?: string;
        projectType?: string;
        sshConfig?: { working_directory?: string };
    }): Promise<WorkspaceProject> => {
        const body: Record<string, unknown> = { name };
        // Support legacy signature: createProject(name, templateString)
        if (typeof options === 'string') {
            body.template = options;
        } else if (options) {
            if (options.template) body.template = options.template;
            if (options.projectType) body.projectType = options.projectType;
            if (options.sshConfig) body.sshConfig = options.sshConfig;
        }

        const res = await fetch(`${getApiUrl()}/workspace/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify(body),
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    updateProjectType: async (name: string, projectType: string, sshConfig?: { working_directory?: string }): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(name)}/type`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({ projectType, sshConfig }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to update project type' }));
            throw new Error(error.detail || 'Failed to update project type');
        }
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to update note');
        return res.json();
    },

    deleteNote: async (project: string, id: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/notes/${id}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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

            const res = await fetch(`${getApiUrl()}/workspace/projects/${encodeURIComponent(project)}/data/${endpoint}`, {
                method: 'POST',
                headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'text/plain', ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to update session');
    },

    deleteSession: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/workspace/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete session');
    },
};

// ============ Recordings API (CCResearch session recordings) ============

export interface RecordingInfo {
    has_recording: boolean;
    size_bytes: number;
    filename?: string;
    created_at?: string;
    duration?: number;
}

export const recordingsApi = {
    /** Check if a session has a recording */
    hasRecording: async (sessionId: string): Promise<RecordingInfo> => {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${sessionId}/has-recording`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to check recording');
        return res.json();
    },

    /** List recordings for a session */
    listRecordings: async (sessionId: string): Promise<RecordingInfo[]> => {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${sessionId}/recordings`, {
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to list recordings');
        return res.json();
    },

    /** Get the URL for streaming a .cast recording */
    getRecordingUrl: (sessionId: string): string => {
        return `${getApiUrl()}/ccresearch/sessions/${sessionId}/recording`;
    },

    /** Delete a session recording */
    deleteRecording: async (sessionId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${sessionId}/recording`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete recording');
    },

    /** Generate transcript for a session (POST) */
    generateTranscript: async (sessionId: string): Promise<{ transcript: string; session_id: string }> => {
        const res = await fetch(`${getApiUrl()}/ccresearch/sessions/${sessionId}/transcript`, {
            method: 'POST',
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to generate transcript');
        return res.json();
    },

    /** Download a file via fetch+blob (handles cross-origin cookies) */
    downloadFile: async (url: string, filename: string): Promise<void> => {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    },

    /** Download .cast recording file */
    downloadRecording: async (sessionId: string): Promise<void> => {
        const url = `${getApiUrl()}/ccresearch/sessions/${sessionId}/recording?download=true`;
        await recordingsApi.downloadFile(url, `${sessionId}.cast`);
    },

    /** Download transcript .md file */
    downloadTranscript: async (sessionId: string): Promise<void> => {
        const url = `${getApiUrl()}/ccresearch/sessions/${sessionId}/transcript/download`;
        await recordingsApi.downloadFile(url, `transcript-${sessionId}.md`);
    },
};
