"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import DiagramHeader from '@/components/mermaid/DiagramHeader';
import DiagramSidebar from '@/components/mermaid/DiagramSidebar';
import MermaidPreview from '@/components/mermaid/MermaidPreview';
import AiAssistant from '@/components/mermaid/AiAssistant';

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
    const [showAi, setShowAi] = useState(false);
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

    const handleEdit = useCallback((oldText: string) => {
        const newText = window.prompt(`Edit text for "${oldText}":`, oldText);
        if (newText !== null && newText !== oldText) {
            setCode(prev => {
                const escapedOld = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return prev.replace(new RegExp(escapedOld), newText);
            });
        }
    }, []);

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
            <DiagramHeader
                diagramTitle={diagramTitle}
                setDiagramTitle={setDiagramTitle}
                theme={theme}
                setTheme={setTheme}
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                diagramsCount={diagrams.length}
                newDiagram={newDiagram}
                saveDiagram={saveDiagram}
                exportSvg={exportSvg}
                showAi={showAi}
                setShowAi={setShowAi}
            />

            <div className="flex-1 flex overflow-hidden relative">
                <DiagramSidebar
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    diagrams={diagrams}
                    currentId={currentId}
                    loadDiagram={loadDiagram}
                    deleteDiagram={deleteDiagram}
                />

                <div className="flex-1 flex flex-row overflow-hidden relative min-w-0">
                    <div className="flex-col h-full relative" style={{ width: `${leftPanelWidth}%` }}>
                        <Editor
                            height="100%"
                            defaultLanguage="yaml"
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: 'on', padding: { top: 16 } }}
                        />
                    </div>
                    <div onMouseDown={startResize} className={`w-1 h-full cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-indigo-500 transition-colors z-30 flex-none ${isDraggingWidth ? 'bg-indigo-500' : ''}`} />
                    <div className="flex-1 h-full min-w-0" style={{ width: `${100 - leftPanelWidth}%` }}>
                        <MermaidPreview
                            ref={iframeRef}
                            code={code}
                            theme={theme}
                            isDraggingWidth={isDraggingWidth}
                            onEdit={handleEdit}
                            renderError={renderError}
                            setRenderError={setRenderError}
                        />
                    </div>
                </div>
                {showAi && (
                    <AiAssistant
                        currentCode={code}
                        onApplyCode={(newCode) => {
                            setCode(newCode);
                            // Optionally close AI sidebar on apply if prompt-based edit
                        }}
                        onClose={() => setShowAi(false)}
                    />
                )}
            </div>
        </div>
    );
}
