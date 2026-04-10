#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBS_DIR="$PROJECT_DIR/publications"
PUBLIC_DIR="$PROJECT_DIR/public"

if [ -d "$PUBS_DIR/Publications" ]; then
  for dir in "$PUBS_DIR/Publications"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    mkdir -p "$PUBLIC_DIR/$relpath"
    cp "$dir"*.pdf "$PUBLIC_DIR/$relpath" 2>/dev/null || true
  done
fi

if [ -d "$PUBS_DIR/Abstracts" ]; then
  for dir in "$PUBS_DIR/Abstracts"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    mkdir -p "$PUBLIC_DIR/$relpath"
    cp "$dir"*.pdf "$PUBLIC_DIR/$relpath" 2>/dev/null || true
  done
fi

if [ -d "$PUBS_DIR/Unpublished" ]; then
  mkdir -p "$PUBLIC_DIR/Unpublished"
  cp "$PUBS_DIR/Unpublished/"*.pdf "$PUBLIC_DIR/Unpublished/" 2>/dev/null || true
fi

echo "PDFs copied to public directory"
