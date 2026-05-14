# List available commands
default:
    @just --list

# Build and deploy to Cloudflare Pages, then purge the CDN cache.
# Requires CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID in env.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    npm run build:cv
    npm run build
    npx wrangler pages deploy dist --project-name=personal-site
    echo "→ purging Cloudflare cache..."
    curl -sf -X POST \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' | jq -r '.success'
    echo "✓ deployed"

# Run the Astro dev server bound to the tailnet (reachable from any tailnet
# device, not LAN/internet). Override port with: just dev 4322
dev port='4321':
    #!/usr/bin/env bash
    set -euo pipefail
    TS_IP=$(tailscale ip -4)
    TS_HOST=$(tailscale status --self --json | jq -r '.Self.DNSName' | sed 's/\.$//')
    echo "→ http://${TS_HOST}:{{port}}/"
    npm run build:pdfs
    npm run build:blog-assets
    VITE_ALLOWED_HOSTS="$TS_HOST" npx astro dev --host="$TS_IP" --port={{port}}

# Update publications submodule to latest and commit the pointer
update-pubs:
    git -C publications fetch origin
    git submodule update --remote publications
    bash scripts/copy-pdfs.sh
    git add publications
    git diff --cached --quiet publications || git commit -m "chore: update publications submodule"

# Update blog submodule to latest and commit the pointer
update-blog:
    git -C blog-posts fetch origin
    git submodule update --remote blog-posts
    bash scripts/copy-blog-assets.sh
    git add blog-posts
    git diff --cached --quiet blog-posts || git commit -m "chore: update blog-posts submodule"

# Publish a blog post end-to-end: flip draft:false in blog-posts, push it,
# bump the submodule pointer in personal-site, push that. Idempotent.
#
#   just publish-post sops-age-docker-compose
publish-post slug:
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
    if ! git diff --quiet -- blog-posts; then
        git add blog-posts
        git commit -m "blog: bump submodule for {{slug}}" -- blog-posts
        git push
        echo "→ pushed personal-site submodule bump"
    else
        echo "→ personal-site submodule pointer already current"
    fi
    echo ""
    echo "✓ published. watch the deploy:"
    echo "  gh run watch --repo pike00/personal-site"
