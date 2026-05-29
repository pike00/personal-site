---
title: MedPeds
description: Free clinical quick-reference for Internal Medicine and Pediatrics — 105 curated resources, in-page PDF viewer, faceted search, print-optimized for bedside use.
url: https://mp.khanpikehome.com
tags: ["Astro", "Tailwind CSS", "Cloudflare Pages", "Medicine"]
date: "2026-05-11"
status: "active"
stack: ["Astro 4", "Tailwind CSS", "Pagefind", "Cloudflare Pages", "Python", "docling", "LiteLLM"]
---

A free clinical quick-reference site for residents in combined Internal Medicine and Pediatrics, built for my wife while she's in residency. The motivating problem: the canonical guidelines for any given clinical question are scattered across the AAP, USPSTF, CDC, AHA, ADA, NICE, individual specialty societies, and a long tail of calculators and bedside tools. A senior resident in clinic or hospital shouldn't have to remember which PDF lives on which org's site.

## What it does

- **105 curated resources** across 8 sections — preventive care, guidelines (sub-specialty grouped), critical care, pediatrics, reference, drugs, technique, and "root" curated landing pages. Every entry is tagged by audience (adult / peds), source organization, and asset type.
- **Faceted in-browser search** via [Pagefind](https://pagefind.app/) — static, build-time, zero infra. Section, audience, and source-org chips are URL-state persisted so a filtered view is a shareable link.
- **In-page PDF viewer** for resources that can be legally republished — the canonical AAP periodicity schedule, ACIP immunization schedule, AHA ACLS algorithm cards, NICE guideline summaries — vendored locally so they load instantly and survive upstream link rot. External links open in a new tab for everything else.
- **Hand-authored bedside reference pages** for things that don't compress well into a PDF or link out — a NICU bedside reference with cited values, hypoglycemia management, electrolyte derangement quick-reference. Each is a content collection page in MDX, with inline citations and a print-only CSS layout that turns it into a clean handout.
- **Print-optimized** throughout. Catalog pages, immunization schedules, and reference cards all have a separate print stylesheet that strips chrome and reflows for paper — because a working resident often wants a single sheet pinned next to the workstation, not a tab they have to find again.

## How it's built

Astro 4 + Tailwind, deployed to Cloudflare Pages as a fully static site. There's intentionally no backend — search is Pagefind, the catalog is a YAML file generated from a `sources.yaml` manifest, and the resource PDFs live in `public/pdfs/` alongside the rest of the static assets. Local-only deploy via `wrangler pages deploy` — no CI, just `just deploy` from a workstation that can decrypt the Cloudflare API token via SOPS.

## Why

Residency hours are bad, and the existing reference apps either gate content behind institutional subscriptions or wrap it in interstitials and tracking. A site that loads instantly, works offline-ish (the PDFs are cached locally), prints cleanly, and surfaces the actual authoritative source for every claim is a small thing — but it removes friction in the exact moments when friction is most expensive. Built for one resident; useful for any of them.

## Next

- **Decide the search backend.** Pagefind is fine at 105 entries; the question is what to use when the catalog includes the full text of every PDF rather than just titles + notes. Algolia is the lowest-effort wire-up; Meilisearch Cloud preserves the ingest pipeline's existing schema. Decision deferred until search latency or recall actually degrades.
- **More hand-authored bedside pages.** The NICU reference is the proof of concept — common ones queued: pediatric fluid management, adult ACLS reversibility checklist, neonatal hyperbilirubinemia thresholds, common rashes differential.
- **Mobile-first audit.** The current layout reads fine on a phone but wasn't designed for it. Residents pull this up between rooms; the catalog filter UX deserves a touch-first pass.
