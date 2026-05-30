---
title: Tag/topic landing pages
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Add a /topics/[tag] prerendered route unifying publications + posts + projects for each tag
source: ../../extensions-2026-05-29.md
---

# Tag/topic landing pages

## Goal

Real, crawlable `/topics/[tag]` pages that aggregate everything (publications, blog posts, projects) sharing a tag — replacing the current query-string filter that only narrows the publications list.

## Why

The homepage research-area pills link to `/publications?tag=…`, a client-side filter on one section. A query param is not a linkable, indexable destination, and it ignores posts/projects with the same tag. Static topic pages are better for SEO and let a topic show the full cross-content picture. Tags already exist on all three content shapes.

## Approach

- Enumerate the tag universe from publications (`researchArea`) + post/project `tags`.
- Add `src/pages/topics/[tag].astro` with `getStaticPaths` over that universe; each page lists matching publications (PublicationCard) + posts/projects (FeedCard).
- Point `TopicPill` hrefs at `/topics/<tag>` instead of `/publications?tag=`.
- Decide slugification (the publications slugify drops leading digits; tags need their own encode) and whether tag taxonomies across content types need normalizing.

## Tasks

- [ ] Build a `getAllTags()` helper merging publication + post + project tags
- [ ] Create `src/pages/topics/[tag].astro` (prerendered)
- [ ] Render mixed results (publications + feed entries) per tag
- [ ] Repoint `TopicPill` / homepage pills to the new route
- [ ] Add topic pages to sitemap; verify no orphan/empty tag pages

## Anchors

- `src/pages/index.astro:175` — pills link to `/publications?tag=…`
- `src/components/TopicPill.astro` — href construction
- `src/components/SearchPublications.tsx:28-29,48-50` — current query-param tag filter
- `src/lib/publications.ts:88` — `researchArea` tags per publication
