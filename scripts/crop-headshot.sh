#!/usr/bin/env bash
# Crop src/assets/headshot-full.jpg into src/assets/headshot.jpg.
#
# The full-resolution source lives at src/assets/headshot-full.jpg (800x1066).
# The cropped square at src/assets/headshot.jpg is what the home page uses.
#
# Usage:
#   scripts/crop-headshot.sh                    # default: 600x600 square, x=100 y=0
#   scripts/crop-headshot.sh 600 600 100 0      # explicit WxH at offset +X+Y
#   scripts/crop-headshot.sh 700 700 50 20      # wider square, shifted right+down
#
# Reference: source full-frame is 800w x 1066h. Subject's face midpoint sits
# roughly at source (400, 300) — center the crop on that point. Increase Y to
# move the face up within the crop; decrease (or use negative not supported)
# to move it down. Increase X to move the face left within the crop.
#
# After cropping, refresh the dev preview (`just dev` is hot-reloaded by Vite).

set -euo pipefail

cd "$(dirname "$0")/.."

W="${1:-600}"
H="${2:-600}"
X="${3:-100}"
Y="${4:-0}"

SRC=src/assets/headshot-full.jpg
DST=src/assets/headshot.jpg

if [[ ! -f "$SRC" ]]; then
  echo "missing source: $SRC" >&2
  exit 1
fi

magick "$SRC" -crop "${W}x${H}+${X}+${Y}" +repage -quality 92 "$DST"

echo "wrote $DST ($(identify -format '%wx%h %b' "$DST"))"
echo "  crop: ${W}x${H}+${X}+${Y} from $(identify -format '%wx%h' "$SRC")"
