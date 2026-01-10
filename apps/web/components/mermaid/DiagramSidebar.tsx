"use client";

import React from 'react';
import { ChevronRight, FileText, Sparkles, Trash2 } from 'lucide-react';

interface Edition {
    id: string;
    code: string;
    description: string;
    updatedAt: string;
}

interface Diagram {
    id: string;
    title: string;
    code: string;
    theme: string;
    updatedAt: string;
    editions?: Edition[];
    currentEditionId?: string;
}

interface DiagramSidebarProps {
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    diagrams: Diagram[];
    currentId: string | null;
    currentEditionId: string | null;
    loadDiagram: (diagram: Diagram) => void;
    loadEdition: (diagramId: string, edition: Edition) => void;
    deleteDiagram: (id: string, e: React.MouseEvent) => void;
}

export default function DiagramSidebar({
    showSidebar,
    setShowSidebar,
    diagrams,
    currentId,
    currentEditionId,
    loadDiagram,
    loadEdition,
    deleteDiagram
}: DiagramSidebarProps) {
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    // Auto-expand current diagram on mount or change
    React.useEffect(() => {
        if (currentId) {
            setExpandedIds(prev => new Set(prev).add(currentId));
        }
    }, [currentId]);
    return (
        <div className={`flex-none bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${showSidebar ? 'w-72' : 'w-0'}`}>
            <div className="w-72 h-full overflow-y-auto p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-800 dark:text-white">My Diagrams</h2>
                    <button onClick={() => setShowSidebar(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>
                {diagrams.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No saved diagrams</p>
                ) : (
                    <div className="space-y-2">
                        {diagrams.map((d) => {
                            const isCurrent = d.id === currentId;
                            const isExpanded = expandedIds.has(d.id);

                            return (
                                <div key={d.id} className="space-y-1">
                                    <div
                                        onClick={() => loadDiagram(d)}
                                        className={`group p-2.5 rounded-lg cursor-pointer transition-all border flex items-center gap-2 ${isCurrent
                                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800'
                                                : 'bg-white border-transparent hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <button
                                            onClick={(e) => toggleExpand(d.id, e)}
                                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <ChevronRight
                                                size={14}
                                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-medium text-xs truncate ${isCurrent ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-200'
                                                }`}>
                                                {d.title}
                                            </h3>
                                        </div>

                                        <button
                                            onClick={(e) => deleteDiagram(d.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    {/* Sub-pages (Editions) */}
                                    {isExpanded && d.editions && d.editions.length > 0 && (
                                        <div className="ml-6 space-y-1 border-l border-gray-100 dark:border-gray-700 pl-2">
                                            {d.editions.slice().reverse().map((edition, index) => {
                                                const isActive = currentEditionId === edition.id;
                                                const isAI = edition.description.toLowerCase().includes('ai') ||
                                                    edition.description.toLowerCase().includes('imagine') ||
                                                    edition.description.toLowerCase().includes('color') ||
                                                    edition.description.toLowerCase().includes('fix');

                                                return (
                                                    <div
                                                        key={edition.id}
                                                        onClick={() => loadEdition(d.id, edition)}
                                                        className={`p-1.5 px-2 rounded-md cursor-pointer text-[11px] transition-all flex items-center gap-2 ${isActive
                                                                ? 'bg-indigo-50/80 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300'
                                                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
                                                            }`}
                                                    >
                                                        {isAI ? (
                                                            <Sparkles size={10} className={isActive ? 'text-indigo-500' : 'text-purple-400'} />
                                                        ) : (
                                                            <FileText size={10} className={isActive ? 'text-indigo-500' : 'text-gray-400'} />
                                                        )}
                                                        <span className="truncate flex-1">
                                                            {edition.description}
                                                        </span>
                                                        <span className="text-[9px] text-gray-300 dark:text-gray-600 tabular-nums">
                                                            {new Date(edition.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
