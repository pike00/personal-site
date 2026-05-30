---
title: Self-hosted comment server for the blog
status: planned
repos: [personal-site, Homelab]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Reconcile with the existing Homelab "commenting system on blog" project, then pick Comentario vs Isso
source: ../../extensions-2026-05-29.md
related: Homelab/docs/projects/commenting-system-on-blog
---

# Self-hosted comment server for the blog

## Goal

Add a privacy-respecting, self-hosted comment box to blog post pages, served from a Traefik-fronted container in the homelab.

## Why

`src/pages/blog/[slug].astro` renders the article body with no discussion affordance. A self-hosted server (Comentario or Isso) at e.g. `comments.khanpikehome.com` fits the existing Traefik routing pattern and avoids third-party tracking — consistent with the Umami-only analytics stance.

## Prior art / coordination

There is already a Homelab project directory `~/Documents/Homelab/docs/projects/commenting system on blog/`. **Before building, reconcile with it** — this personal-site project should own the frontend/CSP integration while the Homelab project owns the container/Traefik route, or the two should merge. Do not duplicate the service decision.

## Approach

- Decide Comentario vs Isso (moderation, SSO, footprint).
- Stand up the container in Homelab (`apps/<svc>`), Traefik route, persistent volume, backup.
- Embed the widget on `blog/[slug].astro`; add the comment server origin to `connect-src` (and script-src if it ships an inline loader) in **both** `public/_headers` and `Caddyfile`.
- Recompute CSP hashes if a new inline script is introduced.

## Tasks

- [ ] Reconcile scope with the Homelab `commenting system on blog` project
- [ ] Choose comment engine (Comentario vs Isso)
- [ ] Deploy container + Traefik route + backup (Homelab side)
- [ ] Embed widget on blog post template
- [ ] Update CSP in `public/_headers` + `Caddyfile`; recompute hashes
- [ ] Verify a real comment round-trips in production

## Anchors

- `src/pages/blog/[slug].astro:132-135` — article body, no comments
- `public/_headers` + `Caddyfile` — dual CSP (see collapse-dual-csp)
- `~/Documents/Homelab/docs/projects/commenting system on blog/` — existing related project
