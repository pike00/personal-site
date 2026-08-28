set shell := ["bash", "-uc"]
# `release` / `version` / changelog recipes come from release.just (shared).
# `dev` / `down` / `down-clean` / `logs` / `ps` / `shell` / `pytest` /
# `worktree` / `worktree-rm` / `pr` come from preview.just. preview-kit
# threads GIT_HASH + APP_VERSION as build args.

default:
    @just --list

# BEGIN PROJECT-KIT — generated, do not edit by hand
import '.project-kit/_lib.just'
import '.project-kit/preview.just'
import '.project-kit/release.just'
# END PROJECT-KIT

# --- repo-specific ---

# Decrypt the Cloudflare deploy secrets in build.env.sops to stdout as dotenv,
# for `just deploy` to source. Prefers the `sopsx` wrapper; falls back to raw
# sops with this repo's own .sops.yaml so it still works where the homelab
# scripts aren't on PATH. `sops exec-env` is unusable here: it has no
# --input-type and mis-detects a .sops dotenv as JSON (sops #717), so we always
# decrypt explicitly. The dev stack needs no secrets and no .env — the preview
# domain is hardcoded in preview-kit.toml's host_pattern.
_decrypt:
    #!/usr/bin/env bash
    set -euo pipefail
    if command -v sopsx >/dev/null 2>&1; then
        sopsx build.env.sops -d
    else
        sops --config .sops.yaml --decrypt --input-type dotenv --output-type dotenv build.env.sops
    fi

_deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    # Deploy telemetry: emit start/complete to Loki (job=personal-site,
    # script=deploy) and, when MATTERMOST_DEPLOY_WEBHOOK is set, post a one-line
    # deploy ping. Both are fire-and-forget — loki.sh swallows errors and the
    # curl is guarded — so neither can fail an otherwise-good deploy.
    source scripts/loki.sh
    start=$(date +%s)
    sha=$(git rev-parse --short HEAD)
    loki_emit deploy info started "sha=${sha}"
    echo "→ building CV PDF"
    pnpm build:cv
    echo "→ building site (Astro + postbuild CSP-hash sync)"
    pnpm build
    echo "→ deploying dist/ at commit ${sha}"
    pnpm exec wrangler pages deploy dist \
        --project-name=personal-site \
        --branch=main \
        --commit-hash="$(git rev-parse HEAD)"
    echo "→ purging Cloudflare cache..."
    curl -sf -X POST \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' | jq -r '.success'
    elapsed=$(( $(date +%s) - start ))
    loki_emit deploy info complete "elapsed_s=${elapsed}" "sha=${sha}"
    # Optional Mattermost deploy ping (no-op when the webhook env is unset).
    if [ -n "${MATTERMOST_DEPLOY_WEBHOOK:-}" ]; then
        curl -sf --max-time 5 -X POST "${MATTERMOST_DEPLOY_WEBHOOK}" \
          -H "Content-Type: application/json" \
          --data "$(jq -nc --arg sha "$sha" --arg s "$elapsed" \
            '{username:"pikemd.com deploy", text:("🚀 Deployed `" + $sha + "` to pikemd.com in " + $s + "s")}')" \
          >/dev/null 2>&1 || echo "warn: Mattermost deploy ping failed (non-fatal)" >&2
    fi
    echo "✓ deployed personal-site @ ${sha}"

# Run the Astro dev server bound to the tailnet (reachable from any tailnet
# device, not LAN/internet). Override port with: just astro-dev 4322
astro-dev port='4321':
    #!/usr/bin/env bash
    set -euo pipefail
    TS_IP=$(tailscale ip -4)
    TS_HOST=$(tailscale status --self --json | jq -r '.Self.DNSName' | sed 's/\.$//')
    echo "→ http://${TS_HOST}:{{port}}/"
    pnpm build:pdfs
    pnpm build:blog-assets
    VITE_ALLOWED_HOSTS="$TS_HOST" pnpm exec astro dev --host="$TS_IP" --port={{port}}

# Build the site bundle only (Astro + CV PDF + postbuild CSP-hash sync). Does not deploy.
build:
    pnpm build:cv
    pnpm build

# Build the site and deploy to Cloudflare Pages. Replaces the old GHA
# deploy.yml — all build + deploy steps run locally now.
#
# Credentials loaded from sops-encrypted build.env.sops; edit with `sopsx build.env.sops`.
# Required keys: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID.
# Optional key: MATTERMOST_DEPLOY_WEBHOOK — incoming webhook for a post-deploy ping.
# Refuses to deploy on a dirty tree to keep the deployed commit traceable.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "error: uncommitted changes — commit or stash before deploying" >&2
        exit 1
    fi
    # Decrypt build.env.sops (via `just _decrypt` → sopsx) and source into this
    # shell with set -a so the vars export into the `just _deploy` child.
    # Process substitution keeps plaintext off disk. `sops exec-env` can't be
    # used: no --input-type, mis-detects .sops as JSON (sops #717).
    set -a
    . <(just _decrypt)
    set +a
    just _deploy

# Scaffold a new blog post in the blog-posts submodule.
# Creates blog-posts/posts/<slug>.md with default frontmatter (draft: true)
# and opens it in $EDITOR. Title defaults to the slug, capitalized.
#
#   just new-post my-cool-post
#   just new-post my-cool-post "My Cool Post: An Adventure"
new-post slug title="":
    #!/usr/bin/env bash
    set -euo pipefail
    POST="blog-posts/posts/{{slug}}.md"
    if [[ -f "$POST" ]]; then
        echo "error: $POST already exists" >&2
        exit 1
    fi
    today=$(date -u +%Y-%m-%d)
    title="{{title}}"
    if [[ -z "$title" ]]; then
        # Derive title from slug: kebab-case → Title Case
        title=$(echo "{{slug}}" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++)$i=toupper(substr($i,1,1))substr($i,2)}1')
    fi
    {
        echo '---'
        echo "title: \"$title\""
        echo 'description: ""'
        echo "date: \"$today\""
        echo 'tags: []'
        echo 'draft: true'
        echo '---'
        echo ''
    } > "$POST"
    echo "✓ scaffolded $POST"
    echo "→ opening in \${EDITOR:-vim}"
    ${EDITOR:-vim} "$POST"
    echo ""
    echo "When ready to publish:  just publish {{slug}}"

# Publish a blog post end-to-end: flip draft:false in blog-posts, push it,
# bump the submodule pointer in personal-site, push that, then deploy.
# Idempotent.
#
#   just publish sops-age-docker-compose
publish slug:
    #!/usr/bin/env bash
    set -euo pipefail
    POST="posts/{{slug}}.md"
    if [[ ! -f "blog-posts/$POST" ]]; then
        echo "post not found: blog-posts/$POST" >&2
        echo "available:" >&2
        ls blog-posts/posts/ | sed 's/^/  /' >&2
        exit 1
    fi
    # 1. Flip draft frontmatter in blog-posts (idempotent)
    pushd blog-posts >/dev/null
    if grep -q '^draft: true' "$POST"; then
        sed -i 's/^draft: true$/draft: false/' "$POST"
        echo "→ flipped draft: true → false"
    elif grep -q '^draft: false' "$POST"; then
        echo "→ already draft: false"
    else
        echo "no 'draft:' frontmatter line in $POST" >&2
        popd >/dev/null
        exit 1
    fi
    # 2. Commit + push in blog-posts if the post changed; also push if we're ahead of origin
    if ! git diff --quiet -- "$POST"; then
        git commit -m "publish: {{slug}}" -- "$POST"
        echo "→ committed in blog-posts"
    fi
    if [[ -n "$(git log @{u}..HEAD 2>/dev/null || true)" ]]; then
        git push
        echo "→ pushed blog-posts"
    fi
    popd >/dev/null
    # 3. Bump submodule pointer in personal-site if it lags
    bumped=0
    if ! git diff --quiet -- blog-posts; then
        git add blog-posts
        git commit -m "blog: bump submodule for {{slug}}" -- blog-posts
        git push
        bumped=1
        echo "→ pushed personal-site submodule bump"
    else
        echo "→ personal-site submodule pointer already current"
    fi
    echo ""
    if [[ "$bumped" -eq 1 ]]; then
        echo "→ triggering deploy"
        just deploy
    else
        echo "✓ nothing changed; site already serving this content"
    fi

# Alias for `deploy` — build and push to Cloudflare Pages.
ship:
    @just deploy

# Update blog submodule to latest and commit the pointer
update-blog:
    git -C blog-posts fetch origin
    git submodule update --remote blog-posts
    bash scripts/copy-blog-assets.sh
    git add blog-posts
    git diff --cached --quiet blog-posts || git commit -m "chore: update blog-posts submodule"

# Update publications submodule to latest and commit the pointer
update-pubs:
    git -C publications fetch origin
    git submodule update --remote publications
    bash scripts/copy-pdfs.sh
    git add publications
    git diff --cached --quiet publications || git commit -m "chore: update publications submodule"
