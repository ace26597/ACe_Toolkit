"""
Report generation for Research Assistant.

Supports multiple output formats:
- Markdown: Structured research reports
- HTML: Styled web-viewable reports
- PDF: Print-ready documents
- CSV: Data exports
"""

from datetime import datetime
from typing import Dict, Any
from pathlib import Path
import logging

# Report generation libraries
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
import markdown
import pandas as pd

logger = logging.getLogger(__name__)


def generate_markdown_report(state: Dict[str, Any]) -> str:
    """
    Generate comprehensive Markdown report from research state.

    Args:
        state: Research workflow state containing query, results, analysis, etc.

    Returns:
        Formatted Markdown report string
    """
    report_parts = []

    # Header with metadata
    report_parts.append(f"# Research Report: {state.get('user_query', 'Untitled')}\n")
    report_parts.append(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    model_config = state.get('model_config', {})
    provider = model_config.get('provider', 'unknown')
    model_name = model_config.get('model_name', 'unknown')
    report_parts.append(f"**AI Model**: {provider.title()} - {model_name}")

    workflow_type = state.get('workflow_type', 'unknown')
    report_parts.append(f"**Workflow Type**: {workflow_type.title()}\n")
    report_parts.append("---\n")

    # Executive Summary
    report_parts.append("## Executive Summary\n")
    synthesis = state.get('synthesis', 'No synthesis generated.')
    report_parts.append(synthesis)
    report_parts.append("\n---\n")

    # Search Results (if any)
    search_results = state.get('search_results', [])
    if search_results:
        report_parts.append("## Web Search Results\n")
        for i, result in enumerate(search_results, 1):
            report_parts.append(f"### {i}. {result.get('title', 'Untitled')}")
            report_parts.append(f"\n{result.get('content', '')}\n")
            report_parts.append(f"**Source**: [{result.get('url', '#')}]({result.get('url', '#')})")
            report_parts.append(f"**Relevance Score**: {result.get('score', 0):.2f}\n")
        report_parts.append("---\n")

    # File Analysis (if any)
    extracted_content = state.get('extracted_content', [])
    if extracted_content:
        report_parts.append("## Uploaded File Analysis\n")
        for file_content in extracted_content:
            filename = file_content.get('filename', 'Unknown file')
            method = file_content.get('method', 'unknown')
            content = file_content.get('content', '')

            report_parts.append(f"### {filename}")
            report_parts.append(f"**Extraction Method**: {method}\n")
            report_parts.append("```")
            report_parts.append(content[:2000])  # Limit to 2000 chars
            if len(content) > 2000:
                report_parts.append("\n... (content truncated)")
            report_parts.append("```\n")
        report_parts.append("---\n")

    # Detailed Analysis
    analysis_results = state.get('analysis_results', [])
    if analysis_results:
        report_parts.append("## Detailed Analysis\n")
        for i, analysis in enumerate(analysis_results, 1):
            report_parts.append(f"### Analysis {i}\n")
            report_parts.append(analysis)
            report_parts.append("\n")
        report_parts.append("---\n")

    # MCP Tool Results (if any)
    mcp_tool_results = state.get('mcp_tool_results', [])
    if mcp_tool_results:
        report_parts.append("## Scientific Tool Results\n")
        for tool_result in mcp_tool_results:
            skill_name = tool_result.get('skill_name', 'Unknown Tool')
            report_parts.append(f"### {skill_name}")

            if tool_result.get('success'):
                output = tool_result.get('output', 'No output')
                report_parts.append("```")
                report_parts.append(output[:1000])  # Limit output
                if len(output) > 1000:
                    report_parts.append("\n... (output truncated)")
                report_parts.append("```")
            else:
                error = tool_result.get('error', 'Unknown error')
                report_parts.append(f"**Error**: {error}")

            exec_time = tool_result.get('execution_time_ms', 0)
            report_parts.append(f"\n*Execution Time: {exec_time}ms*\n")
        report_parts.append("---\n")

    # Metadata footer
    report_parts.append("## Report Metadata\n")
    tokens_used = state.get('tokens_used', 0)
    report_parts.append(f"- **Total Tokens Used**: {tokens_used:,}")

    steps_completed = state.get('steps_completed', [])
    if steps_completed:
        report_parts.append(f"- **Workflow Steps**: {' → '.join(steps_completed)}")

    report_parts.append(f"\n*Generated by Research Assistant at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

    return "\n".join(report_parts)


def generate_html_report(markdown_content: str) -> str:
    """
    Convert Markdown report to styled HTML.

    Args:
        markdown_content: Markdown formatted report

    Returns:
        HTML string with embedded CSS styling
    """
    # Convert markdown to HTML
    html_body = markdown.markdown(
        markdown_content,
        extensions=['extra', 'codehilite', 'tables', 'toc', 'nl2br']
    )

    # HTML template with professional styling
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.8;
            color: #333;
            background: #f9f9f9;
        }}

        h1 {{
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 12px;
            margin-top: 30px;
            font-size: 2.5em;
        }}

        h2 {{
            color: #1e40af;
            margin-top: 35px;
            padding-left: 10px;
            border-left: 4px solid #3b82f6;
            font-size: 1.8em;
        }}

        h3 {{
            color: #1e3a8a;
            margin-top: 25px;
            font-size: 1.3em;
        }}

        p {{
            margin: 15px 0;
        }}

        pre {{
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }}

        code {{
            background: #e5e7eb;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #dc2626;
        }}

        pre code {{
            background: transparent;
            padding: 0;
            color: #e2e8f0;
        }}

        a {{
            color: #2563eb;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }}

        a:hover {{
            border-bottom-color: #2563eb;
        }}

        hr {{
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 40px 0;
        }}

        blockquote {{
            border-left: 4px solid #3b82f6;
            padding-left: 20px;
            margin-left: 0;
            color: #64748b;
            font-style: italic;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}

        th, td {{
            padding: 12px;
            border: 1px solid #e5e7eb;
            text-align: left;
        }}

        th {{
            background: #f3f4f6;
            font-weight: 600;
        }}

        ul, ol {{
            margin: 15px 0;
            padding-left: 30px;
        }}

        li {{
            margin: 8px 0;
        }}

        strong {{
            color: #1e293b;
        }}

        em {{
            color: #64748b;
        }}

        @media print {{
            body {{
                background: white;
                max-width: 100%;
            }}
        }}
    </style>
</head>
<body>
    {html_body}
</body>
</html>
"""

    return html_template


async def generate_pdf_report(markdown_content: str, output_path: str):
    """
    Convert Markdown report to PDF using ReportLab.

    Args:
        markdown_content: Markdown formatted report
        output_path: Path where PDF will be saved
    """
    try:
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )

        # Get styles
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=30,
            alignment=TA_CENTER
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )

        # Story (content) list
        story = []

        # Parse markdown into sections
        lines = markdown_content.split('\n')
        current_section = []

        for line in lines:
            if line.startswith('# '):
                # Main title
                if current_section:
                    story.append(Paragraph(' '.join(current_section), styles['Normal']))
                    current_section = []
                title_text = line.replace('# ', '')
                story.append(Paragraph(title_text, title_style))
                story.append(Spacer(1, 12))

            elif line.startswith('## '):
                # Section heading
                if current_section:
                    story.append(Paragraph(' '.join(current_section), styles['Normal']))
                    current_section = []
                heading_text = line.replace('## ', '')
                story.append(Paragraph(heading_text, heading_style))
                story.append(Spacer(1, 6))

            elif line.startswith('---'):
                # Horizontal rule - add space
                if current_section:
                    story.append(Paragraph(' '.join(current_section), styles['Normal']))
                    current_section = []
                story.append(Spacer(1, 20))

            elif line.startswith('**') and line.endswith('**'):
                # Bold line (metadata)
                if current_section:
                    story.append(Paragraph(' '.join(current_section), styles['Normal']))
                    current_section = []
                bold_text = line.replace('**', '<b>').replace('**', '</b>')
                story.append(Paragraph(bold_text, styles['Normal']))

            elif line.strip():
                # Regular content
                current_section.append(line)

            else:
                # Empty line - paragraph break
                if current_section:
                    story.append(Paragraph(' '.join(current_section), styles['Normal']))
                    story.append(Spacer(1, 12))
                    current_section = []

        # Add any remaining content
        if current_section:
            story.append(Paragraph(' '.join(current_section), styles['Normal']))

        # Build PDF
        doc.build(story)
        logger.info(f"PDF report generated successfully at: {output_path}")

    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise


def generate_csv_export(state: Dict[str, Any], output_path: str):
    """
    Export research data to CSV format.

    Args:
        state: Research workflow state
        output_path: Path where CSV will be saved
    """
    try:
        search_results = state.get('search_results', [])

        if search_results:
            # Export search results as CSV
            df = pd.DataFrame(search_results)
            df.to_csv(output_path, index=False)
            logger.info(f"CSV export (search results) generated at: {output_path}")

        else:
            # Export conversation summary
            summary_data = {
                'Query': [state.get('user_query', '')],
                'Synthesis': [state.get('synthesis', '')],
                'Workflow Type': [state.get('workflow_type', '')],
                'Tokens Used': [state.get('tokens_used', 0)],
                'Steps Completed': [' → '.join(state.get('steps_completed', []))],
                'Generated At': [datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
            }
            df = pd.DataFrame(summary_data)
            df.to_csv(output_path, index=False)
            logger.info(f"CSV export (summary) generated at: {output_path}")

    except Exception as e:
        logger.error(f"CSV generation error: {e}")
        raise
