# personal-site — Claude notes

Project-specific instructions. Defers to `~/.claude/CLAUDE.md` for global rules.

## What this is

Static site for pikemd.com. Astro 6 + React 19 + Tailwind 4. Deploys to **Cloudflare Pages** (the README still says "GitHub Pages" — stale). Production URL: https://pikemd.com.

Public GitHub repo: `pike00/personal-site`. Per global rules: **never push without explicit user approval**.

## Just recipes (run `just` for the full list)

- `just deploy` — bumps `package.json` version (prompts patch/minor/major), commits, tags, pushes, then `wrangler pages deploy` + cache purge using sops-loaded creds from `.env.sops`. Refuses to run with a dirty tree. This is the canonical release path; CI also runs on the resulting push.
- `just dev [port]` — Astro dev server bound to the host's Tailscale IP with `VITE_ALLOWED_HOSTS` set to the MagicDNS name. Default port 4321. Use this instead of `npm run dev` so the dev box is reachable from other tailnet devices.
- `just publish-post <slug>` — flips `draft: false` in `blog-posts/posts/<slug>.md`, commits+pushes the `pike00/blog` submodule, bumps the pointer here, pushes. Idempotent.
- `just update-pubs` / `just update-blog` — fast-forward submodule + copy assets + commit pointer bump (no push).

## Deploy

### How it actually deploys

`git push origin main` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs on GitHub-hosted runner → builds → `wrangler pages deploy dist --project-name=personal-site` (via `cloudflare/wrangler-action@v4`) → Cloudflare zone-wide cache purge.

A successful run is ~50–70s. Watch with:

```sh
gh run watch                                     # most recent
gh run list --workflow=deploy.yml --limit 5      # history
```

### Triggers

The workflow listens for:

- `push` to `main` — the normal path.
- `repository_dispatch` with `event_type: publications-updated` or `blog-updated` — fired from the `publications` / `blog-posts` submodule repos when their upstream content lands, so the site rebuilds without a code change here. Note: a dispatch rebuilds against the **submodule pointer recorded in this repo**, not the submodule's latest commit. New content needs the pointer bumped here too (which `just publish-post` does). Trigger a no-op rebuild manually with:
  ```sh
  gh api repos/pike00/personal-site/dispatches -f event_type=publications-updated
  ```
  Triggering blog-updated cross-repo from a workflow needs a token. The `pike00/blog` repo's `.github/workflows/notify-site.yml` does this with `SITE_DEPLOY_TOKEN` — a fine-grained PAT scoped to `pike00/personal-site` with **Contents: read+write**. (Counterintuitive but `repository_dispatch` maps to the Contents permission, not Actions.) If the token errors with "Bad credentials", regenerate it: https://github.com/settings/personal-access-tokens/new.

No `workflow_dispatch` is configured, so `gh workflow run deploy.yml` does not work. To force a no-op deploy, push an empty commit:

```sh
git commit --allow-empty -m "chore: trigger deploy"
git push origin main          # only after explicit user approval — public repo
```

### Required secrets (already set on the repo)

- `CLOUDFLARE_PAGES_TOKEN` — API token scoped to Pages:Edit + Cache Purge
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

### Manual deploy from a laptop

Use `just deploy` (preferred — see Just recipes above). It runs `sops exec-env .env.sops just _deploy` so credentials never hit the shell. Required keys in `.env.sops`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`. Edit with `sops .env.sops` (recipients/age key configured in `.sops.yaml`).

### Self-hosted Caddy build (alternative, not currently deployed)

`Dockerfile` + `Caddyfile` build a static Caddy container serving `dist/` on `:8080`. Used only if migrating off Cloudflare Pages. The Caddyfile hard-codes its own copy of the CSP — if you update `public/_headers`, update `Caddyfile` too or the two diverge silently.

## Build gotchas

### `npm run build` does NOT build the CV

`package.json` `"build"` is `build:pdfs && build:blog-assets && astro build`. CV PDF generation (`build:cv` → Typst) is a **separate** script that the GHA workflow runs explicitly before `npm run build`. Locally, `npm run build` will produce a site whose `/cv.pdf` is whatever was last committed to `public/`. To match CI exactly:

```sh
npm run build:cv && npm run build
```

### `build:citations` is dead

`package.json` defines `build:citations` (`tsx scripts/generate-citations.ts`) but nothing invokes it — not the `build` chain, not CI, not the Dockerfile. Citation metadata is generated at runtime from publication source files via `src/lib/`, not from a prebuilt artifact. The README claim that `npm run build` runs citations is wrong. Either wire it into `build` or delete it; do not assume it has run.

### Submodules are required

`publications/` and `blog-posts/` are git submodules. Without them the Publications page, homepage recent-pubs, CV pub counts, and blog index render empty. CI checks them out with `submodules: recursive`. Locally:

```sh
git submodule update --init --recursive
```

### Blog markdown pipeline: shiki + marked-footnote

[src/pages/blog/[slug].astro](src/pages/blog/[slug].astro) renders posts with `marked` + custom `walkTokens` that calls shiki's `codeToHtml` for syntax highlighting (theme: `github-dark`). Two non-obvious things:

- A fresh `Marked` instance is created **per post** inside the `Promise.all`. `marked-footnote` keeps shared closure state (an `e.hasFootnotes` flag) that races and throws `Cannot read properties of undefined (reading 'filter')` when the same instance parses multiple posts concurrently.
- Syntax highlighting goes through `walkTokens` + a custom `code` renderer, **not** via `marked-shiki` — the plugin conflicts with marked-footnote's tokenizer at `node_modules/marked-footnote/dist/index.js:54`.

If you add another markdown-rendering page (about, projects), repeat the same pattern — don't try to share a Marked instance.

### CSP allowlist must be re-extracted after Astro upgrades

CSP is defined in **two** places that must stay in sync:

- [public/_headers](public/_headers) — served by Cloudflare Pages (the live deploy)
- [Caddyfile](Caddyfile) — used only by the alternative self-hosted container build

Both pin per-script `sha256-...` hashes for every inline `<script>` Astro emits. Current allowlist has 4 hashes covering the `astro:load` shim, the client-directive runner that hydrates `client:load` islands (what makes `<SearchPublications>` work), per-page inline handlers (e.g. projects-page card-click, dark-mode toggle, inline-code copy-on-click), and the analytics shim. These hashes change with **every Astro version bump** and when any inline `<script>` in `src/` changes. Symptoms when stale: the React island on `/publications/` silently stops hydrating in production (search and dropdowns inert; dev mode looks fine because it ships different scripts).

Recompute and update with:

```sh
npm run build
python3 - <<'PY'
import re, hashlib, base64, glob, os
seen = {}
for p in glob.glob('dist/**/*.html', recursive=True):
    for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', open(p).read(), re.S):
        h = 'sha256-' + base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode()
        seen.setdefault(h, os.path.relpath(p, 'dist'))
for h, p in seen.items():
    print(h, p)
PY
```

Compare the printed set against `script-src` in **both** `public/_headers` and `Caddyfile`; add any missing hashes to both. Verify on the deployed site by opening DevTools console on `/publications/` — any `Content Security Policy` violation there means a hash is missing.

Other CSP origins currently allowlisted: `https://umami.khanpikehome.com` (script-src + connect-src) for analytics; `https://rsms.me` (style-src + font-src) for Inter web font. Update both files if you change either.

## Local dev

```sh
npm install
just dev             # tailnet-bound, reachable from other devices
# or: npm run dev    # localhost:4321 only
```

`npm run dev` chains `build:pdfs` + `build:blog-assets` once at startup. The dev server does not re-run them on reload — restart after touching `publications/`, `blog-posts/`, or the CV `.typ` source. CV PDF is not rebuilt by the dev server at all; run `npm run build:cv` separately if you change the `.typ`.

## Content layout

- `src/content/` — Astro content collections: `cv/` (single doc), `projects/` (per-project markdown), `about.md`, `publication-tags.yaml`. Schemas in `src/content.config.ts`. There is no `blog` content collection in `src/content/` — blog posts live in the `blog-posts/` submodule and are loaded directly by `src/pages/blog/[slug].astro` via `fs` + `gray-matter`.
- `publications/` (submodule) — publication PDFs + frontmatter, copied into `public/Publications/` by `scripts/copy-pdfs.sh`.
- `blog-posts/` (submodule, `pike00/blog`) — blog markdown + assets, copied into `public/blog/` by `scripts/copy-blog-assets.sh`.

`src/pages/` is route-based (no `_routes.json`). `whoami` is filtered out of the sitemap in `astro.config.mjs`.

No Pagefind. No MDX integration. Search is in-browser via Fuse.js over a JSON bundle generated at build time.

## Analytics

Only **Umami** (self-hosted at `umami.khanpikehome.com`, homelab `apps/umami`, website ID `e195e031-845c-4950-a08b-bd4a44038ab3`) — wired in [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro). GoatCounter was removed in commit `19819ed`. Umami runs on the same parent domain as the rest of the homelab so household-wide blocklists can't filter it selectively.

If you swap analytics: update `script-src` (script origin) and `connect-src` (API origin — Umami POSTs to `/api/send`) in **both** `public/_headers` and `Caddyfile`, and recompute the inline-script hash if you add a shim.

## Repo metadata to keep in sync

- `README.md` still says "GitHub Pages", "Astro 5", and lists `build:citations` as part of the build pipeline. All three are wrong as of 2026-05. Fix if you rewrite README; do not trust it for runtime facts.
- `package.json` engines pin Node `>=22.12.0`; CI and the Dockerfile both pin Node 24. Don't downgrade.
- `astro.config.mjs` injects `import.meta.env.COMMIT_HASH` from `git rev-parse --short HEAD` (or `$COMMIT_HASH` env var if set — Dockerfile passes `--build-arg COMMIT_HASH`). Used in the footer; expect `unknown` if built outside a git checkout.
- `.pre-push-allowlist` exists at repo root — the global pre-push secret scanner respects it. Add new public-by-design hostnames here, not by widening the scanner.
