# personal-site — Claude notes

Project-specific instructions. Defers to `~/.claude/CLAUDE.md` for global rules.

## What this is

Static site for pikemd.com. Astro 6 + React 19 + Tailwind 4. Deploys to **Cloudflare Pages** (the README still says "GitHub Pages" — stale). Production URL: https://pikemd.com.

Public GitHub repo: `pike00/personal-site`. Per global rules: **never push without explicit user approval**.

## Publishing a blog post

Use the `publish-post` just recipe — it handles the cross-repo dance end-to-end:

```sh
just publish-post sops-age-docker-compose
```

That flips `draft: false` in `blog-posts/posts/<slug>.md`, commits + pushes the blog-posts submodule (`pike00/blog`), then bumps the submodule pointer here and pushes (`pike00/personal-site`). Idempotent: rerunning on an already-published post is a no-op except for the submodule pointer if it lags.

Manual cross-repo dispatch (if you only want to *rebuild* against an already-updated submodule pointer, no commit) is documented under Triggers below — but in normal flow `publish-post` covers it.

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

### Manual deploy from a laptop (escape hatch)

Only if CI is wedged. Requires `wrangler` and the same token in `CLOUDFLARE_API_TOKEN`:

```sh
npm ci
npm run build:cv         # CI runs this separately — see gotcha below
npm run build
npx wrangler pages deploy dist --project-name=personal-site
```

Cache purge afterward (CI does this automatically):

```sh
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

## Build gotchas

### `npm run build` does NOT build the CV

`package.json` `"build"` is `build:pdfs && build:blog-assets && astro build`. CV PDF generation (`build:cv` → Typst) is a **separate** script that the GHA workflow runs explicitly before `npm run build`. Locally, `npm run build` will produce a site whose `/cv.pdf` is whatever was last committed to `public/`. To match CI exactly:

```sh
npm run build:cv && npm run build
```

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

[public/_headers](public/_headers) pins a strict CSP with **per-script sha256 hashes** for every inline `<script>` Astro emits. Three of the hashes are Astro-emitted boilerplate:

- the `astro:load` shim
- the client-directive runner that hydrates `client:load` islands (this is what makes `<SearchPublications>` work)
- per-page inline handlers (e.g. the projects-page card-click code)

These hashes change with **every Astro version bump**. When that happens, the React island on `/publications/` silently stops hydrating in production (search box and dropdowns become inert; dev mode looks fine because it ships different scripts). Recompute and update them with:

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

Compare the printed set against `script-src` in `public/_headers`; add any missing hashes. Verify on the deployed site by opening DevTools console on `/publications/` — any `Content Security Policy` violation there means a hash is missing.

## Local dev

```sh
npm install
npm run dev          # http://localhost:4321
```

Dev server does not run `build:cv` or the PDF copy steps eagerly on every reload — restart it after touching `publications/` or the CV `.typ` source.

## Analytics

Two trackers are wired in [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro):

- **GoatCounter** — `pikemd.goatcounter.com` (SaaS). Note: blocked by aggressive tracker-blocklists including the household NextDNS profile, so admin and other privacy-tooled visitors won't appear in its counts.
- **Umami** — self-hosted at `umami.khanpikehome.com` (homelab `apps/umami`). Website ID `e195e031-845c-4950-a08b-bd4a44038ab3`. Default-allow on the same domain as the homelab so blocklists can't selectively filter it.

If you change either tracker, update the CSP in [public/_headers](public/_headers): `script-src` needs the script's origin and `connect-src` needs the API origin (Umami POSTs to `/api/send`).

## Repo metadata to keep in sync

- README's "GitHub Pages" line and "Astro 5" stack line are both stale. Update if rewriting.
- `package.json` engines pin Node `>=22.12.0`; CI uses `24.15.0`. Don't downgrade CI without a reason.
