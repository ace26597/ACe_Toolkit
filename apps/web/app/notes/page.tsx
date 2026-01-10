"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Home, PlusCircle, Trash2, Search, Check, Cloud, CloudOff } from 'lucide-react';
import { notesApi } from '@/lib/api';

const STORAGE_KEY = 'ace_notes';

interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    createdAt: string;
    isSynced?: boolean;
}

export default function NotesPage() {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isCloudEnabled, setIsCloudEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial load - prefer cloud if token exists
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const localSaved = localStorage.getItem(STORAGE_KEY);
            let initialNotes: Note[] = localSaved ? JSON.parse(localSaved) : [];

            if (token) {
                try {
                    const cloudNotes = await notesApi.getAll();
                    if (Array.isArray(cloudNotes)) {
                        // Merge logic: prefer newer content or just overwrite for simplicity in MVP
                        // For now, let's treat cloud as the master if it has data
                        if (cloudNotes.length > 0) {
                            initialNotes = cloudNotes.map((n: any) => ({
                                ...n,
                                isSynced: true
                            }));
                        }
                        setIsCloudEnabled(true);
                    }
                } catch (e) {
                    console.error('Failed to sync with cloud:', e);
                }
            }

            setNotes(initialNotes);
            if (initialNotes.length > 0) {
                setCurrentNote(initialNotes[0]);
            }
            setIsLoading(false);
        };
        init();
    }, []);

    // Set editor content when note changes
    useEffect(() => {
        if (editorRef.current && currentNote) {
            // Only update if content is actually different to avoid cursor jumps
            if (editorRef.current.innerHTML !== currentNote.content) {
                editorRef.current.innerHTML = currentNote.content;
            }
        }
    }, [currentNote?.id]);

    const saveCurrentNote = async () => {
        if (!currentNote || !editorRef.current) return;

        setSaveStatus('saving');

        const content = editorRef.current.innerHTML;
        const title = extractTitle(content);

        const updatedNote: Note = {
            ...currentNote,
            content,
            title,
            updatedAt: new Date().toISOString(),
        };

        // Update local state first for responsiveness
        const updatedNotes = notes.map(n =>
            n.id === currentNote.id ? updatedNote : n
        );
        setNotes(updatedNotes);
        setCurrentNote(updatedNote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));

        // Sync to cloud if enabled
        if (isCloudEnabled) {
            try {
                // If it looks like a temporary local ID (timestamp), we might need to create it on backend first
                // or the backend handles UUIDs. Our backend uses UUIDs. 
                // For simplicity, we'll try to update, if 404 we create.

                // Check if currentNote.id is a UUID (backend style) vs timestamp (local style)
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentNote.id);

                if (isUuid) {
                    await notesApi.update(currentNote.id, { title, content });
                } else {
                    const response = await notesApi.create({ title, content });
                    if (response && response.id) {
                        // Swap the local ID for the backend ID
                        const finalNote = { ...updatedNote, id: response.id, isSynced: true };
                        const finalNotes = updatedNotes.map(n => n.id === currentNote.id ? finalNote : n);
                        setNotes(finalNotes);
                        setCurrentNote(finalNote);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalNotes));
                    }
                }
            } catch (e) {
                console.error('Cloud save failed:', e);
            }
        }

        setSaveStatus('saved');
    };

    const handleContentChange = () => {
        if (!currentNote || !editorRef.current) return;
        setSaveStatus('unsaved');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(saveCurrentNote, 1000);
    };

    const extractTitle = (html: string): string => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const text = temp.textContent || temp.innerText || '';
        const firstLine = text.split('\n')[0].trim();
        return firstLine.slice(0, 50) || 'Untitled Note';
    };

    const createNewNote = async () => {
        const tempId = Date.now().toString();
        const newNote: Note = {
            id: tempId,
            title: 'Untitled Note',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        setCurrentNote(newNote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));

        if (editorRef.current) {
            editorRef.current.innerHTML = '';
            editorRef.current.focus();
        }

        // If cloud enabled, create it immediately to get a real ID
        if (isCloudEnabled) {
            try {
                const response = await notesApi.create({ title: newNote.title, content: newNote.content });
                if (response && response.id) {
                    const finalNote = { ...newNote, id: response.id, isSynced: true };
                    const finalNotes = [finalNote, ...notes];
                    setNotes(finalNotes);
                    setCurrentNote(finalNote);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalNotes));
                }
            } catch (e) {
                console.error('Cloud create failed:', e);
            }
        }
    };

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this note?')) return;

        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));

        if (currentNote?.id === id) {
            setCurrentNote(updatedNotes[0] || null);
        }

        if (isCloudEnabled) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (isUuid) {
                try {
                    await notesApi.delete(id);
                } catch (e) {
                    console.error('Cloud delete failed:', e);
                }
            }
        }
    };

    const selectNote = (note: Note) => {
        if (currentNote && saveStatus !== 'saved') {
            saveCurrentNote();
        }
        setCurrentNote(note);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = document.createElement('img');
                        img.src = event.target?.result as string;
                        img.style.maxWidth = '100%';
                        img.className = 'rounded-lg my-2 shadow-sm';

                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            range.insertNode(img);
                            range.setStartAfter(img);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                        handleContentChange();
                    };
                    reader.readAsDataURL(blob);
                }
                return;
            }
        }
    };

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300 transition-colors"
                                title="Home"
                            >
                                <Home size={20} />
                            </button>
                            <h1 className="font-bold text-gray-800 dark:text-white">Notes</h1>
                        </div>
                        <div className="flex items-center gap-1">
                            <div title={isCloudEnabled ? "Cloud Sync Enabled" : "Cloud Sync Disabled"}>
                                {isCloudEnabled ? <Cloud size={16} className="text-green-500" /> : <CloudOff size={16} className="text-gray-400" />}
                            </div>
                            <button
                                onClick={createNewNote}
                                className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-300 transition-colors"
                                title="New Note"
                            >
                                <PlusCircle size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No notes found</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredNotes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => selectNote(note)}
                                    className={`p-3 rounded-lg cursor-pointer group transition-all ${note.id === currentNote?.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-600'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-medium text-sm truncate ${note.id === currentNote?.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {note.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(note.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => deleteNote(note.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
                <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {currentNote ? currentNote.title : 'Select a note'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        {saveStatus === 'saved' && (
                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <Check size={14} /> Synced
                            </span>
                        )}
                        {saveStatus === 'saving' && <span className="text-gray-400 animate-pulse">Syncing...</span>}
                        {saveStatus === 'unsaved' && <span className="text-amber-600 dark:text-amber-400">Saving...</span>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {currentNote ? (
                        <div className="max-w-4xl mx-auto py-10 px-8 h-full">
                            <div
                                ref={editorRef}
                                contentEditable
                                onInput={handleContentChange}
                                onPaste={handlePaste}
                                className="min-h-full outline-none prose prose-slate dark:prose-invert max-w-none text-gray-800 dark:text-gray-100 selection:bg-indigo-100 dark:selection:bg-indigo-900"
                                placeholder="Write something amazing..."
                                suppressContentEditableWarning
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full">
                            <div className="text-center">
                                <PlusCircle size={48} className="mx-auto text-gray-300 mb-4" />
                                <h2 className="text-xl font-semibold text-gray-400 mb-2">No note selected</h2>
                                <button
                                    onClick={createNewNote}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
                                >
                                    Start a new one
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
