'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { Send, RotateCcw, ChevronDown, ChevronRight, AlertCircle, Loader2, DollarSign, Zap, Wrench, FolderOpen, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, MessageSquare, Pencil, Check, X } from 'lucide-react';
import { chatApi, ChatEvent } from '@/lib/api';
import type { ChatSessionSummary, ChatMessage as APIChatMessage } from '@/lib/api';

const DataBrowser = dynamic(() => import('@/components/workspace/DataBrowser'), { ssr: false });

// ============ Types ============

interface ToolCall {
    tool_use_id: string;
    tool: string;
    input: Record<string, unknown>;
    result?: string;
    is_error?: boolean;
    collapsed: boolean;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    toolCalls: ToolCall[];
    isStreaming?: boolean;
    isError?: boolean;
}

interface ChatViewProps {
    selectedProject: string;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

// ============ Tool Call Card ============

function ToolCallCard({ toolCall, onToggle }: { toolCall: ToolCall; onToggle: () => void }) {
    // Build a concise label from the tool input
    const label = (() => {
        const inp = toolCall.input;
        if (toolCall.tool === 'Read' && inp.file_path) return String(inp.file_path);
        if (toolCall.tool === 'Write' && inp.file_path) return String(inp.file_path);
        if (toolCall.tool === 'Edit' && inp.file_path) return String(inp.file_path);
        if (toolCall.tool === 'Bash' && inp.command) {
            const cmd = String(inp.command);
            return cmd.length > 60 ? cmd.slice(0, 60) + '...' : cmd;
        }
        if (toolCall.tool === 'Grep' && inp.pattern) return `/${inp.pattern}/`;
        if (toolCall.tool === 'Glob' && inp.pattern) return String(inp.pattern);
        if (toolCall.tool === 'WebSearch' && inp.query) return String(inp.query);
        // Fallback: show first string value
        const firstVal = Object.values(inp).find(v => typeof v === 'string');
        if (firstVal) {
            const s = String(firstVal);
            return s.length > 50 ? s.slice(0, 50) + '...' : s;
        }
        return '';
    })();

    const hasResult = toolCall.result !== undefined;

    return (
        <div className="my-1.5 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors text-sm"
            >
                {toolCall.collapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                )}
                <Wrench className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-blue-400 font-medium flex-shrink-0">{toolCall.tool}</span>
                {label && (
                    <span className="text-slate-400 truncate">{label}</span>
                )}
                {!hasResult && (
                    <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin ml-auto flex-shrink-0" />
                )}
                {hasResult && toolCall.is_error && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 ml-auto flex-shrink-0" />
                )}
            </button>

            {!toolCall.collapsed && (
                <div className="border-t border-slate-700 px-3 py-2 space-y-2">
                    {Object.keys(toolCall.input).length > 0 && (
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Input</div>
                            <pre className="text-xs text-slate-300 bg-slate-900/50 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
                                {JSON.stringify(toolCall.input, null, 2)}
                            </pre>
                        </div>
                    )}
                    {hasResult && (
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                {toolCall.is_error ? 'Error' : 'Result'}
                            </div>
                            <pre className={`text-xs rounded p-2 overflow-x-auto max-h-48 overflow-y-auto ${
                                toolCall.is_error
                                    ? 'text-red-300 bg-red-900/20'
                                    : 'text-slate-300 bg-slate-900/50'
                            }`}>
                                {toolCall.result && toolCall.result.length > 2000
                                    ? toolCall.result.slice(0, 2000) + '\n... (truncated)'
                                    : toolCall.result}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ Markdown Renderer ============

function MarkdownContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !className;
                    if (isInline) {
                        return (
                            <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-emerald-300 text-sm" {...props}>
                                {children}
                            </code>
                        );
                    }
                    return (
                        <pre className="bg-slate-900/70 rounded-lg p-3 my-2 overflow-x-auto border border-slate-700">
                            <code className={`text-sm ${className || ''}`} {...props}>
                                {children}
                            </code>
                        </pre>
                    );
                },
                p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                    return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                },
                h1({ children }) {
                    return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
                },
                h2({ children }) {
                    return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
                },
                h3({ children }) {
                    return <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>;
                },
                table({ children }) {
                    return (
                        <div className="overflow-x-auto my-2">
                            <table className="min-w-full text-sm border border-slate-700">{children}</table>
                        </div>
                    );
                },
                th({ children }) {
                    return <th className="border border-slate-700 px-3 py-1.5 bg-slate-800 text-left font-medium">{children}</th>;
                },
                td({ children }) {
                    return <td className="border border-slate-700 px-3 py-1.5">{children}</td>;
                },
                blockquote({ children }) {
                    return <blockquote className="border-l-2 border-slate-600 pl-3 text-slate-400 my-2">{children}</blockquote>;
                },
                a({ href, children }) {
                    return <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

// ============ Session List Sidebar ============

function SessionListPanel({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onRenameSession,
    isLoading,
}: {
    sessions: ChatSessionSummary[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onRenameSession: (id: string, title: string) => void;
    isLoading: boolean;
}) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const editRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && editRef.current) {
            editRef.current.focus();
            editRef.current.select();
        }
    }, [editingId]);

    const startEdit = (id: string, title: string) => {
        setEditingId(id);
        setEditValue(title);
    };

    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            onRenameSession(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
        if (diffHours < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-3 border-b border-slate-700">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    New Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                        No chat history yet
                    </div>
                ) : (
                    <div className="py-1">
                        {sessions.map(s => {
                            const isActive = s.session_id === activeSessionId;
                            const isEditing = editingId === s.session_id;

                            return (
                                <div
                                    key={s.session_id}
                                    className={`group relative px-3 py-2 cursor-pointer transition-colors ${
                                        isActive
                                            ? 'bg-purple-600/20 border-l-2 border-purple-500'
                                            : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                                    }`}
                                    onClick={() => !isEditing && onSelectSession(s.session_id)}
                                >
                                    {isEditing ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                ref={editRef}
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveEdit();
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-purple-500"
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <button
                                                onClick={e => { e.stopPropagation(); saveEdit(); }}
                                                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); setEditingId(null); }}
                                                className="p-0.5 text-slate-400 hover:text-white"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${
                                                    isActive ? 'text-purple-400' : 'text-slate-500'
                                                }`} />
                                                <span className={`text-sm truncate ${
                                                    isActive ? 'text-white font-medium' : 'text-slate-300'
                                                }`}>
                                                    {s.title}
                                                </span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); startEdit(s.session_id, s.title); }}
                                                    className="hidden group-hover:block p-0.5 text-slate-500 hover:text-white ml-auto flex-shrink-0"
                                                    title="Rename"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 ml-6 text-[11px] text-slate-500">
                                                {s.last_activity_at && (
                                                    <span>{formatDate(s.last_activity_at)}</span>
                                                )}
                                                {s.total_turns > 0 && (
                                                    <span>{s.total_turns} turn{s.total_turns !== 1 ? 's' : ''}</span>
                                                )}
                                                {s.total_cost_usd > 0 && (
                                                    <span>${s.total_cost_usd.toFixed(3)}</span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============ ChatView Component ============

export default function ChatView({ selectedProject, showToast }: ChatViewProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionModel, setSessionModel] = useState<string>('');
    const [totalCost, setTotalCost] = useState(0);
    const [totalTurns, setTotalTurns] = useState(0);

    // Session list state
    const [sessionList, setSessionList] = useState<ChatSessionSummary[]>([]);
    const [sessionListLoading, setSessionListLoading] = useState(false);
    const [showSessionList, setShowSessionList] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat_session_list_open');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });

    const [showFiles, setShowFiles] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat_file_browser_open');
            return saved !== null ? saved === 'true' : true; // Default open
        }
        return true;
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef(false);
    const prevProjectRef = useRef(selectedProject);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load session list when project changes
    const loadSessionList = useCallback(async () => {
        if (!selectedProject) return;
        setSessionListLoading(true);
        try {
            const sessions = await chatApi.listSessions(selectedProject);
            setSessionList(sessions);
        } catch {
            // Ignore errors for list
        } finally {
            setSessionListLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        loadSessionList();
    }, [loadSessionList]);

    // Reset when project changes
    useEffect(() => {
        if (prevProjectRef.current !== selectedProject) {
            setSessionId(null);
            setMessages([]);
            setTotalCost(0);
            setTotalTurns(0);
            setSessionModel('');
            setIsStreaming(false);
            prevProjectRef.current = selectedProject;
        }
    }, [selectedProject]);

    const toggleSessionList = useCallback(() => {
        setShowSessionList(prev => {
            const next = !prev;
            localStorage.setItem('chat_session_list_open', String(next));
            return next;
        });
    }, []);

    const toggleFiles = useCallback(() => {
        setShowFiles(prev => {
            const next = !prev;
            localStorage.setItem('chat_file_browser_open', String(next));
            return next;
        });
    }, []);

    const handleNewChat = useCallback(() => {
        setSessionId(null);
        setMessages([]);
        setTotalCost(0);
        setTotalTurns(0);
        setSessionModel('');
        setIsStreaming(false);
        abortRef.current = true;
    }, []);

    const handleSelectSession = useCallback(async (id: string) => {
        if (id === sessionId) return;
        if (isStreaming) return;

        try {
            const detail = await chatApi.getSession(id);
            setSessionId(id);
            setSessionModel(detail.model || '');
            setTotalCost(detail.total_cost_usd || 0);
            setTotalTurns(detail.total_turns || 0);

            // Restore messages from DB
            if (detail.messages && detail.messages.length > 0) {
                const restored: ChatMessage[] = detail.messages.map((m: APIChatMessage) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content || '',
                    thinking: m.thinking,
                    toolCalls: (m.toolCalls || []).map(tc => ({ ...tc, collapsed: true })),
                    isError: m.isError,
                }));
                setMessages(restored);
            } else {
                setMessages([]);
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to load session', 'error');
        }
    }, [sessionId, isStreaming, showToast]);

    const handleRenameSession = useCallback(async (id: string, title: string) => {
        try {
            await chatApi.renameSession(id, title);
            setSessionList(prev => prev.map(s =>
                s.session_id === id ? { ...s, title } : s
            ));
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to rename', 'error');
        }
    }, [showToast]);

    // Build a serializable messages snapshot for DB persistence
    const buildMessagesSnapshot = useCallback((msgs: ChatMessage[]): APIChatMessage[] => {
        return msgs
            .filter(m => !m.isStreaming)
            .map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                thinking: m.thinking,
                toolCalls: m.toolCalls.map(tc => ({
                    tool_use_id: tc.tool_use_id,
                    tool: tc.tool,
                    input: tc.input,
                    result: tc.result,
                    is_error: tc.is_error,
                })),
                isError: m.isError,
            }));
    }, []);

    const persistMessages = useCallback(async (sid: string, msgs: ChatMessage[]) => {
        try {
            const snapshot = buildMessagesSnapshot(msgs);
            await chatApi.persistMessages(sid, snapshot);
        } catch {
            // Best-effort persistence
        }
    }, [buildMessagesSnapshot]);

    const handleSend = useCallback(async () => {
        const msg = inputValue.trim();
        if (!msg || isStreaming) return;

        abortRef.current = false;
        setInputValue('');
        setIsStreaming(true);

        // Add user message
        const userMsgId = `user-${Date.now()}`;
        const assistantMsgId = `assistant-${Date.now()}`;

        setMessages(prev => [
            ...prev,
            { id: userMsgId, role: 'user', content: msg, toolCalls: [] },
            { id: assistantMsgId, role: 'assistant', content: '', toolCalls: [], isStreaming: true },
        ]);

        try {
            // Create session if first message
            let currentSessionId = sessionId;
            if (!currentSessionId) {
                const session = await chatApi.createSession(selectedProject);
                currentSessionId = session.session_id;
                setSessionId(currentSessionId);
                // Add to session list
                setSessionList(prev => [{
                    session_id: currentSessionId!,
                    title: session.title,
                    project_name: selectedProject,
                    total_cost_usd: 0,
                    total_turns: 0,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString(),
                }, ...prev]);
            }

            let finalMessages: ChatMessage[] = [];

            // Send message with streaming
            await chatApi.sendMessage(
                currentSessionId,
                msg,
                selectedProject,
                (event: ChatEvent) => {
                    if (abortRef.current) return;

                    setMessages(prev => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (lastIdx < 0 || updated[lastIdx].role !== 'assistant') return prev;

                        const current = { ...updated[lastIdx] };

                        switch (event.type) {
                            case 'init':
                                if (event.model) setSessionModel(event.model);
                                break;

                            case 'text':
                                current.content = event.content || '';
                                break;

                            case 'text_delta':
                                current.content += event.content || '';
                                break;

                            case 'tool_start':
                                current.toolCalls = [
                                    ...current.toolCalls,
                                    {
                                        tool_use_id: event.tool_use_id || '',
                                        tool: event.tool || 'unknown',
                                        input: (event.input as Record<string, unknown>) || {},
                                        collapsed: true,
                                    },
                                ];
                                break;

                            case 'tool_result':
                                current.toolCalls = current.toolCalls.map(tc =>
                                    tc.tool_use_id === event.tool_use_id
                                        ? { ...tc, result: event.content || '', is_error: event.is_error }
                                        : tc
                                );
                                break;

                            case 'thinking':
                                current.thinking = event.content || '';
                                break;

                            case 'thinking_delta':
                                current.thinking = (current.thinking || '') + (event.content || '');
                                break;

                            case 'result':
                                current.isStreaming = false;
                                if (event.total_cost_usd !== undefined) setTotalCost(event.total_cost_usd);
                                if (event.total_turns !== undefined) setTotalTurns(event.total_turns);
                                if (event.is_error && !current.content) {
                                    current.content = event.content || 'An error occurred';
                                    current.isError = true;
                                }
                                break;

                            case 'error':
                                current.content = event.content || 'An error occurred';
                                current.isStreaming = false;
                                current.isError = true;
                                break;
                        }

                        updated[lastIdx] = current;
                        finalMessages = updated;
                        return updated;
                    });
                },
            );

            // After stream completes, persist messages to DB
            if (finalMessages.length > 0 && currentSessionId) {
                persistMessages(currentSessionId, finalMessages);

                // Update session list entry
                setSessionList(prev => prev.map(s =>
                    s.session_id === currentSessionId
                        ? { ...s, last_activity_at: new Date().toISOString() }
                        : s
                ));
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Failed to send message';
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: errMsg,
                        isStreaming: false,
                        isError: true,
                    };
                }
                return updated;
            });
            showToast(errMsg, 'error');
        } finally {
            setIsStreaming(false);
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
                    updated[lastIdx] = { ...updated[lastIdx], isStreaming: false };
                }
                return updated;
            });
        }
    }, [inputValue, isStreaming, sessionId, selectedProject, showToast, persistMessages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [inputValue]);

    const toggleToolCollapse = (msgId: string, toolUseId: string) => {
        setMessages(prev =>
            prev.map(m =>
                m.id === msgId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls.map(tc =>
                            tc.tool_use_id === toolUseId
                                ? { ...tc, collapsed: !tc.collapsed }
                                : tc
                        ),
                    }
                    : m
            )
        );
    };

    return (
        <div className="flex h-full bg-slate-900">
            {/* Session List Sidebar */}
            {showSessionList && (
                <div className="hidden md:block w-56 border-r border-slate-700 bg-slate-900/50 flex-shrink-0 overflow-hidden">
                    <SessionListPanel
                        sessions={sessionList}
                        activeSessionId={sessionId}
                        onSelectSession={handleSelectSession}
                        onNewChat={handleNewChat}
                        onRenameSession={handleRenameSession}
                        isLoading={sessionListLoading}
                    />
                </div>
            )}

            {/* Chat Panel */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* Info Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 text-sm">
                    <div className="flex items-center gap-4 text-slate-400">
                        <button
                            onClick={toggleSessionList}
                            className={`hidden md:flex items-center gap-1.5 px-2 py-1 text-sm rounded-lg transition-colors ${
                                showSessionList
                                    ? 'bg-slate-600 text-white'
                                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={showSessionList ? 'Hide sessions' : 'Show sessions'}
                        >
                            {showSessionList ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                        </button>
                        {sessionModel && (
                            <span className="flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-slate-300">{sessionModel.split('/').pop()?.replace('claude-', '') || sessionModel}</span>
                            </span>
                        )}
                        {totalCost > 0 && (
                            <span className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                <span>${totalCost.toFixed(4)}</span>
                            </span>
                        )}
                        {totalTurns > 0 && (
                            <span className="text-slate-500">{totalTurns} turn{totalTurns !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFiles}
                            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                showFiles
                                    ? 'bg-slate-600 text-white'
                                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={showFiles ? 'Hide files' : 'Show files'}
                        >
                            {showFiles ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                            Files
                        </button>
                        <button
                            onClick={handleNewChat}
                            disabled={isStreaming}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            New Chat
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <Zap className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">Chat with Claude</h3>
                        <p className="text-sm text-slate-400 max-w-md mb-6">
                            Ask questions about your project, analyze files, write code, or get research help.
                            Claude has full access to your workspace.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {[
                                'What files are in this project?',
                                'Analyze the data files',
                                'Summarize the README',
                                'Help me write a script',
                            ].map(prompt => (
                                <button
                                    key={prompt}
                                    onClick={() => {
                                        setInputValue(prompt);
                                        textareaRef.current?.focus();
                                    }}
                                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] ${
                                msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                                    : 'w-full'
                            }`}
                        >
                            {msg.role === 'user' ? (
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Thinking (collapsible) */}
                                    {msg.thinking && (
                                        <details className="group">
                                            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1 py-1">
                                                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                                                Thinking...
                                            </summary>
                                            <div className="text-xs text-slate-500 bg-slate-800/30 rounded-lg p-3 mt-1 italic whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                {msg.thinking}
                                            </div>
                                        </details>
                                    )}

                                    {/* Tool calls */}
                                    {msg.toolCalls.map(tc => (
                                        <ToolCallCard
                                            key={tc.tool_use_id}
                                            toolCall={tc}
                                            onToggle={() => toggleToolCollapse(msg.id, tc.tool_use_id)}
                                        />
                                    ))}

                                    {/* Main text content */}
                                    {msg.content && (
                                        <div className={`text-sm leading-relaxed ${
                                            msg.isError ? 'text-red-400' : 'text-slate-200'
                                        }`}>
                                            <MarkdownContent content={msg.content} />
                                        </div>
                                    )}

                                    {/* Streaming indicator */}
                                    {msg.isStreaming && !msg.content && msg.toolCalls.length === 0 && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    )}
                                    {msg.isStreaming && (msg.content || msg.toolCalls.length > 0) && (
                                        <div className="inline-block w-2 h-4 bg-slate-400 animate-pulse rounded-sm" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

                {/* Input Bar */}
                <div className="border-t border-slate-700 bg-slate-800/50 p-3">
                    <div className="flex items-end gap-2 max-w-4xl mx-auto">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isStreaming ? 'Waiting for response...' : 'Type a message... (Enter to send, Shift+Enter for newline)'}
                            disabled={isStreaming}
                            rows={1}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none disabled:opacity-50 transition-colors"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isStreaming || !inputValue.trim()}
                            className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors flex-shrink-0"
                            title="Send message"
                        >
                            {isStreaming ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* File Browser Sidebar - Desktop only */}
            {showFiles && (
                <div className="hidden md:block w-80 border-l border-slate-700 bg-slate-900/50 flex-shrink-0 overflow-hidden">
                    <DataBrowser projectName={selectedProject} />
                </div>
            )}
        </div>
    );
}
