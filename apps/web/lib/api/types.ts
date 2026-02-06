// Shared types used across multiple API modules

export interface DashboardInfo {
    id: string;
    name: string;
    widget_count: number;
    updated_at: string;
}

export interface DashboardLayout {
    name: string;
    widgets: DashboardWidget[];
    created_at?: string;
    updated_at?: string;
}

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'table' | 'code' | 'mermaid' | 'stat_card' | 'bar_chart' | 'line_chart' | 'histogram' | 'scatter' | 'pie_chart' | 'heatmap';
    data: any;
    layout: { x: number; y: number; w: number; h: number };
    title?: string;
    description?: string;
    source_file?: string;
    plotly_spec?: any;
    plotly?: any;  // Alternate field name from Claude
    vega_lite_spec?: any;
    stat_value?: string;
    stat_label?: string;
    value?: string;     // Alternate field name from Claude
    subtitle?: string;  // Alternate field name from Claude
    mermaid_code?: string;
}
