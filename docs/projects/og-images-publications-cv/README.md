---
title: OG images for publications, home, and CV
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: S
impact: med
next_step: Add a publication branch to og/[slug].png.ts getStaticPaths and an og prop to the publications/[slug] layout
source: ../../extensions-2026-05-29.md
---

# OG images for publications, home, and CV

## Goal

Generate per-page Open Graph preview images for the publication detail pages, the homepage, and the CV — matching the satori-rendered cards already produced for blog posts and projects.

## Why

Sharing any `/publications/<slug>` link on social or Slack currently falls back to no preview card, because `og/[slug].png.ts` only emits `blog-*` and `project-*` slugs. The satori template is already written; a publication variant (title + journal + year + a "Publication" label) is a copy-paste of the existing branch. Low effort, visible polish on the site's primary content.

## Approach

- Extend `getStaticPaths` in `src/pages/og/[slug].png.ts` with a third loop over `getPublications()` emitting `pub-<slug>` params and props `{ title, description: journal+year, label: "Publication" }`.
- Pass `image={`/og/pub-${slug}.png`}` from `src/pages/publications/[slug].astro` into its `PageLayout`/`SEO`.
- Add static `home` and `cv` entries (fixed title/description) and wire `image` on `index.astro` and `cv.astro`.

## Tasks

- [ ] Add publication branch to `og/[slug].png.ts` `getStaticPaths`
- [ ] Add `home` + `cv` static OG entries
- [ ] Thread `image` prop through `publications/[slug].astro`, `index.astro`, `cv.astro`
- [ ] Verify generated PNGs in `dist/og/` after `pnpm build`; check card with a social debugger

## Anchors

- `src/pages/og/[slug].png.ts:21-52` — `getStaticPaths` (blog + project only)
- `src/pages/publications/[slug].astro` — detail page with no `image`
- `src/lib/publications.ts:55-124` — `getPublications()` supplies title/journal/pubDate
