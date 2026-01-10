"use client";

import React, { useEffect, useCallback, forwardRef } from 'react';

interface MermaidPreviewProps {
    code: string;
    theme: string;
    isDraggingWidth?: boolean;
    onEdit?: (oldText: string) => void;
    renderError: string | null;
    setRenderError: (error: string | null) => void;
}

const MermaidPreview = forwardRef<HTMLIFrameElement, MermaidPreviewProps>(({
    code,
    theme,
    isDraggingWidth,
    onEdit,
    renderError,
    setRenderError
}, ref) => {

    const renderDiagram = useCallback(async () => {
        // ref here is the iframe ref passed from parent
        const iframe = (ref as React.MutableRefObject<HTMLIFrameElement>)?.current;
        if (!iframe || !code.trim()) return;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: ${bgColor}; font-family: sans-serif; user-select: none; }
        #container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform-origin: 0 0; cursor: grab; }
        #container:active { cursor: grabbing; }
        svg { max-width: none; height: auto; }
        .error { color: #ef4444; font-family: monospace; white-space: pre-wrap; padding: 20px; }
        .node, .edgeLabel { cursor: pointer; transition: opacity 0.2s; }
        .node:hover, .edgeLabel:hover { opacity: 0.8; }
    </style>
</head>
<body>
    <div id="container"><div id="output">Rendering...</div></div>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.2.0/dist/mermaid-layout-elk.esm.min.mjs';

        const container = document.getElementById('container');
        const output = document.getElementById('output');
        
        let state = { scale: 1, pX: 0, pY: 0 };
        let isDragging = false;
        let startX = 0, startY = 0;

        const updateTransform = () => {
            container.style.transform = \`translate(\${state.pX}px, \${state.pY}px) scale(\${state.scale})\`;
        };

        window.addEventListener('wheel', (e) => {
            e.preventDefault();
            const xs = (e.clientX - state.pX) / state.scale;
            const ys = (e.clientY - state.pY) / state.scale;
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.1 : 0.9;
            const newScale = Math.min(Math.max(state.scale * factor, 0.1), 5);
            state.pX = e.clientX - xs * newScale;
            state.pY = e.clientY - ys * newScale;
            state.scale = newScale;
            updateTransform();
        }, { passive: false });

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node') || e.target.closest('.edgeLabel')) return;
            isDragging = true;
            startX = e.clientX - state.pX;
            startY = e.clientY - state.pY;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            state.pX = e.clientX - startX;
            state.pY = e.clientY - startY;
            updateTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'grab';
        });

        document.addEventListener('click', (e) => {
            const node = e.target.closest('.node') || e.target.closest('.edgeLabel');
            if (node) {
                const text = node.textContent.trim();
                window.top.postMessage({ type: 'MERMAID_EDIT', text: text }, '*');
            }
        });

        try {
            mermaid.registerLayoutLoaders(elkLayouts);
            mermaid.initialize({
                startOnLoad: false,
                theme: '${theme}',
                logLevel: 5,
                securityLevel: 'loose',
                flowchart: { useMaxWidth: false, htmlLabels: true }
            });

            const code = \`${code.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
            const { svg } = await mermaid.render('graphDiv', code);
            output.innerHTML = svg;
            
        } catch (e) {
            let errorMsg = e.message;
            if (code.trim().search(/^[\\s\\S]+\\n---/) !== -1 && (code.includes('config:') || code.includes('init:'))) {
                 errorMsg += '\\n\\n💡 HINT: It looks like you have a configuration block (---). Make sure it is at the very top of the editor, before any graph definitions.';
            }
            output.innerHTML = '<div class="error">' + errorMsg + '</div>';
            console.error('Iframe Render Error:', e);
        }
    </script>
</body>
</html>`;

        try {
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
            setRenderError(null);
        } catch (e: any) {
            console.error('Mermaid iframe write error:', e);
            setRenderError(e.message);
        }
    }, [code, theme, setRenderError, ref]);

    useEffect(() => {
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [renderDiagram]);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'MERMAID_EDIT' && e.data?.text && onEdit) {
                onEdit(e.data.text);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onEdit]);

    return (
        <div className="h-full flex flex-col relative" style={{ backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff' }}>
            {renderError && (
                <div className="absolute top-4 left-4 right-4 z-10 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded shadow-sm">
                    <p className="text-red-800 dark:text-red-300 font-semibold text-sm flex items-center gap-2">⚠️ Syntax Error</p>
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1 whitespace-pre-wrap font-mono">{renderError}</p>
                </div>
            )}
            {isDraggingWidth && <div className="absolute inset-0 z-40 bg-transparent" />}
            <iframe
                ref={ref}
                className="flex-1 w-full h-full border-0 block"
                sandbox="allow-scripts allow-modals allow-same-origin"
                title="Mermaid Preview"
            />
        </div>
    );
});

MermaidPreview.displayName = 'MermaidPreview';

export default MermaidPreview;
