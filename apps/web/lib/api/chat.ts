import { getApiUrl, CSRF_HEADERS } from './client';

// ============ Chat Types ============

export interface ChatSessionInfo {
    session_id: string;
    project_name: string;
    title: string;
}

export interface ChatSessionSummary {
    session_id: string;
    title: string;
    project_name: string;
    total_cost_usd: number;
    total_turns: number;
    status: string;
    created_at: string;
    last_activity_at: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    toolCalls: Array<{
        tool_use_id: string;
        tool: string;
        input: Record<string, unknown>;
        result?: string;
        is_error?: boolean;
    }>;
    isError?: boolean;
}

export interface ChatSessionDetail extends ChatSessionSummary {
    messages: ChatMessage[];
    claude_session_id: string | null;
    model: string | null;
    project_dir: string;
}

export interface ChatEvent {
    type: 'init' | 'text' | 'text_delta' | 'tool_start' | 'tool_result' | 'thinking' | 'thinking_delta' | 'result' | 'error';
    content?: string;
    session_id?: string;
    model?: string;
    tools?: number;
    // tool_start fields
    tool?: string;
    tool_use_id?: string;
    input?: Record<string, unknown>;
    // tool_result fields
    is_error?: boolean;
    // result fields
    cost_usd?: number;
    turns?: number;
    duration_ms?: number;
    total_cost_usd?: number;
    total_turns?: number;
}

// ============ Chat API ============

export const chatApi = {
    /**
     * List chat sessions for the current user, optionally filtered by project.
     */
    listSessions: async (projectName?: string): Promise<ChatSessionSummary[]> => {
        const params = projectName ? `?project_name=${encodeURIComponent(projectName)}` : '';
        const res = await fetch(`${getApiUrl()}/chat/sessions${params}`, {
            credentials: 'include',
        });
        if (!res.ok) return [];
        return res.json();
    },

    /**
     * Get full session details including messages.
     */
    getSession: async (sessionId: string): Promise<ChatSessionDetail> => {
        const res = await fetch(`${getApiUrl()}/chat/sessions/${sessionId}`, {
            credentials: 'include',
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to get session' }));
            throw new Error(error.detail || 'Failed to get session');
        }
        return res.json();
    },

    /**
     * Create a new chat session for a workspace project.
     */
    createSession: async (projectName: string): Promise<ChatSessionInfo> => {
        const res = await fetch(`${getApiUrl()}/chat/sessions`, {
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

    /**
     * Send a message and receive SSE events via callback.
     * Optionally sends messages_snapshot for DB persistence.
     */
    sendMessage: async (
        sessionId: string,
        message: string,
        projectName: string,
        onEvent: (event: ChatEvent) => void,
        messagesSnapshot?: ChatMessage[],
    ): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/chat/sessions/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({
                message,
                project_name: projectName,
                messages_snapshot: messagesSnapshot,
            }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to send message' }));
            throw new Error(error.detail || 'Failed to send message');
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
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
                        const event: ChatEvent = JSON.parse(line.slice(6));
                        onEvent(event);
                    } catch {
                        // Skip malformed events
                    }
                }
            }
        }

        // Process any remaining buffered data
        if (buffer.startsWith('data: ')) {
            try {
                const event: ChatEvent = JSON.parse(buffer.slice(6));
                onEvent(event);
            } catch {
                // Skip
            }
        }
    },

    /**
     * Rename a chat session.
     */
    renameSession: async (sessionId: string, title: string): Promise<void> => {
        const res = await fetch(`${getApiUrl()}/chat/sessions/${sessionId}/rename`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({ title }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Failed to rename session' }));
            throw new Error(error.detail || 'Failed to rename session');
        }
    },

    /**
     * Persist messages snapshot to DB without triggering a Claude call.
     */
    persistMessages: async (sessionId: string, messagesSnapshot: ChatMessage[]): Promise<void> => {
        await fetch(`${getApiUrl()}/chat/sessions/${sessionId}/persist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
            credentials: 'include',
            body: JSON.stringify({ messages_snapshot: messagesSnapshot }),
        });
    },

    /**
     * Close a chat session (soft close - preserves history).
     */
    closeSession: async (sessionId: string): Promise<void> => {
        await fetch(`${getApiUrl()}/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { ...CSRF_HEADERS },
            credentials: 'include',
        });
    },
};
