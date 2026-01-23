"""
Dashboard Generator - Auto-generates dashboards based on data analysis.

Creates Vega-Lite specifications that can be converted to Plotly for rendering.
Generates 5-10 meaningful visualizations based on data characteristics.
"""

import json
import logging
import os
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class WidgetSpec:
    """Specification for a dashboard widget."""
    id: str
    type: str  # "stat_card", "bar_chart", "line_chart", "histogram", "scatter", "pie_chart", "heatmap", "table", "mermaid"
    title: str
    description: str
    source_file: Optional[str] = None
    vega_lite_spec: Optional[Dict[str, Any]] = None
    plotly_spec: Optional[Dict[str, Any]] = None
    stat_value: Optional[str] = None
    stat_label: Optional[str] = None
    stat_change: Optional[str] = None
    table_data: Optional[List[Dict]] = None
    mermaid_code: Optional[str] = None
    layout: Dict[str, int] = field(default_factory=lambda: {"x": 0, "y": 0, "w": 4, "h": 3})

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class Dashboard:
    """Complete dashboard specification."""
    id: str
    name: str
    description: str
    created_at: str
    widgets: List[WidgetSpec]
    layout_cols: int = 12
    theme: str = "dark"

    def to_dict(self) -> dict:
        result = asdict(self)
        result['widgets'] = [w.to_dict() for w in self.widgets]
        return result


class DashboardGenerator:
    """
    Generates auto-dashboards from project metadata.

    Workflow:
    1. Analyze metadata to identify key metrics and patterns
    2. Select appropriate chart types for each insight
    3. Generate Vega-Lite/Plotly specs for visualizations
    4. Arrange widgets in a logical layout
    """

    # Chart type mappings
    CHART_COLORS = {
        'primary': '#06b6d4',   # cyan-500
        'secondary': '#10b981', # emerald-500
        'tertiary': '#8b5cf6',  # violet-500
        'quaternary': '#f59e0b', # amber-500
        'danger': '#ef4444',    # red-500
    }

    def __init__(self, project_dir: str):
        self.project_dir = project_dir
        self.dashboards_dir = os.path.join(project_dir, '.data-studio', 'dashboards')

    def _ensure_dirs(self):
        """Create dashboards directory if needed."""
        os.makedirs(self.dashboards_dir, exist_ok=True)

    def _create_stat_card(
        self,
        title: str,
        value: str,
        label: str,
        change: Optional[str] = None,
        source_file: Optional[str] = None
    ) -> WidgetSpec:
        """Create a stat card widget."""
        return WidgetSpec(
            id=f"stat-{uuid.uuid4().hex[:8]}",
            type="stat_card",
            title=title,
            description=f"Key metric: {label}",
            source_file=source_file,
            stat_value=value,
            stat_label=label,
            stat_change=change,
            layout={"x": 0, "y": 0, "w": 3, "h": 2}
        )

    def _create_histogram(
        self,
        column_name: str,
        file_name: str,
        title: Optional[str] = None
    ) -> WidgetSpec:
        """Create a histogram widget using Plotly spec."""
        return WidgetSpec(
            id=f"hist-{uuid.uuid4().hex[:8]}",
            type="histogram",
            title=title or f"Distribution of {column_name}",
            description=f"Histogram showing the distribution of {column_name}",
            source_file=file_name,
            plotly_spec={
                "data": [{
                    "type": "histogram",
                    "x": [],  # Will be populated with actual data
                    "marker": {"color": self.CHART_COLORS['primary']},
                    "name": column_name
                }],
                "layout": {
                    "title": {"text": title or f"Distribution of {column_name}", "font": {"color": "#e5e7eb"}},
                    "xaxis": {"title": column_name, "color": "#9ca3af"},
                    "yaxis": {"title": "Count", "color": "#9ca3af"},
                    "template": "plotly_dark",
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(31,41,55,0.5)",
                    "height": 350
                },
                "_column": column_name,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _create_bar_chart(
        self,
        x_column: str,
        y_column: Optional[str],
        aggregation: str,
        file_name: str,
        title: Optional[str] = None
    ) -> WidgetSpec:
        """Create a bar chart widget."""
        chart_title = title or (
            f"{y_column} by {x_column}" if y_column else f"{x_column} Count"
        )
        return WidgetSpec(
            id=f"bar-{uuid.uuid4().hex[:8]}",
            type="bar_chart",
            title=chart_title,
            description=f"Bar chart comparing {x_column}",
            source_file=file_name,
            plotly_spec={
                "data": [{
                    "type": "bar",
                    "x": [],
                    "y": [],
                    "marker": {"color": self.CHART_COLORS['primary']}
                }],
                "layout": {
                    "title": {"text": chart_title, "font": {"color": "#e5e7eb"}},
                    "xaxis": {"title": x_column, "color": "#9ca3af"},
                    "yaxis": {"title": aggregation.title() if aggregation != 'count' else "Count", "color": "#9ca3af"},
                    "template": "plotly_dark",
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(31,41,55,0.5)",
                    "height": 350
                },
                "_x_column": x_column,
                "_y_column": y_column,
                "_aggregation": aggregation,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _create_line_chart(
        self,
        x_column: str,
        y_column: str,
        file_name: str,
        title: Optional[str] = None
    ) -> WidgetSpec:
        """Create a line chart widget."""
        chart_title = title or f"{y_column} over {x_column}"
        return WidgetSpec(
            id=f"line-{uuid.uuid4().hex[:8]}",
            type="line_chart",
            title=chart_title,
            description=f"Line chart showing {y_column} trend",
            source_file=file_name,
            plotly_spec={
                "data": [{
                    "type": "scatter",
                    "mode": "lines+markers",
                    "x": [],
                    "y": [],
                    "line": {"color": self.CHART_COLORS['secondary']},
                    "marker": {"color": self.CHART_COLORS['secondary']}
                }],
                "layout": {
                    "title": {"text": chart_title, "font": {"color": "#e5e7eb"}},
                    "xaxis": {"title": x_column, "color": "#9ca3af"},
                    "yaxis": {"title": y_column, "color": "#9ca3af"},
                    "template": "plotly_dark",
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(31,41,55,0.5)",
                    "height": 350
                },
                "_x_column": x_column,
                "_y_column": y_column,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _create_pie_chart(
        self,
        column_name: str,
        file_name: str,
        title: Optional[str] = None
    ) -> WidgetSpec:
        """Create a pie chart widget."""
        chart_title = title or f"{column_name} Distribution"
        return WidgetSpec(
            id=f"pie-{uuid.uuid4().hex[:8]}",
            type="pie_chart",
            title=chart_title,
            description=f"Pie chart showing {column_name} breakdown",
            source_file=file_name,
            plotly_spec={
                "data": [{
                    "type": "pie",
                    "labels": [],
                    "values": [],
                    "hole": 0.4,
                    "marker": {
                        "colors": [
                            self.CHART_COLORS['primary'],
                            self.CHART_COLORS['secondary'],
                            self.CHART_COLORS['tertiary'],
                            self.CHART_COLORS['quaternary'],
                            "#6366f1", "#ec4899", "#14b8a6"
                        ]
                    }
                }],
                "layout": {
                    "title": {"text": chart_title, "font": {"color": "#e5e7eb"}},
                    "template": "plotly_dark",
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(31,41,55,0.5)",
                    "height": 350,
                    "showlegend": True,
                    "legend": {"font": {"color": "#9ca3af"}}
                },
                "_column": column_name,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 4, "h": 4}
        )

    def _create_scatter_plot(
        self,
        x_column: str,
        y_column: str,
        file_name: str,
        color_column: Optional[str] = None,
        title: Optional[str] = None
    ) -> WidgetSpec:
        """Create a scatter plot widget."""
        chart_title = title or f"{y_column} vs {x_column}"
        return WidgetSpec(
            id=f"scatter-{uuid.uuid4().hex[:8]}",
            type="scatter",
            title=chart_title,
            description=f"Scatter plot comparing {x_column} and {y_column}",
            source_file=file_name,
            plotly_spec={
                "data": [{
                    "type": "scatter",
                    "mode": "markers",
                    "x": [],
                    "y": [],
                    "marker": {
                        "color": self.CHART_COLORS['tertiary'],
                        "size": 8,
                        "opacity": 0.7
                    }
                }],
                "layout": {
                    "title": {"text": chart_title, "font": {"color": "#e5e7eb"}},
                    "xaxis": {"title": x_column, "color": "#9ca3af"},
                    "yaxis": {"title": y_column, "color": "#9ca3af"},
                    "template": "plotly_dark",
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(31,41,55,0.5)",
                    "height": 350
                },
                "_x_column": x_column,
                "_y_column": y_column,
                "_color_column": color_column,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _create_table_widget(
        self,
        columns: List[str],
        file_name: str,
        title: str,
        limit: int = 10
    ) -> WidgetSpec:
        """Create a data table widget."""
        return WidgetSpec(
            id=f"table-{uuid.uuid4().hex[:8]}",
            type="table",
            title=title,
            description=f"Sample data from {file_name}",
            source_file=file_name,
            plotly_spec={
                "_columns": columns,
                "_limit": limit,
                "_file": file_name
            },
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _create_overview_diagram(self, metadata: Dict) -> WidgetSpec:
        """Create a Mermaid diagram showing data structure."""
        files = metadata.get('files', {})
        if not files:
            return None

        # Build mermaid diagram
        lines = ["flowchart TB"]
        lines.append("    subgraph Project[Data Files]")

        for i, (filename, analysis) in enumerate(files.items()):
            safe_id = f"F{i}"
            row_count = analysis.get('row_count', 0)
            col_count = analysis.get('column_count', 0)
            lines.append(f'        {safe_id}["{filename}<br/>{row_count:,} rows, {col_count} cols"]')

        lines.append("    end")

        # Add cross-file relationships
        cross_insights = metadata.get('cross_file_insights', [])
        for insight in cross_insights:
            if insight.get('type') == 'joinable':
                file_list = list(files.keys())
                insight_files = insight.get('files', [])
                if len(insight_files) == 2:
                    try:
                        idx1 = file_list.index(insight_files[0])
                        idx2 = file_list.index(insight_files[1])
                        cols = ', '.join(insight.get('columns', [])[:2])
                        lines.append(f'    F{idx1} -.->|"{cols}"| F{idx2}')
                    except ValueError:
                        pass

        mermaid_code = "\n".join(lines)

        return WidgetSpec(
            id=f"diagram-{uuid.uuid4().hex[:8]}",
            type="mermaid",
            title="Data Structure Overview",
            description="Diagram showing data files and relationships",
            mermaid_code=mermaid_code,
            layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )

    def _arrange_layout(self, widgets: List[WidgetSpec]) -> List[WidgetSpec]:
        """Arrange widgets in a grid layout."""
        x, y = 0, 0
        row_height = 0

        for widget in widgets:
            w = widget.layout.get('w', 4)
            h = widget.layout.get('h', 3)

            # Check if widget fits in current row
            if x + w > 12:
                x = 0
                y += row_height
                row_height = 0

            widget.layout['x'] = x
            widget.layout['y'] = y

            x += w
            row_height = max(row_height, h)

        return widgets

    async def generate_dashboard(self, metadata: Dict, name: str = "default") -> Dashboard:
        """Generate a dashboard from project metadata."""
        self._ensure_dirs()

        widgets = []
        summary = metadata.get('summary', {})
        files = metadata.get('files', {})

        # 1. Overview stat cards
        total_files = summary.get('total_files', 0)
        total_rows = summary.get('total_rows', 0)
        total_columns = summary.get('total_columns', 0)

        widgets.append(self._create_stat_card(
            title="Total Files",
            value=str(total_files),
            label="Data files",
            source_file=None
        ))

        widgets.append(self._create_stat_card(
            title="Total Rows",
            value=f"{total_rows:,}",
            label="Records",
            source_file=None
        ))

        widgets.append(self._create_stat_card(
            title="Total Columns",
            value=str(total_columns),
            label="Features",
            source_file=None
        ))

        # Determine dominant theme
        themes = summary.get('themes', [])
        if themes:
            domain = summary.get('domain_detected', themes[0])
            widgets.append(self._create_stat_card(
                title="Domain",
                value=domain.split('/')[0].title() if domain else "General",
                label="Data type",
                source_file=None
            ))

        # 2. Data overview diagram
        diagram = self._create_overview_diagram(metadata)
        if diagram:
            widgets.append(diagram)

        # 3. Charts for each file based on suggested_charts
        charts_added = 0
        max_charts = 6  # Limit total charts

        for filename, analysis in files.items():
            if charts_added >= max_charts:
                break

            columns = analysis.get('columns', [])
            suggested = analysis.get('suggested_charts', [])

            # Get column info by name for quick lookup
            col_map = {c['name']: c for c in columns}

            for chart_suggestion in suggested:
                if charts_added >= max_charts:
                    break

                chart_type = chart_suggestion.get('type')

                if chart_type == 'histogram':
                    x_col = chart_suggestion.get('x')
                    if x_col:
                        widgets.append(self._create_histogram(
                            column_name=x_col,
                            file_name=filename,
                            title=chart_suggestion.get('title')
                        ))
                        charts_added += 1

                elif chart_type == 'bar':
                    x_col = chart_suggestion.get('x')
                    y_col = chart_suggestion.get('y')
                    agg = chart_suggestion.get('agg', 'count')
                    if x_col:
                        widgets.append(self._create_bar_chart(
                            x_column=x_col,
                            y_column=y_col,
                            aggregation=agg,
                            file_name=filename,
                            title=chart_suggestion.get('title')
                        ))
                        charts_added += 1

                elif chart_type == 'line':
                    x_col = chart_suggestion.get('x')
                    y_col = chart_suggestion.get('y')
                    if x_col and y_col:
                        widgets.append(self._create_line_chart(
                            x_column=x_col,
                            y_column=y_col,
                            file_name=filename,
                            title=chart_suggestion.get('title')
                        ))
                        charts_added += 1

                elif chart_type == 'pie':
                    values_col = chart_suggestion.get('values')
                    if values_col:
                        widgets.append(self._create_pie_chart(
                            column_name=values_col,
                            file_name=filename,
                            title=chart_suggestion.get('title')
                        ))
                        charts_added += 1

                elif chart_type == 'scatter':
                    x_col = chart_suggestion.get('x')
                    y_col = chart_suggestion.get('y')
                    if x_col and y_col:
                        widgets.append(self._create_scatter_plot(
                            x_column=x_col,
                            y_column=y_col,
                            file_name=filename,
                            title=chart_suggestion.get('title')
                        ))
                        charts_added += 1

        # 4. Sample data tables
        for filename, analysis in list(files.items())[:2]:  # Max 2 tables
            columns = analysis.get('columns', [])
            if columns:
                col_names = [c['name'] for c in columns[:8]]  # Limit columns
                widgets.append(self._create_table_widget(
                    columns=col_names,
                    file_name=filename,
                    title=f"Sample: {filename}"
                ))

        # Arrange layout
        widgets = self._arrange_layout(widgets)

        dashboard = Dashboard(
            id=name,
            name=name.replace('-', ' ').title(),
            description=f"Auto-generated dashboard for {summary.get('total_files', 0)} data files",
            created_at=datetime.utcnow().isoformat(),
            widgets=widgets
        )

        # Save dashboard
        dashboard_path = os.path.join(self.dashboards_dir, f"{name}.json")
        with open(dashboard_path, 'w') as f:
            json.dump(dashboard.to_dict(), f, indent=2)

        logger.info(f"Generated dashboard '{name}' with {len(widgets)} widgets")
        return dashboard

    def get_dashboard(self, name: str) -> Optional[Dashboard]:
        """Load a saved dashboard."""
        dashboard_path = os.path.join(self.dashboards_dir, f"{name}.json")
        if os.path.exists(dashboard_path):
            try:
                with open(dashboard_path, 'r') as f:
                    data = json.load(f)
                return data  # Return as dict for simplicity
            except Exception as e:
                logger.error(f"Error loading dashboard '{name}': {e}")
        return None

    def list_dashboards(self) -> List[Dict]:
        """List all saved dashboards."""
        self._ensure_dirs()
        dashboards = []

        for filename in os.listdir(self.dashboards_dir):
            if filename.endswith('.json'):
                dashboard_path = os.path.join(self.dashboards_dir, filename)
                try:
                    with open(dashboard_path, 'r') as f:
                        data = json.load(f)
                    dashboards.append({
                        'id': filename[:-5],
                        'name': data.get('name', filename[:-5]),
                        'widget_count': len(data.get('widgets', [])),
                        'created_at': data.get('created_at')
                    })
                except Exception as e:
                    logger.error(f"Error reading dashboard {filename}: {e}")

        return dashboards

    def save_dashboard(self, dashboard: Dict) -> str:
        """Save a dashboard (for NLP edits)."""
        self._ensure_dirs()

        dashboard_id = dashboard.get('id', f"custom-{uuid.uuid4().hex[:8]}")
        dashboard['id'] = dashboard_id

        if 'created_at' not in dashboard:
            dashboard['created_at'] = datetime.utcnow().isoformat()
        dashboard['updated_at'] = datetime.utcnow().isoformat()

        dashboard_path = os.path.join(self.dashboards_dir, f"{dashboard_id}.json")
        with open(dashboard_path, 'w') as f:
            json.dump(dashboard, f, indent=2)

        return dashboard_id

    def delete_dashboard(self, dashboard_id: str) -> bool:
        """Delete a dashboard."""
        dashboard_path = os.path.join(self.dashboards_dir, f"{dashboard_id}.json")
        if os.path.exists(dashboard_path):
            os.remove(dashboard_path)
            return True
        return False
