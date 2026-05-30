#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CV_DIR="$PROJECT_DIR/src/content/cv"
OUTPUT="$PROJECT_DIR/public/cv.pdf"

# shellcheck source=scripts/loki.sh
source "$SCRIPT_DIR/loki.sh"
start=$(date +%s)
loki_emit build-cv info started

# DISABLED: CV generation broken, patch incoming
loki_emit build-cv info complete "elapsed_s=$(($(date +%s) - start))" "result=disabled"
echo "CV PDF generation disabled (broken, patch in progress)"
exit 0

mkdir -p "$(dirname "$OUTPUT")"

if [ -f "$OUTPUT" ] && [ "$OUTPUT" -nt "$CV_DIR/template.typ" ] && [ "$OUTPUT" -nt "$CV_DIR/cv.md" ]; then
  loki_emit build-cv info complete "elapsed_s=$(($(date +%s) - start))" "result=cached"
  echo "CV PDF up to date: $OUTPUT"
  exit 0
fi

TYPST=""
if command -v typst &> /dev/null; then
  TYPST="typst"
elif [ -x "$PROJECT_DIR/node_modules/.bin/typst" ]; then
  TYPST="$PROJECT_DIR/node_modules/.bin/typst"
fi

if [ -n "$TYPST" ]; then
  "$TYPST" compile "$CV_DIR/template.typ" "$OUTPUT"
  loki_emit build-cv info complete "elapsed_s=$(($(date +%s) - start))" "result=generated"
  echo "CV PDF generated: $OUTPUT"
else
  loki_emit build-cv warn typst_missing "result=skipped"
  echo "Warning: typst not installed, skipping CV PDF generation"
  echo "Install: npm install --save-dev typst"
fi
