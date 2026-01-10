"use client";

import React from 'react';
import { Download, Home, PlusCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DiagramHeaderProps {
    diagramTitle: string;
    setDiagramTitle: (title: string) => void;
    theme: string;
    setTheme: (theme: string) => void;
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    diagramsCount: number;
    newDiagram: () => void;
    saveDiagram: () => void;
    exportSvg: () => void;
    showAi: boolean;
    setShowAi: (show: boolean) => void;
}

export default function DiagramHeader({
    diagramTitle,
    setDiagramTitle,
    theme,
    setTheme,
    showSidebar,
    setShowSidebar,
    diagramsCount,
    newDiagram,
    saveDiagram,
    exportSvg,
    showAi,
    setShowAi
}: DiagramHeaderProps) {
    const router = useRouter();

    return (
        <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-10 relative">
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
                    className={`px-3 py-1 text-sm rounded transition-colors ${showSidebar
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                >
                    My Diagrams ({diagramsCount})
                </button>
                <button
                    onClick={newDiagram}
                    className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                    title="New Diagram"
                >
                    <PlusCircle size={20} />
                </button>
                <input
                    type="text"
                    placeholder="Diagram title"
                    value={diagramTitle}
                    onChange={(e) => setDiagramTitle(e.target.value)}
                    className="w-48 px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="flex items-center space-x-3">
                <button
                    onClick={() => setShowAi(!showAi)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-all ${showAi
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}
                >
                    <Sparkles size={16} />
                    <span className="hidden md:inline">Ask AI</span>
                </button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme:</span>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="forest">Forest</option>
                    <option value="neutral">Neutral</option>
                    <option value="base">Base</option>
                </select>
                <button
                    onClick={saveDiagram}
                    className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={exportSvg}
                    className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 text-sm flex items-center gap-1 font-medium shadow-sm transition-colors"
                >
                    <Download size={16} /> SVG
                </button>
            </div>
        </header>
    );
}
