"use client";

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Save, Download, FileJson, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
// import { Button } from '@/components/ui/button'; // If using shadcn later, but now use raw HTML/Tailwind

export default function MermaidPage() {
    const { user, loading } = useAuth();
    const [code, setCode] = useState(`graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `);
    const [theme, setTheme] = useState('default');
    const [diagramId, setDiagramId] = useState<string | null>(null);
    const [svgUrl, setSvgUrl] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);

    // Initialize mermaid
    useEffect(() => {
        mermaid.initialize({ startOnLoad: true, theme: theme, securityLevel: 'loose' });
    }, [theme]);

    // Render diagram on code change
    useEffect(() => {
        const renderDiagram = async () => {
            if (previewRef.current) {
                try {
                    const { svg } = await mermaid.render('mermaid-svg', code);
                    previewRef.current.innerHTML = svg;
                    // Store for export
                    const blob = new Blob([svg], { type: 'image/svg+xml' });
                    setSvgUrl(URL.createObjectURL(blob));
                } catch (e) {
                    // Mermaid throws error on syntax error, ignore or show error
                    // console.error(e);
                    // Optional: Show error in UI
                }
            }
        };

        // Debounce
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [code, theme]);

    const handleSave = async () => {
        try {
            if (diagramId) {
                await api.put(`/diagrams/${diagramId}`, { mermaid_code: code, theme });
            } else {
                const title = `Diagram ${new Date().toISOString()}`;
                const { data } = await api.post('/diagrams', { title, mermaid_code: code, theme });
                setDiagramId(data.id);
            }
            alert('Saved!');
        } catch (e) {
            alert('Failed to save');
        }
    };

    const handleExport = async (format: 'png' | 'pdf') => {
        try {
            const response = await api.post(`/export/${format}`, { mermaid_code: code, theme }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `diagram.${format}`);
            document.body.appendChild(link);
            link.click();
        } catch (e) {
            alert('Export failed');
        }
    };

    const handleClientExportSvg = () => {
        if (svgUrl) {
            const link = document.createElement('a');
            link.href = svgUrl;
            link.setAttribute('download', 'diagram.svg');
            document.body.appendChild(link);
            link.click();
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>Please log in...</div>; // Should redirect in middleware or useEffect

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="flex-none h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-10">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Mermaid Editor</h1>
                <div className="flex items-center space-x-4">
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="block w-32 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-custom-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                    >
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="forest">Forest</option>
                        <option value="neutral">Neutral</option>
                    </select>

                    <button onClick={handleSave} className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300">
                        <Save size={20} />
                    </button>

                    {/* Export Dropdown - simplified */}
                    <div className="flex space-x-2">
                        <button onClick={handleClientExportSvg} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">SVG</button>
                        <button onClick={() => handleExport('png')} className="px-3 py-1 bg-green-200 rounded hover:bg-green-300 text-sm">PNG (Pro)</button>
                        <button onClick={() => handleExport('pdf')} className="px-3 py-1 bg-red-200 rounded hover:bg-red-300 text-sm">PDF (Pro)</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Pane */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    <Editor
                        height="100%"
                        defaultLanguage="markdown" // No mermaid lang support out of box easily, markdown is close enough
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>

                {/* Preview Pane */}
                <div className="w-1/2 p-4 bg-white dark:bg-gray-800 overflow-auto relative">
                    <div className="absolute top-4 right-4 flex space-x-2 bg-gray-100 p-1 rounded z-10 opacity-75 hover:opacity-100 transition-opacity">
                        <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-1 hover:bg-gray-300 rounded"><ZoomIn size={16} /></button>
                        <button onClick={() => setZoom(1)} className="p-1 hover:bg-gray-300 rounded"><Maximize size={16} /></button>
                        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-1 hover:bg-gray-300 rounded"><ZoomOut size={16} /></button>
                    </div>

                    <div
                        ref={previewRef}
                        className="flex justify-center items-start min-h-full transition-transform origin-top-left"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    />
                </div>
            </div>
        </div>
    );
}
