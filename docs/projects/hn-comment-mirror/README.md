---
title: Mirror Hacker News (and other aggregator) discussions on blog posts
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Decide tier (link-row vs full-embed island), then add hn.algolia.com to connect-src and build the URL→story lookup
source: ../../extensions-2026-05-29.md
related: self-hosted-comment-server
---

# Mirror Hacker News (and other aggregator) discussions on blog posts

## Goal

Surface the Hacker News discussion for a blog post directly on its page — at minimum a "Discussion on HN" link with points/comment counts, optionally the full comment tree rendered inline. Generalizes to Lobsters and Reddit.

## Why

When a post gets submitted to HN, the discussion often outshines anything a native comment box would attract — and it needs zero infrastructure, no moderation, no spam handling, and no database. For a static, no-tracking, low-maintenance site this is a better fit than (or a complement to) a self-hosted comment server. It's also a well-trodden pattern with several drop-in reference implementations (see Prior art).

This is the recommended **zero-infra first step** relative to [`self-hosted-comment-server`](../self-hosted-comment-server/README.md): mirror the discussion that happened elsewhere before standing up a container to host one here. The two are complementary — mirror = "discussed at," self-hosted = "comment directly."

## Mechanism (Algolia HN Search API — public, no auth)

1. **Find the story** by canonical post URL:
   `https://hn.algolia.com/api/v1/search?query=https://pikemd.com/blog/<slug>/&restrictSearchableAttributes=url`
   — may return multiple submissions; pick the one with the most comments, or list all.
2. **Fetch the comment tree** (full-embed tier only):
   `https://hn.algolia.com/api/v1/items/<storyId>` — nested `children` with author, text (HTML), timestamps. One call, vs the official Firebase API's N-fetches-per-comment.

## Design: two tiers

### Tier 1 — discussion link row (low effort, ages well)
A small row at the bottom of each post: "Discussion on Hacker News · 142 points · 87 comments" linking to the thread, plus optional Lobsters/Reddit. Renders nothing if no story exists.

### Tier 2 — full comment tree inline (higher effort)
Render the HN thread on-page via a React island (the repo already has `@astrojs/react`). Fetch client-side so it stays live — build-time bake would be stale because discussions happen *after* publish and deploys are manual/decoupled (`just deploy`).

Recommendation: ship Tier 1 first; add Tier 2 only if the on-page thread is genuinely wanted.

## Why client-side (not build-time)

HN threads grow after publication; a build-time fetch freezes them at deploy time. A browser-side fetch keeps both tiers fresh with no backend. Trade-off: nothing renders if JS is off, and there's a brief fetch latency — acceptable for a discussion afterthought below the article.

## CSP impact

- Add `https://hn.algolia.com` to **`connect-src`** in both `public/_headers` and `Caddyfile` (currently `connect-src 'self' https://umami.khanpikehome.com`). Generalizing adds `https://www.reddit.com` / `https://lobste.rs`.
- If the renderer is an inline `<script>`, it needs a hash via `scripts/sync-csp-hashes.mjs`. A React island avoids the inline-script hash churn — prefer it. (See [`collapse-dual-csp`](../collapse-dual-csp/README.md) for the dual-file CSP footgun.)

## Tasks

- [ ] Pick tier(s): link-row (Tier 1) and/or full-embed island (Tier 2)
- [ ] Add `hn.algolia.com` to `connect-src` in `public/_headers` + `Caddyfile`
- [ ] Build URL→story lookup (handle multiple submissions; trailing-slash / canonical-URL matching)
- [ ] Tier 1: render points/comments link row on `blog/[slug].astro`
- [ ] Tier 2: React island rendering the `/items/<id>` comment tree (sanitize HN's HTML)
- [ ] Empty state: render nothing when no story matches
- [ ] (Optional) generalize to Lobsters (`lobste.rs/search`) + Reddit (`reddit.com/search.json?q=url:`) as a "Discussed at" aggregate
- [ ] Verify in production with a post that has a real HN thread; check no CSP violations in DevTools

## Prior art / reference implementations

- [TXTPEN/hn](https://github.com/TXTPEN/hn) — auto-embeds the HN comment tree; Preact, queries `hn.algolia.com/api` (~10ms). Closest match to Tier 2.
- [tgallant/embedd](https://github.com/tgallant/embedd) — embeds **HN + Reddit** comments, all queries in-browser; aimed at blogs. Reference for the multi-source generalization.
- [some1else/hn-comments](https://github.com/Some1Else/hn-comments), [fatsell/hn-comments](https://github.com/fatsell/hn-comments) — "embed HN comments on your blog."
- [giscus](https://news.ycombinator.com/item?id=27333384) — GitHub-Discussions-backed comments; the lighter *native*-comments alternative to `self-hosted-comment-server` (repo is already `pike00/personal-site` on GitHub).
- Simon Willison's [HN tooling TILs](https://til.simonwillison.net/hacker-news) — data-plumbing precedent (sqlite import, thread summarization), not inline embedding.
- [Algolia HN Search API docs](https://hn.algolia.com/api)

## Anchors

- `src/pages/blog/[slug].astro:132-137` — article body + existing inline-script pattern; insertion point for the discussion row/island
- `public/_headers` — `connect-src` to extend
- `Caddyfile` — duplicate CSP to keep in sync
- `astro.config.mjs:21-24` — `@astrojs/react` already wired for an island
