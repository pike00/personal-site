#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PUBS_DIR="$PROJECT_DIR/publications"
PUBLIC_DIR="$PROJECT_DIR/public"

# shellcheck source=scripts/loki.sh
source "$SCRIPT_DIR/loki.sh"
start=$(date +%s)
loki_emit copy-pdfs info started

count=0
copy_pdfs() {
  local src="$1" dest="$2"
  mkdir -p "$dest"
  local f
  for f in "$src"*.pdf; do
    [ -e "$f" ] || continue
    cp "$f" "$dest" && count=$((count + 1))
  done
}

if [ -d "$PUBS_DIR/Publications" ]; then
  for dir in "$PUBS_DIR/Publications"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    copy_pdfs "$dir" "$PUBLIC_DIR/$relpath"
  done
fi

if [ -d "$PUBS_DIR/Abstracts" ]; then
  for dir in "$PUBS_DIR/Abstracts"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    copy_pdfs "$dir" "$PUBLIC_DIR/$relpath"
  done
fi

if [ -d "$PUBS_DIR/Unpublished" ]; then
  copy_pdfs "$PUBS_DIR/Unpublished/" "$PUBLIC_DIR/Unpublished"
fi

loki_emit copy-pdfs info complete "elapsed_s=$(($(date +%s) - start))" "count=$count"
echo "PDFs copied to public directory ($count files)"
