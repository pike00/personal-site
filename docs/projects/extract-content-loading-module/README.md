---
title: Extract a single content-loading module
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Create src/lib/posts.ts with one typed draft-filtering loader and replace the four duplicated reads
source: ../../extensions-2026-05-29.md
---

# Extract a single content-loading module

## Goal

One typed loader (`src/lib/posts.ts`) for blog posts (and the parallel projects loader), replacing the four independent copies of the `readdirSync` + `gray-matter` + draft-filter logic.

## Why

The same blog-loading logic is duplicated in `index.astro`, `rss.xml.ts`, `og/[slug].png.ts`, and `blog/[slug].astro`. Four copies drift independently — for example, the RSS feed and homepage filter drafts but each re-implements the read, and any new derived field (reading time, search index) has to be added in every copy. A single typed loader is the keystone refactor that makes blog-reading-time, unified-site-search, and schema-validate-blog-frontmatter cheap.

## Approach

- Create `src/lib/posts.ts` exporting `getPosts()` / `getProjects()` returning a typed shape, with draft filtering centralized and a single `parsePost(file)`.
- Replace the inline reads in all four call sites with the new functions.
- Keep frontmatter typing here so it's the natural home for zod validation (see schema-validate-blog-frontmatter).
- No behavior change intended — verify the built `dist/` (feed order, RSS items, OG slugs, post pages) is byte-stable before/after where possible.

## Tasks

- [ ] Write `src/lib/posts.ts` (`getPosts`, `getProjects`, typed entry)
- [ ] Replace read in `src/pages/index.astro:35-67`
- [ ] Replace read in `src/pages/rss.xml.ts:18-47`
- [ ] Replace read in `src/pages/og/[slug].png.ts:24-49`
- [ ] Replace read in `src/pages/blog/[slug].astro:60-85`
- [ ] Diff `dist/` before/after to confirm no regressions

## Anchors

- `src/pages/index.astro:35-51` — blog read #1
- `src/pages/rss.xml.ts:18-31` — blog read #2
- `src/pages/og/[slug].png.ts:24-36` — blog read #3
- `src/pages/blog/[slug].astro:60-85` — blog read #4
