"use client";

import React from 'react';

interface Diagram {
    id: string;
    title: string;
    code: string;
    theme: string;
    updatedAt: string;
}

interface DiagramSidebarProps {
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    diagrams: Diagram[];
    currentId: string | null;
    loadDiagram: (diagram: Diagram) => void;
    deleteDiagram: (id: string, e: React.MouseEvent) => void;
}

export default function DiagramSidebar({
    showSidebar,
    setShowSidebar,
    diagrams,
    currentId,
    loadDiagram,
    deleteDiagram
}: DiagramSidebarProps) {
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
                        {diagrams.map((d) => (
                            <div
                                key={d.id}
                                onClick={() => loadDiagram(d)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors border ${d.id === currentId
                                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/50 dark:border-indigo-700'
                                        : 'bg-white border-transparent hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="overflow-hidden">
                                        <h3 className={`font-medium text-sm truncate ${d.id === currentId
                                                ? 'text-indigo-900 dark:text-indigo-100'
                                                : 'text-gray-700 dark:text-gray-200'
                                            }`}>
                                            {d.title}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {new Date(d.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => deleteDiagram(d.id, e)}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 ml-2"
                                    >✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
