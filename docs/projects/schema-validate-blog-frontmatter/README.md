---
title: Schema-validate blog frontmatter
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Add a zod schema for blog post frontmatter and validate it in the shared loader so bad frontmatter fails the build
source: ../../extensions-2026-05-29.md
---

# Schema-validate blog frontmatter

## Goal

Validate blog post frontmatter against a schema so a typo'd `date` or a missing `description` fails the build loudly, instead of rendering wrong or shipping empty.

## Why

`src/content.config.ts` defines schemas for `projects` and `cv`, but blog posts are loaded via raw `matter()` with `as PostFrontmatter` casts — the cast asserts a shape that is never checked. A malformed `date` produces an `Invalid Date`; a missing `description` ships an empty OG card and meta description. A schema makes these build-time errors.

## Approach

- Define a zod schema (`title`, `description`, `date` as ISO date, `tags: string[]`, `draft?: boolean`).
- Validate inside the shared loader from extract-content-loading-module (preferred) — one validation point feeds all consumers. If that project hasn't landed, validate at each `matter()` call site as an interim.
- On failure, throw with the offending filename + zod issue so the build output points straight at the bad post.
- Consider migrating blog into a proper Astro content collection loader later; the zod schema is reusable either way.

## Tasks

- [ ] Author the blog frontmatter zod schema
- [ ] Validate in `src/lib/posts.ts` (or per call site if loader not yet extracted)
- [ ] Throw with filename + issue context on failure
- [ ] Add a deliberately-bad fixture to confirm the build fails as intended
- [ ] Replace `as PostFrontmatter` casts with the validated type

## Anchors

- `src/content.config.ts` — existing `projects`/`cv` schemas (blog absent)
- `src/pages/blog/[slug].astro:71-79` — raw `matter()` + `as PostFrontmatter`
- Depends on / pairs with: extract-content-loading-module
