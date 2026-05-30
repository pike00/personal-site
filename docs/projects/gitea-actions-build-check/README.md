---
title: Gitea Actions build check
status: planned
repos: [personal-site, Homelab]
started: 2026-05-29
last_updated: 2026-05-29
effort: M
impact: med
next_step: Pull-mirror the repo into Gitea and add a .gitea/workflows job running pnpm build
source: ../../extensions-2026-05-29.md
---

# Gitea Actions build check

## Goal

Run `pnpm build` (submodules + CSP-hash sync) as an automated check on the homelab Gitea instance, catching broken builds before a manual `just deploy`.

## Why

Deploys are local-only with no CI — pushing to `main` archives the commit but nothing validates it. A broken build (bad frontmatter, missing submodule asset, CSP drift) is only discovered at the next manual deploy. Gitea Actions already runs `.gitea/workflows/*.yml` for plaid-sync, finance-hub, and personal-crm with a runner colocated on ares; this mirrors that pattern without reintroducing the GitHub-Pages CI that was deliberately retired.

## Approach

- Create a pull-mirror of `pike00/personal-site` in Gitea (`gitea.lab.khanpikehome.com`).
- Add `.gitea/workflows/build.yml`: checkout with `submodules: recursive`, corepack/pnpm, `pnpm install`, `pnpm build:cv && pnpm build`. The postbuild CSP-hash sync runs as part of `pnpm build`.
- Keep it a check only — no deploy step (deploy stays local-first via `just deploy`).
- Depends on the pending Gitea runner token setup (see Homelab CLAUDE.md "Gitea Actions pending setup").

## Tasks

- [ ] Ensure Gitea runner is registered (token step from Homelab setup)
- [ ] Create Gitea pull-mirror for personal-site
- [ ] Author `.gitea/workflows/build.yml` (submodules + pnpm + build)
- [ ] Confirm a green run on a clean commit and a red run on an intentionally broken one
- [ ] Document in project CLAUDE.md that a build check exists (it currently says "no CI")

## Anchors

- Project CLAUDE.md — "Local-only, no CI … no `.github/workflows/`"
- `package.json:11-12` — `build` chain + `postbuild` CSP sync
- Homelab: `.gitea/workflows/*.yml` precedent (plaid-sync/finance-hub/personal-crm)
