---
title: Re-enable contact form behind a Cloudflare Worker
status: planned
repos: [personal-site]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: low
next_step: Build a Pages Function/Worker endpoint with Turnstile + email delivery, then flip flags.contact
source: ../../extensions-2026-05-29.md
---

# Re-enable contact form behind a Cloudflare Worker

## Goal

Turn the gated-off contact page back on with a working, spam-resistant submission path that needs no traditional backend.

## Why

`src/lib/flags.ts` has `contact: false` and `src/pages/contact.astro` already exists but is disabled. A Cloudflare Pages Function / Worker + Turnstile gives a serverless submission endpoint that fits the existing Cloudflare Pages deploy, with email delivery handled by the `cloudflare-email-service` skill.

## Approach

- Add a Pages Function (`functions/contact.ts`) or a small Worker that validates a Turnstile token and sends the message via Cloudflare Email Sending (or SES, matching `send-email`).
- Add the Turnstile script/connect origins to CSP in `public/_headers` (and `Caddyfile`).
- Wire `contact.astro` form to POST the endpoint; handle success/error states.
- Flip `flags.contact = true` only after the endpoint is verified end-to-end (real submission → received email).

## Tasks

- [ ] Decide delivery: Cloudflare Email Service vs SES (reuse `send-email` creds)
- [ ] Build + deploy the Function/Worker with Turnstile verification
- [ ] Add Turnstile origins to CSP (`public/_headers` + `Caddyfile`)
- [ ] Wire the form; success/error UX
- [ ] End-to-end test, then flip `flags.contact`

## Anchors

- `src/lib/flags.ts:2` — `contact: false`
- `src/pages/contact.astro` — existing, gated page
- `public/_headers` — CSP needing Turnstile origins
- Skills: `cloudflare-email-service`, `wrangler`, `workers-best-practices`
