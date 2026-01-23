'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Database, FileSpreadsheet, Send, Pin, Trash2, Play, Loader2, Wifi, WifiOff, BarChart3, Table, Code, Search, FolderOpen, Copy, Check } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth';
import { workspaceApi, DataFile } from '@/lib/api';
import { useDataStudioSession, ChatMessage, DataStudioEvent } from './hooks/useDataStudioSession';
import mermaid from 'mermaid';

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Initialize mermaid
if (typeof window !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
    });
}

// ==================== Chart Components ====================

interface ParsedBlock {
    type: 'text' | 'plotly' | 'mermaid' | 'code' | 'table';
    content: string;
    language?: string;
}

function parseMarkdownContent(content: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    // Match code blocks with language tags
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Add text before this code block
        if (match.index > lastIndex) {
            const text = content.slice(lastIndex, match.index).trim();
            if (text) {
                blocks.push({ type: 'text', content: text });
            }
        }

        const language = match[1]?.toLowerCase() || '';
        const code = match[2].trim();

        if (language === 'plotly') {
            blocks.push({ type: 'plotly', content: code });
        } else if (language === 'mermaid') {
            blocks.push({ type: 'mermaid', content: code });
        } else {
            blocks.push({ type: 'code', content: code, language: language || 'text' });
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        const text = content.slice(lastIndex).trim();
        if (text) {
            blocks.push({ type: 'text', content: text });
        }
    }

    return blocks.length > 0 ? blocks : [{ type: 'text', content }];
}

function PlotlyChart({ content, onPin }: { content: string; onPin?: (data: any) => void }) {
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const chartData = useMemo(() => {
        try {
            const parsed = JSON.parse(content);
            // Ensure dark theme
            if (parsed.layout) {
                parsed.layout.template = 'plotly_dark';
                parsed.layout.paper_bgcolor = 'rgba(0,0,0,0)';
                parsed.layout.plot_bgcolor = 'rgba(31,41,55,0.5)';
                parsed.layout.font = { color: '#9ca3af' };
            }
            return parsed;
        } catch (e) {
            setError('Invalid Plotly JSON');
            return null;
        }
    }, [content]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                {error}
                <pre className="mt-2 text-xs overflow-auto max-h-32">{content}</pre>
            </div>
        );
    }

    if (!chartData) return null;

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-cyan-400 font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Plotly Chart
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    {onPin && (
                        <button
                            onClick={() => onPin(chartData)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            <Pin className="w-3 h-3" /> Add to Dashboard
                        </button>
                    )}
                </div>
            </div>
            <div className="p-2">
                <Plot
                    data={chartData.data}
                    layout={{
                        ...chartData.layout,
                        autosize: true,
                        margin: { t: 40, r: 20, b: 40, l: 50 },
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: chartData.layout?.height || 350 }}
                />
            </div>
        </div>
    );
}

function MermaidDiagram({ content, onPin }: { content: string; onPin?: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, content);
                setSvg(svg);
                setError(null);
            } catch (e: any) {
                setError(e.message || 'Failed to render diagram');
            }
        };
        renderDiagram();
    }, [content]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                Mermaid Error: {error}
                <pre className="mt-2 text-xs overflow-auto max-h-32 text-gray-400">{content}</pre>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-purple-400 font-medium flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Mermaid Diagram
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    {onPin && (
                        <button
                            onClick={onPin}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            <Pin className="w-3 h-3" /> Add to Dashboard
                        </button>
                    )}
                </div>
            </div>
            <div
                ref={containerRef}
                className="p-4 flex justify-center bg-gray-900/50"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        </div>
    );
}

function InlineCodeBlock({ content, language, onPin }: { content: string; language: string; onPin?: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">{language}</span>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
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
                <code className="text-gray-300">{content}</code>
            </pre>
        </div>
    );
}

function RenderedContent({
    content,
    onPinChart,
    onPinCode
}: {
    content: string;
    onPinChart?: (chartData: any, type: 'plotly' | 'mermaid') => void;
    onPinCode?: (code: string, language: string) => void;
}) {
    const blocks = useMemo(() => parseMarkdownContent(content), [content]);

    return (
        <div className="space-y-3">
            {blocks.map((block, idx) => {
                if (block.type === 'plotly') {
                    return (
                        <PlotlyChart
                            key={idx}
                            content={block.content}
                            onPin={onPinChart ? (data) => onPinChart(data, 'plotly') : undefined}
                        />
                    );
                }
                if (block.type === 'mermaid') {
                    return (
                        <MermaidDiagram
                            key={idx}
                            content={block.content}
                            onPin={onPinChart ? () => onPinChart({ mermaid: block.content }, 'mermaid') : undefined}
                        />
                    );
                }
                if (block.type === 'code') {
                    return (
                        <InlineCodeBlock
                            key={idx}
                            content={block.content}
                            language={block.language || 'text'}
                            onPin={onPinCode ? () => onPinCode(block.content, block.language || 'text') : undefined}
                        />
                    );
                }
                // Text block - render with basic markdown-like formatting
                return (
                    <div key={idx} className="text-gray-200 whitespace-pre-wrap">
                        {block.content.split('\n').map((line, lineIdx) => {
                            // Simple markdown table detection
                            if (line.includes('|') && line.trim().startsWith('|')) {
                                return <span key={lineIdx} className="font-mono text-sm">{line}<br/></span>;
                            }
                            // Headers
                            if (line.startsWith('### ')) {
                                return <h3 key={lineIdx} className="text-lg font-semibold text-white mt-3 mb-1">{line.slice(4)}</h3>;
                            }
                            if (line.startsWith('## ')) {
                                return <h2 key={lineIdx} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
                            }
                            if (line.startsWith('# ')) {
                                return <h1 key={lineIdx} className="text-2xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
                            }
                            // Bold text
                            if (line.includes('**')) {
                                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                                return (
                                    <span key={lineIdx}>
                                        {parts.map((part, partIdx) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={partIdx} className="text-white">{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                        })}
                                        <br/>
                                    </span>
                                );
                            }
                            return <span key={lineIdx}>{line}<br/></span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

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
    onPinChart,
    onRunCode
}: {
    message: ChatMessage;
    onPinCode?: (code: string, language: string) => void;
    onPinChart?: (chartData: any, type: 'plotly' | 'mermaid') => void;
    onRunCode?: (code: string) => void;
}) {
    const isUser = message.role === 'user';

    return (
        <div className={`mb-4 ${isUser ? 'ml-8' : 'mr-8'}`}>
            <div className={`rounded-lg p-3 ${isUser ? 'bg-cyan-900/30 border border-cyan-700' : 'bg-gray-800 border border-gray-700'}`}>
                {/* Text content - now with chart rendering */}
                {message.content && (
                    isUser ? (
                        <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <RenderedContent
                            content={message.content}
                            onPinChart={onPinChart}
                            onPinCode={onPinCode}
                        />
                    )
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
    onPinChart,
    onRunCode
}: {
    messages: ChatMessage[];
    isConnected: boolean;
    onSendMessage: (content: string) => void;
    onPinCode: (code: string, language: string) => void;
    onPinChart: (chartData: any, type: 'plotly' | 'mermaid') => void;
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

    const quickActions = [
        { label: "List all files", prompt: "What data files do I have? List them with their sizes and types." },
        { label: "Data overview", prompt: "Give me a quick overview of all the data files - structure, row counts, and key columns." },
        { label: "Find patterns", prompt: "Analyze the data and identify any interesting patterns, trends, or anomalies." },
        { label: "Create chart", prompt: "Create a visualization that best represents the main insights from this data." },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-4">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium text-gray-300">Ask Claude to analyze your data</p>
                        <p className="text-sm mt-2 mb-6">Click a file on the left or try a quick action below</p>

                        {/* Quick actions */}
                        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => isConnected && onSendMessage(action.prompt)}
                                    disabled={!isConnected}
                                    className="text-xs text-left p-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:text-gray-600 border border-gray-700 hover:border-cyan-600 rounded transition-colors"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-gray-600 mt-6">
                            ← Select files from the sidebar to analyze
                        </p>
                    </div>
                ) : (
                    messages.map(message => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onPinCode={onPinCode}
                            onPinChart={onPinChart}
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

function DashboardWidget({ widget, onRemove }: { widget: { id: string; type: string; data: any }; onRemove: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mermaidSvg, setMermaidSvg] = useState<string>('');

    // Render Mermaid diagram if type is mermaid
    useEffect(() => {
        if (widget.type === 'mermaid' && widget.data?.mermaid) {
            const renderMermaid = async () => {
                try {
                    const id = `dashboard-mermaid-${widget.id}`;
                    const { svg } = await mermaid.render(id, widget.data.mermaid);
                    setMermaidSvg(svg);
                } catch (e) {
                    console.error('Mermaid render error:', e);
                }
            };
            renderMermaid();
        }
    }, [widget.id, widget.type, widget.data]);

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                    {widget.type === 'chart' && <BarChart3 className="w-4 h-4 text-cyan-400" />}
                    {widget.type === 'mermaid' && <Code className="w-4 h-4 text-purple-400" />}
                    {widget.type === 'table' && <Table className="w-4 h-4" />}
                    {widget.type === 'code' && <Code className="w-4 h-4" />}
                    {widget.type === 'chart' ? 'Plotly Chart' : widget.type === 'mermaid' ? 'Diagram' : widget.type}
                </span>
                <button
                    onClick={onRemove}
                    className="text-gray-500 hover:text-red-400"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="p-2">
                {widget.type === 'code' && (
                    <pre className="text-xs text-gray-300 font-mono max-h-64 overflow-auto p-2">
                        {widget.data?.content || JSON.stringify(widget.data, null, 2)}
                    </pre>
                )}
                {widget.type === 'chart' && widget.data?.data && (
                    <Plot
                        data={widget.data.data}
                        layout={{
                            ...widget.data.layout,
                            autosize: true,
                            margin: { t: 40, r: 20, b: 40, l: 50 },
                            template: 'plotly_dark',
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(31,41,55,0.5)',
                            font: { color: '#9ca3af' },
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: widget.data.layout?.height || 300 }}
                    />
                )}
                {widget.type === 'mermaid' && mermaidSvg && (
                    <div
                        ref={containerRef}
                        className="flex justify-center bg-gray-900/50 p-4 rounded"
                        dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                    />
                )}
                {widget.type === 'table' && (
                    <div className="text-gray-400 text-sm p-4">
                        Table view coming soon
                    </div>
                )}
            </div>
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
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Dashboard</p>
                    <p className="text-sm mt-2">Charts will appear here</p>
                    <p className="text-xs mt-4 text-gray-600">
                        Click "Add to Dashboard" on charts to pin them
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {widgets.map(widget => (
                <DashboardWidget
                    key={widget.id}
                    widget={widget}
                    onRemove={() => onRemoveWidget(widget.id)}
                />
            ))}
        </div>
    );
}

function DataFilesList({
    files,
    selectedFiles,
    onToggleSelect,
    onAnalyzeSelected,
    isConnected
}: {
    files: DataFile[];
    selectedFiles: Set<string>;
    onToggleSelect: (path: string) => void;
    onAnalyzeSelected: () => void;
    isConnected: boolean;
}) {
    const [search, setSearch] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['data', 'notes', 'root']));

    // Filter files by search
    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.path.toLowerCase().includes(search.toLowerCase())
    );

    // Group files by folder
    const groupedFiles = filteredFiles.reduce((acc, file) => {
        const folder = file.folder || 'root';
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(file);
        return acc;
    }, {} as Record<string, DataFile[]>);

    const toggleFolder = (folder: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'csv':
            case 'tsv':
                return <Table className="w-4 h-4 text-green-500" />;
            case 'xlsx':
            case 'xls':
                return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
            case 'json':
            case 'jsonl':
                return <Code className="w-4 h-4 text-yellow-500" />;
            case 'md':
                return <FileSpreadsheet className="w-4 h-4 text-blue-400" />;
            default:
                return <FileSpreadsheet className="w-4 h-4 text-cyan-500" />;
        }
    };

    if (files.length === 0) {
        return (
            <div className="text-gray-500 text-sm p-4 text-center">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No data files found</p>
                <p className="text-xs mt-1">Add CSV, JSON, MD, or Excel files to your project</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-2 border-b border-gray-800">
                <input
                    type="text"
                    placeholder="Search files..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
            </div>

            {/* Selected count & analyze button */}
            {selectedFiles.size > 0 && (
                <div className="p-2 bg-cyan-900/30 border-b border-cyan-700 flex items-center justify-between">
                    <span className="text-xs text-cyan-300">{selectedFiles.size} selected</span>
                    <button
                        onClick={onAnalyzeSelected}
                        disabled={!isConnected}
                        className="text-xs bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-2 py-1 rounded flex items-center gap-1"
                    >
                        <BarChart3 className="w-3 h-3" />
                        Analyze
                    </button>
                </div>
            )}

            {/* File list grouped by folder */}
            <div className="flex-1 overflow-auto">
                {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
                    <div key={folder}>
                        {/* Folder header */}
                        <button
                            onClick={() => toggleFolder(folder)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-900 hover:bg-gray-800 text-xs text-gray-400 sticky top-0"
                        >
                            <span>{expandedFolders.has(folder) ? '▼' : '▶'}</span>
                            <span className="font-medium">{folder}/</span>
                            <span className="text-gray-600">({folderFiles.length})</span>
                        </button>

                        {/* Files in folder */}
                        {expandedFolders.has(folder) && (
                            <div className="space-y-0.5 p-1">
                                {folderFiles.map(file => {
                                    const isSelected = selectedFiles.has(file.path);
                                    return (
                                        <div
                                            key={file.path}
                                            onClick={() => onToggleSelect(file.path)}
                                            className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-cyan-900/40 border border-cyan-600'
                                                    : 'hover:bg-gray-800 border border-transparent'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                                isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'
                                            }`}>
                                                {isSelected && <span className="text-white text-[10px]">✓</span>}
                                            </div>
                                            {/* Icon */}
                                            {getFileIcon(file.type)}
                                            {/* Name & size */}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-gray-300 truncate block">{file.name}</span>
                                            </div>
                                            <span className="text-gray-600 text-[10px]">{formatSize(file.size)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="p-2 border-t border-gray-800 space-y-1">
                <button
                    onClick={() => {
                        // Select all visible files
                        filteredFiles.forEach(f => {
                            if (!selectedFiles.has(f.path)) onToggleSelect(f.path);
                        });
                    }}
                    className="w-full text-xs text-gray-400 hover:text-cyan-400 p-1 hover:bg-gray-800 rounded text-left"
                >
                    Select All ({filteredFiles.length})
                </button>
                {selectedFiles.size > 0 && (
                    <button
                        onClick={() => {
                            selectedFiles.forEach(path => onToggleSelect(path));
                        }}
                        className="w-full text-xs text-gray-400 hover:text-red-400 p-1 hover:bg-gray-800 rounded text-left"
                    >
                        Clear Selection
                    </button>
                )}
            </div>
        </div>
    );
}

// ==================== Main Page ====================

function DataStudioContent() {
    const [projectName, setProjectName] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

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
        setSelectedFiles(new Set());
        await connect(name);
    };

    const handlePinCode = (code: string, language: string) => {
        pinWidget({
            type: 'code',
            data: { content: code, language },
        });
    };

    const handlePinChart = (chartData: any, type: 'plotly' | 'mermaid') => {
        pinWidget({
            type: type === 'plotly' ? 'chart' : 'mermaid',
            data: chartData,
        });
    };

    const handleToggleFileSelect = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const handleAnalyzeSelected = () => {
        if (!isConnected || selectedFiles.size === 0) return;

        const files = Array.from(selectedFiles);
        if (files.length === 1) {
            sendMessage(`Analyze the file "${files[0]}" - show me the structure, data types, basic statistics, and any interesting patterns or insights.`);
        } else {
            const fileList = files.map(f => `- ${f}`).join('\n');
            sendMessage(`Analyze these ${files.length} files and provide insights:\n${fileList}\n\nFor each file, show structure and key statistics. Then identify any relationships or patterns across the files.`);
        }
        // Clear selection after analyzing
        setSelectedFiles(new Set());
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
                <div className="w-64 border-r border-gray-800 bg-gray-950 flex-shrink-0 flex flex-col">
                    <div className="p-3 border-b border-gray-800">
                        <h3 className="text-sm font-medium text-gray-400">Project Files</h3>
                        <p className="text-xs text-gray-500 mt-1">{dataFiles.length} files · Select to analyze</p>
                    </div>
                    <DataFilesList
                        files={dataFiles as DataFile[]}
                        selectedFiles={selectedFiles}
                        onToggleSelect={handleToggleFileSelect}
                        onAnalyzeSelected={handleAnalyzeSelected}
                        isConnected={isConnected}
                    />
                </div>

                {/* Chat panel */}
                <div className="w-[400px] border-r border-gray-800 flex flex-col flex-shrink-0">
                    <ChatPanel
                        messages={messages}
                        isConnected={isConnected}
                        onSendMessage={sendMessage}
                        onPinCode={handlePinCode}
                        onPinChart={handlePinChart}
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
