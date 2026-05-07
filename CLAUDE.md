# personal-site — Claude notes

Project-specific instructions. Defers to `~/.claude/CLAUDE.md` for global rules.

## What this is

Static site for pikemd.com. Astro 6 + React 19 + Tailwind 4. Deploys to **Cloudflare Pages** (the README still says "GitHub Pages" — stale). Production URL: https://pikemd.com.

Public GitHub repo: `pike00/personal-site`. Per global rules: **never push without explicit user approval**.

## Deploy

### How it actually deploys

`git push origin main` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs on GitHub-hosted runner → builds → `wrangler pages deploy dist --project-name=personal-site` → Cloudflare zone-wide cache purge.

A successful run is ~50–70s. Watch with:

```sh
gh run watch                                     # most recent
gh run list --workflow=deploy.yml --limit 5      # history
```

### Triggers

The workflow listens for:

- `push` to `main` — the normal path.
- `repository_dispatch` with `event_type: publications-updated` or `blog-updated` — fired from the `publications` / `blog-posts` submodule repos when their upstream content lands, so the site rebuilds without a code change here. Trigger manually with:
  ```sh
  gh api repos/pike00/personal-site/dispatches -f event_type=publications-updated
  ```

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

## Repo metadata to keep in sync

- README's "GitHub Pages" line and "Astro 5" stack line are both stale. Update if rewriting.
- `package.json` engines pin Node `>=22.12.0`; CI uses `24.15.0`. Don't downgrade CI without a reason.
