---
title: JSON-LD structured data for publications and Person
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: S
impact: med
next_step: Emit ScholarlyArticle JSON-LD on publication pages and a Person block site-wide via SEO.astro
source: ../../extensions-2026-05-29.md
---

# JSON-LD structured data for publications and Person

## Goal

Add schema.org JSON-LD to make the site legible to Google Scholar, search rich results, and academic crawlers: a `Person` block site-wide and a `ScholarlyArticle` block on each publication page.

## Why

A researcher portfolio benefits disproportionately from structured metadata, and all the inputs (DOI, journal, authors, publication date) are already present on the `Publication` type. Currently nothing is emitted, so the publication corpus is opaque to structured-data consumers.

## Approach

- Add an optional `jsonLd` prop (object) to `src/components/SEO.astro`, rendered as `<script type="application/ld+json">`.
- Build a `Person` graph (name, sameAs links to ORCID/Scholar, jobTitle) injected from `BaseLayout`/site-wide.
- Build a `ScholarlyArticle` graph per publication in `publications/[slug].astro` from `getPublications()` fields (`headline`, `author[]`, `datePublished`, `isPartOf` journal, `sameAs` DOI).
- Note: inline JSON-LD changes CSP — confirm whether it needs a hash in `public/_headers` or qualifies under existing `script-src`.

## Tasks

- [ ] Add `jsonLd` slot/prop to `SEO.astro`
- [ ] Author `Person` schema and wire site-wide
- [ ] Author `ScholarlyArticle` schema on publication detail pages
- [ ] Validate with Google Rich Results test
- [ ] Recompute CSP hashes if JSON-LD ships as an inline script (`scripts/sync-csp-hashes.mjs`)

## Anchors

- `src/components/SEO.astro` — rendered from `src/layouts/BaseLayout.astro:23`
- `src/lib/publications.ts:55-124` — fields for `ScholarlyArticle`
- `public/_headers` — `script-src` hash allowlist
