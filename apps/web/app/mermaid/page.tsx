"use client";

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Save, Download, FileJson, ZoomIn, ZoomOut, Maximize, LogOut, Home, FileText, Trash2, PlusCircle } from 'lucide-react';

export default function MermaidPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [code, setCode] = useState(`graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `);
    const [theme, setTheme] = useState('default');
    const [diagramId, setDiagramId] = useState<string | null>(null);
    const [diagramTitle, setDiagramTitle] = useState<string>('');
    const [svgUrl, setSvgUrl] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [diagrams, setDiagrams] = useState<any[]>([]);
    const [showSidebar, setShowSidebar] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [loading, user, router]);

    // Load saved diagrams
    useEffect(() => {
        const loadDiagrams = async () => {
            if (user) {
                try {
                    const { data } = await api.get('/diagrams');
                    setDiagrams(data);
                } catch (e) {
                    console.error('Failed to load diagrams:', e);
                }
            }
        };
        loadDiagrams();
    }, [user]);

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
                    setRenderError(null);
                } catch (e: any) {
                    setRenderError(e?.message || 'Invalid Mermaid syntax');
                    console.error('Mermaid render error:', e);
                }
            }
        };

        // Debounce
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [code, theme]);

    const handleSave = async () => {
        const title = diagramTitle.trim() || `Diagram ${new Date().toLocaleString()}`;
        setIsSaving(true);
        try {
            if (diagramId) {
                await api.put(`/diagrams/${diagramId}`, { title, mermaid_code: code, theme });
            } else {
                const { data } = await api.post('/diagrams', { title, mermaid_code: code, theme });
                setDiagramId(data.id);
                setDiagramTitle(title);
            }
            // Reload diagram list
            const { data } = await api.get('/diagrams');
            setDiagrams(data);
            alert('Saved successfully!');
        } catch (e) {
            alert('Failed to save diagram');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadDiagram = (diagram: any) => {
        setCode(diagram.mermaid_code);
        setTheme(diagram.theme || 'default');
        setDiagramId(diagram.id);
        setDiagramTitle(diagram.title);
        setShowSidebar(false);
    };

    const handleNewDiagram = () => {
        setCode(`graph TD
    A[Start] --> B[End]`);
        setTheme('default');
        setDiagramId(null);
        setDiagramTitle('');
        setShowSidebar(false);
    };

    const handleDeleteDiagram = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this diagram?')) return;

        try {
            await api.delete(`/diagrams/${id}`);
            const { data } = await api.get('/diagrams');
            setDiagrams(data);
            // If deleting current diagram, reset
            if (id === diagramId) {
                handleNewDiagram();
            }
        } catch (e) {
            alert('Failed to delete diagram');
        }
    };

    const handleExport = async (format: 'png' | 'pdf') => {
        setIsExporting(true);
        try {
            const response = await api.post(`/export/${format}`, { mermaid_code: code, theme }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `diagram.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClientExportSvg = () => {
        if (svgUrl) {
            const link = document.createElement('a');
            link.href = svgUrl;
            link.setAttribute('download', 'diagram.svg');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    // Show loading spinner
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    // Return null while redirecting (useEffect handles redirect)
    if (!user) return null;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="flex-none h-16 bg-white/80 backdrop-blur-md dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-10 shadow-sm">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Mermaid Editor
                    </h1>
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Home"
                    >
                        <Home size={20} />
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-2 transition-colors rounded-lg ${
                            showSidebar
                                ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30'
                                : 'text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="My Diagrams"
                    >
                        <FileText size={20} />
                    </button>
                    <button
                        onClick={handleNewDiagram}
                        className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="New Diagram"
                    >
                        <PlusCircle size={20} />
                    </button>
                    <input
                        type="text"
                        placeholder="Diagram title (optional)"
                        value={diagramTitle}
                        onChange={(e) => setDiagramTitle(e.target.value)}
                        className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="block w-32 rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-all"
                    >
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="forest">Forest</option>
                        <option value="neutral">Neutral</option>
                    </select>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Save"
                    >
                        {isSaving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
                        ) : (
                            <Save size={20} />
                        )}
                    </button>

                    {/* Export Buttons */}
                    <div className="flex space-x-2">
                        <button
                            onClick={handleClientExportSvg}
                            disabled={isExporting}
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            SVG
                        </button>
                        <button
                            onClick={() => handleExport('png')}
                            disabled={isExporting}
                            className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? '...' : 'PNG'}
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={isExporting}
                            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? '...' : 'PDF'}
                        </button>
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center space-x-3 border-l border-gray-300 dark:border-gray-600 pl-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar - Diagram List */}
                {showSidebar && (
                    <div className="absolute left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-20 shadow-xl overflow-y-auto">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">My Diagrams</h2>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            {diagrams.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No saved diagrams yet</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create and save your first diagram!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {diagrams.map((diagram) => (
                                        <div
                                            key={diagram.id}
                                            onClick={() => handleLoadDiagram(diagram)}
                                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                                                diagram.id === diagramId
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700'
                                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {diagram.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {new Date(diagram.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteDiagram(diagram.id, e)}
                                                    className="ml-2 p-1.5 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Editor Pane */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
                    <Editor
                        height="100%"
                        defaultLanguage="markdown"
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            roundedSelection: true,
                            padding: { top: 16, bottom: 16 },
                        }}
                    />
                </div>

                {/* Preview Pane */}
                <div className="w-1/2 p-6 bg-white dark:bg-gray-900 overflow-auto relative">
                    {/* Zoom Controls */}
                    <div className="absolute top-4 right-4 flex space-x-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-md z-10 border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setZoom(z => Math.min(z + 0.1, 3))}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <button
                            onClick={() => setZoom(1)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Reset Zoom"
                        >
                            <Maximize size={16} />
                        </button>
                        <button
                            onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                    </div>

                    {/* Error Display */}
                    {renderError && (
                        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-red-800 font-semibold text-sm">Syntax Error</p>
                                    <p className="text-red-600 text-sm mt-1">{renderError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        ref={previewRef}
                        className="flex justify-center items-start min-h-full transition-transform duration-200"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    />
                </div>
            </div>
        </div>
    );
}
