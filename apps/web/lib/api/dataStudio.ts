import { getApiUrl, CSRF_HEADERS } from './client';
import type { DashboardWidget, DashboardInfo, DashboardLayout } from './types';

// ============ Data Studio Types ============

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

export type { DashboardInfo, DashboardLayout, DashboardWidget };

// ============ Data Studio API (Legacy) ============

export const dataStudioApi = {
    createSession: async (projectName: string): Promise<DataStudioSession> => {
        const res = await fetch(`${getApiUrl()}/data-studio/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify(dashboard),
        });
        if (!res.ok) throw new Error('Failed to save dashboard');
        return res.json();
    },

    deleteDashboard: async (projectName: string, dashboardId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/dashboards/${projectName}/${dashboardId}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
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

// ============ Data Studio V2 Types ============

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

// ============ Data Studio V2 API (Redesigned) ============

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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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
            headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({ workspace_project: workspaceProject, files }),
        });
        if (!res.ok) throw new Error('Failed to import files');
        return res.json();
    },

    deleteFile: async (projectName: string, path: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/files?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({ name, widgets }),
        });
        if (!res.ok) throw new Error('Failed to save dashboard');
        return res.json();
    },

    deleteDashboard: async (projectName: string, dashboardId: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/data-studio/v2/projects/${encodeURIComponent(projectName)}/dashboards/${encodeURIComponent(dashboardId)}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
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
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
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
