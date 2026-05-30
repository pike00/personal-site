---
title: Reading time + word count on blog posts
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: S
impact: low
next_step: Compute word count from raw markdown content in getStaticPaths and render an estimate near the date
source: ../../extensions-2026-05-29.md
---

# Reading time + word count on blog posts

## Goal

Show an estimated reading time (and optionally word count) on each blog post, next to the date.

## Why

Cheap reader affordance. The raw markdown `content` is already in scope inside `getStaticPaths` for the blog route, so the estimate can be computed at build time with no extra IO and passed through as a prop.

## Approach

- In `src/pages/blog/[slug].astro` `getStaticPaths`, count words from `content` (strip code fences/footnote defs first to avoid skew), divide by ~200 wpm, round up.
- Add `readingMinutes` to the `PostData` props and render it beside `dateDisplay`.
- Consider a tiny helper in the future `src/lib/posts.ts` (see extract-content-loading-module) so the same value is available to the feed/RSS if wanted.

## Tasks

- [ ] Add word-count + reading-time computation in `getStaticPaths`
- [ ] Thread `readingMinutes` into `PostData` and the template
- [ ] Render `· N min read` next to the date
- [ ] Sanity-check against a long post (code-heavy) so the estimate isn't absurd

## Anchors

- `src/pages/blog/[slug].astro:60-98` — `getStaticPaths` (has `content`) + date rendering
