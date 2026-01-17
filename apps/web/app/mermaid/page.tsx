"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sun, Moon, Download, Save, Plus, Trash2, Upload, ChevronRight, ChevronDown, FolderOpen, Folder, FileCode2, Sparkles, Send, Loader2, Layout, Palette, RefreshCw, PanelLeftClose, PanelLeft, Zap, Search, Settings, Check, Cloud, CloudOff, RefreshCcw, FileText, File, HardDrive, FolderInput, FolderOutput } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { aiApi, projectsApi, chartsApi, mermaidDiskApi, DiskProject, Project as ApiProject, Chart as ApiChart, Edition as ApiEdition } from '@/lib/api';
import MarkdownDocumentView from '@/components/mermaid/MarkdownDocumentView';
import { useToast } from '@/components/ui/ToastProvider';

// Types
interface Edition {
    id: string;
    code: string;
    description: string;
    updatedAt: string;
}

interface Chart {
    id: string;
    projectId: string;
    documentId?: string; // Optional reference to parent document
    name: string;
    code: string;
    editions: Edition[];
    currentEditionId: string;
    createdAt: string;
    updatedAt: string;
}

// Document groups charts from the same markdown file
interface Document {
    id: string;
    name: string;
    sourceMarkdown?: string;
    chartIds: string[]; // References to charts
    createdAt: string;
}

interface Project {
    id: string;
    name: string;
    charts: Chart[]; // All charts (maintains backward compatibility)
    documents: Document[]; // Optional document groupings
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'mermaid_projects_v2';
const SETTINGS_KEY = 'mermaid_settings';

const DEFAULT_CODE = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do Something]
    B -->|No| D[Do Something Else]
    C --> E[End]
    D --> E`;

const MERMAID_KEYWORDS = ['graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie ', 'journey', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart', 'requirementDiagram', 'c4Context'];

const THEMES = [
    { id: 'default', name: 'Light', bg: '#ffffff' },
    { id: 'dark', name: 'Dark', bg: '#0f172a' },
    { id: 'forest', name: 'Forest', bg: '#1a2e1a' },
    { id: 'neutral', name: 'Neutral', bg: '#f5f5f5' },
    { id: 'base', name: 'Base', bg: '#fffdf5' },
];

const LAYOUTS = [
    { id: 'TD', name: 'Top → Down', icon: '↓' },
    { id: 'TB', name: 'Top → Bottom', icon: '⬇' },
    { id: 'BT', name: 'Bottom → Top', icon: '⬆' },
    { id: 'LR', name: 'Left → Right', icon: '→' },
    { id: 'RL', name: 'Right → Left', icon: '←' },
];

export default function MermaidPage() {
    const { showToast, dismissToast, updateToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [currentChartId, setCurrentChartId] = useState<string | null>(null);
    const [code, setCode] = useState(DEFAULT_CODE);
    const [theme, setTheme] = useState('dark');
    const [showSidebar, setShowSidebar] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
    const [isLoading, setIsLoading] = useState(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [showDocumentView, setShowDocumentView] = useState(false);
    const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'diagram' | 'markdown'>('diagram');
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    const [showDiskDialog, setShowDiskDialog] = useState(false);
    const [diskProjects, setDiskProjects] = useState<DiskProject[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const currentProject = projects.find(p => p.id === currentProjectId);
    const currentChart = currentProject?.charts.find(c => c.id === currentChartId);

    // Detect pasted content type with improved name extraction
    const detectedContent = useMemo(() => {
        if (!code.trim()) return null;

        const extractChartName = (fullText: string, matchIndex: number, chartCode: string, chartNumber: number): string => {
            const beforeMatch = fullText.substring(0, matchIndex);
            const lines = beforeMatch.split('\n');

            for (let j = lines.length - 1; j >= Math.max(0, lines.length - 10); j--) {
                const line = lines[j].trim();
                if (line.startsWith('#')) return line.replace(/^#+\s*/, '').trim();
            }

            for (let j = lines.length - 1; j >= Math.max(0, lines.length - 5); j--) {
                const boldMatch = lines[j].match(/\*\*([^*]+)\*\*|__([^_]+)__/);
                if (boldMatch) return (boldMatch[1] || boldMatch[2]).trim();
            }

            const firstLine = chartCode.split('\n')[0].trim().toLowerCase();
            if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) return `Flowchart ${chartNumber}`;
            if (firstLine.startsWith('sequencediagram')) return `Sequence Diagram ${chartNumber}`;
            if (firstLine.startsWith('classdiagram')) return `Class Diagram ${chartNumber}`;
            if (firstLine.startsWith('statediagram')) return `State Diagram ${chartNumber}`;
            if (firstLine.startsWith('erdiagram')) return `ER Diagram ${chartNumber}`;
            if (firstLine.startsWith('gantt')) return `Gantt Chart ${chartNumber}`;
            if (firstLine.startsWith('pie')) return `Pie Chart ${chartNumber}`;
            if (firstLine.startsWith('mindmap')) return `Mind Map ${chartNumber}`;

            return `Chart ${chartNumber}`;
        };

        const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/gi;
        const matches = [...code.matchAll(mermaidBlockRegex)];
        if (matches.length > 0) {
            const charts = matches.map((match, i) => {
                const chartCode = match[1].trim();
                const name = extractChartName(code, match.index!, chartCode, i + 1);
                return { name, code: chartCode };
            });
            return { type: 'markdown', charts, count: matches.length };
        }

        if (!currentChartId) {
            const trimmed = code.trim();
            const isMermaid = MERMAID_KEYWORDS.some(kw => trimmed.toLowerCase().startsWith(kw.toLowerCase()));
            if (isMermaid) {
                const name = extractChartName('', 0, trimmed, 1);
                return { type: 'raw_mermaid', charts: [{ name, code: trimmed }], count: 1 };
            }
        }

        return null;
    }, [code, currentChartId]);

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.theme) setTheme(settings.theme);
        }
    }, []);

    // Save settings
    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
    }, [theme]);

    // Load projects from API (with localStorage fallback)
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Try to load from API first
                const apiProjects = await projectsApi.getAll();
                if (apiProjects.length > 0) {
                    // Convert API format to local format
                    const loaded: Project[] = apiProjects.map(p => ({
                        ...p,
                        documents: p.documents || [],
                        charts: p.charts.map((c: any) => ({
                            ...c,
                            editions: c.editions || [],
                            currentEditionId: c.currentEditionId || ''
                        }))
                    }));
                    setProjects(loaded);
                    setCurrentProjectId(loaded[0].id);
                    setExpandedProjects(new Set([loaded[0].id]));
                    if (loaded[0].charts.length > 0) {
                        setCurrentChartId(loaded[0].charts[0].id);
                        setCode(loaded[0].charts[0].code);
                    }
                    setSyncStatus('synced');
                    // Clear localStorage since API has data
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    // Check localStorage for existing data to migrate
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        const localData: Project[] = JSON.parse(saved);
                        // Sync localStorage data to API
                        await projectsApi.sync(localData);
                        setProjects(localData);
                        if (localData.length > 0) {
                            setCurrentProjectId(localData[0].id);
                            setExpandedProjects(new Set([localData[0].id]));
                            if (localData[0].charts.length > 0) {
                                setCurrentChartId(localData[0].charts[0].id);
                                setCode(localData[0].charts[0].code);
                            }
                        }
                        setSyncStatus('synced');
                    } else {
                        // No data anywhere, create a new project
                        createNewProjectAsync();
                    }
                }
            } catch (error) {
                console.error('Failed to load from API, falling back to localStorage:', error);
                setSyncStatus('offline');
                // Fallback to localStorage
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const loaded: Project[] = JSON.parse(saved);
                    setProjects(loaded);
                    if (loaded.length > 0) {
                        setCurrentProjectId(loaded[0].id);
                        setExpandedProjects(new Set([loaded[0].id]));
                        if (loaded[0].charts.length > 0) {
                            setCurrentChartId(loaded[0].charts[0].id);
                            setCode(loaded[0].charts[0].code);
                        }
                    }
                } else {
                    createNewProject();
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Debounced auto-save to API on changes
    const syncToApi = useCallback(async (projectsToSync: Project[], immediate = false) => {
        // Always save to localStorage as backup first
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSync));

        // Skip API sync if already in offline mode (to avoid repeated errors)
        if (syncStatus === 'offline' && !immediate) return;

        try {
            setSyncStatus('syncing');
            await projectsApi.sync(projectsToSync);
            setSyncStatus('synced');
        } catch (error: any) {
            // Differentiate between network errors and API errors
            const isNetworkError = error?.message?.includes('Failed to fetch') ||
                error?.message?.includes('NetworkError') ||
                error?.name === 'TypeError';

            if (isNetworkError) {
                console.warn('Backend offline, using localStorage:', error);
                setSyncStatus('offline');
            } else {
                console.error('API sync error:', error);
                setSyncStatus('error');
            }
        }
    }, [syncStatus]);

    // Immediate sync function (bypasses debounce)
    const triggerImmediateSync = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // Use a short delay to ensure state updates have completed
        setTimeout(() => {
            setProjects(current => {
                syncToApi(current, true);
                return current;
            });
        }, 100);
    }, [syncToApi]);

    useEffect(() => {
        if (projects.length > 0 && !isLoading) {
            // Always save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

            // Debounced API sync (skip if offline to avoid repeated errors)
            if (syncStatus !== 'offline') {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
                saveTimeoutRef.current = setTimeout(() => {
                    syncToApi(projects);
                }, 1500);
            }
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [projects, isLoading, syncToApi, syncStatus]);

    // Auto-retry sync when coming back online or tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && syncStatus === 'offline') {
                // Try to sync again when user returns to tab
                triggerImmediateSync();
            }
        };

        const handleOnline = () => {
            if (syncStatus === 'offline') {
                triggerImmediateSync();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [syncStatus, triggerImmediateSync]);

    // Sidebar resize handling
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.min(Math.max(e.clientX, 200), 600);
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isResizing) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Render mermaid in iframe with full pan/zoom/drag functionality
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const themeConfig = THEMES.find(t => t.id === theme) || THEMES[1];
        const displayCode = currentChartId ? code : (detectedContent?.charts[0]?.code || code);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: ${themeConfig.bg};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #canvas {
            width: 100%;
            height: 100%;
            position: relative;
            cursor: grab;
            overflow: hidden;
        }
        
        #canvas:active {
            cursor: grabbing;
        }
        
        #diagram-container {
            position: absolute;
            transform-origin: 0 0;
            will-change: transform;
            opacity: 0;
            transition: opacity 0.2s ease-out;
        }
        
        #output {
            display: inline-block;
            padding: 40px;
        }
        
        #output svg {
            max-width: none !important;
            height: auto;
            display: block;
        }
        
        .error { 
            color: #ef4444; 
            font-size: 14px; 
            text-align: center; 
            padding: 40px;
            font-family: ui-monospace, monospace;
        }
        
        .empty { 
            color: #64748b; 
            font-size: 14px;
            padding: 40px;
        }
        
        /* Zoom indicator */
        #zoom-indicator {
            position: fixed;
            bottom: 16px;
            right: 16px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 100;
        }
        
        #zoom-indicator.visible {
            opacity: 1;
        }
        
        /* Help tooltip */
        #help-tooltip {
            position: fixed;
            bottom: 16px;
            left: 16px;
            background: rgba(0, 0, 0, 0.6);
            color: rgba(255, 255, 255, 0.8);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            pointer-events: none;
            z-index: 100;
        }
        
        /* Minimap */
        #minimap {
            position: fixed;
            bottom: 50px;
            right: 16px;
            width: 120px;
            height: 80px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            overflow: hidden;
            z-index: 100;
        }
        
        #minimap-viewport {
            position: absolute;
            border: 2px solid #6366f1;
            background: rgba(99, 102, 241, 0.2);
            pointer-events: none;
        }
        
        /* Node hover effects */
        .node { cursor: pointer; transition: filter 0.2s; }
        .node:hover { filter: brightness(1.1); }
        .edgeLabel { cursor: pointer; }
        .edgeLabel:hover { filter: brightness(1.2); }
    </style>
</head>
<body>
    <div id="canvas">
        <div id="loading-placeholder" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #64748b; font-size: 14px;">
            Rendering diagram...
        </div>
        <div id="diagram-container">
            <div id="output"></div>
        </div>
    </div>
    
    <div id="zoom-indicator">100%</div>
    <div id="help-tooltip">Scroll to zoom • Drag to pan • Double-click to reset</div>
    
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        
        const canvas = document.getElementById('canvas');
        const container = document.getElementById('diagram-container');
        const output = document.getElementById('output');
        const zoomIndicator = document.getElementById('zoom-indicator');
        
        // Transform state
        let state = {
            scale: 1,
            panX: 0,
            panY: 0,
            minScale: 0.1,
            maxScale: 5
        };
        
        // Drag state
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let lastPan = { x: 0, y: 0 };
        
        // Update transform
        const updateTransform = () => {
            container.style.transform = \`translate(\${state.panX}px, \${state.panY}px) scale(\${state.scale})\`;
        };
        
        // Show zoom indicator
        let zoomTimeout;
        const showZoom = () => {
            zoomIndicator.textContent = Math.round(state.scale * 100) + '%';
            zoomIndicator.classList.add('visible');
            clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(() => zoomIndicator.classList.remove('visible'), 1000);
        };
        
        // Center and fit diagram on load
        const centerDiagram = () => {
            const svg = output.querySelector('svg');
            if (!svg) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            
            // Get the natural size of the SVG
            let svgWidth = svg.viewBox?.baseVal?.width || svg.getBBox?.()?.width || svg.clientWidth;
            let svgHeight = svg.viewBox?.baseVal?.height || svg.getBBox?.()?.height || svg.clientHeight;
            
            // Fallback: use the actual rendered size at current scale
            if (!svgWidth || !svgHeight) {
                const svgRect = svg.getBoundingClientRect();
                svgWidth = svgRect.width / state.scale;
                svgHeight = svgRect.height / state.scale;
            }
            
            // Calculate scale to fit with padding
            const padding = 100;
            const availableWidth = canvasRect.width - padding;
            const availableHeight = canvasRect.height - padding;
            
            const scaleX = availableWidth / svgWidth;
            const scaleY = availableHeight / svgHeight;
            
            // Use the smaller scale to ensure fit, but cap at 1 (don't zoom in)
            state.scale = Math.min(scaleX, scaleY, 1);
            state.scale = Math.max(state.scale, 0.1); // Minimum scale
            
            // Calculate centered position
            const scaledWidth = svgWidth * state.scale;
            const scaledHeight = svgHeight * state.scale;
            
            state.panX = (canvasRect.width - scaledWidth) / 2;
            state.panY = (canvasRect.height - scaledHeight) / 2;
            
            updateTransform();
            
            // Show the container after positioning
            container.style.opacity = '1';
        };
        
        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(state.scale * delta, state.minScale), state.maxScale);
            
            // Zoom towards mouse position
            const scaleChange = newScale / state.scale;
            state.panX = mouseX - (mouseX - state.panX) * scaleChange;
            state.panY = mouseY - (mouseY - state.panY) * scaleChange;
            state.scale = newScale;
            
            updateTransform();
            showZoom();
        }, { passive: false });
        
        // Mouse drag
        canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node') || e.target.closest('.edgeLabel')) return;
            
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            lastPan = { x: state.panX, y: state.panY };
            canvas.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            state.panX = lastPan.x + (e.clientX - dragStart.x);
            state.panY = lastPan.y + (e.clientY - dragStart.y);
            updateTransform();
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        // Double-click to reset view
        canvas.addEventListener('dblclick', (e) => {
            if (e.target.closest('.node') || e.target.closest('.edgeLabel')) return;
            
            state.scale = 1;
            state.panX = 0;
            state.panY = 0;
            updateTransform();
            showZoom();
            
            // Re-center after reset
            setTimeout(centerDiagram, 100);
        });
        
        // Touch support
        let lastTouchDistance = 0;
        let lastTouchCenter = { x: 0, y: 0 };
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
                lastTouchCenter = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                };
            } else if (e.touches.length === 1) {
                isDragging = true;
                dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                lastPan = { x: state.panX, y: state.panY };
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (lastTouchDistance > 0) {
                    const scale = distance / lastTouchDistance;
                    const newScale = Math.min(Math.max(state.scale * scale, state.minScale), state.maxScale);
                    
                    const center = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                    };
                    
                    const scaleChange = newScale / state.scale;
                    state.panX = center.x - (center.x - state.panX) * scaleChange;
                    state.panY = center.y - (center.y - state.panY) * scaleChange;
                    state.scale = newScale;
                    
                    updateTransform();
                    showZoom();
                }
                
                lastTouchDistance = distance;
            } else if (e.touches.length === 1 && isDragging) {
                // Pan
                state.panX = lastPan.x + (e.touches[0].clientX - dragStart.x);
                state.panY = lastPan.y + (e.touches[0].clientY - dragStart.y);
                updateTransform();
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', () => {
            isDragging = false;
            lastTouchDistance = 0;
        });
        
        // Node click handling
        document.addEventListener('click', (e) => {
            const node = e.target.closest('.node') || e.target.closest('.edgeLabel');
            if (node) {
                const text = node.textContent?.trim();
                if (text) {
                    window.top.postMessage({ type: 'MERMAID_EDIT', text: text }, '*');
                }
            }
        });
        
        // Render diagram
        const code = \`${displayCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        const loadingPlaceholder = document.getElementById('loading-placeholder');
        
        if (code.trim()) {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: '${theme}',
                    securityLevel: 'loose',
                    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' }
                });
                
                const { svg } = await mermaid.render('diagram', code);
                output.innerHTML = svg;
                
                // Hide loading and center diagram after render
                loadingPlaceholder.style.display = 'none';
                setTimeout(centerDiagram, 50);
                
            } catch (e) {
                loadingPlaceholder.style.display = 'none';
                container.style.opacity = '1';
                output.innerHTML = '<div class="error">⚠️ ' + e.message + '</div>';
            }
        } else {
            loadingPlaceholder.textContent = 'Select or create a chart';
            container.style.opacity = '0';
        }
    </script>
</body>
</html>`;

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
    }, [code, theme, currentChartId, detectedContent]);

    // Change layout direction
    const changeLayout = (direction: string) => {
        if (!code.trim()) return;
        const newCode = code.replace(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL)/im, `$1 ${direction}`);
        if (newCode !== code) {
            if (currentChartId) {
                updateChartCode(newCode);
            } else {
                setCode(newCode);
            }
        }
    };

    // Project/Chart Management
    const createNewProject = () => {
        const newProject: Project = {
            id: Date.now().toString(),
            name: 'New Project',
            charts: [],
            documents: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects(prev => [...prev, newProject]);
        setCurrentProjectId(newProject.id);
        setCurrentChartId(null);
        setCode('');
        setExpandedProjects(prev => new Set([...prev, newProject.id]));
    };

    const createNewProjectAsync = async () => {
        const newProject: Project = {
            id: Date.now().toString(),
            name: 'New Project',
            charts: [],
            documents: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setProjects([newProject]);
        setCurrentProjectId(newProject.id);
        setCurrentChartId(null);
        setCode('');
        setExpandedProjects(new Set([newProject.id]));

        // Sync to API
        try {
            await projectsApi.sync([newProject]);
            setSyncStatus('synced');
        } catch (error) {
            console.error('Failed to create project in API:', error);
            setSyncStatus('offline');
        }
    };

    const createNewChart = (projectId: string, name?: string, initialCode?: string, documentId?: string) => {
        const timestamp = Date.now().toString();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const uniqueId = `${timestamp}-${randomSuffix}`;

        const newChart: Chart = {
            id: uniqueId,
            projectId,
            documentId, // Optional reference to parent document
            name: name || 'New Chart',
            code: initialCode || DEFAULT_CODE,
            editions: [{
                id: `${uniqueId}-e1`,
                code: initialCode || DEFAULT_CODE,
                description: 'Initial Version',
                updatedAt: new Date().toISOString()
            }],
            currentEditionId: `${uniqueId}-e1`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setProjects(prev => prev.map(p =>
            p.id === projectId
                ? { ...p, charts: [...p.charts, newChart], updatedAt: new Date().toISOString() }
                : p
        ));
        setCurrentProjectId(projectId);
        setCurrentChartId(newChart.id);
        setCode(newChart.code);

        // Show toast only if it's not an automated batch operation
        if (!documentId) {
            showToast({ type: 'success', message: `Created "${name || 'New Chart'}"` });
        }
    };

    // Create a new document (note) in a project
    const createNewDocument = (projectId: string, name?: string, content?: string) => {
        const timestamp = Date.now().toString();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const docId = `doc-${timestamp}-${randomSuffix}`;

        const newDocument: Document = {
            id: docId,
            name: name || 'New Note',
            sourceMarkdown: content || '# New Note\n\nStart writing here...\n\n```mermaid\ngraph TD\n    A[Start] --> B[End]\n```\n',
            chartIds: [],
            createdAt: new Date().toISOString()
        };

        setProjects(prev => prev.map(p =>
            p.id === projectId
                ? { ...p, documents: [...p.documents, newDocument], updatedAt: new Date().toISOString() }
                : p
        ));

        // Select the new document for editing
        setCurrentProjectId(projectId);
        setCurrentDocumentId(docId);
        setCurrentChartId(null);
        setCode(newDocument.sourceMarkdown || '');
        setViewMode('markdown');
        setShowDocumentView(true);

        showToast({ type: 'success', message: `Created "${name || 'New Note'}"` });
    };

    // Update document content (when editing markdown)
    const updateDocumentContent = (newContent: string) => {
        if (!currentDocumentId || !currentProjectId) return;

        setProjects(prev => prev.map(p => {
            if (p.id !== currentProjectId) return p;
            return {
                ...p,
                documents: p.documents.map(d =>
                    d.id === currentDocumentId
                        ? { ...d, sourceMarkdown: newContent }
                        : d
                ),
                updatedAt: new Date().toISOString()
            };
        }));
        setCode(newContent);
    };

    // Delete a document
    const deleteDocument = (projectId: string, documentId: string) => {
        const project = projects.find(p => p.id === projectId);
        const docName = project?.documents.find(d => d.id === documentId)?.name || 'Document';

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                documents: p.documents.filter(d => d.id !== documentId),
                // Also remove charts that belong to this document
                charts: p.charts.filter(c => c.documentId !== documentId),
                updatedAt: new Date().toISOString()
            };
        }));

        if (currentDocumentId === documentId) {
            setCurrentDocumentId(null);
            setViewMode('diagram');
        }

        showToast({ type: 'info', message: `Deleted "${docName}"` });
    };

    const deleteProject = (projectId: string) => {
        const projectName = projects.find(p => p.id === projectId)?.name || 'Project';
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (currentProjectId === projectId) {
            const remaining = projects.filter(p => p.id !== projectId);
            setCurrentProjectId(remaining[0]?.id || null);
            setCurrentChartId(remaining[0]?.charts[0]?.id || null);
            setCode(remaining[0]?.charts[0]?.code || '');
        }
        showToast({ type: 'info', message: `Deleted "${projectName}"` });
    };

    const deleteChart = (projectId: string, chartId: string) => {
        const project = projects.find(p => p.id === projectId);
        const chartName = project?.charts.find(c => c.id === chartId)?.name || 'Chart';
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, charts: p.charts.filter((c: Chart) => c.id !== chartId) } : p
        ));
        if (currentChartId === chartId) {
            const remaining = project?.charts.filter((c: Chart) => c.id !== chartId) || [];
            setCurrentChartId(remaining[0]?.id || null);
            setCode(remaining[0]?.code || '');
        }
        showToast({ type: 'info', message: `Deleted "${chartName}"` });
    };

    // Helper to update markdown content
    const updateDocumentMarkdown = (originalMarkdown: string, chartIndex: number, newCode: string): string => {
        const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)```/gi;
        const matches = [...originalMarkdown.matchAll(mermaidBlockRegex)];

        if (chartIndex >= 0 && chartIndex < matches.length) {
            const match = matches[chartIndex];
            const before = originalMarkdown.substring(0, match.index!);
            const after = originalMarkdown.substring(match.index! + match[0].length);
            return `${before}\`\`\`mermaid\n${newCode}\n\`\`\`${after}`;
        }
        return originalMarkdown;
    };

    const updateChartCode = (newCode: string) => {
        if (!currentProjectId || !currentChartId) return;

        setProjects(prev => prev.map(p => {
            if (p.id !== currentProjectId) return p;

            // Find the chart to check if it has a documentId
            const targetChart = p.charts.find(c => c.id === currentChartId);
            let updatedDocuments = p.documents;

            if (targetChart && targetChart.documentId) {
                updatedDocuments = p.documents.map(doc => {
                    if (doc.id === targetChart.documentId && doc.sourceMarkdown) {
                        // Find index of this chart in the document's chart list
                        // This relies on the fact that charts are added in order
                        // We need to match the chartId to find its index
                        const chartIndex = p.charts
                            .filter(c => c.documentId === doc.id)
                            .findIndex(c => c.id === currentChartId);

                        if (chartIndex !== -1) {
                            return {
                                ...doc,
                                sourceMarkdown: updateDocumentMarkdown(doc.sourceMarkdown, chartIndex, newCode)
                            };
                        }
                    }
                    return doc;
                });
            }

            return {
                ...p,
                documents: updatedDocuments,
                charts: p.charts.map(c =>
                    c.id === currentChartId
                        ? { ...c, code: newCode, updatedAt: new Date().toISOString() }
                        : c
                ),
                updatedAt: new Date().toISOString()
            };
        }));

        setCode(newCode);
    };

    const handleAddDetectedCharts = () => {
        if (!detectedContent || !currentProjectId) return;

        detectedContent.charts.forEach((chart, idx) => {
            setTimeout(() => createNewChart(currentProjectId, chart.name, chart.code), idx * 100);
        });

        if (!currentChartId) setCode('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const content = await file.text();
        const fileName = file.name.replace(/\.(md|mmd|txt)$/i, '');
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Extract mermaid blocks from content
        const mermaidBlocks = [...content.matchAll(/```mermaid\s*([\s\S]*?)```/gi)];

        // Helper to extract chart name from context
        const extractChartName = (fullText: string, matchIndex: number, chartCode: string, chartNumber: number): string => {
            const beforeMatch = fullText.substring(0, matchIndex);
            const lines = beforeMatch.split('\n');
            for (let j = lines.length - 1; j >= Math.max(0, lines.length - 10); j--) {
                const line = lines[j].trim();
                if (line.startsWith('#')) return line.replace(/^#+\s*/, '').trim();
            }
            const firstLine = chartCode.split('\n')[0].trim().toLowerCase();
            if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) return `Flowchart ${chartNumber}`;
            if (firstLine.startsWith('sequencediagram')) return `Sequence ${chartNumber}`;
            return `Chart ${chartNumber}`;
        };

        // Ensure we have a project
        let projectId = currentProjectId;
        if (!projectId) {
            const newProject: Project = {
                id: Date.now().toString(),
                name: 'New Project',
                charts: [],
                documents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setProjects(prev => [...prev, newProject]);
            setCurrentProjectId(newProject.id);
            setExpandedProjects(prev => new Set([...prev, newProject.id]));
            projectId = newProject.id;
        }

        if (mermaidBlocks.length > 0) {
            // Multiple mermaid blocks - create a document
            const toastId = showToast({ type: 'loading', message: `Processing ${mermaidBlocks.length} diagrams...` });

            const charts = mermaidBlocks.map((match, i) => ({
                name: extractChartName(content, match.index!, match[1].trim(), i + 1),
                code: match[1].trim()
            }));

            // Create document
            const docId = `doc-${Date.now()}`;
            const newDocument: Document = {
                id: docId,
                name: fileName || `Document ${new Date().toLocaleDateString()}`,
                sourceMarkdown: content,
                chartIds: [],
                createdAt: new Date().toISOString()
            };

            // Add charts
            charts.forEach((chart, idx) => {
                setTimeout(() => createNewChart(projectId!, chart.name, chart.code, docId), idx * 30);
            });

            // Add document to project
            setProjects(prev => prev.map(p =>
                p.id === projectId
                    ? { ...p, documents: [...p.documents, newDocument], updatedAt: new Date().toISOString() }
                    : p
            ));

            // Also keep the markdown content in editor for reference
            setCode(content);
            setShowDocumentView(true);

            setTimeout(() => {
                updateToast(toastId, {
                    type: 'success',
                    message: `Added "${fileName}" with ${charts.length} charts`
                });
                // Trigger immediate sync after all charts are added
                triggerImmediateSync();
            }, charts.length * 30 + 100);

        } else {
            // Check if it's raw mermaid code (no markdown blocks)
            const trimmed = content.trim();
            const MERMAID_STARTERS = ['graph ', 'flowchart ', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'gantt', 'pie ', 'journey', 'gitgraph', 'mindmap'];
            const isMermaid = MERMAID_STARTERS.some(kw => trimmed.toLowerCase().startsWith(kw));

            if (isMermaid) {
                // Single mermaid code - add as chart directly
                createNewChart(projectId, fileName || 'Uploaded Chart', trimmed);
                showToast({ type: 'success', message: `Added "${fileName || 'Uploaded Chart'}"` });
                // Trigger immediate sync
                setTimeout(() => triggerImmediateSync(), 100);
            } else {
                // Just text/markdown without mermaid - put in editor
                setCode(content);
                showToast({ type: 'info', message: 'No mermaid diagrams found in file' });
            }
        }
    };

    // Document View Handlers
    const handleEditDiagramFromDoc = (chartCode: string, name: string) => {
        setShowDocumentView(false);
        if (currentProjectId) {
            createNewChart(currentProjectId, name, chartCode);
        } else {
            setCode(chartCode);
        }
    };

    const handleAddChartFromDoc = (name: string, chartCode: string) => {
        if (currentProjectId) {
            createNewChart(currentProjectId, name, chartCode);
        }
    };

    const handleAddAllChartsFromDoc = (charts: { name: string; code: string }[], documentName?: string) => {
        if (!currentProjectId) {
            showToast({ type: 'error', message: 'Please select a project first' });
            return;
        }

        const toastId = showToast({ type: 'loading', message: `Adding ${charts.length} charts...` });

        // Create a new document to group these charts
        const docId = `doc-${Date.now()}`;
        const newDocument: Document = {
            id: docId,
            name: documentName || `Document ${new Date().toLocaleDateString()}`,
            sourceMarkdown: code,
            chartIds: [],
            createdAt: new Date().toISOString()
        };

        // Create charts and track their IDs
        const chartIds: string[] = [];
        charts.forEach((chart, idx) => {
            const chartId = Date.now().toString() + '-' + idx;
            chartIds.push(chartId);
            setTimeout(() => createNewChart(currentProjectId, chart.name, chart.code, docId), idx * 50);
        });

        newDocument.chartIds = chartIds;

        // Add document to project
        setProjects(prev => prev.map(p =>
            p.id === currentProjectId
                ? { ...p, documents: [...p.documents, newDocument] }
                : p
        ));

        setShowDocumentView(false);

        // Update toast to success
        setTimeout(() => {
            updateToast(toastId, {
                type: 'success',
                message: `Added ${charts.length} charts to "${newDocument.name}"`
            });
        }, charts.length * 50 + 100);
    };

    const handleRepairWithAI = async (brokenCode: string, error: string): Promise<string | null> => {
        try {
            setIsAiLoading(true);
            const response = await aiApi.generate(`Fix the syntax errors in this mermaid diagram. Error: ${error}`, brokenCode);
            if (response?.mermaid_code) {
                return cleanMermaidCode(response.mermaid_code);
            }
            return null;
        } catch (err) {
            console.error('AI repair failed:', err);
            return null;
        } finally {
            setIsAiLoading(false);
        }
    };

    // AI
    const cleanMermaidCode = (text: string): string => {
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
            const lines = cleaned.split('\n');
            if (lines[0].startsWith('```')) lines.shift();
            if (lines[lines.length - 1].startsWith('```')) lines.pop();
            cleaned = lines.join('\n').trim();
        }
        if (cleaned.toLowerCase().startsWith('mermaid')) {
            cleaned = cleaned.substring(7).trim();
        }
        return cleaned;
    };

    const handleAiGenerate = async (prompt?: string) => {
        const usePrompt = prompt || aiPrompt;
        if (!usePrompt.trim() || isAiLoading) return;

        setIsAiLoading(true);
        setAiError(null);

        try {
            const response = await aiApi.generate(usePrompt, code);
            if (response?.mermaid_code) {
                const newCode = cleanMermaidCode(response.mermaid_code);
                if (currentChartId) {
                    updateChartCode(newCode);
                    const editionId = Date.now().toString();
                    setProjects(prev => prev.map(p =>
                        p.id === currentProjectId
                            ? {
                                ...p,
                                charts: p.charts.map(c =>
                                    c.id === currentChartId
                                        ? {
                                            ...c,
                                            editions: [...c.editions, {
                                                id: editionId,
                                                code: newCode,
                                                description: response.edition_title || usePrompt,
                                                updatedAt: new Date().toISOString()
                                            }],
                                            currentEditionId: editionId
                                        }
                                        : c
                                )
                            }
                            : p
                    ));
                } else if (currentProjectId) {
                    createNewChart(currentProjectId, response.edition_title || 'AI Generated', newCode);
                }
                setAiPrompt('');
            }
        } catch (err: any) {
            setAiError(err.message || 'AI generation failed');
        } finally {
            setIsAiLoading(false);
        }
    };

    const exportCurrentChart = () => {
        if (!currentChart) return;
        const blob = new Blob([currentChart.code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentChart.name}.mmd`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const saveAll = async () => {
        // Save to localStorage immediately
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));

        // Sync to API with toast feedback
        const toastId = showToast({ type: 'loading', message: 'Syncing changes...' });

        try {
            setSyncStatus('syncing');
            setSaveMessage('Syncing...');
            await projectsApi.sync(projects);
            setSyncStatus('synced');
            setSaveMessage('Synced!');
            updateToast(toastId, { type: 'success', message: 'All changes synced!' });
        } catch (error) {
            console.error('Failed to sync:', error);
            setSyncStatus('error');
            setSaveMessage('Saved locally');
            updateToast(toastId, {
                type: 'warning',
                message: 'Saved locally - sync failed',
                action: { label: 'Retry', onClick: saveAll }
            });
        }
        setTimeout(() => setSaveMessage(null), 2000);
    };

    // Load disk projects list
    const loadDiskProjects = async () => {
        try {
            const projects = await mermaidDiskApi.listDiskProjects();
            setDiskProjects(projects);
        } catch (error) {
            console.error('Failed to load disk projects:', error);
        }
    };

    // Export current project to SSD
    const exportProjectToDisk = async () => {
        if (!currentProject) return;
        setIsExporting(true);
        try {
            const result = await mermaidDiskApi.exportToDisk(currentProject.id);
            showToast({ type: 'success', message: `Exported "${result.name}" to SSD (${result.chart_files.length} charts)` });
            loadDiskProjects();
        } catch (error) {
            showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to export' });
        } finally {
            setIsExporting(false);
        }
    };

    // Import project from SSD
    const importProjectFromDisk = async (folderName: string) => {
        setIsImporting(true);
        try {
            const imported = await mermaidDiskApi.importFromDisk(folderName);
            // Add to local state
            const newProject: Project = {
                id: imported.id,
                name: imported.name,
                charts: imported.charts.map((c: any) => ({
                    ...c,
                    editions: c.editions || [],
                    currentEditionId: c.currentEditionId || ''
                })),
                documents: imported.documents || [],
                createdAt: imported.createdAt,
                updatedAt: imported.updatedAt
            };
            setProjects(prev => [...prev, newProject]);
            setCurrentProjectId(newProject.id);
            if (newProject.charts.length > 0) {
                setCurrentChartId(newProject.charts[0].id);
                setCode(newProject.charts[0].code);
            }
            setShowDiskDialog(false);
            showToast({ type: 'success', message: `Imported "${imported.name}" from SSD` });
        } catch (error) {
            showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to import' });
        } finally {
            setIsImporting(false);
        }
    };

    // Delete disk project
    const deleteDiskProject = async (folderName: string) => {
        if (!confirm(`Delete "${folderName}" from SSD?`)) return;
        try {
            await mermaidDiskApi.deleteDiskProject(folderName);
            setDiskProjects(prev => prev.filter(p => p.name !== folderName));
            showToast({ type: 'success', message: 'Deleted from SSD' });
        } catch (error) {
            showToast({ type: 'error', message: 'Failed to delete' });
        }
    };

    const startRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditValue(currentName);
    };

    const finishRename = (type: 'project' | 'chart', projectId: string, chartId?: string) => {
        if (!editValue.trim()) { setEditingId(null); return; }
        if (type === 'project') {
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: editValue } : p));
        } else if (chartId) {
            setProjects(prev => prev.map(p =>
                p.id === projectId
                    ? { ...p, charts: p.charts.map(c => c.id === chartId ? { ...c, name: editValue } : c) }
                    : p
            ));
        }
        setEditingId(null);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="text-indigo-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Loading projects...</span>
                    </div>
                </div>
            )}

            {/* Header - Responsive */}
            <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-shrink">
                    <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg flex-shrink-0">
                        {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
                    </button>
                    <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                        Mermaid Studio
                    </h1>
                    {currentProject && <span className="text-xs sm:text-sm text-slate-500 truncate hidden sm:inline">/ {currentProject.name}</span>}
                    {currentChart && <span className="text-xs sm:text-sm text-slate-400 truncate hidden md:inline">/ {currentChart.name}</span>}
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Theme Selector */}
                    <div className="relative">
                        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg">
                            <Settings size={14} />
                            <span className="hidden sm:inline">Options</span>
                        </button>
                        {showSettings && (
                            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-3 space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Theme</label>
                                    <div className="grid grid-cols-3 gap-1 mt-1">
                                        {THEMES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${theme === t.id ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                                            >
                                                <div className="w-3 h-3 rounded-full border border-slate-500" style={{ background: t.bg }} />
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Layout Direction</label>
                                    <div className="grid grid-cols-3 gap-1 mt-1">
                                        {LAYOUTS.map(l => (
                                            <button key={l.id} onClick={() => changeLayout(l.id)} className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-indigo-600 rounded">
                                                <span>{l.icon}</span> {l.id}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-700">
                                    Scroll on diagram to zoom • Drag to pan
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={exportCurrentChart} disabled={!currentChart} className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg">
                        <Download size={14} /> <span className="hidden sm:inline">Export</span>
                    </button>

                    <button
                        onClick={() => { setShowDiskDialog(true); loadDiskProjects(); }}
                        className="flex items-center gap-1 px-1.5 sm:px-2 py-1.5 text-xs bg-slate-800 hover:bg-emerald-700 rounded-lg"
                        title="Save/Load from SSD"
                    >
                        <HardDrive size={14} /> <span className="hidden sm:inline">SSD</span>
                    </button>

                    {/* Sync Status Indicator */}
                    <div className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg" title={
                        syncStatus === 'synced' ? 'All changes synced to server' :
                            syncStatus === 'syncing' ? 'Syncing changes...' :
                                syncStatus === 'error' ? 'Sync failed - saved locally' :
                                    'Offline mode - changes saved locally'
                    }>
                        {syncStatus === 'synced' && <Cloud size={14} className="text-emerald-400" />}
                        {syncStatus === 'syncing' && <RefreshCcw size={14} className="text-blue-400 animate-spin" />}
                        {syncStatus === 'error' && <CloudOff size={14} className="text-amber-400" />}
                        {syncStatus === 'offline' && <CloudOff size={14} className="text-slate-500" />}
                        <span className={`${syncStatus === 'synced' ? 'text-emerald-400' :
                            syncStatus === 'syncing' ? 'text-blue-400' :
                                syncStatus === 'error' ? 'text-amber-400' :
                                    'text-slate-500'
                            }`}>
                            {syncStatus === 'synced' ? 'Synced' :
                                syncStatus === 'syncing' ? 'Syncing' :
                                    syncStatus === 'error' ? 'Error' :
                                        'Offline'}
                        </span>
                    </div>

                    <button onClick={saveAll} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                        {saveMessage ? <><Check size={14} /> {saveMessage}</> : <><Save size={14} /> Save</>}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {showSidebar && (
                    <div className="relative flex" style={{ width: sidebarWidth }}>
                        <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900 overflow-hidden">
                            {/* Projects Section */}
                            <div className="h-[160px] border-b border-slate-700 overflow-y-auto">
                                <div className="p-2 flex items-center justify-between border-b border-slate-800">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Projects</span>
                                    <button onClick={createNewProject} className="p-1 hover:bg-slate-700 rounded" title="New Project"><Plus size={14} /></button>
                                </div>
                                <div className="p-1">
                                    {projects.map(project => (
                                        <div key={project.id}>
                                            <div
                                                className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer group ${currentProjectId === project.id ? 'bg-indigo-900/40' : 'hover:bg-slate-800'}`}
                                                onClick={() => {
                                                    setCurrentProjectId(project.id);
                                                    setExpandedProjects(prev => {
                                                        const next = new Set(prev);
                                                        next.has(project.id) ? next.delete(project.id) : next.add(project.id);
                                                        return next;
                                                    });
                                                }}
                                            >
                                                {expandedProjects.has(project.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                <FolderOpen size={13} className="text-yellow-500" />
                                                {editingId === project.id ? (
                                                    <input className="flex-1 text-xs bg-slate-800 px-1 rounded" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => finishRename('project', project.id)} onKeyDown={e => e.key === 'Enter' && finishRename('project', project.id)} autoFocus onClick={e => e.stopPropagation()} />
                                                ) : (
                                                    <span className="flex-1 text-xs truncate" onDoubleClick={() => startRename(project.id, project.name)}>{project.name}</span>
                                                )}
                                                <span className="text-[10px] text-slate-500">{project.charts.length}</span>
                                                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                                                    <button onClick={e => { e.stopPropagation(); createNewChart(project.id); }} className="p-0.5 hover:bg-slate-600 rounded" title="Add Chart"><Plus size={10} /></button>
                                                    <button onClick={e => { e.stopPropagation(); deleteProject(project.id); }} className="p-0.5 hover:bg-red-900 rounded text-red-400"><Trash2 size={10} /></button>
                                                </div>
                                            </div>
                                            {expandedProjects.has(project.id) && (
                                                <div className="ml-2 border-l border-slate-800">
                                                    {/* Documents (Folders) */}
                                                    {project.documents.map(doc => (
                                                        <div key={doc.id}>
                                                            <div
                                                                className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer group ${currentDocumentId === doc.id ? 'bg-blue-800/50' : 'hover:bg-slate-800/50'}`}
                                                                onClick={() => {
                                                                    setCurrentProjectId(project.id);
                                                                    setCurrentDocumentId(doc.id);
                                                                    setCurrentChartId(null);
                                                                    setCode(doc.sourceMarkdown || '');
                                                                    setViewMode('markdown');
                                                                    setShowDocumentView(true);
                                                                }}
                                                            >
                                                                <div
                                                                    className="p-0.5 hover:bg-slate-700 rounded cursor-pointer transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedDocuments(prev => {
                                                                            const next = new Set(prev);
                                                                            next.has(doc.id) ? next.delete(doc.id) : next.add(doc.id);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                >
                                                                    {expandedDocuments.has(doc.id) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                                                </div>
                                                                <FileText size={11} className="text-blue-400" />
                                                                <span className="flex-1 text-[11px] truncate text-slate-300">{doc.name}</span>
                                                                <span className="text-[9px] text-slate-600">{project.charts.filter(c => c.documentId === doc.id).length}</span>
                                                                <button onClick={e => { e.stopPropagation(); deleteDocument(project.id, doc.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-900 rounded text-red-400"><Trash2 size={10} /></button>
                                                            </div>
                                                            {expandedDocuments.has(doc.id) && project.charts.filter(c => c.documentId === doc.id).map(chart => (
                                                                <div key={chart.id} className={`flex items-center gap-2 px-6 py-1 rounded cursor-pointer group ${currentChartId === chart.id ? 'bg-indigo-800/50' : 'hover:bg-slate-800/50'}`} onClick={() => { setCurrentProjectId(project.id); setCurrentChartId(chart.id); setCurrentDocumentId(null); setCode(chart.code); setViewMode('diagram'); setShowDocumentView(false); }}>
                                                                    <FileCode2 size={11} className="text-blue-400/70" />
                                                                    {editingId === chart.id ? (
                                                                        <input className="flex-1 text-[11px] bg-slate-800 px-1 rounded" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => finishRename('chart', project.id, chart.id)} onKeyDown={e => e.key === 'Enter' && finishRename('chart', project.id, chart.id)} autoFocus onClick={e => e.stopPropagation()} />
                                                                    ) : (
                                                                        <span className="flex-1 text-[11px] truncate text-slate-400" onDoubleClick={() => startRename(chart.id, chart.name)}>{chart.name}</span>
                                                                    )}
                                                                    <span className="text-[9px] text-slate-600">{chart.editions.length}v</span>
                                                                    <button onClick={e => { e.stopPropagation(); deleteChart(project.id, chart.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-900 rounded text-red-400"><Trash2 size={10} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}

                                                    {/* Standalone Charts */}
                                                    {project.charts.filter(c => !c.documentId).map(chart => (
                                                        <div key={chart.id} className={`flex items-center gap-2 px-5 py-1 rounded cursor-pointer group ${currentChartId === chart.id ? 'bg-indigo-800/50' : 'hover:bg-slate-800/50'}`} onClick={() => { setCurrentProjectId(project.id); setCurrentChartId(chart.id); setCurrentDocumentId(null); setCode(chart.code); setViewMode('diagram'); setShowDocumentView(false); }}>
                                                            <FileCode2 size={11} className="text-blue-400" />
                                                            {editingId === chart.id ? (
                                                                <input className="flex-1 text-xs bg-slate-800 px-1 rounded" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => finishRename('chart', project.id, chart.id)} onKeyDown={e => e.key === 'Enter' && finishRename('chart', project.id, chart.id)} autoFocus onClick={e => e.stopPropagation()} />
                                                            ) : (
                                                                <span className="flex-1 text-xs truncate" onDoubleClick={() => startRename(chart.id, chart.name)}>{chart.name}</span>
                                                            )}
                                                            <span className="text-[10px] text-slate-600">{chart.editions.length}v</span>
                                                            <button onClick={e => { e.stopPropagation(); deleteChart(project.id, chart.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-900 rounded text-red-400"><Trash2 size={10} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detected Content Banner */}
                            {detectedContent && !currentChartId && (
                                <div className={`p-2 border-b border-slate-700 ${detectedContent.type === 'markdown' ? 'bg-blue-900/30' : 'bg-emerald-900/30'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {detectedContent.type === 'markdown' ? <Search size={14} className="text-blue-400" /> : <Zap size={14} className="text-emerald-400" />}
                                            <span className="text-xs font-medium">{detectedContent.charts.length} diagram{detectedContent.charts.length > 1 ? 's' : ''} found</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {detectedContent.type === 'markdown' && (
                                                <button
                                                    onClick={() => setShowDocumentView(!showDocumentView)}
                                                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${showDocumentView ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                                >
                                                    <FileText size={12} /> Doc View
                                                </button>
                                            )}
                                            <button onClick={handleAddDetectedCharts} className={`flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded ${detectedContent.type === 'markdown' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                                <Plus size={12} /> Add All
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Editor Toolbar */}
                            <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => currentProjectId && createNewChart(currentProjectId)}
                                        disabled={!currentProjectId}
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white"
                                        title="Add new chart"
                                    >
                                        <Plus size={12} /> Chart
                                    </button>
                                    <button
                                        onClick={() => currentProjectId && createNewDocument(currentProjectId)}
                                        disabled={!currentProjectId}
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white"
                                        title="Add new note/document"
                                    >
                                        <FileText size={12} /> Note
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                                        title="Upload markdown or mermaid file"
                                    >
                                        <Upload size={12} /> Upload
                                    </button>
                                    {/* View Mode Toggle */}
                                    {currentDocumentId && (
                                        <div className="flex items-center gap-1 ml-2 bg-slate-800 rounded p-0.5">
                                            <button
                                                onClick={() => setViewMode('markdown')}
                                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${viewMode === 'markdown' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <FileText size={12} /> Markdown
                                            </button>
                                            <button
                                                onClick={() => setViewMode('diagram')}
                                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${viewMode === 'diagram' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <FileCode2 size={12} /> Diagram
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {currentChart && (
                                    <span className="text-xs text-slate-400 truncate max-w-[150px]" title={currentChart.name}>
                                        Editing: {currentChart.name}
                                    </span>
                                )}
                                {currentDocumentId && !currentChart && (
                                    <span className="text-xs text-blue-400 truncate max-w-[150px]" title={currentProject?.documents.find(d => d.id === currentDocumentId)?.name}>
                                        Editing: {currentProject?.documents.find(d => d.id === currentDocumentId)?.name}
                                    </span>
                                )}
                            </div>

                            {/* Code Editor */}
                            <div className="flex-1 min-h-0">
                                <Editor
                                    height="100%"
                                    defaultLanguage="markdown"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(value) => {
                                        const newValue = value || '';
                                        if (currentDocumentId && viewMode === 'markdown') {
                                            // Editing document markdown
                                            updateDocumentContent(newValue);
                                        } else if (currentChartId) {
                                            // Editing chart code
                                            updateChartCode(newValue);
                                        } else {
                                            // Just updating local state (pasted content, etc.)
                                            setCode(newValue);
                                        }
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 12,
                                        scrollBeyondLastLine: false,
                                        wordWrap: 'on',
                                        padding: { top: 8 },
                                        lineNumbers: viewMode === 'markdown' ? 'on' : 'off',
                                        renderLineHighlight: 'none'
                                    }}
                                />
                            </div>

                            {/* AI Section */}
                            <div className="border-t border-slate-700 p-2 space-y-2 bg-slate-900/80">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Sparkles size={12} className="text-purple-400" />
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">AI</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <input ref={fileInputRef} type="file" accept=".md,.mmd,.txt" onChange={handleFileUpload} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 rounded"><Upload size={10} /> Upload</button>
                                        {currentProjectId && <button onClick={() => createNewChart(currentProjectId)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 rounded"><Plus size={10} /> Chart</button>}
                                    </div>
                                </div>

                                <div className="flex gap-1">
                                    <button onClick={() => handleAiGenerate('Re-imagine with better layout')} disabled={isAiLoading} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] bg-slate-800 hover:bg-indigo-600 disabled:opacity-50 rounded"><Layout size={10} /> Layout</button>
                                    <button onClick={() => handleAiGenerate('Add colorful styling')} disabled={isAiLoading} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] bg-slate-800 hover:bg-purple-600 disabled:opacity-50 rounded"><Palette size={10} /> Style</button>
                                    <button onClick={() => handleAiGenerate('Fix syntax errors')} disabled={isAiLoading} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] bg-slate-800 hover:bg-emerald-600 disabled:opacity-50 rounded"><RefreshCw size={10} /> Fix</button>
                                </div>

                                {aiError && <div className="text-[10px] text-red-400 bg-red-900/20 px-2 py-1 rounded">{aiError}</div>}

                                <div className="relative">
                                    <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiGenerate()} placeholder="Describe what you want..." className="w-full px-2 py-1.5 pr-8 text-xs bg-slate-800 border border-slate-700 rounded focus:ring-1 focus:ring-purple-500" />
                                    <button onClick={() => handleAiGenerate()} disabled={isAiLoading || !aiPrompt.trim()} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded">
                                        {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Resize Handle */}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition-colors z-10"
                            onMouseDown={() => setIsResizing(true)}
                        />
                    </div>
                )}

                {/* Preview Panel */}
                <div ref={previewRef} className="flex-1 min-w-0 bg-slate-950 relative overflow-hidden">
                    {(showDocumentView && detectedContent?.type === 'markdown') || (currentDocumentId && viewMode === 'markdown') ? (
                        <MarkdownDocumentView
                            markdown={code}
                            documentName={currentDocumentId
                                ? currentProject?.documents?.find(d => d.id === currentDocumentId)?.name
                                : currentProject?.documents?.find(d => d.sourceMarkdown === code)?.name}
                            theme={theme}
                            themes={THEMES}
                            onThemeChange={setTheme}
                            onEditDiagram={handleEditDiagramFromDoc}
                            onAddChart={handleAddChartFromDoc}
                            onAddAllCharts={handleAddAllChartsFromDoc}
                            onRepairWithAI={handleRepairWithAI}
                            onClose={() => {
                                setShowDocumentView(false);
                                if (currentDocumentId) {
                                    setViewMode('diagram');
                                }
                            }}
                        />
                    ) : (
                        <iframe ref={iframeRef} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" title="Mermaid Preview" />
                    )}
                </div>
            </div>

            {/* SSD Storage Dialog */}
            {showDiskDialog && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-[480px] max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <HardDrive size={20} className="text-emerald-400" />
                                SSD Storage
                            </h3>
                            <button
                                onClick={() => setShowDiskDialog(false)}
                                className="p-1 hover:bg-slate-700 rounded"
                            >
                                <span className="text-slate-400">✕</span>
                            </button>
                        </div>

                        {/* Export Current Project */}
                        {currentProject && (
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">Export Current Project</p>
                                        <p className="text-xs text-slate-400">{currentProject.name} ({currentProject.charts.length} charts)</p>
                                    </div>
                                    <button
                                        onClick={exportProjectToDisk}
                                        disabled={isExporting}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
                                    >
                                        {isExporting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <FolderOutput size={16} />
                                        )}
                                        Export to SSD
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Saved Projects on SSD */}
                        <div className="p-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Projects on SSD</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {diskProjects.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500">
                                        <HardDrive size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No projects saved to SSD yet</p>
                                    </div>
                                ) : (
                                    diskProjects.map(project => (
                                        <div
                                            key={project.name}
                                            className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors group"
                                            onClick={() => importProjectFromDisk(project.name)}
                                        >
                                            <FolderOpen size={20} className="text-emerald-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{project.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {project.chart_count} charts • {project.document_count} docs
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteDiskProject(project.name); }}
                                                className="p-1.5 hover:bg-red-900/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete from SSD"
                                            >
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); importProjectFromDisk(project.name); }}
                                                disabled={isImporting}
                                                className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                                            >
                                                {isImporting ? <Loader2 size={12} className="animate-spin" /> : <FolderInput size={12} />}
                                                Import
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
                            Projects are stored at /data/mermaid-projects/ on the SSD
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
