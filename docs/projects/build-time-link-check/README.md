---
title: Build-time broken-link / asset check
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: low
next_step: Add a postbuild link/asset check (e.g. lychee) that fails when a referenced PDF or link is missing
source: ../../extensions-2026-05-29.md
---

# Build-time broken-link / asset check

## Goal

Catch missing publication PDFs and broken links before they reach production, as a build/postbuild step.

## Why

`scripts/copy-pdfs.sh` and `scripts/copy-blog-assets.sh` copy submodule assets into `public/` with no verification that the files referenced by the site actually exist. A publication whose `pdfPath` points at a missing or renamed PDF (the `findPdf` heuristic skips `Pubmed.pdf` and `20*`-prefixed files) will 404 silently in production. A link/asset check turns that into a build failure.

## Approach

- Add an asset-existence assertion: for each `Publication.pdfPath`, confirm the file landed in `public/Publications/`. Cheap, no network, catches the most likely breakage.
- Optionally add `lychee` (offline mode first) over `dist/` to catch internal broken links; gate network checks behind a flag to keep deploys fast/deterministic.
- Wire as an opt-in `build:check` recipe or a `postbuild` addition — decide whether it should block `just deploy` (probably yes for the asset check, optional for full link-crawl).

## Tasks

- [ ] Add a PDF-existence assertion keyed off `getPublications()` `pdfPath`
- [ ] Evaluate `lychee` (container or binary) for `dist/` internal-link checking
- [ ] Decide blocking vs advisory; wire into a just recipe / postbuild
- [ ] Confirm it fails on a deliberately removed/renamed publication PDF

## Anchors

- `scripts/copy-pdfs.sh` + `scripts/copy-blog-assets.sh` — asset copy, no verification
- `src/lib/publications.ts:33-42,89` — `findPdf` heuristic + `pdfPath`
- `package.json:12` — `postbuild` hook insertion point
