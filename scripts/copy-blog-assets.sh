#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$PROJECT_DIR/blog-posts/assets"
PUBLIC_DIR="$PROJECT_DIR/public/blog"

if [ -d "$ASSETS_DIR" ]; then
  for dir in "$ASSETS_DIR"/*/; do
    [ -d "$dir" ] || continue
    slug="$(basename "$dir")"
    mkdir -p "$PUBLIC_DIR/$slug"
    cp "$dir"* "$PUBLIC_DIR/$slug/" 2>/dev/null || true
  done
fi

echo "Blog assets copied to public directory"
