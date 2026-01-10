"use client";

import React, { useState } from 'react';
import { Send, Sparkles, Loader2, X, RefreshCw, Palette, Layout } from 'lucide-react';
import { aiApi } from '@/lib/api';

interface AiAssistantProps {
    currentCode: string;
    onApplyCode: (newCode: string, description: string) => void;
    onClose: () => void;
}

export default function AiAssistant({ currentCode, onApplyCode, onClose }: AiAssistantProps) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cleanMermaidCode = (text: string): string => {
        let cleaned = text.trim();
        // Remove markdown code blocks if present
        if (cleaned.startsWith('```')) {
            const lines = cleaned.split('\n');
            if (lines[0].startsWith('```')) lines.shift();
            if (lines[lines.length - 1].startsWith('```')) lines.pop();
            cleaned = lines.join('\n').trim();
        }
        // Remove 'mermaid' language identifier if it remained
        if (cleaned.toLowerCase().startsWith('mermaid')) {
            cleaned = cleaned.substring(7).trim();
        }
        return cleaned;
    };

    const handleGenerate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await aiApi.generate(prompt, currentCode);
            if (response && response.mermaid_code) {
                const cleanedCode = cleanMermaidCode(response.mermaid_code);
                onApplyCode(cleanedCode, prompt);
                setPrompt('');
            } else {
                setError("Failed to generate diagram. Please try again.");
            }
        } catch (err: any) {
            console.error("AI Assistant Error:", err);
            setError(err.message || "An error occurred during generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { label: 'Re-imagine', icon: <Layout size={14} />, prompt: 'Re-imagine this diagram with a better layout and more clear connections.' },
        { label: 'Colorize', icon: <Palette size={14} />, prompt: 'Add colorful styling and classes to make this diagram look premium and professional.' },
        { label: 'Fix Errors', icon: <RefreshCw size={14} />, prompt: 'Check for any syntax errors in this diagram and fix them.' },
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl w-80 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-bold text-gray-800 dark:text-white text-sm">AI Assistant</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <X size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</p>
                    <div className="grid grid-cols-1 gap-2">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => {
                                    setPrompt(action.prompt);
                                }}
                                className="flex items-center gap-2 p-2.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 group"
                            >
                                <span className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 transition-colors">
                                    {action.icon}
                                </span>
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                        <Sparkles size={12} /> Pro Tip
                    </h3>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
                        Try descriptive prompts like "Create a sequence diagram for user login" or "Change this flowchart to a Gantt chart".
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg text-xs text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer / Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form
                    onSubmit={handleGenerate}
                    className="relative"
                >
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask AI to build or edit..."
                        className="w-full p-3 pr-12 pb-10 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[100px]"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                    />
                    <div className="absolute right-2 bottom-2">
                        <button
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                    <p className="absolute left-3 bottom-3 text-[10px] text-gray-400">
                        {isLoading ? 'Generating magic...' : 'Press Enter to send'}
                    </p>
                </form>
            </div>
        </div>
    );
}
