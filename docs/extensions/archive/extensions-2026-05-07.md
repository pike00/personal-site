# Extension Ideas: personal-site
Date: 2026-05-07
Context: Astro 6 + React 19 + Tailwind 4 static site at pikemd.com — academic portfolio (publications + CV) plus an engineering blog, deployed to Cloudflare Pages, content driven by two git submodules (`publications/`, `blog-posts/`) and a Typst-compiled CV.

## Homelab integration surface

The homelab already touches this repo via [self-hosted Umami at `umami.khanpikehome.com`](src/layouts/BaseLayout.astro). Adjacent services worth pairing: `apps/n8n` (automation triggers), `apps/mattermost` (publish notifications), `apps/litellm` (`deepseek-v4-pro-cloud` for summarization/related-post recs), `kindred` (personal-crm at `kindred.khanpikehome.com` for contact-form ingestion), `apps/davis` (CalDAV for a /talks calendar), and `apps/gitea` (mirror of the public repo).

## Quick wins

### Fix the README stack/deploy mismatch
- **Effort:** S · **Impact:** low
- **Anchor:** [README.md:3](README.md#L3) says "GitHub Pages"; [README.md:8](README.md#L8) says "Astro 5". Real stack is Astro 6 + Cloudflare Pages — already flagged in [CLAUDE.md:122](CLAUDE.md#L122).
- **Why:** Stale top-of-readme is the first thing visitors and recruiters see. Two-line fix.

### Wire `build:citations` into `npm run build`
- **Effort:** S · **Impact:** med
- **Anchor:** [package.json:10](package.json#L10) — `build` runs `build:pdfs && build:blog-assets && astro build`. `build:citations` ([scripts/generate-citations.ts](scripts/generate-citations.ts)) is defined but never invoked, so citation metadata only refreshes when someone remembers to run it.
- **Why:** Either the script is dead code (delete it) or the build is silently shipping stale citations. Pick one.

### Add `build:cv` to the local `build` chain (or document why it's split)
- **Effort:** S · **Impact:** med
- **Anchor:** [CLAUDE.md:60](CLAUDE.md#L60) — `npm run build` does NOT build the CV; only CI does. Locally produces a site whose `/cv.pdf` is whatever was last committed.
- **Why:** Footgun for any local "did I break the CV" check. Either auto-run `build:cv` when Typst is on PATH, or have `build` warn when the PDF on disk is older than the `.typ` source.

### Generate CSP hashes at build time, not by hand
- **Effort:** M · **Impact:** high
- **Anchor:** [public/_headers:7](public/_headers#L7) lists 4 inline-script hashes; [CLAUDE.md:75-95](CLAUDE.md#L75-L95) documents the manual extraction one-liner. Drawer `astro_inline_script_csp_hashes.md` notes this has bitten you twice already.
- **Why:** Move the Python one-liner into a postbuild script that reads `dist/**/*.html`, computes hashes, and rewrites `_headers` in place — or even better, emits a `_headers.generated` and fails the build on diff. Eliminates the silent-React-hydration-break-after-Astro-bump class entirely.

### Add `/uses` and `/now` pages
- **Effort:** S · **Impact:** low
- **Anchor:** [src/pages/](src/pages/) currently has index/about/blog/projects/publications/cv/contact. Both pages are markdown-only; `gray-matter + marked` infra already exists ([src/pages/blog.astro:7](src/pages/blog.astro#L7)).
- **Why:** Standard personal-site genre pieces. `/now` doubles as a low-effort recruiter signal that you're an active person.

## New features

### Pagefind full-text search across blog + publications
- **Effort:** M · **Impact:** high
- **Anchor:** [src/components/SearchPublications.tsx](src/components/SearchPublications.tsx) uses Fuse.js over publications metadata only — body text isn't searchable, and `/blog` has no search at all.
- **Why:** Pagefind is built for static Astro sites, indexes at build time, ships a tiny WASM runtime. One unified `/search` covers blog bodies + publication titles/abstracts. The CSP would need a hash for its bootstrap script — fits the pattern.

### Static `/tags/[tag]` index for blog
- **Effort:** S · **Impact:** med
- **Anchor:** [src/components/PostCard.astro](src/components/PostCard.astro) renders tags but they don't link anywhere. Publications already do `/publications?tag=...` ([src/pages/index.astro:96](src/pages/index.astro#L96)) but that's a query-param filter, not a page.
- **Why:** Three blog posts today, but tags become useful at ~10. Generates statically, no runtime cost. Pairs with the `getStaticPaths` pattern Astro already uses for `[slug]`.

### Scholar-citation count badge per publication
- **Effort:** M · **Impact:** med
- **Anchor:** [src/components/PublicationCard.astro](src/components/PublicationCard.astro) shows title/journal/date but no impact signal. The publications submodule has DOIs.
- **Why:** Hit Semantic Scholar's free API at build time (no key required for low volume), cache to a JSON in `publications/.cache/`, render a "cited by N" badge. Refreshes when CI re-runs on `repository_dispatch`. Recruiter-relevant for the academic side.

### Webmentions inbox
- **Effort:** M · **Impact:** low
- **Anchor:** Static site, no comments, RSS already shipping at [src/pages/rss.xml.ts](src/pages/rss.xml.ts). Nothing currently captures inbound discussion.
- **Why:** webmention.io aggregates pings from anyone who links to your posts; Astro plugins exist that fetch + render them at build. CSP `connect-src` and `img-src` would need `webmention.io` and `webmention.io/avatar`. Low impact unless you actively post; cheap to wire.

### Reading-time + last-modified on blog posts
- **Effort:** S · **Impact:** low
- **Anchor:** [src/components/PostCard.astro](src/components/PostCard.astro) shows date only. Word count is trivial; `git log -1 --format=%ai blog-posts/posts/<slug>.md` (run from the submodule) gives last-edit.
- **Why:** Improves the index-page hierarchy and signals to readers whether something is fresh or archival.

### Reuse the OG-image generator for blog cards
- **Effort:** S · **Impact:** med
- **Anchor:** [src/pages/og/[slug].png.ts](src/pages/og/[slug].png.ts) already exists for satori-rendered OG images. The blog/project index pages render text-only [PostCard.astro](src/components/PostCard.astro)/[ProjectCard.astro](src/components/ProjectCard.astro).
- **Why:** Same satori template, swap to a 600x315 inline render and use as the card hero. Adds visual weight to indexes without commissioning per-post art.

## New Docker services

### Plausible-style dashboard read-only embed (Umami self-hosted UI proxy)
- **Effort:** M · **Impact:** low
- **Anchor:** Umami is already at `umami.khanpikehome.com` — homelab service. CSP `connect-src` allows it ([public/_headers:7](public/_headers#L7)).
- **Why:** A `/stats` route showing public, low-resolution top-pages + 30-day visitor count via Umami's `/api/share` endpoint. Brag-page for the engineering side; fits the "transparency" theme that pairs well with self-hosting posts.

### Add Listmonk for a (very small) newsletter
- **Effort:** L · **Impact:** med
- **Anchor:** Today's only outbound channel is RSS ([src/pages/rss.xml.ts](src/pages/rss.xml.ts)). Listmonk is a small Go service (single binary + Postgres) that fits the existing `postgres-private` pattern from `personal-crm`/`umami`.
- **Why:** Lets you push a "new post" notification without depending on Mailchimp/Substack. Wire a Mattermost webhook on subscription so it doesn't go silent. Skip if you don't actually want the audience-management overhead.

### Activitypub / fediverse mirror via `bridgy-fed` or `takahē`
- **Effort:** L · **Impact:** low
- **Anchor:** RSS feed at `/rss.xml` is the only syndication today.
- **Why:** Self-hosted ActivityPub bridge so blog posts auto-fan-out to a `@will@pikemd.com` handle without running a full Mastodon. Niche; high vanity-to-effort ratio. Honest tradeoff disclosed.

## Integrations

### Pipe contact-form submissions to `kindred` via its webhook API
- **Effort:** M · **Impact:** high
- **Anchor:** [src/pages/contact.astro](src/pages/contact.astro) is a static page with no form pipeline. `kindred` (personal-crm at `kindred.khanpikehome.com`) has a documented `personal_crm_webhook_api_constraints` drawer + admin webhook endpoints.
- **Why:** Real contacts land directly in your CRM as ContactInteraction rows instead of email-to-self. Use a Cloudflare Pages Function (or a thin n8n webhook) as the bridge so the API key stays out of the static bundle.

### `apps/n8n` workflow: Mattermost ping when blog/publications submodules update
- **Effort:** S · **Impact:** med
- **Anchor:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml) listens for `repository_dispatch` of `publications-updated` / `blog-updated` ([CLAUDE.md:30-32](CLAUDE.md#L30-L32)). The submodule repos are the natural firing point.
- **Why:** Single n8n workflow watches both submodule repos via Gitea/GitHub webhook → posts a card to a Mattermost channel + dispatches the deploy. Replaces ad-hoc `gh api ... dispatches` and gives you a visible audit trail. Pattern matches `agent-task-runner` already in homelab.

### LLM-generated post summaries via `apps/litellm` (deepseek-v4-pro-cloud)
- **Effort:** M · **Impact:** med
- **Anchor:** [src/content.config.ts:23](src/content.config.ts) requires a hand-written `description` per blog post. LiteLLM proxy is already configured at `127.0.0.1:4000` for ares (drawer `homelab_deepseek_v4pro_cloud_registration.md`).
- **Why:** Build-time script: if frontmatter has `description: auto` (or is missing), call LiteLLM with the post body, write the response back into the file once, commit. Pairs with the same JSON-schema pattern your drape release notes script uses.

### `/talks` page sourced from `apps/davis` CalDAV
- **Effort:** M · **Impact:** med
- **Anchor:** No talks page today. `apps/davis` is the homelab CalDAV server (drawer `davis-caldev-deployment.md`); a "Talks" calendar with date + venue + abstract URL fits naturally.
- **Why:** Edit talks in any calendar app on any device, the site rebuilds via `repository_dispatch` and re-renders the page. Same submodule-or-event-driven pattern you've already established.

### Build-time link-rot scanner with Mattermost report
- **Effort:** M · **Impact:** low
- **Anchor:** Three blog posts already link to external repos and pages ([blog-posts/posts/sops-age-docker-compose.md](blog-posts/posts/sops-age-docker-compose.md), `teaching-a-neural-net-to-find-date-stamps.md`, `the-agent-reads-your-env.md`). Nothing currently checks them.
- **Why:** Weekly GHA cron crawls `dist/**/*.html`, HEADs every external link, posts non-200s to a Mattermost channel via the existing janet/interactivebot pattern. Read-only, won't fail the deploy.

## Architectural improvements

### Move `blog-posts/` from a public submodule to a content collection
- **Effort:** L · **Impact:** med
- **Anchor:** [src/pages/blog.astro:18](src/pages/blog.astro#L18) reads `blog-posts/posts/*.md` directly via `fs` + `gray-matter`, bypassing Astro's content collections. [src/content.config.ts](src/content.config.ts) defines a `blog` collection that nothing actually uses.
- **Why:** You already paid the schema cost. Either delete the unused collection definition, or migrate posts into `src/content/blog/` and get type-safe frontmatter, image-import optimization, and Pagefind indexing for free. The submodule made sense when posts originated in other repos; today all three live in the dedicated `blog-posts` repo and could just as easily live here.

### Render publication abstracts at build, not via per-page `[slug]`
- **Effort:** M · **Impact:** low
- **Anchor:** [src/pages/abstracts/](src/pages/abstracts/) and [src/lib/abstracts.ts](src/lib/abstracts.ts) — separate route tree for what could be sub-content under publications.
- **Why:** Reduces duplicated metadata-loading code paths, gives one canonical URL per publication. Only worth doing if abstracts and publications have meaningfully different SEO needs (probably they don't).

### Replace marked + gray-matter with Astro MDX
- **Effort:** M · **Impact:** med
- **Anchor:** [src/pages/blog.astro:7](src/pages/blog.astro#L7), [src/pages/projects.astro], and [src/pages/about.astro](src/pages/about.astro) all roll their own `fs.readFileSync` + `matter()` + `marked()` pipeline. The blog post on date stamps already wants footnotes (you added `marked-footnote` for it).
- **Why:** MDX gives you components-in-prose (`<Aside>`, `<Figure>`, `<Citation>`), auto-typecheck via Zod, image optimization, syntax highlighting via Shiki — all without per-page glue code. Fits the pattern from drawer `personal-site-blog-migration.md`.

### Move OG-image generation out of the request path
- **Effort:** S · **Impact:** low
- **Anchor:** [src/pages/og/[slug].png.ts](src/pages/og/[slug].png.ts) — satori is fast but every build re-renders every OG.
- **Why:** Cache rendered PNGs by content hash to `public/og-cache/`, only regenerate on body change. Trims build time as the post count grows; pairs with the `content-hash-cache-pattern` skill you already have.

## Wild ideas / spin-offs

### Self-hosted "papers I'm reading" feed sourced from Zotero
- **Effort:** L · **Impact:** med
- **Anchor:** Zero current surface for in-progress academic reading. Zotero has a public API; you'd need a small ingestor (n8n or a Python sidecar) writing to a JSON in the publications submodule.
- **Why:** Differentiates from every other physician portfolio. The same satori OG infra renders cards. Closest analog in your stack: drawer `pikehome_dashboard` (homelab home dashboard) but pointed outward.

### Public `/now-i-know` CRDT-backed micro-blog
- **Effort:** L · **Impact:** low
- **Anchor:** Adjacent project `kindred` already runs a journaling-style data model (`personal_crm_journal_seeding`); the same Postgres could host a `notes` table with a public flag.
- **Why:** Tweet-length notes with a `public: true` checkbox, surfaced as `/notes` on pikemd.com. Spin-off project, shares infra with kindred. Low impact unless you actually post; admit the audience-of-one risk.

### Annotated-PDF viewer for publications using `pdf.js` + sidebar comments stored in `kindred`
- **Effort:** L · **Impact:** low
- **Anchor:** [src/pages/publications/[slug].astro](src/pages/publications/[slug].astro) already serves PDF previews via same-origin framing ([git log:6f79339](https://github.com/pike00/personal-site/commit/6f79339)). Annotations have nowhere to live today.
- **Why:** Spin-off — dedicated repo, embeds via iframe. CSP `frame-ancestors 'self'` already supports it. Wild; only worth it if you actually want to discuss your own papers in public.

### "Methods reproducibility" companion site under `/labs/<paper-slug>/`
- **Effort:** L · **Impact:** med
- **Anchor:** The `yolo-datestamp-detector` blog post is already a methods writeup paired with a publication; the link between them is implicit ([drawer personal-site-architecture](drawer)) — you explicitly chose YAGNI on cross-linking until a concrete case appeared. This is that case.
- **Why:** First-class "Methods" page per paper with reproducible-by-design notebooks rendered to HTML via Quarto or Jupyter Book, hosted as a sibling section. Bridges the academic and engineering halves of the site.

---

Report at `/home/will/projects/personal-site/docs/extensions-2026-05-07.md`. Want me to dig deeper on any of these?
