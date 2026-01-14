const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Scientific Skills types (defined here to avoid import issues)
export interface Skill {
    name: string;
    category: string;
    description: string;
    parameters: Record<string, string>;
}

export interface SkillExecution {
    id: string;
    skill_name: string;
    command: string;
    output: string | null;
    error: string | null;
    status: 'running' | 'success' | 'failed';
    execution_time_ms: number | null;
    created_at: string;
}

export interface MCPStatus {
    running: boolean;
    pid: number | null;
    uptime_seconds: number;
    skills_count: number;
    execution_count: number;
    memory_mb: number;
}

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

export const aiApi = {
    generate: async (prompt: string, currentCode?: string) => {
        const res = await fetchWithAuth('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt, current_code: currentCode }),
        });

        const data = await res.json();

        if (!res.ok) {
            // Backend returns error with detail field
            throw new Error(data.detail || 'AI generation failed');
        }

        return data;
    },
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

// Note: Session-based notes have been unified with the projects/documents system.
// Use projectsApi with documents that have sourceMarkdown for note-like functionality.

// Scientific Skills API
export const skillsApi = {
    getStatus: async (): Promise<MCPStatus> => {
        const res = await fetch(`${API_URL}/skills/status`);
        if (!res.ok) throw new Error('Failed to fetch MCP status');
        return res.json();
    },

    listSkills: async (): Promise<Skill[]> => {
        const res = await fetch(`${API_URL}/skills/list`);
        if (!res.ok) throw new Error('Failed to fetch skills');
        return res.json();
    },

    executeSkill: async (skillName: string, params: Record<string, any>, sessionId: string): Promise<any> => {
        const res = await fetch(`${API_URL}/skills/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skill_name: skillName,
                params,
                session_id: sessionId
            }),
        });
        if (!res.ok) throw new Error('Failed to execute skill');
        return res.json();
    },

    getHistory: async (sessionId: string): Promise<SkillExecution[]> => {
        const res = await fetch(`${API_URL}/skills/history/${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch execution history');
        return res.json();
    },
};

// Scientific Chat API Types
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, any>;
}

export interface ToolResult {
    tool_call_id: string;
    success: boolean;
    output?: string;
    error?: string;
    execution_time_ms: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    tool_calls?: ToolCall[];
    tool_results?: ToolResult[];
    created_at: string;
}

export interface ChatConversation {
    id: string;
    session_id: string;
    title: string;
    message_count: number;
    sandbox_dir: string;
    model_name: string;
    total_tokens_used: number;
    created_at: string;
    last_message_at: string;
}

export interface SandboxFile {
    name: string;
    path: string;
    size: number;
    is_dir: boolean;
    modified_at: string;
}

// Scientific Chat API
export const scientificChatApi = {
    createConversation: async (sessionId: string): Promise<ChatConversation> => {
        const res = await fetch(`${API_URL}/scientific-chat/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok) throw new Error('Failed to create conversation');
        return res.json();
    },

    listConversations: async (sessionId: string): Promise<ChatConversation[]> => {
        const res = await fetch(`${API_URL}/scientific-chat/conversations/${sessionId}`);
        if (!res.ok) throw new Error('Failed to list conversations');
        return res.json();
    },

    getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
        const res = await fetch(`${API_URL}/scientific-chat/conversations/${conversationId}/messages`);
        if (!res.ok) throw new Error('Failed to get messages');
        return res.json();
    },

    deleteConversation: async (conversationId: string): Promise<void> => {
        const res = await fetch(`${API_URL}/scientific-chat/conversations/${conversationId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete conversation');
    },

    listSandboxFiles: async (conversationId: string, subpath: string = ''): Promise<SandboxFile[]> => {
        const params = new URLSearchParams(subpath ? { subpath } : {});
        const res = await fetch(`${API_URL}/scientific-chat/sandbox/${conversationId}/files?${params}`);
        if (!res.ok) throw new Error('Failed to list sandbox files');
        const data = await res.json();
        return data.files;
    },

    downloadSandboxFile: (conversationId: string, filePath: string): string => {
        return `${API_URL}/scientific-chat/sandbox/${conversationId}/download/${filePath}`;
    },

    connectWebSocket: (): WebSocket => {
        const wsUrl = API_URL.replace(/^http/, 'ws') + '/scientific-chat/stream';
        return new WebSocket(wsUrl);
    }
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

// MedResearch API Types (Web-based Claude Code Terminal)
export interface MedResearchSession {
    id: string;
    session_id: string;
    title: string;
    workspace_dir: string;
    status: 'created' | 'active' | 'disconnected' | 'terminated' | 'error';
    terminal_rows: number;
    terminal_cols: number;
    commands_executed: number;
    created_at: string;
    last_activity_at: string;
    expires_at: string;
}

// MedResearch API
export const medresearchApi = {
    createSession: async (browserSessionId: string, title?: string): Promise<MedResearchSession> => {
        const res = await fetch(`${API_URL}/medresearch/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: browserSessionId, title }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to create session' }));
            throw new Error(error.detail || 'Failed to create session');
        }
        return res.json();
    },

    listSessions: async (browserSessionId: string): Promise<MedResearchSession[]> => {
        const res = await fetch(`${API_URL}/medresearch/sessions/${browserSessionId}`);
        if (!res.ok) throw new Error('Failed to list sessions');
        return res.json();
    },

    getSession: async (medresearchId: string): Promise<MedResearchSession> => {
        const res = await fetch(`${API_URL}/medresearch/sessions/detail/${medresearchId}`);
        if (!res.ok) throw new Error('Failed to get session');
        return res.json();
    },

    deleteSession: async (medresearchId: string): Promise<void> => {
        const res = await fetch(`${API_URL}/medresearch/sessions/${medresearchId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete session');
    },

    resizeTerminal: async (medresearchId: string, rows: number, cols: number): Promise<void> => {
        await fetch(`${API_URL}/medresearch/sessions/${medresearchId}/resize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows, cols }),
        });
    },

    connectTerminal: (medresearchId: string): WebSocket => {
        const wsUrl = API_URL.replace(/^http/, 'ws') + `/medresearch/terminal/${medresearchId}`;
        return new WebSocket(wsUrl);
    },

    // Project save/restore (SSD storage)
    saveProject: async (medresearchId: string, projectName: string, description?: string): Promise<{
        name: string;
        path: string;
        saved_at: string;
    }> => {
        const res = await fetch(`${API_URL}/medresearch/sessions/${medresearchId}/save-project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_name: projectName, description }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to save project' }));
            throw new Error(error.detail || 'Failed to save project');
        }
        return res.json();
    },

    listProjects: async (): Promise<{
        name: string;
        path: string;
        description?: string;
        saved_at: string;
        files?: string[];
    }[]> => {
        const res = await fetch(`${API_URL}/medresearch/projects`);
        if (!res.ok) throw new Error('Failed to list projects');
        return res.json();
    },

    createFromProject: async (browserSessionId: string, projectName: string, title?: string): Promise<MedResearchSession> => {
        const res = await fetch(`${API_URL}/medresearch/sessions/from-project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: browserSessionId, project_name: projectName, title }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to restore project' }));
            throw new Error(error.detail || 'Failed to restore project');
        }
        return res.json();
    },

    deleteProject: async (projectName: string): Promise<void> => {
        const res = await fetch(`${API_URL}/medresearch/projects/${encodeURIComponent(projectName)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete project');
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
