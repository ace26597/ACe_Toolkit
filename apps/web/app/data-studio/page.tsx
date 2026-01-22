'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, FileSpreadsheet, Send, Pin, Trash2, Play, Loader2, Wifi, WifiOff, BarChart3, Table, Code } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import { workspaceApi } from '@/lib/api';
import { useDataStudioSession, ChatMessage, DataStudioEvent } from './hooks/useDataStudioSession';

// ==================== Components ====================

function ProjectSelector({ onSelect }: { onSelect: (projectName: string) => void }) {
    const [projects, setProjects] = useState<Array<{ name: string; createdAt: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        workspaceApi.listProjects()
            .then((data) => setProjects(data.map(p => ({ name: p.name, createdAt: p.createdAt }))))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-cyan-400 hover:text-cyan-300"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Select a Project</h2>
            <p className="text-gray-400 mb-6">Choose a project to analyze its data files</p>

            {projects.length === 0 ? (
                <div className="text-center p-8 border border-gray-700 rounded-lg">
                    <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No projects found</p>
                    <Link
                        href="/workspace"
                        className="text-cyan-400 hover:text-cyan-300"
                    >
                        Create a project in Workspace first
                    </Link>
                </div>
            ) : (
                <div className="grid gap-3">
                    {projects.map(project => (
                        <button
                            key={project.name}
                            onClick={() => onSelect(project.name)}
                            className="flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 rounded-lg transition-all text-left"
                        >
                            <Database className="w-8 h-8 text-cyan-500" />
                            <div>
                                <h3 className="font-medium text-white">{project.name}</h3>
                                <p className="text-sm text-gray-400">
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ToolCallCard({ event }: { event: DataStudioEvent }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-gray-800/50 rounded-lg p-3 text-sm border border-gray-700">
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="text-blue-400">
                    {event.status === 'running' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        '🔧'
                    )}
                </span>
                <span className="font-mono text-blue-300">{event.tool}</span>
                <span className="text-gray-500 text-xs ml-auto">
                    {expanded ? '▼' : '▶'}
                </span>
            </div>
            {expanded && event.input && (
                <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-32 bg-gray-900 p-2 rounded">
                    {JSON.stringify(event.input, null, 2)}
                </pre>
            )}
        </div>
    );
}

function CodeBlock({ event, onPin, onRun }: { event: DataStudioEvent; onPin?: () => void; onRun?: () => void }) {
    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">{event.language || 'python'}</span>
                <div className="flex gap-2">
                    {onRun && (
                        <button
                            onClick={onRun}
                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                        >
                            <Play className="w-3 h-3" /> Run
                        </button>
                    )}
                    {onPin && (
                        <button
                            onClick={onPin}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            <Pin className="w-3 h-3" /> Pin
                        </button>
                    )}
                </div>
            </div>
            <pre className="p-3 text-sm overflow-auto max-h-64">
                <code className="text-gray-300">{event.content}</code>
            </pre>
        </div>
    );
}

function MessageBubble({
    message,
    onPinCode,
    onRunCode
}: {
    message: ChatMessage;
    onPinCode?: (code: string, language: string) => void;
    onRunCode?: (code: string) => void;
}) {
    const isUser = message.role === 'user';

    return (
        <div className={`mb-4 ${isUser ? 'ml-8' : 'mr-8'}`}>
            <div className={`rounded-lg p-3 ${isUser ? 'bg-cyan-900/30 border border-cyan-700' : 'bg-gray-800 border border-gray-700'}`}>
                {/* Text content */}
                {message.content && (
                    <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
                )}

                {/* Events (tool calls, code blocks, etc.) */}
                {message.events.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {message.events.map((event, idx) => {
                            if (event.type === 'tool_call') {
                                return <ToolCallCard key={idx} event={event} />;
                            }
                            if (event.type === 'code') {
                                return (
                                    <CodeBlock
                                        key={idx}
                                        event={event}
                                        onPin={onPinCode ? () => onPinCode(event.content || '', event.language || 'python') : undefined}
                                        onRun={onRunCode ? () => onRunCode(event.content || '') : undefined}
                                    />
                                );
                            }
                            if (event.type === 'tool_result') {
                                return (
                                    <div key={idx} className="bg-gray-900/50 rounded p-2 text-xs text-gray-400 max-h-32 overflow-auto">
                                        <span className="text-green-400">Result:</span>
                                        <pre className="mt-1">{event.content?.slice(0, 500)}{event.truncated ? '...' : ''}</pre>
                                    </div>
                                );
                            }
                            if (event.type === 'thinking') {
                                return (
                                    <div key={idx} className="text-gray-500 italic text-sm flex items-center gap-2">
                                        <span className="animate-pulse">💭</span>
                                        {event.content}
                                    </div>
                                );
                            }
                            if (event.type === 'error') {
                                return (
                                    <div key={idx} className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                                        Error: {event.message}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
            </div>
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : ''}`}>
                {message.timestamp.toLocaleTimeString()}
            </div>
        </div>
    );
}

function ChatPanel({
    messages,
    isConnected,
    onSendMessage,
    onPinCode,
    onRunCode
}: {
    messages: ChatMessage[];
    isConnected: boolean;
    onSendMessage: (content: string) => void;
    onPinCode: (code: string, language: string) => void;
    onRunCode: (code: string) => void;
}) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && isConnected) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Ask Claude to analyze your data</p>
                        <p className="text-sm mt-2">Try: "What files do I have?" or "Analyze the CSV file"</p>
                    </div>
                ) : (
                    messages.map(message => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onPinCode={onPinCode}
                            onRunCode={onRunCode}
                        />
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={isConnected ? "Ask about your data..." : "Connecting..."}
                        disabled={!isConnected}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!isConnected || !input.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}

function DashboardCanvas({
    widgets,
    onRemoveWidget
}: {
    widgets: Array<{ id: string; type: string; data: any }>;
    onRemoveWidget: (id: string) => void;
}) {
    if (widgets.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                    <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Pin charts and tables here</p>
                    <p className="text-sm mt-2">Click the pin icon on code blocks to add widgets</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 grid grid-cols-2 gap-4">
            {widgets.map(widget => (
                <div
                    key={widget.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                >
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                            {widget.type === 'chart' && <BarChart3 className="w-4 h-4" />}
                            {widget.type === 'table' && <Table className="w-4 h-4" />}
                            {widget.type === 'code' && <Code className="w-4 h-4" />}
                            {widget.type}
                        </span>
                        <button
                            onClick={() => onRemoveWidget(widget.id)}
                            className="text-gray-500 hover:text-red-400"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-4 h-48 overflow-auto">
                        {widget.type === 'code' && (
                            <pre className="text-xs text-gray-300 font-mono">
                                {widget.data?.content || JSON.stringify(widget.data, null, 2)}
                            </pre>
                        )}
                        {widget.type === 'chart' && (
                            <div className="text-gray-400 text-sm">
                                Chart visualization (Plotly integration coming soon)
                            </div>
                        )}
                        {widget.type === 'table' && (
                            <div className="text-gray-400 text-sm">
                                Table view (AG Grid integration coming soon)
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function DataFilesList({ files }: { files: Array<{ name: string; path: string; size: number; type: string }> }) {
    if (files.length === 0) {
        return (
            <div className="text-gray-500 text-sm p-2">
                No data files found. Upload files to the project's data folder.
            </div>
        );
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-1">
            {files.map(file => (
                <div
                    key={file.path}
                    className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded text-sm"
                >
                    <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
                    <span className="text-gray-300 flex-1 truncate">{file.name}</span>
                    <span className="text-gray-500 text-xs">{formatSize(file.size)}</span>
                </div>
            ))}
        </div>
    );
}

// ==================== Main Page ====================

function DataStudioContent() {
    const [projectName, setProjectName] = useState<string | null>(null);

    const {
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
    } = useDataStudioSession();

    const handleSelectProject = async (name: string) => {
        setProjectName(name);
        await connect(name);
    };

    const handlePinCode = (code: string, language: string) => {
        pinWidget({
            type: 'code',
            data: { content: code, language },
        });
    };

    if (!projectName) {
        return (
            <div className="min-h-screen bg-gray-900">
                <header className="border-b border-gray-800 bg-gray-950">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">Back</span>
                        </Link>
                        <div className="h-4 w-px bg-gray-700" />
                        <h1 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            C3 Data Studio
                        </h1>
                    </div>
                </header>
                <ProjectSelector onSelect={handleSelectProject} />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-950 flex-shrink-0">
                <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <h1 className="text-lg font-semibold text-cyan-500 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Data Studio
                        </h1>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-300">{projectName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Connection status */}
                        <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                            {isConnected ? 'Connected' : isLoading ? 'Connecting...' : 'Disconnected'}
                        </div>
                        <button
                            onClick={() => {
                                disconnect();
                                setProjectName(null);
                            }}
                            className="text-gray-400 hover:text-white text-sm"
                        >
                            Change Project
                        </button>
                    </div>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar - Data files */}
                <div className="w-48 border-r border-gray-800 bg-gray-950 flex-shrink-0 overflow-auto">
                    <div className="p-3 border-b border-gray-800">
                        <h3 className="text-sm font-medium text-gray-400">Data Files</h3>
                    </div>
                    <DataFilesList files={dataFiles} />
                </div>

                {/* Chat panel */}
                <div className="w-[400px] border-r border-gray-800 flex flex-col flex-shrink-0">
                    <ChatPanel
                        messages={messages}
                        isConnected={isConnected}
                        onSendMessage={sendMessage}
                        onPinCode={handlePinCode}
                        onRunCode={runCode}
                    />
                </div>

                {/* Dashboard canvas */}
                <div className="flex-1 overflow-auto bg-gray-900">
                    <DashboardCanvas
                        widgets={widgets}
                        onRemoveWidget={removeWidget}
                    />
                </div>
            </div>
        </div>
    );
}

export default function DataStudioPage() {
    return (
        <ProtectedRoute>
            <DataStudioContent />
        </ProtectedRoute>
    );
}
