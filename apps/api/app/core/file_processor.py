"""
Multi-modal file processor for Research Assistant.

Handles extraction of content from various file types:
- Images: AI vision analysis (GPT-4o, Claude)
- PDFs: Text extraction
- CSV/Excel: Data analysis and summarization
- Plain text: Direct reading
"""

import pypdf
import pandas as pd
from pathlib import Path
from typing import Dict, Any
import logging

from .ai_provider import get_ai_provider, ModelConfig

logger = logging.getLogger(__name__)


async def process_uploaded_file(
    file_path: str,
    file_type: str,
    model_config: ModelConfig,
    api_keys: Dict[str, str]
) -> Dict[str, Any]:
    """
    Process uploaded file and extract content using appropriate method.

    Args:
        file_path: Path to the uploaded file
        file_type: Type of file (image, pdf, csv, excel, text)
        model_config: AI model configuration for vision tasks
        api_keys: API keys for AI providers

    Returns:
        Dictionary with:
            - success: bool
            - content: str (extracted content)
            - method: str (extraction method used)
            - error: Optional[str] (error message if failed)
    """
    try:
        logger.info(f"Processing file: {file_path} (type: {file_type})")

        if file_type == "image":
            return await extract_image_content(file_path, model_config, api_keys)
        elif file_type == "pdf":
            return await extract_pdf_content(file_path)
        elif file_type in ["csv", "excel"]:
            return await extract_tabular_content(file_path, file_type)
        elif file_type == "text":
            return extract_text_content(file_path)
        else:
            return {
                "success": False,
                "content": "",
                "method": "unknown",
                "error": f"Unsupported file type: {file_type}"
            }

    except Exception as e:
        logger.error(f"Error processing file {file_path}: {e}")
        return {
            "success": False,
            "content": "",
            "method": "error",
            "error": str(e)
        }


async def extract_image_content(
    file_path: str,
    model_config: ModelConfig,
    api_keys: Dict[str, str]
) -> Dict[str, Any]:
    """
    Use AI vision APIs (GPT-4o or Claude) to analyze images.

    Performs OCR, describes visual elements, extracts scientific information,
    and analyzes charts/diagrams.

    Args:
        file_path: Path to image file
        model_config: AI model configuration
        api_keys: API keys dict

    Returns:
        Extraction result dict
    """
    try:
        provider = get_ai_provider(
            model_config.provider,
            model_config.model_name,
            api_keys
        )

        image_data = Path(file_path).read_bytes()

        prompt = """Analyze this image in detail. Describe:

1. Main content and subject matter
2. Any visible text (perform OCR on all text in the image)
3. Data visualizations, charts, graphs, or diagrams - describe axes, labels, trends
4. Scientific information, equations, formulas, or technical details
5. Key observations and insights
6. If this is a research figure, describe the experimental setup or results shown

Be thorough and precise. Extract all text visible in the image."""

        content = await provider.vision(image_data, prompt)

        return {
            "success": True,
            "content": content,
            "method": "vision"
        }

    except Exception as e:
        logger.error(f"Image extraction error: {e}")
        return {
            "success": False,
            "content": "",
            "method": "vision",
            "error": str(e)
        }


async def extract_pdf_content(file_path: str) -> Dict[str, Any]:
    """
    Extract text from PDF using pypdf library.

    Args:
        file_path: Path to PDF file

    Returns:
        Extraction result dict with text from all pages
    """
    try:
        reader = pypdf.PdfReader(file_path)
        pages = []

        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            if text.strip():  # Only include pages with content
                pages.append(f"--- Page {i} ---\n{text}")

        content = "\n\n".join(pages)

        if not content.strip():
            return {
                "success": False,
                "content": "",
                "method": "pypdf",
                "error": "PDF appears to be empty or text could not be extracted (might be image-based PDF)"
            }

        return {
            "success": True,
            "content": content,
            "method": "pypdf"
        }

    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return {
            "success": False,
            "content": "",
            "method": "pypdf",
            "error": str(e)
        }


async def extract_tabular_content(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Parse CSV/Excel files and generate comprehensive data summary.

    Args:
        file_path: Path to CSV or Excel file
        file_type: "csv" or "excel"

    Returns:
        Extraction result dict with data summary and statistics
    """
    try:
        # Read file based on type
        if file_type == "csv":
            df = pd.read_csv(file_path)
        else:  # excel
            df = pd.read_excel(file_path)

        # Generate comprehensive summary
        summary_parts = [
            "# Dataset Summary",
            f"- Total Rows: {len(df):,}",
            f"- Total Columns: {len(df.columns)}",
            f"- Column Names: {', '.join(df.columns.tolist())}",
            "",
            "## First 10 Rows"
        ]

        # Add first 10 rows
        summary_parts.append(df.head(10).to_string())

        # Add statistical summary for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            summary_parts.extend([
                "",
                "## Statistical Summary (Numeric Columns)"
            ])
            summary_parts.append(df[numeric_cols].describe().to_string())

        # Add data types
        summary_parts.extend([
            "",
            "## Data Types"
        ])
        summary_parts.append(df.dtypes.to_string())

        # Add missing value analysis
        missing_counts = df.isnull().sum()
        if missing_counts.any():
            summary_parts.extend([
                "",
                "## Missing Values"
            ])
            missing_data = missing_counts[missing_counts > 0]
            summary_parts.append(missing_data.to_string())
        else:
            summary_parts.append("\n## Missing Values\nNo missing values detected.")

        # Add value counts for categorical columns (first 5 unique values)
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            summary_parts.extend([
                "",
                "## Sample Values (Categorical Columns)"
            ])
            for col in categorical_cols[:5]:  # Limit to first 5 categorical columns
                unique_vals = df[col].value_counts().head(5)
                summary_parts.append(f"\n### {col}")
                summary_parts.append(unique_vals.to_string())

        content = "\n".join(summary_parts)

        return {
            "success": True,
            "content": content,
            "method": "pandas"
        }

    except Exception as e:
        logger.error(f"Tabular extraction error: {e}")
        return {
            "success": False,
            "content": "",
            "method": "pandas",
            "error": str(e)
        }


def extract_text_content(file_path: str) -> Dict[str, Any]:
    """
    Read plain text file.

    Args:
        file_path: Path to text file

    Returns:
        Extraction result dict with file contents
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if not content.strip():
            return {
                "success": False,
                "content": "",
                "method": "text",
                "error": "File is empty"
            }

        return {
            "success": True,
            "content": content,
            "method": "text"
        }

    except UnicodeDecodeError:
        # Try with different encoding
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
            return {
                "success": True,
                "content": content,
                "method": "text"
            }
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            return {
                "success": False,
                "content": "",
                "method": "text",
                "error": f"Could not decode file: {str(e)}"
            }

    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        return {
            "success": False,
            "content": "",
            "method": "text",
            "error": str(e)
        }


def determine_file_type(mime_type: str, filename: str) -> str:
    """
    Determine file type category from MIME type and filename.

    Args:
        mime_type: MIME type string
        filename: Original filename

    Returns:
        File type category: "image", "pdf", "csv", "excel", "text"
    """
    mime_lower = mime_type.lower()
    filename_lower = filename.lower()

    # Image files
    if mime_lower.startswith('image/'):
        return "image"

    # PDF files
    if mime_lower == 'application/pdf' or filename_lower.endswith('.pdf'):
        return "pdf"

    # CSV files
    if mime_lower == 'text/csv' or filename_lower.endswith('.csv'):
        return "csv"

    # Excel files
    if any(x in mime_lower for x in ['spreadsheet', 'excel']) or \
       any(filename_lower.endswith(ext) for ext in ['.xlsx', '.xls', '.xlsm']):
        return "excel"

    # Plain text files
    if mime_lower.startswith('text/') or \
       any(filename_lower.endswith(ext) for ext in ['.txt', '.md', '.markdown', '.json', '.xml', '.html']):
        return "text"

    # Default to text
    return "text"
