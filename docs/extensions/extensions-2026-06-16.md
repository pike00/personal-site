# Extension Ideas: personal-site

Date: 2026-06-16
Context: Static site for pikemd.com (Astro 6 + React 19 + Tailwind 4), deployed local-only to Cloudflare Pages via `just deploy`. Content = blog posts (now served at `/notes`, from the `blog-posts/` submodule), publications + abstracts (`publications/` submodule), project pages, 3D prints, and a Typst-built CV. Contact form ships via a Pages Function → Mattermost.

## What shipped since the last two reports

Most of the 2026-05-07 and 2026-05-29 ideas are now live (archived under `docs/extensions/archive/`): JSON-LD (`src/lib/jsonld.ts`), a global ⌘K palette (`src/lib/search.ts` + `CommandPalette.tsx`), `/topics/[tag]` landing pages, per-publication BibTeX/RIS export (`src/pages/publications/[slug].bib.ts` / `.ris.ts`), the contact form behind Turnstile (`functions/api/contact.ts`), Loki logging across the build scripts (`scripts/loki.sh` / `loki.ts`), single-sourced CSP (`scripts/sync-csp-hashes.mjs`), a unified content loader with schema validation + reading-time (`src/lib/posts.ts`), publication OG cards, and even the "micro-blog `/notes`" wild idea. This report targets the *current* state — the gaps the build-out opened or left behind.

## Homelab integration surface

The build now emits structured `job=personal-site` logs to **Loki** from every sub-script — but the one event worth a Grafana annotation, the actual deploy, is unlogged (`just _deploy` pushes nothing). **Mattermost** is already proven reachable from the CF edge (`functions/api/contact.ts:113`) yet the deploy is silent and contacts don't reach **kindred**. Site search now depends on **Algolia DocSearch** (`flags.search: "docsearch"`) — the only third-party runtime call besides **Umami**, and an awkward fit with the `ai-train=no` / self-hosting posture in `public/robots.txt`. **Gitea Actions** (already running CI for plaid-sync/finance-hub/personal-crm) and the **LiteLLM** proxy (`deepseek-v4-pro-cloud`) remain one API call away.

## Quick wins

### AGENTS.md still documents the retired `/blog` route tree
- **Effort:** S · **Impact:** med
- **Anchor:** `AGENTS.md` "Blog markdown pipeline" + "Content layout" sections reference `src/pages/blog/[slug].astro`; that file no longer exists — the marked + marked-footnote + shiki pipeline now lives at `src/pages/notes/[slug].astro:1-40`
- **Why:** the project's own agent instructions point at a deleted file for the trickiest pipeline (the per-post `Marked` instance gotcha). Anyone following AGENTS.md to debug a footnote race opens the wrong file. Two-section fix; the redirect (`astro.config.mjs:19-20`) is correct, only the docs lag.

### 3D prints have no OG card, and note cards are still labeled "Blog"
- **Effort:** S · **Impact:** med
- **Anchor:** `src/pages/og/[slug].png.ts:25-46` emits `blog-`, `project-`, `pub-` slugs but never calls `getPrints()`; the note branch hardcodes `label: "Blog"` and the `blog-` prefix though the section is now `/notes`
- **Why:** sharing any `/prints/<slug>` link falls back to no preview card, and note cards advertise a section name that 301s away. The satori template already exists — a prints branch + a `Note` label is a copy-paste of the existing post branch.

### ⌘K search index omits 3D prints
- **Effort:** S · **Impact:** med
- **Anchor:** `src/lib/search.ts:20-54` — `buildGlobalIndex()` walks publications, notes, and projects; `getPrints()` (already exported from `src/lib/posts.ts:149`) is never added
- **Why:** the whole point of the global palette is "find anything"; prints are the one content type it can't surface. One more loop, same `SearchDoc` shape.

### The deploy itself logs nothing to Loki
- **Effort:** S · **Impact:** med
- **Anchor:** `justfile` `_deploy` recipe — `build:cv`, `copy-pdfs`, `copy-blog-assets`, `generate-citations`, `check-assets` all `loki_emit`, but the `wrangler pages deploy` + cache-purge steps emit only `echo` to the terminal
- **Why:** deploy cadence and which SHA went live is the single most useful signal to have in Grafana, and it's the one the build *doesn't* record. Add a `loki_emit deploy info complete elapsed_s=… sha=…` after the purge (helper is already sourced one directory over).

## New features

### Tag-driven "related content" to replace the one hardcoded pairing
- **Effort:** M · **Impact:** med
- **Anchor:** `src/lib/pairings.ts:17-22` — the entire cross-link system is a single hand-maintained `{project, post}` tuple
- **Why:** every note, project, publication, and print already carries `tags`/`researchArea`; a `getRelated(slug, type)` that ranks other entries by tag overlap (reusing the `buildGlobalIndex()` corpus) gives automatic "see also" blocks across all sections without growing a manual table that goes stale the moment a fourth thing is worth linking.

### `/now` (and `/uses`) page
- **Effort:** S · **Impact:** low
- **Anchor:** `src/pages/` has index/about/notes/projects/publications/prints/cv/contact/topics/abstracts — no `/now`; the markdown-render path (`marked` + `gray-matter`, `src/content/about.md`) is already the pattern
- **Why:** standard personal-site genre piece and a cheap "this person is active" recruiter signal; `/now` pairs naturally with the new `/notes` stream and reuses the about-page rendering verbatim.

### "Cited by N" badge per publication (build-time, cached)
- **Effort:** M · **Impact:** med
- **Anchor:** `src/lib/publications.ts` loads DOIs but renders no impact signal on `src/pages/publications/[slug].astro`
- **Why:** academics expect a citation count. Hit Semantic Scholar's keyless low-volume API at build, cache by DOI to a JSON keyed on content hash (the `content-hash-cache-pattern` skill is exactly this), render a badge. No runtime call, no CSP change.

## New Docker services

### Self-hosted search (Meilisearch / Typesense) behind Traefik
- **Effort:** L · **Impact:** med
- **Anchor:** `src/lib/docsearch.ts` + the `https://*.algolia.net` / `algolianet.com` / `algolia.io` entries in `public/_headers` `connect-src` — search is now an external SaaS dependency
- **Why:** a `search.khanpikehome.com` Meilisearch instance (single Rust binary, Traefik-routed like the rest of the homelab) indexed at build time from the same `buildGlobalIndex()` JSON removes the only third-party runtime besides Umami and aligns search with the `ai-train=no` posture. The ⌘K UI swaps the DocSearch client for the Meilisearch JS client; `flags.search` already abstracts the backend choice (`src/lib/flags.ts:13`).

### Self-hosted comments (Comentario / Isso) for `/notes`
- **Effort:** M · **Impact:** med
- **Anchor:** `src/pages/notes/[slug].astro` renders the article body with no discussion affordance
- **Why:** a privacy-respecting comment box at `comments.khanpikehome.com` fits the Traefik pattern; add its origin to `connect-src` in `scripts/sync-csp-hashes.mjs` (single-sourced into `_headers` + `Caddyfile`). Pairs with the empirical/investigative posts that tend to draw replies.

## Integrations

### Mattermost deploy ping + Loki deploy event → Grafana annotation
- **Effort:** S · **Impact:** med
- **Anchor:** `justfile` `_deploy:79` ends at `echo "✓ deployed … @ ${sha}"`; `functions/api/contact.ts:114` already proves a Mattermost webhook reaches the CF edge / homelab
- **Why:** one `curl` to a Mattermost incoming webhook ("deployed `<sha>` to pikemd.com") + the `loki_emit deploy` from the quick-win gives both a human ping and a Grafana annotation overlaying deploy times on the Umami traffic graph. Names **Mattermost**, **Loki**, **Grafana** — all already in the stack.

### Contact submissions also land in kindred
- **Effort:** M · **Impact:** med
- **Anchor:** `functions/api/contact.ts:113-124` posts the validated message only to the Mattermost webhook
- **Why:** a real inbound contact is a CRM event; after the Turnstile check, also POST to the **kindred** API (contact + interaction) so the person isn't just a chat message that scrolls away. Keep the key in a Pages secret (`KINDRED_API_KEY`), mirroring how `MATTERMOST_WEBHOOK_URL` is handled. Names **kindred** + **Mattermost**.

### Gitea Actions build check + LiteLLM-drafted deploy summary
- **Effort:** M · **Impact:** med
- **Anchor:** no `.gitea/` or `.github/` directory exists (confirmed); project CLAUDE.md "Local-only, no CI"
- **Why:** a pull-mirror + Gitea Actions job running `pnpm build` (submodules + CSP-hash sync + `build:check`) catches a broken build *before* a manual `just deploy`, without reintroducing the GitHub-Pages CI you deliberately retired. Pair it with a `deepseek-v4-pro-cloud` call (the `generate-citations.ts` script is the existing build-time-TS model) to draft a one-paragraph "what changed" from the commit range for the Mattermost ping. Names **Gitea** + **LiteLLM**.

## Architectural improvements

### Delete (or actually use) the dead `blog` content collection
- **Effort:** S · **Impact:** med
- **Anchor:** `src/content.config.ts:27-36` defines a `blog` collection that nothing queries — posts load via `getPosts()` reading `blog-posts/posts/` directly (`src/lib/posts.ts:77`); confirmed no `getCollection("blog")` anywhere
- **Why:** the schema is now duplicated — `postFrontmatterSchema` in `posts.ts:15` is the real validator, while the collection definition is decorative. Either delete the `blog` collection or migrate notes onto the content layer and drop the hand-rolled loader. The `prints` collection (`:38-48`) has the same smell — prints validate via `posts.ts`, not `getCollection`.

### Two search backends are maintained in parallel
- **Effort:** M · **Impact:** med
- **Anchor:** `flags.search: "docsearch"` (`src/lib/flags.ts:13`) selects Algolia, but the Fuse path is still fully built every deploy: `src/lib/search.ts` (index) + `src/components/CommandPalette.tsx` (6.4k) + `src/components/DocSearchPalette.tsx` (2.4k)
- **Why:** the build serializes a global JSON index that the live site no longer uses, and two palette components drift independently. Either document the Fuse path as the explicit offline/fallback contract (and gate its index build on `flags.search === "fuse"`), or prune it. The self-hosted-search idea above would collapse this to one path anyway.

### No tests anywhere — add test-kit
- **Effort:** M · **Impact:** med
- **Anchor:** `package.json` has no `test` script; no `vitest.config.*` / `playwright.config.*`; `functions/api/contact.ts` has no local exercise path at all
- **Why:** several pure functions are now load-bearing and untested — `postFrontmatterSchema` parsing (`posts.ts:77`), `readingTimeMinutes()` (`posts.ts:103`), `buildGlobalIndex()`, and the CSP hash extraction in `sync-csp-hashes.mjs`. A small Vitest suite via the homelab `test` skill (test-kit) plus a `wrangler pages dev` smoke test for the contact function would catch the silent-empty-render class the schema work was meant to prevent.

## Wild ideas / spin-offs

### Public homelab status badge on pikemd.com
- **Effort:** M · **Impact:** low
- **Anchor:** the homelab already runs a status surface (memory `drawer_ha_mqtt_discovery_device_block_entity_id` — "built Homelab status page"); the site has no live homelab signal
- **Why:** a build-time-fetched-or-edge-proxied "homelab uptime" badge/strip turns the self-hosting blog posts into a live demo ("the thing serving this search is up: N days"). On-brand differentiator; keep it read-only and cached so it can't become a load-bearing dependency of a static site.

### "Currently reading" feed from Zotero
- **Effort:** L · **Impact:** med
- **Anchor:** zero surface for in-progress academic reading today; Zotero has a public API and the satori OG infra (`src/pages/og/[slug].png.ts`) already renders cards
- **Why:** differentiates from every other physician portfolio. A small ingestor writes a JSON into the publications submodule; the existing card/OG pipeline renders it. Closest analog is the new `/notes` stream, pointed at others' work.

### Extract the reusable bits into an `astro-homelab` starter
- **Effort:** L · **Impact:** med
- **Anchor:** this repo has solved several generic problems well: single-source CSP (`scripts/sync-csp-hashes.mjs`), build-time Loki logging (`scripts/loki.sh` / `loki.ts`), per-worktree Traefik previews (`preview-kit.toml`), and the satori OG service
- **Why:** these four are copy-pasted into every new homelab-adjacent site by hand. A thin `pike00/astro-homelab` template (or a set of scripts published as a package) would seed the next site with the CSP/Loki/preview/OG plumbing already wired — the same instinct behind release-kit/preview-kit.

---

Report at [/home/will/projects/personal-site/docs/extensions/extensions-2026-06-16.md](</home/will/projects/personal-site/docs/extensions/extensions-2026-06-16.md>). Want me to dig deeper on any of these?
