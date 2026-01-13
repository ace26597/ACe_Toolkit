#!/bin/bash
# Import project documentation into the Mermaid app
# This creates a "Documentation" project with all .md files

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../.. && pwd)"

echo "Importing documentation files into Mermaid app..."

# Find all .md files in the project
MD_FILES=$(find "$PROJECT_DIR" -name "*.md" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.venv/*" | sort)

if [ -z "$MD_FILES" ]; then
    echo "No documentation files found."
    exit 0
fi

echo "Found documentation files:"
echo "$MD_FILES" | sed 's/^/  - /'
echo ""

# Create a JSON file listing all docs for the frontend to import
DOCS_JSON="$PROJECT_DIR/apps/web/public/documentation.json"

echo "{" > "$DOCS_JSON"
echo "  \"files\": [" >> "$DOCS_JSON"

FIRST=true
while IFS= read -r file; do
    # Get relative path and filename
    REL_PATH="${file#$PROJECT_DIR/}"
    FILENAME=$(basename "$file")
    NAME="${FILENAME%.md}"

    # Read file content and escape for JSON
    CONTENT=$(cat "$file" | jq -Rs .)

    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$DOCS_JSON"
    fi

    echo "    {" >> "$DOCS_JSON"
    echo "      \"name\": \"$NAME\"," >> "$DOCS_JSON"
    echo "      \"path\": \"$REL_PATH\"," >> "$DOCS_JSON"
    echo "      \"content\": $CONTENT" >> "$DOCS_JSON"
    echo -n "    }" >> "$DOCS_JSON"
done <<< "$MD_FILES"

echo "" >> "$DOCS_JSON"
echo "  ]" >> "$DOCS_JSON"
echo "}" >> "$DOCS_JSON"

echo "✓ Documentation index created at: $DOCS_JSON"
echo ""
echo "Documentation files are now available in the app."
echo "They will appear in a 'Documentation' project on next load."
