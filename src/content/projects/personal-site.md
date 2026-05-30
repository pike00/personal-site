---
title: Personal Website
description: Static portfolio that pulls publications and blog posts from git submodules, generates the printable CV from Typst, and deploys to Cloudflare Pages.
repo: https://github.com/pike00/personal-site
tags: ["Astro", "Tailwind CSS", "TypeScript", "Typst"]
date: "2026-04-10"
stack: ["Astro 6", "Tailwind 4", "React 19", "TypeScript", "Typst", "Cloudflare Pages"]
---

This site. A thin static portfolio where publications and posts are the source of truth: drop a paper into the `publications/` submodule or a post into `blog-posts/`, push, and it appears on the homepage, the CV, the relevant tag pages, and the RSS feed without any copy-paste.

## What it does

- **Publications page** with in-browser search, faceted research-area filters, and PDF previews. Search runs Fuse.js over a JSON bundle generated at build time — no Pagefind, no server.
- **Generated CV** in two synced surfaces: the HTML `/cv` page and a Typst-built `/cv.pdf`. Same metadata source for both.
- **Blog and projects** under a single `/blog` feed (you're looking at it). Markdown rendered with `marked` + a custom `shiki` walker for syntax highlighting.
- **Per-page OG cards** generated at build with `satori` + `resvg`, so every post and project has a real social preview.
- **CSP hash sync** runs as a postbuild step — Astro emits inline hydration scripts whose SHA-256 hashes change on every version bump, and a small Node script rewrites the `script-src` allowlist so the React island on `/publications/` keeps hydrating after upgrades.

## How it's built

The interesting design decision was making the `publications/` submodule the source of truth for everything academic. A `lib/publications.ts` loader parses Zotero-style metadata once and flows it into the homepage, `/publications`, `/cv`, the CV PDF generator, and the RSS feed. Adding a paper is a single submodule commit; the GitHub repository-dispatch workflow rebuilds the site without touching this repo.

The CV is built with Typst rather than HTML-to-PDF because the typography is dramatically better and the build is deterministic — same input, same bytes out.

## Why

Off-the-shelf academic themes treated publications as static content. I wanted the list to be a single artifact that every page could read, and I wanted to ship the printable CV from the same data without maintaining two copies. Writing it as a thin Astro site with a typed loader took less time than wrangling a Hugo theme into the same shape, and the result is faster.
