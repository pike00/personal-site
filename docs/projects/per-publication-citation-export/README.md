---
title: Per-publication citation export (BibTeX / RIS / copy-citation)
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Add BibTeX/RIS generation per publication and a Cite button on publications/[slug].astro
source: ../../extensions-2026-05-29.md
---

# Per-publication citation export (BibTeX / RIS / copy-citation)

## Goal

A "Cite" affordance on each publication page that offers a formatted citation, BibTeX, and RIS — copyable to clipboard or downloadable.

## Why

Academics expect to grab a citation in one click. The site already generates a repo-wide `CITATION.cff` from the same metadata (`scripts/generate-citations.ts` + `src/lib/citations.ts`), so all fields needed for per-paper BibTeX/RIS are already loaded by `getPublications()`. This extends existing machinery rather than introducing new data.

## Approach

- Add BibTeX and RIS formatters in `src/lib/citations.ts` operating on a single `Publication`.
- Generate a stable BibTeX key (e.g. `pike<year><firstword>`).
- On `publications/[slug].astro`, render a "Cite" disclosure with formatted/BibTeX/RIS tabs; copy-to-clipboard reuses the existing inline-copy pattern (`/js/copy-code.js`) — note CSP hash implications for any new inline handler.
- Optionally emit `.bib`/`.ris` static files per publication for direct download.

## Tasks

- [ ] Add `toBibTeX(pub)` / `toRIS(pub)` to `src/lib/citations.ts`
- [ ] Deterministic citation-key generator
- [ ] Cite UI on the publication detail page (copy + download)
- [ ] Recompute CSP hashes if a new inline copy handler is added
- [ ] Spot-check BibTeX against a reference manager (Zotero import round-trip)

## Anchors

- `src/lib/citations.ts` + `scripts/generate-citations.ts` — existing CFF generation
- `src/pages/publications/[slug].astro` — no per-paper export today
- `src/pages/blog/[slug].astro:53-55,137` — inline-copy pattern + `/js/copy-code.js`
