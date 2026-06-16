#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CV_DIR="$PROJECT_DIR/src/content/cv"
OUTPUT="$PROJECT_DIR/public/cv.pdf"
TEMPLATE="$CV_DIR/template.typ"
CV_MD="$CV_DIR/cv.md"
TEMP_TYPST=$(mktemp)
trap "rm -f '$TEMP_TYPST'" EXIT

# shellcheck source=scripts/loki.sh
source "$SCRIPT_DIR/loki.sh"
start=$(date +%s)
loki_emit build-cv info started

mkdir -p "$(dirname "$OUTPUT")"

if [ -f "$OUTPUT" ] && [ "$OUTPUT" -nt "$TEMPLATE" ] && [ "$OUTPUT" -nt "$CV_MD" ] && [ "$OUTPUT" -nt "$SCRIPT_DIR/md-to-typst.py" ]; then
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

if [ -z "$TYPST" ]; then
  loki_emit build-cv warn typst_missing "result=skipped"
  echo "Warning: typst not installed, skipping CV PDF generation"
  echo "Install: npm install --save-dev typst"
  exit 0
fi

# Convert markdown to Typst and combine with template
{
  cat "$TEMPLATE"
  echo ""
  python3 "$SCRIPT_DIR/md-to-typst.py" "$CV_MD"
} > "$TEMP_TYPST"

"$TYPST" compile --font-path "$CV_DIR/fonts" "$TEMP_TYPST" "$OUTPUT"
loki_emit build-cv info complete "elapsed_s=$(($(date +%s) - start))" "result=generated"
echo "CV PDF generated: $OUTPUT"
