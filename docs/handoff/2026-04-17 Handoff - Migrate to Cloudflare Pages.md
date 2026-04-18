---
summary: "Migrate pikemd.com from GitHub Pages to Cloudflare Pages -- done, needs tf apply + secrets"
---

# Handoff: Migrate to Cloudflare Pages

**Date:** 2026-04-17
**Goal:** Fix missing security headers on pikemd.com by migrating from GitHub Pages to Cloudflare Pages, with security headers via `_headers` file and CV PDF generation in GitHub Actions.

## Current Status

All code changes are written. Not yet deployed -- Terraform hasn't been applied and GitHub secrets haven't been added.

Completed:
- `public/_headers` created with all six security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- `.github/workflows/deploy.yml` rewritten to build CV PDF via Typst + deploy to CF Pages via Wrangler
- Homelab Terraform updated: `pikemd_zone_id` variable, `pikemd_root` CNAME DNS record, new `pages.tf` with `cloudflare_pages_project` + `cloudflare_pages_domain`

## Next Steps

1. Get pikemd.com zone ID from Cloudflare dashboard and add `pikemd_zone_id` to tfvars/env
2. `cd ~/Documents/Homelab/infra/gateway/cloudflare && terraform apply` -- creates Pages project, domain binding, DNS CNAME
3. In the GitHub repo settings (personal-site), add two secrets:
   - `CLOUDFLARE_PAGES_TOKEN` -- API token with "Cloudflare Pages: Edit" permission scoped to the account
   - `CLOUDFLARE_ACCOUNT_ID` -- your Cloudflare account ID
4. Push a commit to `main` to trigger the first Wrangler deployment
5. Verify pikemd.com resolves and re-run the security header scan

## Key Context

- CF Pages uses **direct upload** (no GitHub source integration) -- GitHub Actions builds the site and pushes via `wrangler pages deploy dist --project-name=personal-site`
- Typst is installed in GHA via `typst-community/setup-typst@v4`; `npm run build:cv` generates `public/cv.pdf` before `npm run build`
- `public/_headers` is copied to `dist/` automatically by Astro during build; no Astro config changes needed
- Cloudflare provider v5.16 (`cloudflare_pages_project`, `cloudflare_pages_domain`) -- no `source` block in the project resource since we're using direct upload
- The `access-control-allow-origin: *` header is left as-is (set by GitHub Pages origin, will go away once CF Pages serves the site directly)
- CSP uses `'unsafe-inline'` for scripts and styles -- can be tightened later once inline usage is audited

## Files Touched

- `personal-site/.github/workflows/deploy.yml` -- rewritten
- `personal-site/public/_headers` -- new
- `Homelab/infra/gateway/cloudflare/variables.tf` -- added `pikemd_zone_id`
- `Homelab/infra/gateway/cloudflare/dns.tf` -- added `pikemd_root` CNAME + `pikemd_zone_id` local
- `Homelab/infra/gateway/cloudflare/pages.tf` -- new file

## Blockers

- Waiting on: `pikemd_zone_id` added to tfvars, `CLOUDFLARE_PAGES_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets added to GitHub repo
- GitHub Pages environment/deployment should be disabled after CF Pages is live to avoid confusion
