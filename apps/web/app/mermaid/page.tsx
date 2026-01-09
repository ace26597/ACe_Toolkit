"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useRouter } from 'next/navigation';
import { Download, Home, PlusCircle } from 'lucide-react';

const STORAGE_KEY = 'mermaid_diagrams';
const CURRENT_KEY = 'mermaid_current';

interface Diagram {
    id: string;
    title: string;
    code: string;
    theme: string;
    updatedAt: string;
}

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
    const [renderError, setRenderError] = useState<string | null>(null);
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let loadedDiagrams: Diagram[] = [];
        if (saved) {
            loadedDiagrams = JSON.parse(saved);
            setDiagrams(loadedDiagrams);
        }

        // Initialize with default if empty
        if (loadedDiagrams.length === 0) {
            const defaultId = Date.now().toString();
            const defaultDiagram = {
                id: defaultId,
                title: 'Untitled Diagram',
                code: `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]`,
                theme: 'default',
                updatedAt: new Date().toISOString()
            };
            loadedDiagrams = [defaultDiagram];
            setDiagrams(loadedDiagrams);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedDiagrams));
            // Also set as current
            setCode(defaultDiagram.code);
            setTheme(defaultDiagram.theme);
            setDiagramTitle(defaultDiagram.title);
            setCurrentId(defaultDiagram.id);
        } else {
            const current = localStorage.getItem(CURRENT_KEY);
            if (current) {
                const parsed = JSON.parse(current);
                setCode(parsed.code);
                setTheme(parsed.theme || 'default');
                setDiagramTitle(parsed.title);
                setCurrentId(parsed.id);
            }
        }
    }, []);

    // Autosave current diagram
    useEffect(() => {
        if (!currentId && diagrams.length > 0) return;
        const current = { id: currentId, code, theme, title: diagramTitle };
        localStorage.setItem(CURRENT_KEY, JSON.stringify(current));
    }, [code, theme, diagramTitle, currentId, diagrams.length]);

    // Render diagram using iframe isolation with CDN script
    const renderDiagram = useCallback(async () => {
        if (!iframeRef.current || !code.trim()) return;

        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';

        // We use double backslashes for things that should remain as \ in the final string,
        // and single backslash escapes for things that React's template literal should preserve as literal chars in the result.
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${bgColor}; font-family: sans-serif; user-select: none; }
        #container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform-origin: 0 0; cursor: grab; }
        #container:active { cursor: grabbing; }
        svg { max-width: none; height: auto; }
        .error { color: #ef4444; font-family: monospace; white-space: pre-wrap; padding: 20px; }
        .node, .edgeLabel { cursor: pointer; transition: opacity 0.2s; }
        .node:hover, .edgeLabel:hover { opacity: 0.8; }
    </style>
</head>
<body>
    <div id="container"><div id="output">Rendering...</div></div>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.2.0/dist/mermaid-layout-elk.esm.min.mjs';

        const container = document.getElementById('container');
        const output = document.getElementById('output');
        
        let state = { scale: 1, pX: 0, pY: 0 };
        let isDragging = false;
        let startX = 0, startY = 0;

        const updateTransform = () => {
            container.style.transform = \`translate(\${state.pX}px, \${state.pY}px) scale(\${state.scale})\`;
        };

        window.addEventListener('wheel', (e) => {
            e.preventDefault();
            const xs = (e.clientX - state.pX) / state.scale;
            const ys = (e.clientY - state.pY) / state.scale;
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;
            const newScale = Math.min(Math.max(state.scale * factor, 0.1), 5);
            state.pX = e.clientX - xs * newScale;
            state.pY = e.clientY - ys * newScale;
            state.scale = newScale;
            updateTransform();
        }, { passive: false });

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node') || e.target.closest('.edgeLabel')) return;
            isDragging = true;
            startX = e.clientX - state.pX;
            startY = e.clientY - state.pY;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            state.pX = e.clientX - startX;
            state.pY = e.clientY - startY;
            updateTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'grab';
        });

        document.addEventListener('click', (e) => {
            const node = e.target.closest('.node') || e.target.closest('.edgeLabel');
            if (node) {
                const text = node.textContent.trim();
                window.top.postMessage({ type: 'MERMAID_EDIT', text: text }, '*');
            }
        });

        try {
            mermaid.registerLayoutLoaders(elkLayouts);
            mermaid.initialize({
                startOnLoad: false,
                theme: '${theme}',
                logLevel: 5,
                securityLevel: 'loose',
                flowchart: { useMaxWidth: false, htmlLabels: true }
            });

            const code = \`${code.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
            const { svg } = await mermaid.render('graphDiv', code);
            output.innerHTML = svg;
            
        } catch (e) {
            let errorMsg = e.message;
            if (code.trim().search(/^[\\s\\S]+\\n---/) !== -1 && (code.includes('config:') || code.includes('init:'))) {
                 errorMsg += '\\n\\n💡 HINT: It looks like you have a configuration block (---). Make sure it is at the very top of the editor, before any graph definitions.';
            }
            output.innerHTML = '<div class="error">' + errorMsg + '</div>';
            console.error('Iframe Render Error:', e);
        }
    </script>
</body>
</html>`;

        try {
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
            setRenderError(null);
        } catch (e: any) {
            console.error('Mermaid iframe write error:', e);
            setRenderError(e.message);
        }
    }, [code, theme]);

    // Handle Edit Messages from Iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'MERMAID_EDIT' && e.data?.text) {
                const oldText = e.data.text;
                const newText = window.prompt(`Edit text for "${oldText}":`, oldText);
                if (newText !== null && newText !== oldText) {
                    setCode(prev => {
                        const escapedOld = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        return prev.replace(new RegExp(escapedOld), newText);
                    });
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [renderDiagram]);

    const saveDiagram = () => {
        const id = currentId || Date.now().toString();
        const diagram: Diagram = {
            id,
            title: diagramTitle || 'Untitled',
            code,
            theme,
            updatedAt: new Date().toISOString(),
        };
        const updated = currentId ? diagrams.map(d => d.id === id ? diagram : d) : [...diagrams, diagram];
        setDiagrams(updated);
        setCurrentId(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const loadDiagram = (diagram: Diagram) => {
        setCode(diagram.code);
        setTheme(diagram.theme || 'default');
        setDiagramTitle(diagram.title);
        setCurrentId(diagram.id);
    };

    const newDiagram = () => {
        const defaultCode = `graph TD
    A[Start] --> B[End]`;
        const id = Date.now().toString();
        const diagram: Diagram = {
            id,
            title: 'Untitled Diagram',
            code: defaultCode,
            theme: 'default',
            updatedAt: new Date().toISOString()
        };
        const updated = [...diagrams, diagram];
        setDiagrams(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setCode(defaultCode);
        setTheme('default');
        setDiagramTitle('Untitled Diagram');
        setCurrentId(id);
    };

    const deleteDiagram = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = diagrams.filter(d => d.id !== id);
        setDiagrams(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        if (id === currentId && updated.length > 0) {
            loadDiagram(updated[0]);
        } else if (updated.length === 0) {
            newDiagram();
        }
    };

    const exportSvg = () => {
        if (iframeRef.current?.contentDocument) {
            const svgEl = iframeRef.current.contentDocument.querySelector('svg');
            if (svgEl) {
                const svgData = new XMLSerializer().serializeToString(svgEl);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${diagramTitle || 'diagram'}.svg`;
                link.click();
                URL.revokeObjectURL(url);
            }
        }
    };

    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const [isDraggingWidth, setIsDraggingWidth] = useState(false);

    const startResize = (e: React.MouseEvent) => {
        setIsDraggingWidth(true);
        e.preventDefault();
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingWidth) return;
        const newWidth = (e.clientX / window.innerWidth) * 100;
        if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
    }, [isDraggingWidth]);

    const stopResize = useCallback(() => setIsDraggingWidth(false), []);

    useEffect(() => {
        if (isDraggingWidth) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', stopResize);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopResize);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopResize);
        };
    }, [isDraggingWidth, onMouseMove, stopResize]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-10 relative">
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push('/')} className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300" title="Home"><Home size={20} /></button>
                    <h1 className="text-lg font-bold">Mermaid Editor</h1>
                    <button onClick={() => setShowSidebar(!showSidebar)} className={`px-3 py-1 text-sm rounded transition-colors ${showSidebar ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-gray-100 dark:bg-gray-700'}`}>My Diagrams ({diagrams.length})</button>
                    <button onClick={newDiagram} className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400" title="New Diagram"><PlusCircle size={20} /></button>
                    <input type="text" placeholder="Diagram title" value={diagramTitle} onChange={(e) => setDiagramTitle(e.target.value)} className="w-48 px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">Theme:</span>
                    <select value={theme} onChange={(e) => setTheme(e.target.value)} className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="forest">Forest</option>
                        <option value="neutral">Neutral</option>
                        <option value="base">Base</option>
                    </select>
                    <button onClick={saveDiagram} className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors">Save</button>
                    <button onClick={exportSvg} className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 text-sm flex items-center gap-1 font-medium shadow-sm transition-colors"><Download size={16} /> SVG</button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden relative">
                <div className={`flex-none bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${showSidebar ? 'w-72' : 'w-0'}`}>
                    <div className="w-72 h-full overflow-y-auto p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold">My Diagrams</h2>
                            <button onClick={() => setShowSidebar(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                        </div>
                        {diagrams.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No saved diagrams</p> : (
                            <div className="space-y-2">
                                {diagrams.map((d) => (
                                    <div key={d.id} onClick={() => loadDiagram(d)} className={`p-3 rounded cursor-pointer transition-colors border ${d.id === currentId ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/50 dark:border-indigo-700' : 'bg-white border-transparent hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="overflow-hidden">
                                                <h3 className={`font-medium text-sm truncate ${d.id === currentId ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-200'}`}>{d.title}</h3>
                                                <p className="text-xs text-gray-500">{new Date(d.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                            <button onClick={(e) => deleteDiagram(d.id, e)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 ml-2">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 flex flex-row overflow-hidden relative min-w-0">
                    <div className="flex-col h-full relative" style={{ width: `${leftPanelWidth}%` }}>
                        <Editor height="100%" defaultLanguage="yaml" theme={theme === 'dark' ? 'vs-dark' : 'light'} value={code} onChange={(value) => setCode(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: 'on', padding: { top: 16 } }} />
                    </div>
                    <div onMouseDown={startResize} className={`w-1 h-full cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 transition-colors z-30 flex-none ${isDraggingWidth ? 'bg-indigo-500' : ''}`} />
                    <div className="h-full flex flex-col relative" style={{ width: `${100 - leftPanelWidth}%`, backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff' }}>
                        {renderError && (
                            <div className="absolute top-4 left-4 right-4 z-10 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded shadow-sm">
                                <p className="text-red-800 dark:text-red-300 font-semibold text-sm flex items-center gap-2">⚠️ Syntax Error</p>
                                <p className="text-red-600 dark:text-red-400 text-xs mt-1 whitespace-pre-wrap font-mono">{renderError}</p>
                            </div>
                        )}
                        {isDraggingWidth && <div className="absolute inset-0 z-40 bg-transparent" />}
                        <iframe ref={iframeRef} className="flex-1 w-full h-full border-0 block" sandbox="allow-scripts allow-modals allow-same-origin" title="Mermaid Preview" />
                    </div>
                </div>
            </div>
        </div>
    );
}
