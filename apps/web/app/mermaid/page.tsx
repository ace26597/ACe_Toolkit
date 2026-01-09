"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { useRouter } from 'next/navigation';
import { Download, ZoomIn, ZoomOut, Maximize, Home, PlusCircle } from 'lucide-react';

const STORAGE_KEY = 'mermaid_diagrams';
const CURRENT_KEY = 'mermaid_current';

interface Diagram {
    id: string;
    title: string;
    code: string;
    theme: string;
    updatedAt: string;
}

// Track if mermaid has been initialized
let mermaidInitialized = false;

export default function MermaidPage() {
    const router = useRouter();
    const [code, setCode] = useState(`graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `);
    const [theme, setTheme] = useState('default');
    const [diagramTitle, setDiagramTitle] = useState('Untitled Diagram');
    const [svgOutput, setSvgOutput] = useState<string>('');
    const previewRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const renderIdRef = useRef(0);

    // Initialize mermaid once with elk layout
    useEffect(() => {
        if (!mermaidInitialized) {
            mermaid.registerLayoutLoaders(elkLayouts);
            mermaid.initialize({
                startOnLoad: false,
                theme: theme,
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                },
                logLevel: 'error',
            });
            mermaidInitialized = true;
        }
    }, []);

    // Update theme when changed
    useEffect(() => {
        if (mermaidInitialized) {
            mermaid.initialize({
                startOnLoad: false,
                theme: theme,
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                },
                logLevel: 'error',
            });
        }
    }, [theme]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setDiagrams(JSON.parse(saved));
        }
        const current = localStorage.getItem(CURRENT_KEY);
        if (current) {
            const parsed = JSON.parse(current);
            setCode(parsed.code);
            setTheme(parsed.theme || 'default');
            setDiagramTitle(parsed.title);
            setCurrentId(parsed.id);
        }
    }, []);

    // Autosave current diagram
    useEffect(() => {
        const current = { id: currentId, code, theme, title: diagramTitle };
        localStorage.setItem(CURRENT_KEY, JSON.stringify(current));
    }, [code, theme, diagramTitle, currentId]);

    // Render diagram on code change
    const renderDiagram = useCallback(async () => {
        if (!previewRef.current || !code.trim()) return;

        try {
            // Generate unique ID for each render
            renderIdRef.current += 1;
            const renderId = `mermaid-diagram-${renderIdRef.current}`;

            // Create a temporary container for rendering (avoid React DOM conflicts)
            const tempContainer = document.createElement('div');
            tempContainer.id = renderId;
            document.body.appendChild(tempContainer);

            // Parse and render
            const { svg } = await mermaid.render(renderId, code);

            // Clean up temp container
            tempContainer.remove();

            if (previewRef.current) {
                previewRef.current.innerHTML = svg;
                setSvgOutput(svg);
                setRenderError(null);
            }
        } catch (e: any) {
            console.error('Mermaid render error:', e);
            // Extract error message safely without circular refs
            let errorMsg = 'Invalid Mermaid syntax';
            if (typeof e === 'string') {
                errorMsg = e;
            } else if (e?.message) {
                errorMsg = e.message;
            } else if (e?.str) {
                errorMsg = e.str;
            }
            setRenderError(errorMsg);
        }
    }, [code]);

    useEffect(() => {
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [renderDiagram, theme]);

    const saveDiagram = () => {
        const id = currentId || Date.now().toString();
        const diagram: Diagram = {
            id,
            title: diagramTitle || 'Untitled',
            code,
            theme,
            updatedAt: new Date().toISOString(),
        };

        const updated = currentId
            ? diagrams.map(d => d.id === id ? diagram : d)
            : [...diagrams, diagram];

        setDiagrams(updated);
        setCurrentId(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const loadDiagram = (diagram: Diagram) => {
        setCode(diagram.code);
        setTheme(diagram.theme || 'default');
        setDiagramTitle(diagram.title);
        setCurrentId(diagram.id);
        setShowSidebar(false);
    };

    const newDiagram = () => {
        setCode(`graph TD
    A[Start] --> B[End]`);
        setTheme('default');
        setDiagramTitle('Untitled Diagram');
        setCurrentId(null);
        setShowSidebar(false);
    };

    const deleteDiagram = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = diagrams.filter(d => d.id !== id);
        setDiagrams(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        if (id === currentId) newDiagram();
    };

    const exportSvg = () => {
        if (svgOutput) {
            const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${diagramTitle || 'diagram'}.svg`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300"
                        title="Home"
                    >
                        <Home size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800 dark:text-white">Mermaid Editor</h1>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 rounded"
                    >
                        My Diagrams ({diagrams.length})
                    </button>
                    <button
                        onClick={newDiagram}
                        className="p-2 text-gray-600 hover:text-green-600"
                        title="New Diagram"
                    >
                        <PlusCircle size={20} />
                    </button>
                    <input
                        type="text"
                        placeholder="Diagram title"
                        value={diagramTitle}
                        onChange={(e) => setDiagramTitle(e.target.value)}
                        className="w-48 px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white"
                    >
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="forest">Forest</option>
                        <option value="neutral">Neutral</option>
                        <option value="base">Base</option>
                    </select>
                    <button
                        onClick={saveDiagram}
                        className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                    >
                        Save
                    </button>
                    <button
                        onClick={exportSvg}
                        disabled={!svgOutput}
                        className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                        <Download size={16} /> SVG
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar */}
                {showSidebar && (
                    <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-gray-800 border-r z-20 shadow-lg overflow-y-auto">
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-gray-800 dark:text-white">My Diagrams</h2>
                                <button onClick={() => setShowSidebar(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            {diagrams.length === 0 ? (
                                <p className="text-gray-500 text-sm">No saved diagrams</p>
                            ) : (
                                <div className="space-y-2">
                                    {diagrams.map((d) => (
                                        <div
                                            key={d.id}
                                            onClick={() => loadDiagram(d)}
                                            className={`p-3 rounded cursor-pointer ${d.id === currentId ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-sm truncate">{d.title}</h3>
                                                    <p className="text-xs text-gray-500">{new Date(d.updatedAt).toLocaleDateString()}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteDiagram(d.id, e)}
                                                    className="text-gray-400 hover:text-red-600"
                                                >✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Editor */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                    <Editor
                        height="100%"
                        defaultLanguage="yaml"
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                        }}
                    />
                </div>

                {/* Preview */}
                <div className="w-1/2 p-4 bg-white dark:bg-gray-800 overflow-auto relative">
                    <div className="absolute top-4 right-4 flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded z-10">
                        <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"><ZoomIn size={16} /></button>
                        <button onClick={() => setZoom(1)} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"><Maximize size={16} /></button>
                        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"><ZoomOut size={16} /></button>
                        <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300">{Math.round(zoom * 100)}%</span>
                    </div>
                    {renderError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
                            <p className="text-red-800 dark:text-red-300 font-semibold text-sm">Syntax Error</p>
                            <p className="text-red-600 dark:text-red-400 text-xs mt-1 whitespace-pre-wrap">{renderError}</p>
                        </div>
                    )}
                    <div
                        ref={previewRef}
                        className="flex justify-center items-start min-h-full"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    />
                </div>
            </div>
        </div>
    );
}
