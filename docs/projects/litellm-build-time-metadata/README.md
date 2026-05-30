---
title: LiteLLM-drafted descriptions and tags at build time
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Build a build:suggest script that proposes description/tags for content missing them via the LiteLLM proxy
source: ../../extensions-2026-05-29.md
---

# LiteLLM-drafted descriptions and tags at build time

## Goal

A `build:suggest` script that, for any blog post or project missing a `description` or `tags`, drafts candidates via the homelab LiteLLM proxy and writes them to frontmatter on confirmation.

## Why

Descriptions and tags are hand-maintained and easy to forget; missing/empty ones degrade OG cards, SEO, search, and the topic pages. `scripts/generate-citations.ts` is a proven model for a build-time TS script, and `deepseek-v4-pro-cloud` via LiteLLM is the homelab default. Never write silently — propose, confirm, then mutate.

## Approach

- New `scripts/suggest-metadata.ts` (tsx, mirrors the citations script): scan posts/projects, find missing `description`/`tags`, call the LiteLLM proxy with the body text.
- Use the robust JSON-extraction pattern (strip fences, brace-match, parse) — `json_object` mode may be unavailable on the proxy model.
- Interactive confirm per item (or `--write` flag); never auto-edit frontmatter without explicit acknowledgement.
- Optionally suggest tags from the existing tag universe to keep taxonomy consistent (pairs with tag-topic-landing-pages).
- This is a dev-time helper, not part of the deploy `build` chain.

## Tasks

- [ ] Write `scripts/suggest-metadata.ts` scanning posts + projects for gaps
- [ ] LiteLLM call + robust JSON extraction
- [ ] Confirm-before-write frontmatter mutation (gray-matter stringify)
- [ ] Constrain tag suggestions to the existing tag set
- [ ] Add a `suggest` just recipe (not wired into `deploy`)

## Anchors

- `scripts/generate-citations.ts` — build-time TS script model
- Memory: `drawer_extract_json_without_response_format` — JSON extraction pattern
- `src/content/projects/*.md`, `blog-posts/posts/*.md` — frontmatter targets
- Skill: `litellm`
