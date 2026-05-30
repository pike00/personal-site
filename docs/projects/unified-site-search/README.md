---
title: Unified site-wide search (blog + projects + publications)
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: high
next_step: Generalize the Fuse index from publications-only to the merged content feed and surface a single search box
source: ../../extensions-2026-05-29.md
---

# Unified site-wide search (blog + projects + publications)

## Goal

One search box that covers blog posts, project pages, and publications — instead of the current pub-only search island.

## Why

Fuse.js is already a dependency and there's a working React-island pattern (`SearchPublications.tsx`). The homepage already builds a merged `FeedEntry[]` of posts + projects. Generalizing the search index to the full corpus is the single highest-impact content feature: it makes everything on the site discoverable from one place.

## Approach

- Build a unified searchable index at build time: `{ type, slug, title, description, tags, year/date, authors? }` over posts + projects + publications, written to a JSON bundle (or passed as a prop).
- Refactor `SearchPublications.tsx` into a generic `Search` island keyed on the union type, with per-type result rendering (publication card vs feed card).
- Decide the entry point: a dedicated `/search` page, or an island on `/blog` and the homepage. The merged feed in `index.astro:69-73` is the natural data source.
- This pairs with extract-content-loading-module — a single typed loader makes the index trivial to assemble.

## Tasks

- [ ] Define unified `SearchableEntry` type in `src/lib/types.ts`
- [ ] Build the merged index (reuse `getPublications()` + post/project loaders)
- [ ] Generalize the React island; per-type result cards
- [ ] Choose + build the entry surface (`/search` vs inline island)
- [ ] Confirm island hydration in production (CSP hash for the client-directive runner — see collapse-dual-csp)

## Anchors

- `src/components/SearchPublications.tsx:33-41` — existing Fuse index (pubs only)
- `src/pages/index.astro:69-73` — merged `feed` of posts + projects
- `src/pages/blog.astro` — no search today
- `src/lib/publications.ts:126-137` — `buildSearchIndex` pattern to generalize
