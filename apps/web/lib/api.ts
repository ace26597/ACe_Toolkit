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
