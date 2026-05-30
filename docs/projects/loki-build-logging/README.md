---
title: Loki structured logging for build scripts
status: planned
repos: [personal-site, Homelab]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Add fire-and-forget JSON pushes to Loki from the build scripts, labeled job=personal-site
source: ../../extensions-2026-05-29.md
---

# Loki structured logging for build scripts

## Goal

Emit structured JSON logs from the personal-site build/deploy scripts to the centralized homelab Loki, so deploy cadence, CV-rebuild skips, and citation-cache hits are observable in Grafana.

## Why

The global structured-logging rule requires host-run scripts to push to Loki, but `scripts/build-cv.sh`, `scripts/copy-pdfs.sh`, `scripts/copy-blog-assets.sh`, and `scripts/generate-citations.ts` currently emit nothing. This is a standing rule violation and a missed observability win — the build is a chain of cache-aware steps whose behavior (short-circuit vs rebuild) is invisible today.

## Approach

- Bash scripts: wrap a `curl -s -X POST http://127.0.0.1:3100/loki/api/v1/push` helper that always returns 0 (fire-and-forget, 3s timeout). Log `started` + `complete/failed` with `elapsed_s`, labeled `job=personal-site`, `script=<name>`, `host=<hostname>`.
- `generate-citations.ts`: a tiny JSON push (or shell out to the same helper) reporting cache hit/miss and count.
- Keep label cardinality low (no paths/SHAs as labels — those go in fields).
- Optional: a Grafana panel `{job="personal-site"}` showing deploy/build events over time.

## Tasks

- [ ] Add a shared `loki_push` bash helper (never blocks/raises)
- [ ] Instrument `build-cv.sh`, `copy-pdfs.sh`, `copy-blog-assets.sh` with started/complete events
- [ ] Add cache-hit/miss + count push to `generate-citations.ts`
- [ ] Emit each JSON line to stderr too (terminal visibility)
- [ ] Verify in Grafana with the `{job="personal-site"}` LogQL query

## Anchors

- `scripts/build-cv.sh`, `scripts/copy-pdfs.sh`, `scripts/copy-blog-assets.sh` — no Loki push
- `scripts/generate-citations.ts` — content-hash-cached, no observability
- Global rule: Loki at `http://127.0.0.1:3100/loki/api/v1/push`
