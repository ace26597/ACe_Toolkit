"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Home, PlusCircle, Trash2, Search, Check } from 'lucide-react';

const STORAGE_KEY = 'ace_notes';

interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    createdAt: string;
}

export default function NotesPage() {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load notes from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            setNotes(parsed);
            if (parsed.length > 0) {
                setCurrentNote(parsed[0]);
            }
        }
    }, []);

    // Set editor content when note changes
    useEffect(() => {
        if (editorRef.current && currentNote) {
            editorRef.current.innerHTML = currentNote.content;
        }
    }, [currentNote?.id]);

    // Autosave with debounce
    const handleContentChange = () => {
        if (!currentNote || !editorRef.current) return;

        setSaveStatus('unsaved');

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveCurrentNote();
        }, 1000);
    };

    const saveCurrentNote = () => {
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

        const updatedNotes = notes.map(n =>
            n.id === currentNote.id ? updatedNote : n
        );

        setNotes(updatedNotes);
        setCurrentNote(updatedNote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));

        setSaveStatus('saved');
    };

    const extractTitle = (html: string): string => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const text = temp.textContent || temp.innerText || '';
        const firstLine = text.split('\n')[0].trim();
        return firstLine.slice(0, 50) || 'Untitled Note';
    };

    const createNewNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
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
    };

    const deleteNote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this note?')) return;

        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));

        if (currentNote?.id === id) {
            setCurrentNote(updatedNotes[0] || null);
        }
    };

    const selectNote = (note: Note) => {
        // Save current note before switching
        if (currentNote && editorRef.current) {
            saveCurrentNote();
        }
        setCurrentNote(note);
    };

    // Handle paste with image support
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
                        img.style.margin = '8px 0';
                        img.style.borderRadius = '4px';

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

    // Filter notes by search
    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-300"
                                title="Home"
                            >
                                <Home size={20} />
                            </button>
                            <h1 className="font-bold text-gray-800 dark:text-white">Notes</h1>
                        </div>
                        <button
                            onClick={createNewNote}
                            className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-300"
                            title="New Note"
                        >
                            <PlusCircle size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No notes yet</p>
                            <button
                                onClick={createNewNote}
                                className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
                            >
                                Create your first note
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredNotes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => selectNote(note)}
                                    className={`p-3 rounded-lg cursor-pointer group ${
                                        note.id === currentNote?.id
                                            ? 'bg-indigo-100 dark:bg-indigo-900'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {note.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(note.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => deleteNote(note.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600"
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
            <div className="flex-1 flex flex-col">
                {/* Editor Header */}
                <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {currentNote ? currentNote.title : 'Select or create a note'}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {saveStatus === 'saved' && (
                            <span className="flex items-center gap-1 text-green-600">
                                <Check size={14} /> Saved
                            </span>
                        )}
                        {saveStatus === 'saving' && <span>Saving...</span>}
                        {saveStatus === 'unsaved' && <span className="text-yellow-600">Unsaved</span>}
                    </div>
                </div>

                {/* Editor Content */}
                {currentNote ? (
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleContentChange}
                        onPaste={handlePaste}
                        className="flex-1 p-6 bg-white dark:bg-gray-800 overflow-y-auto focus:outline-none prose dark:prose-invert max-w-none"
                        style={{ minHeight: '100%' }}
                        placeholder="Start typing..."
                        suppressContentEditableWarning
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
                        <div className="text-center text-gray-500">
                            <p className="mb-4">No note selected</p>
                            <button
                                onClick={createNewNote}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Create New Note
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
