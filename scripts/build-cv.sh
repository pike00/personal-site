#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CV_DIR="$PROJECT_DIR/src/content/cv"
OUTPUT="$PROJECT_DIR/public/cv.pdf"

mkdir -p "$(dirname "$OUTPUT")"

if command -v typst &> /dev/null; then
  typst compile "$CV_DIR/template.typ" "$OUTPUT"
  echo "CV PDF generated: $OUTPUT"
else
  echo "Warning: typst not installed, skipping CV PDF generation"
  echo "Install: brew install typst (macOS) or cargo install typst-cli"
fi
