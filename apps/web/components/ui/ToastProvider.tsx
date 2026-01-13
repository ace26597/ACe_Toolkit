"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => string;
    dismissToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const TOAST_ICONS: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-blue-400" />,
    loading: <Loader2 size={18} className="text-indigo-400 animate-spin" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
    success: 'border-emerald-500/30 bg-emerald-900/20',
    error: 'border-red-500/30 bg-red-900/20',
    warning: 'border-amber-500/30 bg-amber-900/20',
    info: 'border-blue-500/30 bg-blue-900/20',
    loading: 'border-indigo-500/30 bg-indigo-900/20',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-slide-in ${TOAST_STYLES[toast.type]}`}
            role="alert"
        >
            {TOAST_ICONS[toast.type]}
            <span className="text-sm text-slate-200 flex-1">{toast.message}</span>
            {toast.action && (
                <button
                    onClick={() => {
                        toast.action?.onClick();
                        onDismiss();
                    }}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-700/50"
                >
                    {toast.action.label}
                </button>
            )}
            {toast.type !== 'loading' && (
                <button
                    onClick={onDismiss}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss (except loading toasts)
        if (toast.type !== 'loading') {
            const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        // If updating to a non-loading type, set auto-dismiss
        if (updates.type && updates.type !== 'loading') {
            const duration = updates.duration ?? (updates.type === 'error' ? 5000 : 3000);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, dismissToast, updateToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                ))}
            </div>

            {/* Animation styles */}
            <style jsx global>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </ToastContext.Provider>
    );
}

// Convenience hooks for common toast types
export function useToastActions() {
    const { showToast, dismissToast, updateToast } = useToast();

    return {
        success: (message: string, action?: Toast['action']) =>
            showToast({ type: 'success', message, action }),

        error: (message: string, action?: Toast['action']) =>
            showToast({ type: 'error', message, action }),

        warning: (message: string, action?: Toast['action']) =>
            showToast({ type: 'warning', message, action }),

        info: (message: string, action?: Toast['action']) =>
            showToast({ type: 'info', message, action }),

        loading: (message: string) =>
            showToast({ type: 'loading', message }),

        dismiss: dismissToast,
        update: updateToast,

        // Helper for async operations
        promise: async <T,>(
            promise: Promise<T>,
            { loading, success, error }: { loading: string; success: string; error: string }
        ): Promise<T> => {
            const id = showToast({ type: 'loading', message: loading });
            try {
                const result = await promise;
                updateToast(id, { type: 'success', message: success });
                return result;
            } catch (e) {
                updateToast(id, { type: 'error', message: error });
                throw e;
            }
        }
    };
}
