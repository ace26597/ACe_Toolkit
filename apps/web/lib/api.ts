const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    generate: (prompt: string, currentCode?: string) =>
        fetchWithAuth('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt, current_code: currentCode }),
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

export interface Chart {
    id: string;
    projectId: string;
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
