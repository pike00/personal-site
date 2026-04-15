---
title: Personal Website
description: Academic portfolio and publication showcase built with Astro, Tailwind CSS, and deployed to Cloudflare Pages.
repo: https://github.com/pike00/personal-site
tags: ["Astro", "Tailwind CSS", "TypeScript"]
date: "2026-04-10"
---

This site — the one you're reading now. A static portfolio that pulls publications from a git submodule, renders PDFs inline, and keeps the CV in version control alongside the code.

## Stack

- **Astro 5** with prerendered static output
- **Tailwind CSS** + `@tailwindcss/typography` for prose pages
- **TypeScript** throughout
- **Typst** for the printable CV, built from the same source data
- Deployed to GitHub Pages via the workflow in `.github/`

## Why build it from scratch

I wanted the publication list to be the source of truth — adding a paper to the submodule should make it appear everywhere (homepage, `/publications`, `/cv`) without copy-pasting. Off-the-shelf academic themes didn't model that cleanly, so I wrote it as a thin Astro site with a `lib/publications.ts` loader that parses the Zotero-style metadata and flows it into every page that needs it.
