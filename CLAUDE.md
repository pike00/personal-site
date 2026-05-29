# personal-site — Claude notes

Project-specific instructions. Defers to `~/.claude/CLAUDE.md` for global rules.

## What this is

Static site for pikemd.com. Astro 6 + React 19 + Tailwind 4. Deploys to **Cloudflare Pages** (the README still says "GitHub Pages" — stale). Production URL: https://pikemd.com.

Public GitHub repo: `pike00/personal-site`. Per global rules: **never push without explicit user approval**.

## Just recipes (run `just` for the full list)

- `just deploy` (alias `just ship`) — refuses dirty tree, sources `.env.sops`, builds CV + site, runs `wrangler pages deploy dist --commit-hash=<HEAD>`, purges the Cloudflare zone cache. Does **not** bump `package.json`, tag, or push — those are independent. This is the canonical deploy path; there is no CI fallback.
- `just dev` — brings up the per-worktree preview stack at `https://<slug>.personal-site.khanpikehome.com` via `compose.worktree.yml` (Traefik-routed, hot-reloaded). First boot is slow because pnpm install runs inside the container; subsequent edits hot-reload through Vite's WebSocket. From `preview.just`.
- `just astro-dev [port]` — bare Astro dev server bound to the host's Tailscale IP with `VITE_ALLOWED_HOSTS` set to the MagicDNS name. Default port 4321. Use this for pure host-side iteration without Traefik.
- `just publish <slug>` — flips `draft: false` in `blog-posts/posts/<slug>.md`, commits+pushes the `pike00/blog` submodule, bumps the pointer here, pushes. Idempotent.
- `just new-post <slug> [title]` — scaffold a new draft in `blog-posts/posts/`.
- `just update-pubs` / `just update-blog` — fast-forward submodule + copy assets + commit pointer bump (no push).

## Deploy

### How it actually deploys

**Local-only, no CI.** There is no `.github/workflows/` directory. Pushing to `main` archives the commit on GitHub but does **not** trigger a deploy. The only path to production is running `just deploy` on a machine that can decrypt `.env.sops` (today: `ares`).

```
just deploy
  ├─ refuses dirty tree (uncommitted/staged changes)
  ├─ sources .env.sops via `sops --decrypt --input-type dotenv --output-type dotenv`
  │   (NOT `sops exec-env` — autodetect treats .env.sops as JSON and fails)
  └─ just _deploy
       ├─ pnpm build:cv            # Typst → public/cv.pdf
       ├─ pnpm build               # build:pdfs → build:blog-assets → astro build
       │                           # → postbuild: scripts/sync-csp-hashes.mjs
       ├─ wrangler pages deploy dist \
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

Lives in `.env.sops` at the repo root (NOT in GitHub repo settings — those have no role anymore).

- `CLOUDFLARE_API_TOKEN` — scoped to Pages:Edit + Cache Purge for the personal-site project
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

Edit with `sops .env.sops` (recipients/age key configured in `.sops.yaml`; private key at `~/.config/sops/age/keys.txt` on each authorized host).

### Self-hosted Caddy build (alternative, not currently deployed)

`Dockerfile` + `Caddyfile` build a static Caddy container serving `dist/` on `:8080`. Used only if migrating off Cloudflare Pages. The Caddyfile hard-codes its own copy of the CSP — if you update `public/_headers`, update `Caddyfile` too or the two diverge silently. This path does NOT run the `sync-csp-hashes` postbuild against `Caddyfile`, so the hashes must be transferred manually.

## Build gotchas

### `npm run build` does NOT build the CV

`package.json` `"build"` is `build:pdfs && build:blog-assets && astro build`. CV PDF generation (`build:cv` → Typst) is a **separate** script that `just deploy` runs explicitly before `pnpm build`. Running `pnpm build` alone will produce a site whose `/cv.pdf` is whatever was last committed to `public/`. To match a real deploy:

```sh
pnpm build:cv && pnpm build
```

### `build:citations` is dead

`package.json` defines `build:citations` (`tsx scripts/generate-citations.ts`) but nothing invokes it — not the `build` chain, not `just deploy`, not the Dockerfile. Citation metadata is generated at runtime from publication source files via `src/lib/`, not from a prebuilt artifact. The README claim that `npm run build` runs citations is wrong. Either wire it into `build` or delete it; do not assume it has run.

### Submodules are required

`publications/` and `blog-posts/` are git submodules. Without them the Publications page, homepage recent-pubs, CV pub counts, and blog index render empty. `just deploy` does not initialize submodules — that's on you:

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
- `package.json` engines pin Node `>=22.12.0`; the Dockerfile pins Node 24. `just deploy` uses whatever Node is on the host (currently Node 24 on ares). Don't downgrade.
- `astro.config.mjs` injects `import.meta.env.COMMIT_HASH` from `git rev-parse --short HEAD` (or `$COMMIT_HASH` env var if set — Dockerfile passes `--build-arg COMMIT_HASH`). Used in the footer; expect `unknown` if built outside a git checkout.
- `.pre-push-allowlist` exists at repo root — the global pre-push secret scanner respects it. Add new public-by-design hostnames here, not by widening the scanner.
