"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Sparkles, Code2, Edit3, Plus, Loader2, CheckCircle, XCircle, Download, Palette, ChevronDown, FileText } from 'lucide-react';

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

interface ThemeOption {
    id: string;
    name: string;
    bg: string;
}

interface MarkdownDocumentViewProps {
    markdown: string;
    documentName?: string;
    theme: string;
    themes: ThemeOption[];
    onThemeChange: (themeId: string) => void;
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

// Simple markdown text renderer with table support
function renderMarkdownText(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this is the start of a table (line with | characters)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            // Collect all table lines
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }

            // Parse the table
            if (tableLines.length >= 2) {
                const parseRow = (row: string): string[] => {
                    return row.split('|').slice(1, -1).map(cell => cell.trim());
                };

                const headers = parseRow(tableLines[0]);
                // Skip separator line (index 1)
                const dataRows = tableLines.slice(2).map(parseRow);

                elements.push(
                    <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
                        <table className="min-w-full border border-slate-600 rounded-lg overflow-hidden">
                            <thead className="bg-slate-700">
                                <tr>
                                    {headers.map((h, hi) => (
                                        <th key={hi} className="px-4 py-2 text-left text-sm font-semibold text-slate-200 border-b border-slate-600">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dataRows.map((row, ri) => (
                                    <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'}>
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-4 py-2 text-sm text-slate-300 border-b border-slate-700">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            continue;
        }

        // Regular line processing
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
        i++;
    }

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
    onRepair,
    onExport
}: {
    code: string;
    name: string;
    theme: string;
    onEdit: () => void;
    onAdd: () => void;
    onRepair: () => void;
    onExport?: () => void;
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #canvas {
            width: 100%;
            height: 100%;
            position: relative;
            cursor: grab;
            overflow: hidden;
        }
        
        #canvas:active {
            cursor: grabbing;
        }
        
        #diagram-container {
            position: absolute;
            transform-origin: 0 0;
            will-change: transform;
            opacity: 0;
            transition: opacity 0.2s ease-out;
        }
        
        #output { 
            display: inline-block;
            padding: 20px;
        }
        
        #output svg { 
            max-width: none !important; 
            height: auto; 
            display: block;
        }
        
        .error { 
            color: #ef4444; 
            font-family: monospace; 
            font-size: 12px; 
            white-space: pre-wrap;
            padding: 20px;
        }
        
        #zoom-indicator {
            position: fixed;
            bottom: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 100;
        }
        
        #zoom-indicator.visible {
            opacity: 1;
        }
        
        #help-tooltip {
            position: fixed;
            bottom: 8px;
            left: 8px;
            background: rgba(0, 0, 0, 0.5);
            color: rgba(255, 255, 255, 0.7);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
        }
    </style>
</head>
<body>
    <div id="canvas">
        <div id="loading-placeholder" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #64748b; font-size: 12px;">
            Rendering...
        </div>
        <div id="diagram-container">
            <div id="output"></div>
        </div>
    </div>
    
    <div id="zoom-indicator">100%</div>
    <div id="help-tooltip">Scroll to zoom • Drag to pan • Double-click to reset</div>
    
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        
        const canvas = document.getElementById('canvas');
        const container = document.getElementById('diagram-container');
        const output = document.getElementById('output');
        const zoomIndicator = document.getElementById('zoom-indicator');
        const loadingPlaceholder = document.getElementById('loading-placeholder');
        
        // Transform state
        let state = {
            scale: 1,
            panX: 0,
            panY: 0,
            minScale: 0.1,
            maxScale: 5
        };
        
        // Drag state
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let lastPan = { x: 0, y: 0 };
        
        // Update transform
        const updateTransform = () => {
            container.style.transform = \`translate(\${state.panX}px, \${state.panY}px) scale(\${state.scale})\`;
        };
        
        // Show zoom indicator
        let zoomTimeout;
        const showZoom = () => {
            zoomIndicator.textContent = Math.round(state.scale * 100) + '%';
            zoomIndicator.classList.add('visible');
            clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(() => zoomIndicator.classList.remove('visible'), 1000);
        };
        
        // Center and fit diagram
        const centerDiagram = () => {
            const svg = output.querySelector('svg');
            if (!svg) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            let svgWidth = svg.viewBox?.baseVal?.width || svg.getBBox?.()?.width || svg.clientWidth;
            let svgHeight = svg.viewBox?.baseVal?.height || svg.getBBox?.()?.height || svg.clientHeight;
            
            if (!svgWidth || !svgHeight) {
                const svgRect = svg.getBoundingClientRect();
                svgWidth = svgRect.width / state.scale;
                svgHeight = svgRect.height / state.scale;
            }
            
            const padding = 40;
            const availableWidth = canvasRect.width - padding;
            const availableHeight = canvasRect.height - padding;
            
            const scaleX = availableWidth / svgWidth;
            const scaleY = availableHeight / svgHeight;
            
            state.scale = Math.min(scaleX, scaleY, 1.5);
            state.scale = Math.max(state.scale, 0.1);
            
            const scaledWidth = svgWidth * state.scale;
            const scaledHeight = svgHeight * state.scale;
            
            state.panX = (canvasRect.width - scaledWidth) / 2;
            state.panY = (canvasRect.height - scaledHeight) / 2;
            
            updateTransform();
            container.style.opacity = '1';
        };
        
        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(state.scale * delta, state.minScale), state.maxScale);
            
            const scaleChange = newScale / state.scale;
            state.panX = mouseX - (mouseX - state.panX) * scaleChange;
            state.panY = mouseY - (mouseY - state.panY) * scaleChange;
            state.scale = newScale;
            
            updateTransform();
            showZoom();
        }, { passive: false });
        
        // Mouse drag
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            lastPan = { x: state.panX, y: state.panY };
            canvas.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            state.panX = lastPan.x + (e.clientX - dragStart.x);
            state.panY = lastPan.y + (e.clientY - dragStart.y);
            updateTransform();
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        // Double-click to reset
        canvas.addEventListener('dblclick', () => {
            setTimeout(centerDiagram, 50);
            showZoom();
        });
        
        // Render diagram
        const code = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: '${theme}',
                securityLevel: 'loose',
                flowchart: { useMaxWidth: false, htmlLabels: true }
            });
            
            const { svg } = await mermaid.render('diagram-${Date.now()}', code);
            output.innerHTML = svg;
            loadingPlaceholder.style.display = 'none';
            setTimeout(centerDiagram, 50);
            window.parent.postMessage({ type: 'DIAGRAM_SUCCESS' }, '*');
        } catch (e) {
            loadingPlaceholder.style.display = 'none';
            container.style.opacity = '1';
            output.innerHTML = '<div class="error">' + e.message + '</div>';
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
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                            title="Export as .mmd"
                        >
                            <Download size={14} />
                        </button>
                    )}
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
                    style={{ height: '400px' }}
                    sandbox="allow-scripts allow-same-origin"
                    title={`Diagram: ${name}`}
                />
            )}
        </div>
    );
}

export default function MarkdownDocumentView({
    markdown,
    documentName,
    theme,
    themes,
    onThemeChange,
    onEditDiagram,
    onAddChart,
    onAddAllCharts,
    onRepairWithAI,
    onClose
}: MarkdownDocumentViewProps) {
    const { segments, charts } = parseMarkdown(markdown);
    const [repairedCode, setRepairedCode] = useState<Record<number, string>>({});
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);

    const handleRepair = async (index: number, code: string, error: string) => {
        const fixed = await onRepairWithAI(code, error);
        if (fixed) {
            setRepairedCode(prev => ({ ...prev, [index]: fixed }));
        }
    };

    // Export a single chart as .mmd file
    const exportChart = (name: string, code: string) => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.replace(/[^a-z0-9]/gi, '_')}.mmd`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Export all charts as individual files (zip would be nicer but this works)
    const exportAllCharts = () => {
        charts.forEach((chart, i) => {
            setTimeout(() => exportChart(chart.name, chart.code), i * 100);
        });
    };

    // Export the entire markdown document
    const exportMarkdown = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentName || 'document'}.md`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const currentTheme = themes.find(t => t.id === theme);

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
                    {/* Theme Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                        >
                            <Palette size={14} />
                            <span>{currentTheme?.name || 'Theme'}</span>
                            <ChevronDown size={12} />
                        </button>
                        {showThemeDropdown && (
                            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[120px]">
                                {themes.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            onThemeChange(t.id);
                                            setShowThemeDropdown(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-700 ${theme === t.id ? 'text-indigo-400' : 'text-slate-300'}`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded border border-slate-600"
                                            style={{ background: t.bg }}
                                        />
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export Dropdown */}
                    <div className="relative group">
                        <button
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                        >
                            <Download size={14} />
                            Export
                            <ChevronDown size={12} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[160px] hidden group-hover:block">
                            <button
                                onClick={exportMarkdown}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                            >
                                <FileText size={14} />
                                Export Markdown
                            </button>
                            <button
                                onClick={exportAllCharts}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                            >
                                <Download size={14} />
                                Export All Charts (.mmd)
                            </button>
                        </div>
                    </div>

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
                                    onExport={() => exportChart(segment.name, currentCode)}
                                />
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    );
}
