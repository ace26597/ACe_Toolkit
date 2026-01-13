"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotesPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to unified mermaid page
        router.replace('/mermaid');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
            <Loader2 size={32} className="text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-400">Redirecting to unified workspace...</p>
            <p className="text-slate-500 text-sm mt-2">
                Notes and diagrams are now managed in one place.
            </p>
        </div>
    );
}
