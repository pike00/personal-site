# personal-site

Personal site and academic portfolio built with [Astro](https://astro.build), deployed to [Cloudflare Pages](https://pages.cloudflare.com) at [pikemd.com](https://pikemd.com).

## Stack

- **Astro 6** + TypeScript (strict)
- **Tailwind CSS 4** with dark mode
- **React 19** for interactive components (publication search via Fuse.js)
- **Typst** for CV compilation (`.typ` -> PDF)
- **Publications** sourced from a git submodule with auto-generated citations

## Project Structure

```
src/
├── pages/          # Routes: index, about, blog (posts + projects), publications, cv, contact
├── components/     # Astro + React components
├── layouts/        # Base and page layouts
├── content/        # Content collections (cv, projects, publication tags)
├── lib/            # Utilities (publications, abstracts, citations, pairings)
└── styles/         # Global CSS
scripts/            # Build utilities (Bash + Tsx)
publications/       # Git submodule
blog-posts/         # Git submodule
```

Blog posts and projects are merged into one chronological feed at `/blog`. Project detail pages still live at `/projects/[slug]`; `/projects` redirects to `/blog`.

## Development

Requires Node >= 22.12.0 and [Typst](https://typst.app) for CV builds.

```sh
git clone --recurse-submodules https://github.com/pike00/personal-site.git
# or, if already cloned without submodules:
git submodule update --init --recursive

npm install
npm run dev          # Start dev server at localhost:4321
npm run build        # Full pipeline: PDFs -> blog assets -> citations -> Astro build
npm run build:cv     # Build the CV PDF separately (NOT part of npm run build)
npm run preview      # Preview production build
```

> **Note:** The `publications/` directory is a git submodule. If you skip submodule init, the Publications page, homepage recent-publications list, and CV publication counts will all render empty on the dev server.

### Build pipeline

`npm run build` runs these steps in sequence:

1. `build:pdfs` -- copy publication PDFs from the `publications/` submodule into `public/Publications/`
2. `build:blog-assets` -- copy blog post images from the `blog-posts/` submodule into `public/blog/`
3. `build:citations` -- generate `public/CITATION.cff` from publication metadata
4. `astro build` -- build the static site
5. `postbuild` (auto) -- sync CSP hashes (see below)

`build:cv` is **not** part of `npm run build`. CI runs it separately before `npm run build`; locally, run `npm run build:cv` yourself when you change the Typst source.

### Postbuild: CSP hash sync

`npm run build` runs `postbuild` automatically via `scripts/sync-csp-hashes.mjs`. It extracts the SHA-256 hash of every inline `<script>` body in `dist/**/*.html` and rewrites the `script-src` directive in `public/_headers`. Without this, an Astro version bump silently ships a CSP that blocks the new inline scripts and breaks React hydration on the live site with no visible build error.

The script fails the build if no inline scripts are found in `dist/`, or if `public/_headers` is missing its CSP line.

## Submodules

Two git submodules, both required:

- **`publications/`** -> [pike00/Publications](https://github.com/pike00/Publications) -- academic papers + PDFs.
- **`blog-posts/`** -> [pike00/blog](https://github.com/pike00/blog) -- blog post `.md` files with frontmatter.

```bash
git clone --recurse-submodules https://github.com/pike00/personal-site.git
# or:
git submodule update --init --recursive

just update-pubs     # pull latest publications + bump pointer + commit
just update-blog     # pull latest blog-posts + bump pointer + commit
```

## Blog publishing

Two-step authoring flow, both submodule-aware:

```bash
just new-post my-cool-post                      # scaffold draft
just new-post my-cool-post "My Cool Post"       # with explicit title

# write the post, save and quit $EDITOR ...

just publish my-cool-post                  # flip draft, commit/push both repos, deploy
```

`just new-post <slug>` creates `blog-posts/posts/<slug>.md` with frontmatter (`title`, `description`, `date`, `tags`, `draft: true`) and opens it in `$EDITOR`. Title defaults to the slug capitalized.

`just publish <slug>` is idempotent. It:
1. Flips `draft: true` -> `draft: false` in `blog-posts/posts/<slug>.md`.
2. Commits + pushes inside the `blog-posts` submodule.
3. Bumps the submodule pointer in the parent repo, commits + pushes.
4. Chains into `just deploy` if (and only if) the submodule pointer moved.

If nothing moved (post was already `draft: false` and the pointer was current), no deploy runs.

## Deploy

```bash
just deploy           # build + wrangler pages deploy + CF cache purge (local; no GHA)
```

Runs entirely from a workstation (typically ares). Credentials live in `build.env.sops`; `just _decrypt` (via `sopsx`) decrypts them into the build's environment for the wrangler call only, using process substitution so no plaintext hits disk. (`sops exec-env` can't read a dotenv `.sops` file -- no `--input-type`, mis-detects as JSON; sops #717.) Refuses to deploy on a dirty tree.

Required keys in `build.env.sops`:
- `CLOUDFLARE_API_TOKEN` -- Cloudflare Pages + cache-purge scope.
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID` -- for the cache purge call.
- `PUBLIC_TURNSTILE_SITE_KEY` -- public Turnstile key baked into the build.

The deploy is tagged with the current commit SHA via `wrangler --commit-hash`, so the Cloudflare Pages dashboard shows the exact source revision live.
