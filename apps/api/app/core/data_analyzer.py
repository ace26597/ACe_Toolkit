"""
Data Analyzer - Smart metadata extraction for any data type.

Analyzes CSV, JSON, Excel, and other data files to extract:
- Column-level statistics and types
- Data quality metrics
- Patterns and insights
- Visualization recommendations
"""

import json
import logging
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import hashlib

logger = logging.getLogger(__name__)


@dataclass
class ColumnInfo:
    """Analysis of a single column."""
    name: str
    dtype: str  # "numerical", "categorical", "temporal", "text", "identifier", "boolean"
    original_dtype: str  # Original pandas/numpy dtype
    unique_count: int
    null_count: int
    null_percentage: float
    sample_values: List[Any]

    # Numerical stats (optional)
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    median_value: Optional[float] = None
    std_value: Optional[float] = None
    distribution: Optional[str] = None  # "normal", "skewed_left", "skewed_right", "uniform", "bimodal"

    # Categorical stats (optional)
    categories: Optional[List[str]] = None
    category_counts: Optional[Dict[str, int]] = None

    # Text stats (optional)
    avg_length: Optional[float] = None
    max_length: Optional[int] = None

    # Temporal stats (optional)
    min_date: Optional[str] = None
    max_date: Optional[str] = None
    date_range_days: Optional[int] = None

    # Suggested visualizations
    suggested_viz: List[str] = field(default_factory=list)
    suggested_role: Optional[str] = None  # "primary_key", "foreign_key", "label", "target", "feature"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FileAnalysis:
    """Complete analysis of a single file."""
    filename: str
    file_path: str
    file_type: str  # "csv", "json", "xlsx", "parquet", etc.
    file_size: int
    analyzed_at: str

    # Structure
    row_count: int
    column_count: int
    columns: List[ColumnInfo]

    # Quality
    total_null_cells: int
    null_percentage: float
    duplicate_rows: int

    # Sample data
    sample_data: List[Dict[str, Any]]

    # Insights
    insights: List[str]
    data_themes: List[str]  # e.g., "financial", "healthcare", "temporal", "geographic"

    # Suggestions
    suggested_charts: List[Dict[str, Any]]

    def to_dict(self) -> dict:
        result = asdict(self)
        result['columns'] = [col.to_dict() if isinstance(col, ColumnInfo) else col for col in self.columns]
        return result


@dataclass
class ProjectMetadata:
    """Aggregated metadata for all files in a project."""
    project_name: str
    analyzed_at: str
    analysis_version: str = "1.0"

    # Summary
    total_files: int = 0
    total_rows: int = 0
    total_columns: int = 0
    primary_data_type: str = "unknown"  # "tabular_numerical", "tabular_mixed", "text", "temporal"
    themes: List[str] = field(default_factory=list)
    domain_detected: Optional[str] = None  # "healthcare", "financial", "scientific", etc.

    # Per-file analyses
    file_analyses: Dict[str, FileAnalysis] = field(default_factory=dict)

    # Cross-file insights
    cross_file_insights: List[Dict[str, Any]] = field(default_factory=list)
    common_columns: List[str] = field(default_factory=list)

    # Dashboard recommendation
    recommended_charts: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        result = {
            'project_name': self.project_name,
            'analyzed_at': self.analyzed_at,
            'analysis_version': self.analysis_version,
            'summary': {
                'total_files': self.total_files,
                'total_rows': self.total_rows,
                'total_columns': self.total_columns,
                'primary_data_type': self.primary_data_type,
                'themes': self.themes,
                'domain_detected': self.domain_detected,
            },
            'files': {k: v.to_dict() if isinstance(v, FileAnalysis) else v for k, v in self.file_analyses.items()},
            'cross_file_insights': self.cross_file_insights,
            'common_columns': self.common_columns,
            'recommended_charts': self.recommended_charts,
        }
        return result


class DataAnalyzer:
    """
    Analyzes data files to extract metadata, statistics, and insights.

    Supports:
    - CSV/TSV files
    - JSON/JSONL files
    - Excel files (xlsx, xls)
    - Parquet files
    """

    SUPPORTED_EXTENSIONS = {'.csv', '.tsv', '.json', '.jsonl', '.xlsx', '.xls', '.parquet'}
    MAX_SAMPLE_ROWS = 1000  # Maximum rows to load for analysis
    MAX_SAMPLE_VALUES = 10  # Sample values to store per column

    def __init__(self, project_dir: str):
        self.project_dir = project_dir
        self.analysis_dir = os.path.join(project_dir, '.analysis')
        self.file_analyses_dir = os.path.join(self.analysis_dir, 'file_analyses')

    def _ensure_dirs(self):
        """Create analysis directories if needed."""
        os.makedirs(self.analysis_dir, exist_ok=True)
        os.makedirs(self.file_analyses_dir, exist_ok=True)

    def _get_data_files(self) -> List[str]:
        """Find all data files in the project."""
        data_files = []
        skip_dirs = {'.claude', '.data-studio', '.analysis', '.git', '__pycache__', 'node_modules', '.venv'}

        for root, dirs, files in os.walk(self.project_dir):
            # Skip hidden and system directories
            dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith('.')]

            for filename in files:
                if filename.startswith('.'):
                    continue
                ext = os.path.splitext(filename)[1].lower()
                if ext in self.SUPPORTED_EXTENSIONS:
                    data_files.append(os.path.join(root, filename))

        return data_files

    def _detect_column_type(self, series, col_name: str) -> str:
        """Detect the semantic type of a column."""
        import pandas as pd
        import numpy as np

        # Check original dtype
        dtype_str = str(series.dtype)

        # Datetime types
        if pd.api.types.is_datetime64_any_dtype(series):
            return "temporal"

        # Boolean
        if pd.api.types.is_bool_dtype(series):
            return "boolean"

        # Numeric types
        if pd.api.types.is_numeric_dtype(series):
            # Check if it's likely an identifier
            unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
            if unique_ratio > 0.9 and series.nunique() > 10:
                # High uniqueness, likely an ID
                if any(id_hint in col_name.lower() for id_hint in ['id', 'key', 'code', 'num']):
                    return "identifier"
            return "numerical"

        # Object/string types
        if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
            # Try to parse as datetime
            try:
                sample = series.dropna().head(100)
                if len(sample) > 0:
                    pd.to_datetime(sample, infer_datetime_format=True)
                    return "temporal"
            except:
                pass

            # Check cardinality
            unique_count = series.nunique()
            total_count = len(series.dropna())

            if total_count == 0:
                return "text"

            unique_ratio = unique_count / total_count

            # High cardinality with ID-like name
            if unique_ratio > 0.9 and any(id_hint in col_name.lower() for id_hint in ['id', 'key', 'code']):
                return "identifier"

            # Low cardinality = categorical
            if unique_count <= 20 or unique_ratio < 0.05:
                return "categorical"

            # Medium cardinality - check average length
            avg_len = series.dropna().astype(str).str.len().mean()
            if avg_len > 50:
                return "text"
            elif unique_ratio > 0.5:
                return "identifier"
            else:
                return "categorical"

        return "text"

    def _suggest_visualizations(self, col_info: ColumnInfo, all_columns: List[ColumnInfo]) -> List[str]:
        """Suggest appropriate visualizations for a column."""
        suggestions = []

        if col_info.dtype == "numerical":
            suggestions.append("histogram")
            suggestions.append("box_plot")
            # If there's a temporal column, suggest line chart
            if any(c.dtype == "temporal" for c in all_columns if c.name != col_info.name):
                suggestions.append("line_chart")
            # If there's a categorical column, suggest grouped bar
            if any(c.dtype == "categorical" for c in all_columns if c.name != col_info.name):
                suggestions.append("grouped_bar")

        elif col_info.dtype == "categorical":
            suggestions.append("bar_chart")
            if col_info.unique_count <= 6:
                suggestions.append("pie_chart")
            suggestions.append("treemap")

        elif col_info.dtype == "temporal":
            suggestions.append("line_chart")
            suggestions.append("area_chart")

        elif col_info.dtype == "text":
            suggestions.append("word_cloud")
            suggestions.append("table")

        return suggestions

    def _detect_distribution(self, series) -> Optional[str]:
        """Detect the distribution shape of a numerical column."""
        try:
            clean = series.dropna()
            if len(clean) < 10:
                return None

            # Try to use scipy for skewness, fall back to simple heuristic
            try:
                from scipy import stats
                skewness = stats.skew(clean)
            except ImportError:
                # Simple skewness approximation without scipy
                mean = clean.mean()
                median = clean.median()
                std = clean.std()
                if std == 0:
                    return "uniform"
                skewness = 3 * (mean - median) / std

            if abs(skewness) < 0.5:
                return "normal"
            elif skewness > 1:
                return "skewed_right"
            elif skewness < -1:
                return "skewed_left"
            else:
                return "moderate_skew"
        except:
            return None

    def _generate_insights(self, df, columns: List[ColumnInfo]) -> List[str]:
        """Generate human-readable insights about the data."""
        insights = []

        # Row count insight
        row_count = len(df)
        if row_count < 100:
            insights.append(f"Small dataset with {row_count} rows - suitable for detailed analysis")
        elif row_count < 10000:
            insights.append(f"Medium dataset with {row_count:,} rows")
        else:
            insights.append(f"Large dataset with {row_count:,} rows - consider sampling for visualizations")

        # Null values insight
        total_nulls = df.isnull().sum().sum()
        null_pct = (total_nulls / (row_count * len(df.columns))) * 100 if row_count > 0 else 0
        if null_pct > 10:
            insights.append(f"Data quality concern: {null_pct:.1f}% missing values")
        elif null_pct > 0:
            insights.append(f"Minor missing data: {null_pct:.1f}% null values")
        else:
            insights.append("Complete data: no missing values detected")

        # Column type distribution
        type_counts = {}
        for col in columns:
            type_counts[col.dtype] = type_counts.get(col.dtype, 0) + 1

        if type_counts.get('numerical', 0) > 3:
            insights.append(f"Rich numerical data: {type_counts.get('numerical', 0)} numeric columns suitable for statistical analysis")
        if type_counts.get('categorical', 0) > 2:
            insights.append(f"Multiple categorical variables: {type_counts.get('categorical', 0)} columns for grouping and segmentation")
        if type_counts.get('temporal', 0) > 0:
            insights.append("Time series data detected - suitable for trend analysis")

        # High cardinality warnings
        high_cardinality = [c for c in columns if c.dtype == 'categorical' and c.unique_count > 50]
        if high_cardinality:
            insights.append(f"High cardinality in {len(high_cardinality)} categorical columns - consider grouping for visualizations")

        return insights

    def _detect_themes(self, df, columns: List[ColumnInfo], filename: str) -> List[str]:
        """Detect data themes/domains based on column names and content."""
        themes = []
        col_names_lower = [c.name.lower() for c in columns]
        all_names = ' '.join(col_names_lower + [filename.lower()])

        # Healthcare/Clinical
        healthcare_keywords = ['patient', 'diagnosis', 'treatment', 'drug', 'clinical', 'trial', 'dose', 'symptom', 'disease', 'medical', 'health']
        if any(kw in all_names for kw in healthcare_keywords):
            themes.append('healthcare')

        # Financial
        financial_keywords = ['price', 'revenue', 'cost', 'profit', 'sales', 'transaction', 'payment', 'invoice', 'budget', 'expense', 'income']
        if any(kw in all_names for kw in financial_keywords):
            themes.append('financial')

        # Geographic
        geo_keywords = ['country', 'city', 'state', 'region', 'location', 'address', 'zip', 'latitude', 'longitude', 'geo']
        if any(kw in all_names for kw in geo_keywords):
            themes.append('geographic')

        # Customer/Marketing
        marketing_keywords = ['customer', 'user', 'campaign', 'channel', 'conversion', 'click', 'impression', 'segment', 'churn']
        if any(kw in all_names for kw in marketing_keywords):
            themes.append('marketing')

        # Scientific
        science_keywords = ['experiment', 'sample', 'measurement', 'observation', 'hypothesis', 'variable', 'control', 'result']
        if any(kw in all_names for kw in science_keywords):
            themes.append('scientific')

        # Time series
        if any(c.dtype == 'temporal' for c in columns):
            themes.append('temporal')

        return themes if themes else ['general']

    def _suggest_charts(self, columns: List[ColumnInfo], row_count: int) -> List[Dict[str, Any]]:
        """Generate specific chart suggestions based on the data."""
        suggestions = []

        numerical_cols = [c for c in columns if c.dtype == 'numerical']
        categorical_cols = [c for c in columns if c.dtype == 'categorical']
        temporal_cols = [c for c in columns if c.dtype == 'temporal']

        # Distribution charts for numerical columns
        for col in numerical_cols[:3]:  # Limit to first 3
            suggestions.append({
                'type': 'histogram',
                'x': col.name,
                'title': f'Distribution of {col.name}',
                'priority': 'high' if col.std_value and col.std_value > 0 else 'medium'
            })

        # Bar charts for categorical columns
        for col in categorical_cols[:2]:  # Limit to first 2
            if col.unique_count <= 15:
                suggestions.append({
                    'type': 'bar',
                    'x': col.name,
                    'agg': 'count',
                    'title': f'{col.name} Distribution',
                    'priority': 'high'
                })

        # Pie chart for low-cardinality categorical
        pie_candidates = [c for c in categorical_cols if c.unique_count <= 6]
        if pie_candidates:
            col = pie_candidates[0]
            suggestions.append({
                'type': 'pie',
                'values': col.name,
                'title': f'{col.name} Breakdown',
                'priority': 'medium'
            })

        # Time series if temporal column exists
        if temporal_cols and numerical_cols:
            suggestions.append({
                'type': 'line',
                'x': temporal_cols[0].name,
                'y': numerical_cols[0].name,
                'title': f'{numerical_cols[0].name} over Time',
                'priority': 'high'
            })

        # Scatter plot for two numerical columns
        if len(numerical_cols) >= 2:
            suggestions.append({
                'type': 'scatter',
                'x': numerical_cols[0].name,
                'y': numerical_cols[1].name,
                'title': f'{numerical_cols[0].name} vs {numerical_cols[1].name}',
                'priority': 'medium'
            })

        # Grouped bar if both categorical and numerical
        if categorical_cols and numerical_cols:
            suggestions.append({
                'type': 'bar',
                'x': categorical_cols[0].name,
                'y': numerical_cols[0].name,
                'agg': 'mean',
                'title': f'Average {numerical_cols[0].name} by {categorical_cols[0].name}',
                'priority': 'high'
            })

        return sorted(suggestions, key=lambda x: 0 if x['priority'] == 'high' else 1)[:8]

    async def analyze_file(self, file_path: str) -> FileAnalysis:
        """Analyze a single data file."""
        import pandas as pd
        import numpy as np

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        file_size = os.path.getsize(file_path)

        logger.info(f"Analyzing file: {filename}")

        # Load data based on file type
        df = None
        try:
            if ext == '.csv':
                df = pd.read_csv(file_path, nrows=self.MAX_SAMPLE_ROWS)
            elif ext == '.tsv':
                df = pd.read_csv(file_path, sep='\t', nrows=self.MAX_SAMPLE_ROWS)
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path, nrows=self.MAX_SAMPLE_ROWS)
            elif ext == '.json':
                df = pd.read_json(file_path)
                if len(df) > self.MAX_SAMPLE_ROWS:
                    df = df.head(self.MAX_SAMPLE_ROWS)
            elif ext == '.jsonl':
                df = pd.read_json(file_path, lines=True, nrows=self.MAX_SAMPLE_ROWS)
            elif ext == '.parquet':
                df = pd.read_parquet(file_path)
                if len(df) > self.MAX_SAMPLE_ROWS:
                    df = df.head(self.MAX_SAMPLE_ROWS)
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
            # Return minimal analysis for failed files
            return FileAnalysis(
                filename=filename,
                file_path=file_path,
                file_type=ext[1:],
                file_size=file_size,
                analyzed_at=datetime.utcnow().isoformat(),
                row_count=0,
                column_count=0,
                columns=[],
                total_null_cells=0,
                null_percentage=0,
                duplicate_rows=0,
                sample_data=[],
                insights=[f"Error loading file: {str(e)}"],
                data_themes=['unknown'],
                suggested_charts=[]
            )

        if df is None or df.empty:
            return FileAnalysis(
                filename=filename,
                file_path=file_path,
                file_type=ext[1:],
                file_size=file_size,
                analyzed_at=datetime.utcnow().isoformat(),
                row_count=0,
                column_count=0,
                columns=[],
                total_null_cells=0,
                null_percentage=0,
                duplicate_rows=0,
                sample_data=[],
                insights=["Empty or invalid data file"],
                data_themes=['unknown'],
                suggested_charts=[]
            )

        # Analyze columns
        columns = []
        for col_name in df.columns:
            series = df[col_name]
            col_type = self._detect_column_type(series, col_name)

            col_info = ColumnInfo(
                name=col_name,
                dtype=col_type,
                original_dtype=str(series.dtype),
                unique_count=int(series.nunique()),
                null_count=int(series.isnull().sum()),
                null_percentage=float(series.isnull().sum() / len(series) * 100) if len(series) > 0 else 0,
                sample_values=series.dropna().head(self.MAX_SAMPLE_VALUES).tolist()
            )

            # Add type-specific stats
            if col_type == 'numerical':
                try:
                    col_info.min_value = float(series.min())
                    col_info.max_value = float(series.max())
                    col_info.mean_value = float(series.mean())
                    col_info.median_value = float(series.median())
                    col_info.std_value = float(series.std())
                    col_info.distribution = self._detect_distribution(series)
                except:
                    pass

            elif col_type == 'categorical':
                value_counts = series.value_counts()
                col_info.categories = value_counts.head(20).index.tolist()
                col_info.category_counts = value_counts.head(20).to_dict()

            elif col_type == 'text':
                try:
                    lengths = series.dropna().astype(str).str.len()
                    col_info.avg_length = float(lengths.mean())
                    col_info.max_length = int(lengths.max())
                except:
                    pass

            elif col_type == 'temporal':
                try:
                    dates = pd.to_datetime(series, errors='coerce')
                    col_info.min_date = str(dates.min())
                    col_info.max_date = str(dates.max())
                    col_info.date_range_days = int((dates.max() - dates.min()).days)
                except:
                    pass

            columns.append(col_info)

        # Add visualization suggestions
        for col in columns:
            col.suggested_viz = self._suggest_visualizations(col, columns)

        # Calculate quality metrics
        total_null_cells = int(df.isnull().sum().sum())
        total_cells = len(df) * len(df.columns)
        null_percentage = (total_null_cells / total_cells * 100) if total_cells > 0 else 0
        duplicate_rows = int(df.duplicated().sum())

        # Generate insights
        insights = self._generate_insights(df, columns)
        themes = self._detect_themes(df, columns, filename)
        suggested_charts = self._suggest_charts(columns, len(df))

        # Get sample data
        sample_data = df.head(10).to_dict(orient='records')
        # Clean sample data (convert numpy types to native Python)
        for row in sample_data:
            for k, v in row.items():
                if pd.isna(v):
                    row[k] = None
                elif hasattr(v, 'item'):  # numpy type
                    row[k] = v.item()

        return FileAnalysis(
            filename=filename,
            file_path=file_path,
            file_type=ext[1:],
            file_size=file_size,
            analyzed_at=datetime.utcnow().isoformat(),
            row_count=len(df),
            column_count=len(df.columns),
            columns=columns,
            total_null_cells=total_null_cells,
            null_percentage=null_percentage,
            duplicate_rows=duplicate_rows,
            sample_data=sample_data,
            insights=insights,
            data_themes=themes,
            suggested_charts=suggested_charts
        )

    def _find_cross_file_insights(self, analyses: Dict[str, FileAnalysis]) -> List[Dict[str, Any]]:
        """Find relationships and patterns across multiple files."""
        insights = []
        file_columns = {}

        # Collect column names per file
        for filename, analysis in analyses.items():
            file_columns[filename] = {col.name.lower(): col for col in analysis.columns}

        # Find common columns (potential join keys)
        if len(file_columns) > 1:
            files = list(file_columns.keys())
            for i in range(len(files)):
                for j in range(i + 1, len(files)):
                    common = set(file_columns[files[i]].keys()) & set(file_columns[files[j]].keys())
                    # Filter to likely join keys (identifiers or categorical with reasonable cardinality)
                    join_candidates = []
                    for col_name in common:
                        col1 = file_columns[files[i]].get(col_name)
                        col2 = file_columns[files[j]].get(col_name)
                        if col1 and col2:
                            if col1.dtype in ['identifier', 'categorical'] or col2.dtype in ['identifier', 'categorical']:
                                join_candidates.append(col_name)

                    if join_candidates:
                        insights.append({
                            'type': 'joinable',
                            'files': [files[i], files[j]],
                            'columns': join_candidates,
                            'description': f"Files '{files[i]}' and '{files[j]}' can potentially be joined on: {', '.join(join_candidates)}"
                        })

        # Find complementary data (different files with similar themes)
        theme_files = {}
        for filename, analysis in analyses.items():
            for theme in analysis.data_themes:
                if theme not in theme_files:
                    theme_files[theme] = []
                theme_files[theme].append(filename)

        for theme, files in theme_files.items():
            if len(files) > 1 and theme not in ['general', 'unknown']:
                insights.append({
                    'type': 'related_theme',
                    'theme': theme,
                    'files': files,
                    'description': f"Multiple files contain {theme} data: {', '.join(files)}"
                })

        return insights

    def _determine_primary_type(self, analyses: Dict[str, FileAnalysis]) -> str:
        """Determine the primary data type across all files."""
        numerical_count = 0
        categorical_count = 0
        text_count = 0
        temporal_count = 0

        for analysis in analyses.values():
            for col in analysis.columns:
                if col.dtype == 'numerical':
                    numerical_count += 1
                elif col.dtype == 'categorical':
                    categorical_count += 1
                elif col.dtype == 'text':
                    text_count += 1
                elif col.dtype == 'temporal':
                    temporal_count += 1

        total = numerical_count + categorical_count + text_count + temporal_count
        if total == 0:
            return 'unknown'

        if numerical_count > total * 0.5:
            return 'tabular_numerical'
        elif text_count > total * 0.3:
            return 'text_heavy'
        elif temporal_count > 0 and numerical_count > 0:
            return 'time_series'
        else:
            return 'tabular_mixed'

    async def analyze_project(self) -> ProjectMetadata:
        """Analyze all data files in the project."""
        self._ensure_dirs()

        data_files = self._get_data_files()
        logger.info(f"Found {len(data_files)} data files to analyze")

        file_analyses = {}
        all_themes = set()
        total_rows = 0
        total_columns = 0

        for file_path in data_files:
            try:
                analysis = await self.analyze_file(file_path)
                rel_path = os.path.relpath(file_path, self.project_dir)
                file_analyses[rel_path] = analysis

                total_rows += analysis.row_count
                total_columns += analysis.column_count
                all_themes.update(analysis.data_themes)

                # Save individual file analysis
                safe_name = hashlib.md5(rel_path.encode()).hexdigest()[:12]
                analysis_path = os.path.join(self.file_analyses_dir, f"{safe_name}.json")
                with open(analysis_path, 'w') as f:
                    json.dump(analysis.to_dict(), f, indent=2, default=str)

            except Exception as e:
                logger.error(f"Error analyzing {file_path}: {e}")
                import traceback
                traceback.print_exc()

        # Cross-file analysis
        cross_insights = self._find_cross_file_insights(file_analyses)

        # Find common columns across all files
        if file_analyses:
            common_cols = None
            for analysis in file_analyses.values():
                col_names = {col.name.lower() for col in analysis.columns}
                if common_cols is None:
                    common_cols = col_names
                else:
                    common_cols &= col_names
            common_columns = list(common_cols or [])
        else:
            common_columns = []

        # Determine domain
        domain = None
        theme_list = list(all_themes)
        if 'healthcare' in theme_list:
            domain = 'healthcare/clinical'
        elif 'financial' in theme_list:
            domain = 'finance/business'
        elif 'scientific' in theme_list:
            domain = 'scientific/research'
        elif 'geographic' in theme_list:
            domain = 'geographic/spatial'
        elif 'marketing' in theme_list:
            domain = 'marketing/analytics'

        # Aggregate chart recommendations
        all_chart_types = set()
        for analysis in file_analyses.values():
            for chart in analysis.suggested_charts:
                all_chart_types.add(chart['type'])

        metadata = ProjectMetadata(
            project_name=os.path.basename(self.project_dir),
            analyzed_at=datetime.utcnow().isoformat(),
            total_files=len(file_analyses),
            total_rows=total_rows,
            total_columns=total_columns,
            primary_data_type=self._determine_primary_type(file_analyses),
            themes=theme_list,
            domain_detected=domain,
            file_analyses=file_analyses,
            cross_file_insights=cross_insights,
            common_columns=common_columns,
            recommended_charts=list(all_chart_types)
        )

        # Save master metadata
        metadata_path = os.path.join(self.analysis_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata.to_dict(), f, indent=2, default=str)

        logger.info(f"Analysis complete: {len(file_analyses)} files, {total_rows} total rows")
        return metadata

    def get_cached_metadata(self) -> Optional[ProjectMetadata]:
        """Load cached metadata if it exists."""
        metadata_path = os.path.join(self.analysis_dir, 'metadata.json')
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    data = json.load(f)
                # Convert back to ProjectMetadata (simplified - just return dict for now)
                return data
            except Exception as e:
                logger.error(f"Error loading cached metadata: {e}")
        return None
