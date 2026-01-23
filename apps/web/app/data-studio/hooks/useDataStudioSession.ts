'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataStudioApi, DashboardWidget, DataFile } from '@/lib/api';

// Event types from Claude output
export interface DataStudioEvent {
    type: 'thinking' | 'tool_call' | 'tool_result' | 'code' | 'text' | 'text_delta' | 'result' | 'chart' | 'table' | 'error' | 'done' | 'raw' | 'pong' | 'input_delta';
    content?: string;
    tool?: string;
    input?: Record<string, any>;
    output?: string;
    status?: string;
    language?: string;
    data?: any;
    message?: string;
    id?: string;
    context_before?: string;
    context_after?: string;
    truncated?: boolean;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    events: DataStudioEvent[];
    timestamp: Date;
}

export interface UseDataStudioSessionReturn {
    // Session state
    sessionId: string | null;
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;

    // Data
    messages: ChatMessage[];
    widgets: DashboardWidget[];
    dataFiles: DataFile[];

    // Actions
    connect: (projectName: string) => Promise<void>;
    disconnect: () => void;
    sendMessage: (content: string) => void;
    runCode: (code: string) => void;
    pinWidget: (widget: Omit<DashboardWidget, 'id' | 'layout'>) => void;
    removeWidget: (widgetId: string) => void;
    updateWidgetLayout: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
    clearMessages: () => void;
}

export function useDataStudioSession(): UseDataStudioSessionReturn {
    // Connection state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [dataFiles, setDataFiles] = useState<DataFile[]>([]);

    // WebSocket ref
    const wsRef = useRef<WebSocket | null>(null);
    const currentMessageRef = useRef<ChatMessage | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate unique IDs
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Connect to a project
    const connect = useCallback(async (projectName: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Create session via API
            const session = await dataStudioApi.createSession(projectName);
            setSessionId(session.session_id);
            setDataFiles(session.data_files);

            // Connect WebSocket
            const wsUrl = dataStudioApi.getWebSocketUrl(session.session_id);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Data Studio WebSocket connected');
                setIsConnected(true);
                setIsLoading(false);
            };

            ws.onmessage = (event) => {
                try {
                    const data: DataStudioEvent = JSON.parse(event.data);
                    handleEvent(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error');
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
                setIsConnected(false);
            };

            wsRef.current = ws;

        } catch (e: any) {
            console.error('Failed to connect:', e);
            setError(e.message || 'Failed to connect');
            setIsLoading(false);
        }
    }, []);

    // Handle incoming events
    const handleEvent = useCallback((event: DataStudioEvent) => {
        setMessages(prev => {
            const updated = [...prev];

            // Get or create current assistant message
            let currentMsg = updated.find(
                m => m.role === 'assistant' && m.id === currentMessageRef.current?.id
            );

            if (!currentMsg && event.type !== 'done' && event.type !== 'pong') {
                // Create new assistant message
                currentMsg = {
                    id: generateId(),
                    role: 'assistant',
                    content: '',
                    events: [],
                    timestamp: new Date(),
                };
                currentMessageRef.current = currentMsg;
                updated.push(currentMsg);
            }

            if (currentMsg) {
                // Add event to current message
                if (event.type === 'text' || event.type === 'result') {
                    // Main text content or final result
                    currentMsg.content += event.content || '';
                } else if (event.type === 'text_delta') {
                    currentMsg.content += event.content || '';
                } else if (event.type === 'done') {
                    currentMessageRef.current = null;
                } else if (event.type === 'pong') {
                    // Ignore keepalive responses
                } else {
                    // Store other events (tool_call, thinking, etc.)
                    currentMsg.events.push(event);
                }
            }

            return updated;
        });
    }, []);

    // Send message to Claude
    const sendMessage = useCallback((content: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError('Not connected');
            return;
        }

        // Add user message
        const userMsg: ChatMessage = {
            id: generateId(),
            role: 'user',
            content,
            events: [],
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);

        // Send to server
        wsRef.current.send(JSON.stringify({
            type: 'message',
            content,
        }));
    }, []);

    // Run code
    const runCode = useCallback((code: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError('Not connected');
            return;
        }

        wsRef.current.send(JSON.stringify({
            type: 'run_code',
            code,
        }));
    }, []);

    // Pin widget to dashboard
    const pinWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'layout'>) => {
        const newWidget: DashboardWidget = {
            ...widget,
            id: generateId(),
            layout: {
                x: (widgets.length * 4) % 12,
                y: Math.floor(widgets.length / 3) * 4,
                w: 4,
                h: 3,
            },
        };
        setWidgets(prev => [...prev, newWidget]);
    }, [widgets.length]);

    // Remove widget from dashboard
    const removeWidget = useCallback((widgetId: string) => {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    }, []);

    // Update widget layouts
    const updateWidgetLayout = useCallback((layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
        setWidgets(prev => prev.map(widget => {
            const layout = layouts.find(l => l.i === widget.id);
            if (layout) {
                return {
                    ...widget,
                    layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
                };
            }
            return widget;
        }));
    }, []);

    // Clear messages
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    // Disconnect
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (sessionId) {
            dataStudioApi.closeSession(sessionId).catch(console.error);
        }
        setSessionId(null);
        setIsConnected(false);
    }, [sessionId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Keepalive ping
    useEffect(() => {
        if (!isConnected) return;

        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);

        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return {
        sessionId,
        isConnected,
        isLoading,
        error,
        messages,
        widgets,
        dataFiles,
        connect,
        disconnect,
        sendMessage,
        runCode,
        pinWidget,
        removeWidget,
        updateWidgetLayout,
        clearMessages,
    };
}
