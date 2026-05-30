---
title: Collapse the dual-CSP maintenance burden
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Make sync-csp-hashes.mjs write both public/_headers and Caddyfile from one extracted hash set
source: ../../extensions-2026-05-29.md
---

# Collapse the dual-CSP maintenance burden

## Goal

Make the CSP single-sourced: one hash-extraction pass that updates both `public/_headers` (Cloudflare Pages) and `Caddyfile` (self-hosted fallback), so the two can never silently diverge.

## Why

CSP is defined in two places that must stay in sync, but `scripts/sync-csp-hashes.mjs` only rewrites `public/_headers`. The `Caddyfile` hard-codes its own copy, and the project CLAUDE.md carries a multi-paragraph warning that updating one without the other diverges silently. The documented failure mode is the React island on `/publications/` silently failing to hydrate in production when a hash is stale. Single-sourcing eliminates a real, repeatedly-warned-about footgun.

## Approach

- Extend `sync-csp-hashes.mjs` to extract the inline-script hash set once and write it into both targets, parsing/replacing the `script-src` (and other) directives in each.
- Keep the non-hash origins (umami, rsms.me) as a shared constant the script injects into both, so analytics/font changes also stay in sync.
- Confirm idempotency (re-running produces no diff) and that the `postbuild` hook still covers the Pages path.
- Verify by diffing the two files' CSP after a clean `pnpm build`.

## Tasks

- [ ] Refactor `sync-csp-hashes.mjs` to target an array of files
- [ ] Add a shared static-origins constant used for both files
- [ ] Parse + rewrite the `Caddyfile` CSP block (different syntax than `_headers`)
- [ ] Assert idempotency + verify CSP parity post-build
- [ ] Update project CLAUDE.md once the divergence footgun is gone

## Anchors

- `scripts/sync-csp-hashes.mjs` — current single-target hash sync (`postbuild`)
- `public/_headers` — live CSP (4 inline-script hashes + umami + rsms.me)
- `Caddyfile` — hard-coded duplicate CSP
- Memory: `astro_inline_script_csp_hashes.md`
