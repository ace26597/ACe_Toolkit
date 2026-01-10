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

export interface Project {
    id: string;
    name: string;
    description?: string;
    charts: Chart[];
    createdAt: string;
    updatedAt: string;
}

export interface ExtractedChart {
    name: string;
    code: string;
    lineNumber?: number;
    metadata?: ChartMetadata;
}
