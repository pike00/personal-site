# Extension Ideas: personal-site

Date: 2026-05-29
Context: Static site for pikemd.com (Astro 6 + React 19 + Tailwind 4), deployed local-only to Cloudflare Pages via `just deploy`; content = 7 blog posts (`blog-posts/` submodule), 25 publications + abstracts (`publications/` submodule), 3 project pages, and a Typst-built CV.

## Homelab integration surface

This repo is unusually well-positioned to wire into the homelab because it already calls one homelab service directly: **Umami** (`umami.khanpikehome.com`) for analytics, with its origin already in the CSP. The build is a chain of local scripts (`scripts/*.sh`, `generate-citations.ts`) that today emit nothing to **Loki**, despite the global structured-logging rule. Deploys are manual and silent — no **Mattermost** notification, no **Gitea Actions** check. And the LiteLLM proxy (`deepseek-v4-pro-cloud`), **pike-gist**, **kindred**, and **Karakeep** are all sitting one API call away from enriching content that's currently hand-maintained (tags, descriptions, cross-links, reading lists).

## Quick wins

### No custom OG images for publication pages, home, or CV
- **Effort:** S · **Impact:** med
- **Anchor:** `src/pages/og/[slug].png.ts:21-52` — `getStaticPaths` only emits `blog-*` and `project-*` slugs
- **Why:** sharing any `/publications/<slug>` link on social/Slack falls back to no preview card; the satori template already exists and a publication variant (title + journal + year) is a copy-paste of the existing branch.

### Brittle author-bolding regex
- **Effort:** S · **Impact:** low
- **Anchor:** `src/components/SearchPublications.tsx:16-21` — `/\bPike\b/.test(a) && !/\bMorgan\b/.test(a)`
- **Why:** the "don't bold Morgan Pike" carve-out is a hardcoded special case that will silently mis-bold any future co-author named Pike; match on the structured author identity instead of a name regex.

### Reading time + word count on blog posts
- **Effort:** S · **Impact:** low
- **Anchor:** `src/pages/blog/[slug].astro:92-98` — renders date but nothing derived from `content`
- **Why:** cheap reader-affordance; the raw markdown `content` is already in scope in `getStaticPaths`.

### JSON-LD structured data for publications and Person
- **Effort:** S · **Impact:** med
- **Anchor:** `src/components/SEO.astro` (rendered from `src/layouts/BaseLayout.astro:23`)
- **Why:** `ScholarlyArticle` + `Person` schema.org blocks make a researcher site legible to Google Scholar and rich results; the DOI/journal/authors are all present on the `Publication` type.

## New features

### Unified site-wide search (blog + projects + publications)
- **Effort:** M · **Impact:** high
- **Anchor:** Fuse.js island exists only for pubs at `src/components/SearchPublications.tsx:33-41`; `/blog` (`src/pages/blog.astro`) and the homepage feed (`src/pages/index.astro:69-73`) have no search at all
- **Why:** there's already a Fuse dependency and a working React-island pattern; generalizing the index to cover the merged feed gives one search box across all content instead of a pub-only one.

### Tag/topic landing pages
- **Effort:** M · **Impact:** med
- **Anchor:** `src/pages/index.astro:175` — research-area pills link to `/publications?tag=…`, a query-string filter, not a real page
- **Why:** `/topics/[tag]` pages would be crawlable, linkable, and could unify a tag's publications + blog posts + projects (tags already exist on all three `FeedEntry`/`Publication` shapes); better SEO than a query param that only filters one section.

### Per-publication citation export (BibTeX / RIS / copy-citation)
- **Effort:** M · **Impact:** med
- **Anchor:** `src/lib/citations.ts` + `scripts/generate-citations.ts` already build a site-wide `CITATION.cff`; `src/pages/publications/[slug].astro` has no per-paper export
- **Why:** academics expect a "Cite" button; the metadata to emit BibTeX/RIS per paper is already loaded in `getPublications()`.

### Re-enable contact behind a Cloudflare Worker
- **Effort:** M · **Impact:** low
- **Anchor:** `src/lib/flags.ts:2` — `contact: false`; `src/pages/contact.astro` exists but gated off
- **Why:** a Pages Function / Worker + Turnstile gives a working contact form without a backend; pairs with `cloudflare-email-service` skill for delivery.

## New Docker services

### Self-hosted comment server (Comentario / Isso) behind Traefik
- **Effort:** M · **Impact:** med
- **Anchor:** `src/pages/blog/[slug].astro:132-135` — article body renders with no discussion affordance
- **Why:** a privacy-respecting, self-hosted comment box at `comments.khanpikehome.com` fits the existing Traefik-routed homelab pattern; add its origin to `connect-src` in `public/_headers` (and `Caddyfile`).

## Integrations

### Loki structured logging for build scripts
- **Effort:** M · **Impact:** med
- **Anchor:** `scripts/build-cv.sh`, `scripts/copy-pdfs.sh`, `scripts/copy-blog-assets.sh`, `scripts/generate-citations.ts` — none push to Loki, violating the global structured-logging rule
- **Why:** wire the bash scripts to the `curl → 127.0.0.1:3100` pattern and `generate-citations.ts` to a tiny JSON push, labeled `job=personal-site`; then a Grafana panel shows deploy cadence, CV-rebuild skips, and citation-cache hits over time.

### Gitea Actions build check (mirror the homelab CI pattern)
- **Effort:** M · **Impact:** med
- **Anchor:** project CLAUDE.md "Local-only, no CI … no `.github/workflows/`"; `gitea.lab.khanpikehome.com` already runs `.gitea/workflows/*.yml` for plaid-sync/finance-hub/personal-crm
- **Why:** a pull-mirror + Gitea Actions job running `pnpm build` (submodules + CSP-hash sync) catches broken builds before a manual `just deploy`, without reintroducing the GitHub-Pages CI you deliberately retired.

### LiteLLM-drafted descriptions / tags at build time
- **Effort:** M · **Impact:** med
- **Anchor:** `scripts/generate-citations.ts` is the existing model for a build-time TS script; `deepseek-v4-pro-cloud` via the LiteLLM proxy is the homelab default
- **Why:** a `build:suggest` script that proposes `description` and `tags` for any post/project missing them (write-to-frontmatter on confirm, never silently) removes a manual chore; reuses the robust-JSON-extraction pattern from `drawer_extract_json_without_response_format`.

## Architectural improvements

### Collapse the dual-CSP maintenance burden
- **Effort:** M · **Impact:** med
- **Anchor:** `scripts/sync-csp-hashes.mjs` updates `public/_headers` only; project CLAUDE.md warns `Caddyfile` "hard-codes its own copy of the CSP … update both or they diverge silently"
- **Why:** make `sync-csp-hashes.mjs` write *both* targets from one extracted hash set so the Caddy fallback path can never drift; eliminates a documented footgun that has its own multi-paragraph warning.

### Extract a single content-loading module
- **Effort:** M · **Impact:** med
- **Anchor:** identical `readdirSync` + `gray-matter` blog-loading logic is duplicated in `src/pages/index.astro:35-51`, `src/pages/rss.xml.ts:18-31`, `src/pages/og/[slug].png.ts:24-36`, and `src/pages/blog/[slug].astro:60-85`
- **Why:** four copies of the same draft-filtering frontmatter read drift independently (the RSS-misses-pubs bug above is a symptom); a `src/lib/posts.ts` with one typed loader is the fix that makes the quick-wins cheaper.

### Schema-validate blog frontmatter
- **Effort:** M · **Impact:** med
- **Anchor:** `src/content.config.ts` defines schemas for `projects`/`cv` but blog posts are loaded as raw `matter()` with `as PostFrontmatter` casts (`src/pages/blog/[slug].astro:71-79`)
- **Why:** a typo'd `date` or missing `description` currently fails at render or ships empty; a zod schema (even outside Astro's loader, validated in the new `posts.ts`) fails the build loudly instead.

### Build-time broken-link / asset check
- **Effort:** M · **Impact:** low
- **Anchor:** `scripts/copy-pdfs.sh` + `scripts/copy-blog-assets.sh` copy submodule assets into `public/` with no verification that referenced PDFs exist
- **Why:** a `lychee`/link-check step (container or postbuild) catches a publication whose `pdfPath` (`src/lib/publications.ts:89`) points at a missing file before it 404s in production.

