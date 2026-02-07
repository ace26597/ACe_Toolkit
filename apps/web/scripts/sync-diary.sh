#!/bin/bash
# Sync diary from T7 to web app data folder (both Alfred and Pip)
SOURCE_BASE="/Volumes/T7/clawd/diary"
DEST_BASE="$HOME/dev/ACe_Toolkit/apps/web/data/diary"

# Sync Alfred's diary
if [ -d "$SOURCE_BASE/alfred" ]; then
    mkdir -p "$DEST_BASE/alfred"
    rsync -av --delete "$SOURCE_BASE/alfred/" "$DEST_BASE/alfred/"
    echo "✅ Alfred: $(ls -1 "$DEST_BASE/alfred" 2>/dev/null | wc -l | tr -d ' ') entries"
else
    echo "⚠️  Alfred source not found"
fi

# Sync Pip's diary
if [ -d "$SOURCE_BASE/pip" ]; then
    mkdir -p "$DEST_BASE/pip"
    rsync -av --delete "$SOURCE_BASE/pip/" "$DEST_BASE/pip/"
    echo "✅ Pip: $(ls -1 "$DEST_BASE/pip" 2>/dev/null | wc -l | tr -d ' ') entries"
else
    echo "⚠️  Pip source not found (creating empty)"
    mkdir -p "$DEST_BASE/pip"
fi

echo "📔 Diary sync complete"
