"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Home, PlusCircle, Trash2, Search, Check, Cloud, CloudOff,
    Folder, FolderOpen, FileText, ChevronRight, ChevronDown,
    Save, Upload, Edit3, MoreVertical, X, Settings, PanelLeftClose, PanelLeft,
    Sparkles, Download, Share2, Pin, Calendar, Clock, Link as LinkIcon
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { sessionNotesApi, SessionNoteProject, SessionNote, SessionNoteMetadata } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

const STORAGE_KEY = 'ace_notes_v2';
const SETTINGS_KEY = 'ace_notes_settings';

const DEFAULT_CONTENT = `# Welcome to your new Note
This is a markdown-enabled note taking experience.

## Features
- **Projects**: Organize your notes into projects.
- **Markdown**: Use standard markdown syntax.
- **Sync**: Automatically syncs to local storage and backend.
- **File Upload**: Upload .md or .txt files.

Start writing something amazing!
`;

export default function NotesPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // State
    const [projects, setProjects] = useState<SessionNoteProject[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [showSidebar, setShowSidebar] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [content, setContent] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived state
    const currentProject = projects.find(p => p.id === currentProjectId);
    const currentNote = currentProject?.notes.find(n => n.id === currentNoteId);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Try to load from API first
                const apiProjects = await sessionNotesApi.getAllProjects();
                if (apiProjects.length > 0) {
                    setProjects(apiProjects);
                    if (apiProjects[0].notes.length > 0) {
                        setCurrentProjectId(apiProjects[0].id);
                        setCurrentNoteId(apiProjects[0].notes[0].id);
                        setContent(apiProjects[0].notes[0].content);
                        setExpandedProjects(new Set([apiProjects[0].id]));
                    }
                } else {
                    // Check local storage for legacy or v2 data
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        const localData: SessionNoteProject[] = JSON.parse(saved);
                        await sessionNotesApi.sync(localData);
                        setProjects(localData);
                    } else {
                        // Create initial project and note
                        await createInitialContent();
                    }
                }
            } catch (error) {
                console.error('Failed to load notes:', error);
                setSyncStatus('offline');
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    setProjects(JSON.parse(saved));
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Settings Load
    useEffect(() => {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.theme) setTheme(settings.theme);
            if (settings.sidebarWidth) setSidebarWidth(settings.sidebarWidth);
        }
    }, []);

    // Auto-sync
    const syncToApi = useCallback(async (data: SessionNoteProject[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        if (syncStatus === 'offline') return;

        try {
            setSyncStatus('syncing');
            await sessionNotesApi.sync(data);
            setSyncStatus('synced');
        } catch (error) {
            setSyncStatus('offline');
        }
    }, [syncStatus]);

    useEffect(() => {
        if (!isLoading && projects.length > 0) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                syncToApi(projects);
            }, 1500);
        }
    }, [projects, isLoading, syncToApi]);

    // Resize handling
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.min(Math.max(e.clientX, 200), 600);
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme, sidebarWidth }));
        };
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, theme, sidebarWidth]);

    // Actions
    const createInitialContent = async () => {
        const projId = 'proj_' + Date.now();
        const noteId = 'note_' + Date.now();
        const newProject: SessionNoteProject = {
            id: projId,
            name: 'General',
            notes: [{
                id: noteId,
                projectId: projId,
                title: 'Welcome Note',
                content: DEFAULT_CONTENT,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects([newProject]);
        setCurrentProjectId(projId);
        setCurrentNoteId(noteId);
        setContent(DEFAULT_CONTENT);
        setExpandedProjects(new Set([projId]));
    };

    const addProject = () => {
        const id = 'proj_' + Date.now();
        const newProject: SessionNoteProject = {
            id,
            name: 'New Project',
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects(prev => [...prev, newProject]);
        setEditingId(id);
        setEditValue('New Project');
        setExpandedProjects(prev => new Set(prev).add(id));
    };

    const addNote = (projectId: string) => {
        const id = 'note_' + Date.now();
        const newNote: SessionNote = {
            id,
            projectId,
            title: 'Untitled Note',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, notes: [newNote, ...p.notes], updatedAt: new Date().toISOString() } : p
        ));
        setCurrentProjectId(projectId);
        setCurrentNoteId(id);
        setContent('');
        setEditingId(id);
        setEditValue('Untitled Note');
    };

    const handleRename = (id: string, type: 'proj' | 'note') => {
        if (!editValue.trim()) return setEditingId(null);

        setProjects(prev => prev.map(p => {
            if (type === 'proj' && p.id === id) {
                return { ...p, name: editValue, updatedAt: new Date().toISOString() };
            }
            if (type === 'note') {
                const note = p.notes.find(n => n.id === id);
                if (note) {
                    return {
                        ...p,
                        notes: p.notes.map(n => n.id === id ? { ...n, title: editValue, updatedAt: new Date().toISOString() } : n),
                        updatedAt: new Date().toISOString()
                    };
                }
            }
            return p;
        }));
        setEditingId(null);
    };

    const deleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete project and all notes inside?')) return;
        setProjects(prev => prev.filter(p => p.id !== id));
        if (currentProjectId === id) {
            setCurrentProjectId(null);
            setCurrentNoteId(null);
            setContent('');
        }
    };

    const deleteNote = (projectId: string, noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this note?')) return;
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, notes: p.notes.filter(n => n.id !== noteId), updatedAt: new Date().toISOString() } : p
        ));
        if (currentNoteId === noteId) {
            setCurrentNoteId(null);
            setContent('');
        }
    };

    const handleContentChange = (value: string | undefined) => {
        const newContent = value || '';
        setContent(newContent);
        if (currentNoteId && currentProjectId) {
            setProjects(prev => prev.map(p =>
                p.id === currentProjectId ? {
                    ...p,
                    notes: p.notes.map(n => n.id === currentNoteId ? { ...n, content: newContent, updatedAt: new Date().toISOString() } : n),
                    updatedAt: new Date().toISOString()
                } : p
            ));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProjectId) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const title = file.name.replace(/\.(md|txt)$/i, '');
            const id = 'note_' + Date.now();
            const newNote: SessionNote = {
                id,
                projectId: currentProjectId,
                title,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setProjects(prev => prev.map(p =>
                p.id === currentProjectId ? { ...p, notes: [newNote, ...p.notes], updatedAt: new Date().toISOString() } : p
            ));
            setCurrentNoteId(id);
            setContent(content);
            showToast('File uploaded successfully', 'success');
        };
        reader.readAsText(file);
    };

    const toggleProject = (id: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filtered list
    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects;
        const query = searchQuery.toLowerCase();
        return projects.map(p => ({
            ...p,
            notes: p.notes.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query)
            )
        })).filter(p => p.name.toLowerCase().includes(query) || p.notes.length > 0);
    }, [projects, searchQuery]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                <div className="flex flex-col items-center gap-4">
                    <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
                    <p className="text-sm font-medium animate-pulse">Loading your knowledge base...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
            {/* Sidebar */}
            {showSidebar && (
                <div
                    style={{ width: sidebarWidth }}
                    className={`flex flex-col border-r relative transition-all duration-300 ease-in-out ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                >
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className={`p-2 rounded-lg hover:scale-110 transition-all ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                                >
                                    <Home size={18} />
                                </button>
                                <span className="font-bold text-lg tracking-tight">Notes</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    {theme === 'dark' ? <Settings size={18} /> : <Settings size={18} />}
                                </button>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <PanelLeftClose size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="relative group">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} size={16} />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl outline-none border transition-all ${theme === 'dark'
                                        ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10'
                                        : 'bg-slate-100 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10'
                                    }`}
                            />
                        </div>

                        <button
                            onClick={addProject}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${theme === 'dark'
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10'
                                }`}
                        >
                            <PlusCircle size={18} />
                            New Project
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-4">
                        <div className="space-y-1">
                            {filteredProjects.map(project => (
                                <div key={project.id} className="group/project">
                                    <div
                                        onClick={() => toggleProject(project.id)}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {expandedProjects.has(project.id) ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                            <Folder size={16} className={expandedProjects.has(project.id) ? 'text-indigo-400' : 'text-slate-500'} />
                                            {editingId === project.id ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleRename(project.id, 'proj')}
                                                    onKeyDown={e => e.key === 'Enter' && handleRename(project.id, 'proj')}
                                                    className="bg-transparent outline-none w-full"
                                                />
                                            ) : (
                                                <span className="text-sm font-medium truncate">{project.name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/project:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addNote(project.id); }}
                                                className={`p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-indigo-400`}
                                            >
                                                <PlusCircle size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => deleteProject(project.id, e)}
                                                className={`p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedProjects.has(project.id) && (
                                        <div className="ml-6 mt-1 space-y-1">
                                            {project.notes.map(note => (
                                                <div
                                                    key={note.id}
                                                    onClick={() => {
                                                        setCurrentProjectId(project.id);
                                                        setCurrentNoteId(note.id);
                                                        setContent(note.content);
                                                    }}
                                                    className={`group/note flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border-l-2 ${currentNoteId === note.id
                                                            ? (theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-500 text-indigo-900')
                                                            : (theme === 'dark' ? 'hover:bg-slate-800/40 border-transparent text-slate-400 hover:text-slate-100' : 'hover:bg-slate-100/50 border-transparent text-slate-600 hover:text-slate-900')
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FileText size={14} className={currentNoteId === note.id ? 'text-indigo-400' : 'text-slate-500'} />
                                                        {editingId === note.id ? (
                                                            <input
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onBlur={() => handleRename(note.id, 'note')}
                                                                onKeyDown={e => e.key === 'Enter' && handleRename(note.id, 'note')}
                                                                className="bg-transparent outline-none w-full"
                                                            />
                                                        ) : (
                                                            <span className="text-sm truncate">{note.title || 'Untitled'}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => deleteNote(project.id, note.id, e)}
                                                        className="opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {project.notes.length === 0 && (
                                                <p className="text-[10px] text-slate-500 py-1 ml-6">No notes yet</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                            <span>Cloud Sync</span>
                            <div className="flex items-center gap-1.5">
                                {syncStatus === 'synced' && <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <span className="text-emerald-500/80">Active</span></>}
                                {syncStatus === 'syncing' && <><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> <span>Syncing</span></>}
                                {syncStatus === 'offline' && <><div className="w-1.5 h-1.5 rounded-full bg-slate-600" /> <span>Offline</span></>}
                            </div>
                        </div>
                    </div>

                    <div
                        onMouseDown={() => setIsResizing(true)}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors z-50"
                    />
                </div>
            )}

            {/* Main Area */}
            <div className={`flex-1 flex flex-col min-w-0 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
                {/* Header */}
                <header className={`h-16 flex items-center justify-between px-6 border-b shrink-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-white/50'
                    }`}>
                    <div className="flex items-center gap-4 min-w-0">
                        {!showSidebar && (
                            <button
                                onClick={() => setShowSidebar(true)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <PanelLeft size={20} />
                            </button>
                        )}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold truncate">
                                    {currentNote ? currentNote.title : 'Select a Note'}
                                </h2>
                                {currentNote && (
                                    <button
                                        onClick={() => { setEditingId(currentNote.id); setEditValue(currentNote.title); }}
                                        className="p-1 text-slate-500 hover:text-indigo-400"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                )}
                            </div>
                            {currentProject && (
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                                    <Folder size={10} /> {currentProject.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentNote && (
                            <>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <Upload size={14} />
                                    <span className="hidden sm:inline">Import</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".md,.txt"
                                    onChange={handleFileUpload}
                                />
                                <div className={`w-px h-6 mx-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button
                                    className={`p-2 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    className={`p-2 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                >
                                    <Share2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Editor Area */}
                <main className="flex-1 flex overflow-hidden">
                    {currentNote ? (
                        <div className="flex-1 flex flex-col h-full bg-slate-950">
                            <Editor
                                height="100%"
                                defaultLanguage="markdown"
                                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                value={content}
                                onChange={handleContentChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                    padding: { top: 20, bottom: 20 },
                                    lineNumbers: 'off',
                                    glyphMargin: false,
                                    folding: false,
                                    lineDecorationsWidth: 0,
                                    lineNumbersMinChars: 0,
                                    fontFamily: 'var(--font-geist-mono)',
                                    scrollBeyondLastLine: true,
                                    automaticLayout: true,
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-center">
                            <div className="max-w-xs flex flex-col items-center gap-4">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                    <FileText size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold">Pick your canvas</h3>
                                <p className="text-sm text-slate-500">Select a note from the sidebar or start a new project to organize your thoughts.</p>
                                <button
                                    onClick={addProject}
                                    className="mt-2 text-sm font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
                                >
                                    Create first project →
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                {/* Footer / Status Bar */}
                {currentNote && (
                    <footer className={`h-8 flex items-center justify-between px-4 border-t text-[10px] font-medium text-slate-500 shrink-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white/50'
                        }`}>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><Clock size={10} /> Last saved: {new Date(currentNote.updatedAt).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1"><LinkIcon size={10} /> {content.split(' ').length} words</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                {syncStatus === 'synced' ? <><Check size={10} className="text-emerald-500" /> Cloud Sync Ready</> : <><CloudOff size={10} /> Local Mode</>}
                            </span>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
}
