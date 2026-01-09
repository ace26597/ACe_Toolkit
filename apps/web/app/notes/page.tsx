"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, Trash2, Save, Home, LogOut, FileText, Loader2, X } from 'lucide-react';

interface Note {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export default function NotesPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [loading, user, router]);

    // Load notes
    useEffect(() => {
        const loadNotes = async () => {
            if (user) {
                try {
                    const { data } = await api.get('/notes');
                    setNotes(data);
                } catch (e) {
                    console.error('Failed to load notes:', e);
                } finally {
                    setLoadingNotes(false);
                }
            }
        };
        loadNotes();
    }, [user]);

    const handleNewNote = () => {
        setSelectedNote(null);
        setTitle('');
        setContent('');
    };

    const handleSelectNote = (note: Note) => {
        setSelectedNote(note);
        setTitle(note.title);
        setContent(note.content);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }

        setIsSaving(true);
        try {
            if (selectedNote) {
                // Update existing note
                const { data } = await api.put(`/notes/${selectedNote.id}`, { title, content });
                setNotes(notes.map(n => n.id === selectedNote.id ? data : n));
                setSelectedNote(data);
            } else {
                // Create new note
                const { data } = await api.post('/notes', { title, content });
                setNotes([data, ...notes]);
                setSelectedNote(data);
            }
            alert('Note saved successfully!');
        } catch (e) {
            alert('Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await api.delete(`/notes/${id}`);
            setNotes(notes.filter(n => n.id !== id));
            if (selectedNote?.id === id) {
                handleNewNote();
            }
        } catch (e) {
            alert('Failed to delete note');
        }
    };

    // Show loading spinner
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
                <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    // Return null while redirecting
    if (!user) return null;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50">
            {/* Header */}
            <header className="flex-none h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
                <div className="flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Notes App
                    </h1>
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 text-gray-600 hover:text-purple-600 transition-colors rounded-lg hover:bg-gray-100"
                        title="Home"
                    >
                        <Home size={20} />
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleNewNote}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        <Plus size={18} />
                        <span>New Note</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <Save size={18} />
                        )}
                        <span>Save</span>
                    </button>
                    <div className="flex items-center space-x-3 border-l border-gray-300 pl-4">
                        <span className="text-sm text-gray-600">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="p-2 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Notes List */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="font-bold text-gray-800">My Notes ({notes.length})</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loadingNotes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 text-sm">No notes yet</p>
                                <p className="text-gray-400 text-xs mt-1">Create your first note!</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-2">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        onClick={() => handleSelectNote(note)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                                            selectedNote?.id === note.id
                                                ? 'bg-purple-50 border-2 border-purple-200'
                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 text-sm truncate mb-1">
                                                    {note.title}
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {note.content.substring(0, 60)}...
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(note.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="ml-2 p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
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

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <input
                            type="text"
                            placeholder="Note title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-3xl font-bold border-none outline-none focus:ring-0 placeholder-gray-300"
                        />
                        <textarea
                            placeholder="Start writing your note..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full min-h-[500px] text-lg border-none outline-none focus:ring-0 resize-none placeholder-gray-300"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
