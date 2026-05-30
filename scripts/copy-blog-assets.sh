#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/blog-posts/assets"
PUBLIC_DIR="$PROJECT_DIR/public/blog"

# shellcheck source=scripts/loki.sh
source "$SCRIPT_DIR/loki.sh"
start=$(date +%s)
loki_emit copy-blog-assets info started

count=0
if [ -d "$ASSETS_DIR" ]; then
  for dir in "$ASSETS_DIR"/*/; do
    [ -d "$dir" ] || continue
    slug="$(basename "$dir")"
    mkdir -p "$PUBLIC_DIR/$slug"
    cp "$dir"* "$PUBLIC_DIR/$slug/" 2>/dev/null && count=$((count + 1)) || true
  done
fi

loki_emit copy-blog-assets info complete "elapsed_s=$(($(date +%s) - start))" "dirs=$count"
echo "Blog assets copied to public directory ($count dirs)"
