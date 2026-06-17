# personal-site — Claude notes

Project-specific instructions. Defers to `~/.claude/CLAUDE.md` for global rules.

## What this is

Static site for pikemd.com. Astro 6 + React 19 + Tailwind 4. Deploys to **Cloudflare Pages** (the README still says "GitHub Pages" — stale). Production URL: https://pikemd.com.

Public GitHub repo: `pike00/personal-site`. Per global rules: **never push without explicit user approval**.

## Just recipes (run `just` for the full list)

- `just deploy` (alias `just ship`) — refuses dirty tree, sources `build.env.sops`, builds CV + site, runs `wrangler pages deploy dist --commit-hash=<HEAD>`, purges the Cloudflare zone cache. Does **not** bump `package.json`, tag, or push — those are independent. This is the canonical deploy path; there is no CI fallback.
- `just dev` — brings up the per-worktree preview stack at `https://<slug>.personal-site.khanpikehome.com` via `compose.worktree.yml` (Traefik-routed, hot-reloaded). No setup or `.env` needed: the preview domain is hardcoded in `preview-kit.toml`'s `host_pattern` (`{slug}.personal-site.khanpikehome.com`). First boot is slow because pnpm install runs inside the container; subsequent edits hot-reload through Vite's WebSocket. From `preview.just`.
- `just astro-dev [port]` — bare Astro dev server bound to the host's Tailscale IP with `VITE_ALLOWED_HOSTS` set to the MagicDNS name. Default port 4321. Use this for pure host-side iteration without Traefik.
- `just publish <slug>` — flips `draft: false` in `blog-posts/posts/<slug>.md`, commits+pushes the `pike00/blog` submodule, bumps the pointer here, pushes. Idempotent.
- `just new-post <slug> [title]` — scaffold a new draft in `blog-posts/posts/`.
- `just update-pubs` / `just update-blog` — fast-forward submodule + copy assets + commit pointer bump (no push).

## Deploy

### How it actually deploys

**Local-only, no CI.** There is no `.github/workflows/` directory. Pushing to `main` archives the commit on GitHub but does **not** trigger a deploy. The only path to production is running `just deploy` on a machine that can decrypt `build.env.sops` (today: `ares`).

```
just deploy
  ├─ refuses dirty tree (uncommitted/staged changes)
  ├─ sources build.env.sops via `just _decrypt` (→ `sopsx build.env.sops -d`,
  │   falls back to `sops --config .sops.yaml --decrypt --input-type dotenv …`)
  │   (NOT `sops exec-env` — no --input-type, mis-detects .sops as JSON, sops #717)
  └─ just _deploy
       ├─ pnpm build:cv            # Typst → public/cv.pdf
       ├─ pnpm build               # build:{pdfs,blog-assets,citations} in parallel → astro build
       │                           # → postbuild: scripts/sync-csp-hashes.mjs
       ├─ pnpm exec wrangler pages deploy dist \  # wrangler is a devDep, NOT pnpm dlx
       │     --project-name=personal-site \
       │     --commit-hash=$(git rev-parse HEAD)
       └─ POST /zones/$ZONE/purge_cache  (purge_everything: true)
```

Astro injects the short commit hash into the footer via `astro.config.mjs` (`import.meta.env.COMMIT_HASH`), so the live footer should match the SHA passed to wrangler. Pages records the same SHA in its deployment metadata. If those diverge the deploy was run on a dirty tree against the rule, or against a stale checkout.

### Consequences worth knowing

- **`git push` is decoupled from deploy.** Land commits on `main` whenever; nothing ships until someone runs `just deploy`. This is intentional — Cloudflare-Pages-via-GitHub-integration was retired in favor of local-first deploys (see global CLAUDE.md "Release tooling").
- **No version bump, no tag.** Despite the verb being shared with other repos' `release-kit cut`, `just deploy` here neither edits `package.json` nor creates a git tag. The "version" surfaced in the footer is the commit short SHA, not a semver.
- **No `repository_dispatch`, no `workflow_dispatch`.** External submodule pushes (`pike00/blog`, `pike00/publications`) do not trigger anything. To ship new submodule content, locally: bump the submodule pointer, commit, then `just deploy`. `just publish <slug>`, `just update-pubs`, and `just update-blog` automate the pointer bump.
- **CSP hashes must regenerate before deploy.** `scripts/sync-csp-hashes.mjs` runs as the `postbuild` hook of `pnpm build`, so a clean `just deploy` handles it; only the alternative Caddy container path bypasses it (see below).
- **The pre-push secret scanner runs on push, not deploy.** Going from "merged commit" to "live site" never reaches the scanner. Secrets in committed code WILL deploy. The scanner only protects the GitHub mirror.

### Secrets

`build.env.sops` at the repo root holds the Cloudflare deploy secrets (NOT GitHub repo settings — those have no role anymore). These are deploy-only; the dev stack needs none, and there is no `.env`:

- `CLOUDFLARE_API_TOKEN` — scoped to Pages:Edit + Cache Purge for the personal-site project
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `PUBLIC_TURNSTILE_SITE_KEY` — public Turnstile key, baked into the build for the contact form

Edit with `sopsx build.env.sops` (edit mode — opens `$EDITOR` on the decrypted temp, re-encrypts on save; non-interactively, set `SOPS_FORCE_CLI=1 EDITOR=<script>`). Read with `sopsx build.env.sops -d`. The `-d | sed | -e` stdin re-encrypt pipe is **broken under sops 3.13.1** (the encrypt path operates on the named file rather than stdin) — use edit mode. Recipients/age key are in `.sops.yaml`; private key at `~/.config/sops/age/keys.txt` on each authorized host. `sopsx` is the homelab wrapper (`infra/scripts/sopsx`); it forces the homelab `.sops.yaml`, which carries the identical age recipient, so re-encrypts stay decryptable.

### Self-hosted Caddy build (alternative, not currently deployed)

`Dockerfile` + `Caddyfile` build a static Caddy container serving `dist/` on `:8080`. Used only if migrating off Cloudflare Pages. As of 2026-05-29 the CSP is single-sourced: `scripts/sync-csp-hashes.mjs` (the `pnpm build` `postbuild` hook) generates the full policy from one structured definition and writes it into **both** `public/_headers` and `Caddyfile`, so the two can no longer diverge. Do not hand-edit the CSP in either file — change `CSP_DIRECTIVES`/`SHARED_ORIGINS` in the script and rebuild.

## Build gotchas

### `npm run build` does NOT build the CV

`package.json` `"build"` runs `build:pdfs`, `build:blog-assets`, `build:citations` in parallel via pnpm's regex script runner (`pnpm run "/^build:(pdfs|blog-assets|citations)$/"`), then `astro build`. CV PDF generation (`build:cv` → Typst) is a **separate** script that `just deploy` runs explicitly before `pnpm build`. Running `pnpm build` alone will produce a site whose `/cv.pdf` is whatever was last committed to `public/`. `build:cv` short-circuits if `public/cv.pdf` is newer than both `src/content/cv/template.typ` and `src/content/cv/cv.md`. To match a real deploy:

```sh
pnpm build:cv && pnpm build
```

### `build:citations` emits `public/CITATION.cff`

`build:citations` (`tsx scripts/generate-citations.ts`) IS part of the `build` chain — it walks `publications/Publications/*/metadata.yml` + `src/content/publication-tags.yaml`, builds a CITATION.cff, and writes it to `public/`. The runtime publication listings on the site come from the same source data via `src/lib/publications.ts`; the .cff is a separate artifact for GitHub's Citation File Format integration. The script is cached by source-file SHA-256 in `node_modules/.cache/citations.stamp` — clean rebuilds invalidate, edits to a `metadata.yml` or the tags file invalidate, everything else short-circuits to "up to date".

### Submodules are required

`publications/` and `blog-posts/` are git submodules. Without them the Publications page, homepage recent-pubs, CV pub counts, and blog index render empty. `just deploy` does not initialize submodules — that's on you:

```sh
git submodule update --init --recursive
```

### Notes (blog) markdown pipeline: shiki + marked-footnote

[src/pages/notes/[slug].astro](src/pages/notes/[slug].astro) renders posts (served at `/notes`; legacy `/blog/*` URLs 301-redirect there via `astro.config.mjs`) with `marked` + custom `walkTokens` that calls shiki's `codeToHtml` for syntax highlighting (theme: `github-dark`). Two non-obvious things:

- A fresh `Marked` instance is created **per post** inside the `Promise.all`. `marked-footnote` keeps shared closure state (an `e.hasFootnotes` flag) that races and throws `Cannot read properties of undefined (reading 'filter')` when the same instance parses multiple posts concurrently.
- Syntax highlighting goes through `walkTokens` + a custom `code` renderer, **not** via `marked-shiki` — the plugin conflicts with marked-footnote's tokenizer at `node_modules/marked-footnote/dist/index.js:54`.

If you add another markdown-rendering page (about, projects), repeat the same pattern — don't try to share a Marked instance.

### CSP is single-sourced — never hand-edit it

CSP is enforced in two files but **authored in one place**. As of 2026-05-29, `scripts/sync-csp-hashes.mjs` (the `pnpm build` `postbuild` hook) generates the entire policy from one structured definition and writes it into **both**:

- [public/_headers](public/_headers) — served by Cloudflare Pages (the live deploy), `Content-Security-Policy: <policy>` syntax
- [Caddyfile](Caddyfile) — the alternative self-hosted container build, `Content-Security-Policy "<policy>"` syntax

The two can no longer silently diverge. The previous failure mode — a stale `Caddyfile` hash silently breaking the `/publications/` React island in the self-hosted build — is structurally eliminated.

`script-src` pins per-script `sha256-...` hashes for every inline `<script>` Astro emits (the `astro:load` shim, the `client:load` island runner that hydrates `<SearchPublications>`, per-page inline handlers, the analytics shim). These change on **every Astro version bump** and whenever any inline `<script>` in `src/` changes — but you don't track them by hand: the postbuild hook re-extracts them from `dist/` on every build.

To change the CSP (add an origin, swap analytics/fonts, etc.), edit `CSP_DIRECTIVES` / `SHARED_ORIGINS` at the top of `scripts/sync-csp-hashes.mjs` and rebuild — **do not** edit `public/_headers` or `Caddyfile` directly; the next build would overwrite a `_headers` edit and the script owns the whole policy. Verify after a deploy by opening DevTools on `/publications/`; any CSP violation there means a hash or origin is missing from the generated policy.

Static origins currently allowlisted (in `SHARED_ORIGINS`): `https://umami.khanpikehome.com` (script-src + connect-src) for analytics; `https://rsms.me` (style-src + font-src) for the Inter web font.

## Local dev

```sh
npm install
just dev             # tailnet-bound, reachable from other devices
# or: npm run dev    # localhost:4321 only
```

`npm run dev` chains `build:pdfs` + `build:blog-assets` once at startup. The dev server does not re-run them on reload — restart after touching `publications/`, `blog-posts/`, or the CV `.typ` source. CV PDF is not rebuilt by the dev server at all; run `npm run build:cv` separately if you change the `.typ`.

## Content layout

- `src/content/` — Astro content collections: `cv/` (single doc), `projects/` (per-project markdown), `about.md`, `publication-tags.yaml`. Schemas in `src/content.config.ts`. There is no `blog` content collection in `src/content/` — blog posts live in the `blog-posts/` submodule and are loaded directly by `src/pages/notes/[slug].astro` (through the `src/lib/posts.ts` loader: `fs` + `gray-matter`) and served at `/notes`.
- `publications/` (submodule) — publication PDFs + frontmatter, copied into `public/Publications/` by `scripts/copy-pdfs.sh`.
- `blog-posts/` (submodule, `pike00/blog`) — blog markdown + assets, copied into `public/blog/` by `scripts/copy-blog-assets.sh`.

`src/pages/` is route-based (no `_routes.json`). `whoami` is filtered out of the sitemap in `astro.config.mjs`.

No Pagefind. No MDX integration. Search is in-browser via Fuse.js over a JSON bundle generated at build time.

## Writing posts

Blog posts here are empirical, investigative technical pieces (see the neural-net date-stamp and tailnet-deploy posts), not marketing copy. **Before drafting a new post in `blog-posts/posts/` from scratch, or substantially rewriting an existing one, invoke the `measured-voice` skill first** — it owns the voice rules (hedged-but-committed claims, evidence accumulation, flat-affect tone, first-person investigation, peer-to-peer register) plus a review checklist. Don't hand-write or hand-edit post prose without it loaded; the skill is the source of truth for voice, not this file. `article-writing` is the umbrella long-form skill and `measured-voice` is its empirical preset — reach for `measured-voice` by default on this blog. New posts making empirical or factual claims should be fact-checked against primary sources before publish.

## Analytics

Only **Umami** (self-hosted at `umami.khanpikehome.com`, homelab `apps/umami`, website ID `e195e031-845c-4950-a08b-bd4a44038ab3`) — wired in [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro). GoatCounter was removed in commit `19819ed`. Umami runs on the same parent domain as the rest of the homelab so household-wide blocklists can't filter it selectively.

If you swap analytics: update the `script-src` (script origin) and `connect-src` (API origin — Umami POSTs to `/api/send`) entries in `SHARED_ORIGINS`/`CSP_DIRECTIVES` in `scripts/sync-csp-hashes.mjs` (single-sourced into both `public/_headers` and `Caddyfile` on build). A new inline shim is hashed automatically by the postbuild step.

## Contact form

Gated behind `flags.contact` in [src/lib/flags.ts](src/lib/flags.ts) (currently `true`). The page [src/pages/contact.astro](src/pages/contact.astro) renders a name/email/message form plus a Cloudflare **Turnstile** widget; [public/js/contact-form.js](public/js/contact-form.js) serializes it and POSTs JSON to `/api/contact`.

### Backend: a Cloudflare Pages Function, NOT an Astro route

[functions/api/contact.ts](functions/api/contact.ts) is a **Pages Function** at the repo root (outside `src/`, so Astro never touches it). `wrangler pages deploy dist` auto-bundles the top-level `functions/` directory — no config or recipe change needed. The function: validates input → verifies the Turnstile token via `challenges.cloudflare.com/turnstile/v0/siteverify` → posts the message to a **Mattermost incoming webhook**.

**Why Mattermost and not Cloudflare Email:** Email Sending is the obvious fit but it requires a **paid Workers plan** — on the free plan `wrangler email sending enable pikemd.com` returns `Unauthorized [code: 2036]` (account not entitled), and `send_email` is anyway **not a supported Pages Functions binding**. Mattermost is free, homelab-native, and reachable from the CF edge because `chat.khanpikehome.com` is public-tier.

### Delivery target

Submissions land in the private **#website-contact** channel on the `khanpikehome` Mattermost team (channel id `8in11tpc4bg7ipquhet9pnsnma`, owner `will`). The incoming webhook was created with `mmctl --local`:

```sh
docker exec mattermost mmctl --local channel create --team khanpikehome \
  --name website-contact --display-name "Website Contact" --private
docker exec mattermost mmctl --local channel users add khanpikehome:website-contact will
docker exec mattermost mmctl --local webhook create-incoming \
  --channel 8in11tpc4bg7ipquhet9pnsnma --user will \
  --display-name "pikemd.com contact form"
# URL = https://chat.khanpikehome.com/hooks/<returned-id>
```

To re-test delivery without Cloudflare in the path (bypass the bot-block per the global validation rule):

```sh
curl -sk --resolve "chat.khanpikehome.com:443:100.119.100.85" \
  -X POST "https://chat.khanpikehome.com/hooks/<id>" \
  -H 'Content-Type: application/json' -d '{"username":"pikemd.com","text":"test"}'
# expect: ok / HTTP 200, message appears in #website-contact
```

### Secrets and config

- **`MATTERMOST_WEBHOOK_URL`** — Pages project secret (set via `wrangler pages secret put MATTERMOST_WEBHOOK_URL --project-name=personal-site`). The webhook URL is a credential; it lives only in the Pages secret store, never in git or `build.env.sops`.
- **`TURNSTILE_SECRET`** — Pages project secret. Create a Turnstile widget for hostname `pikemd.com` (CF dashboard → Turnstile), then `wrangler pages secret put TURNSTILE_SECRET --project-name=personal-site`.
- **`PUBLIC_TURNSTILE_SITE_KEY`** — the public site key, baked into the page at build time. Set it in `build.env.sops` (exported into the build by `just deploy`'s `set -a`) or replace the placeholder default in [src/lib/contact.ts](src/lib/contact.ts). Until set, the widget shows "invalid site key" and the form fails safe (won't submit).

Pages secrets are NOT in `build.env.sops` (those `CLOUDFLARE_*` keys are only for the wrangler deploy + cache purge). Set Pages secrets with `wrangler pages secret put <NAME> --project-name=personal-site` or the dashboard.

### CSP

Turnstile needs `https://challenges.cloudflare.com` in `script-src` (api.js), `connect-src` (siteverify), and `frame-src` (the challenge iframe). These live in `SHARED_ORIGINS.turnstile` / `CSP_DIRECTIVES` in `scripts/sync-csp-hashes.mjs`, single-sourced into both `public/_headers` and `Caddyfile`. Don't hand-edit either file.

## Repo metadata to keep in sync

- `README.md` still says "GitHub Pages" and "Astro 5" — both wrong as of 2026-05 (it's Cloudflare Pages + Astro 6). Fix if you rewrite README; do not trust it for runtime facts.
- `package.json` engines pin Node `>=22.12.0`; the Dockerfile pins Node 24. `just deploy` uses whatever Node is on the host (currently Node 24 on ares). Don't downgrade.
- `astro.config.mjs` injects `import.meta.env.COMMIT_HASH` from `git rev-parse --short HEAD` (or `$COMMIT_HASH` env var if set — Dockerfile passes `--build-arg COMMIT_HASH`). Used in the footer; expect `unknown` if built outside a git checkout.
- `.pre-push-allowlist` exists at repo root — the global pre-push secret scanner respects it. Add new public-by-design hostnames here, not by widening the scanner.
