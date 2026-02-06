"""
Shared utility functions for the ACe Toolkit API.

Contains common helpers used across multiple core managers.
"""

import uuid
import unicodedata


# Reserved names that cannot be used as project/file names (case-insensitive).
# Includes Windows reserved device names and dot-only names.
RESERVED_NAMES = {
    '.', '..', 'con', 'prn', 'aux', 'nul',
    'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
}

MAX_NAME_LENGTH = 100


def sanitize_name(name: str, allow_dots: bool = False) -> str:
    """Sanitize a name for use as a directory or file name.

    Applies Unicode normalization (NFKC) to prevent homograph attacks,
    removes dangerous characters, collapses hyphens, and prevents
    empty, dot-only, or reserved names.

    Args:
        name: The raw name to sanitize.
        allow_dots: If True, allow dots in the name (for filenames).
                    If False, dots are replaced with hyphens (for directory names).

    Returns:
        A safe string suitable for use as a directory or file name.
    """
    # Unicode normalization to prevent homograph attacks
    normalized = unicodedata.normalize("NFKC", name)
    allowed_chars = ('-', '_', '.') if allow_dots else ('-', '_')
    safe = "".join(c if c.isalnum() or c in allowed_chars else '-' for c in normalized)
    # Collapse multiple hyphens into one
    while '--' in safe:
        safe = safe.replace('--', '-')
    safe = safe.strip('-').strip()
    # Truncate to safe length
    safe = safe[:MAX_NAME_LENGTH]
    # Prevent empty or reserved names
    if not safe or safe.lower() in RESERVED_NAMES:
        safe = f"project-{uuid.uuid4().hex[:8]}"
    return safe
