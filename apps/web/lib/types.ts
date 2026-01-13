// Type definitions for the Mermaid Editor

export interface Edition {
    id: string;
    code: string;
    description: string;
    updatedAt: string;
}

export interface ChartMetadata {
    description?: string;
    aiAnalysis?: {
        diagramType?: string;
        entities?: string[];
        relationships?: string[];
        summary?: string;
    };
    source?: 'manual' | 'markdown' | 'ai';
    sourceFile?: string;
}

export interface Chart {
    id: string;
    projectId: string;
    documentId?: string; // Optional - charts can be standalone or in a document
    name: string;
    code: string;
    editions: Edition[];
    currentEditionId: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    metadata?: ChartMetadata;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentMetadata {
    tags?: string[];
    pinned?: boolean;
    source?: 'manual' | 'upload';
}

export interface Document {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    sourceMarkdown?: string; // Full markdown content (the "note" content)
    charts: Chart[]; // Extracted mermaid charts from the markdown
    metadata?: DocumentMetadata;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    documents: Document[];
    standaloneCharts: Chart[]; // Charts not in any document
    createdAt: string;
    updatedAt: string;
}

export interface ExtractedChart {
    name: string;
    code: string;
    lineNumber?: number;
    metadata?: ChartMetadata;
}

// Scientific Skills types
export interface Skill {
    name: string;
    category: string;
    description: string;
    parameters: Record<string, string>;
}

export interface SkillExecution {
    id: string;
    skill_name: string;
    command: string;
    output: string | null;
    error: string | null;
    status: 'running' | 'success' | 'failed';
    execution_time_ms: number | null;
    created_at: string;
}

export interface MCPStatus {
    running: boolean;
    pid: number | null;
    uptime_seconds: number;
    skills_count: number;
    execution_count: number;
    memory_mb: number;
}

