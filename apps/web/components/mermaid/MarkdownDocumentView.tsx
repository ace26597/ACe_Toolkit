"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Sparkles, Code2, Edit3, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DiagramSegment {
    type: 'mermaid';
    code: string;
    name: string;
    index: number;
}

interface TextSegment {
    type: 'text';
    content: string;
}

type Segment = DiagramSegment | TextSegment;

interface DiagramState {
    status: 'loading' | 'success' | 'error';
    error?: string;
}

interface MarkdownDocumentViewProps {
    markdown: string;
    theme: string;
    onEditDiagram: (code: string, name: string) => void;
    onAddChart: (name: string, code: string) => void;
    onAddAllCharts: (charts: { name: string; code: string }[]) => void;
    onRepairWithAI: (code: string, error: string) => Promise<string | null>;
    onClose: () => void;
}

// Parse markdown into segments
function parseMarkdown(markdown: string): { segments: Segment[]; charts: { name: string; code: string }[] } {
    const segments: Segment[] = [];
    const charts: { name: string; code: string }[] = [];

    const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/gi;
    let lastIndex = 0;
    let chartIndex = 0;

    const matches = [...markdown.matchAll(mermaidBlockRegex)];

    for (const match of matches) {
        // Add text before this mermaid block
        if (match.index! > lastIndex) {
            const textContent = markdown.substring(lastIndex, match.index);
            if (textContent.trim()) {
                segments.push({ type: 'text', content: textContent });
            }
        }

        // Extract chart name from preceding context
        const beforeMatch = markdown.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        let name = `Chart ${chartIndex + 1}`;

        // Look for heading or bold text before the chart
        for (let j = lines.length - 1; j >= Math.max(0, lines.length - 10); j--) {
            const line = lines[j].trim();
            if (line.startsWith('#')) {
                name = line.replace(/^#+\s*/, '').trim();
                break;
            }
            const boldMatch = line.match(/\*\*([^*]+)\*\*|__([^_]+)__/);
            if (boldMatch) {
                name = (boldMatch[1] || boldMatch[2]).trim();
                break;
            }
        }

        const chartCode = match[1].trim();
        segments.push({ type: 'mermaid', code: chartCode, name, index: chartIndex });
        charts.push({ name, code: chartCode });

        chartIndex++;
        lastIndex = match.index! + match[0].length;
    }

    // Add remaining text after last mermaid block
    if (lastIndex < markdown.length) {
        const textContent = markdown.substring(lastIndex);
        if (textContent.trim()) {
            segments.push({ type: 'text', content: textContent });
        }
    }

    return { segments, charts };
}

// Simple markdown text renderer
function renderMarkdownText(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            elements.push(<h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">{trimmed.slice(2)}</h1>);
        } else if (trimmed.startsWith('## ')) {
            elements.push(<h2 key={i} className="text-xl font-bold text-slate-200 mt-5 mb-2">{trimmed.slice(3)}</h2>);
        } else if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={i} className="text-lg font-semibold text-slate-300 mt-4 mb-2">{trimmed.slice(4)}</h3>);
        } else if (trimmed.startsWith('#### ')) {
            elements.push(<h4 key={i} className="text-base font-semibold text-slate-400 mt-3 mb-1">{trimmed.slice(5)}</h4>);
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(<li key={i} className="text-slate-300 ml-4 list-disc">{renderInlineMarkdown(trimmed.slice(2))}</li>);
        } else if (trimmed.match(/^\d+\.\s/)) {
            elements.push(<li key={i} className="text-slate-300 ml-4 list-decimal">{renderInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''))}</li>);
        } else if (trimmed.startsWith('> ')) {
            elements.push(<blockquote key={i} className="border-l-4 border-indigo-500 pl-4 py-1 text-slate-400 italic">{trimmed.slice(2)}</blockquote>);
        } else if (trimmed === '---' || trimmed === '***') {
            elements.push(<hr key={i} className="border-slate-700 my-4" />);
        } else if (trimmed) {
            elements.push(<p key={i} className="text-slate-300 mb-2">{renderInlineMarkdown(trimmed)}</p>);
        } else {
            elements.push(<div key={i} className="h-2" />);
        }
    });

    return <>{elements}</>;
}

// Render inline markdown (bold, italic, code, links)
function renderInlineMarkdown(text: string): React.ReactNode {
    // Simple inline parsing - could be expanded
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Process bold, italic, code
    const patterns = [
        { regex: /\*\*([^*]+)\*\*/g, render: (m: string) => <strong key={key++} className="font-bold text-white">{m}</strong> },
        { regex: /\*([^*]+)\*/g, render: (m: string) => <em key={key++} className="italic">{m}</em> },
        { regex: /`([^`]+)`/g, render: (m: string) => <code key={key++} className="bg-slate-800 px-1 rounded text-indigo-300 font-mono text-sm">{m}</code> },
        { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (m: string, url: string) => <a key={key++} href={url} className="text-indigo-400 hover:underline">{m}</a> },
    ];

    // For simplicity, just return the text with basic bold/italic handling
    return <>{text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')}</>;
}

// Individual diagram renderer
function DiagramRenderer({
    code,
    name,
    theme,
    onEdit,
    onAdd,
    onRepair
}: {
    code: string;
    name: string;
    theme: string;
    onEdit: () => void;
    onAdd: () => void;
    onRepair: () => void;
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [state, setState] = useState<DiagramState>({ status: 'loading' });
    const [showCode, setShowCode] = useState(false);
    const [isRepairing, setIsRepairing] = useState(false);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const bgColor = theme === 'dark' ? '#1e293b' : '#f8fafc';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: ${bgColor};
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #output { 
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #output svg { max-width: 100%; height: auto; }
        .error { color: #ef4444; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div id="output">Loading...</div>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        
        const code = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: '${theme}',
                securityLevel: 'loose',
                flowchart: { useMaxWidth: true, htmlLabels: true }
            });
            
            const { svg } = await mermaid.render('diagram-${Date.now()}', code);
            document.getElementById('output').innerHTML = svg;
            window.parent.postMessage({ type: 'DIAGRAM_SUCCESS' }, '*');
        } catch (e) {
            document.getElementById('output').innerHTML = '<div class="error">' + e.message + '</div>';
            window.parent.postMessage({ type: 'DIAGRAM_ERROR', error: e.message }, '*');
        }
    </script>
</body>
</html>`;

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Listen for messages from iframe
        const handleMessage = (e: MessageEvent) => {
            if (e.source !== iframe.contentWindow) return;
            if (e.data?.type === 'DIAGRAM_SUCCESS') {
                setState({ status: 'success' });
            } else if (e.data?.type === 'DIAGRAM_ERROR') {
                setState({ status: 'error', error: e.data.error });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [code, theme]);

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    {state.status === 'loading' && <Loader2 size={14} className="text-blue-400 animate-spin" />}
                    {state.status === 'success' && <CheckCircle size={14} className="text-emerald-400" />}
                    {state.status === 'error' && <XCircle size={14} className="text-red-400" />}
                    <span className="text-sm font-medium text-slate-300">{name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                        title="View Code"
                    >
                        <Code2 size={14} />
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                        title="Edit in Editor"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={onAdd}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                        title="Add as Chart"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Code view (collapsible) */}
            {showCode && (
                <div className="p-3 bg-slate-900 border-b border-slate-700">
                    <pre className="text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
                </div>
            )}

            {/* Diagram or Error */}
            {state.status === 'error' ? (
                <div className="p-4 bg-red-900/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                            <p className="text-red-300 font-medium text-sm">Syntax Error</p>
                            <p className="text-red-400/80 text-xs mt-1 font-mono">{state.error}</p>
                            <button
                                onClick={onRepair}
                                disabled={isRepairing}
                                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded text-sm text-white"
                            >
                                {isRepairing ? (
                                    <><Loader2 size={14} className="animate-spin" /> Repairing...</>
                                ) : (
                                    <><Sparkles size={14} /> Repair with AI</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    className="w-full border-0"
                    style={{ height: '250px' }}
                    sandbox="allow-scripts allow-same-origin"
                    title={`Diagram: ${name}`}
                />
            )}
        </div>
    );
}

export default function MarkdownDocumentView({
    markdown,
    theme,
    onEditDiagram,
    onAddChart,
    onAddAllCharts,
    onRepairWithAI,
    onClose
}: MarkdownDocumentViewProps) {
    const { segments, charts } = parseMarkdown(markdown);
    const [repairedCode, setRepairedCode] = useState<Record<number, string>>({});

    const handleRepair = async (index: number, code: string, error: string) => {
        const fixed = await onRepairWithAI(code, error);
        if (fixed) {
            setRepairedCode(prev => ({ ...prev, [index]: fixed }));
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">📄 Document View</span>
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                        {charts.length} diagram{charts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onAddAllCharts(charts)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white"
                    >
                        <Plus size={14} /> Add All Charts
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {segments.map((segment, i) => {
                        if (segment.type === 'text') {
                            return (
                                <div key={i} className="prose prose-invert max-w-none">
                                    {renderMarkdownText(segment.content)}
                                </div>
                            );
                        } else {
                            const currentCode = repairedCode[segment.index] ?? segment.code;
                            return (
                                <DiagramRenderer
                                    key={`${i}-${currentCode}`}
                                    code={currentCode}
                                    name={segment.name}
                                    theme={theme}
                                    onEdit={() => onEditDiagram(currentCode, segment.name)}
                                    onAdd={() => onAddChart(segment.name, currentCode)}
                                    onRepair={() => handleRepair(segment.index, currentCode, 'Diagram has syntax errors')}
                                />
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    );
}
