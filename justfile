# List available commands
default:
    @just --list

# Build the site and deploy to Cloudflare Pages. Replaces the old GHA
# deploy.yml — all build + deploy steps run locally now.
#
# Credentials loaded from sops-encrypted .env.sops; create with `sops .env.sops`.
# Required keys: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID.
# Refuses to deploy on a dirty tree to keep the deployed commit traceable.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "error: uncommitted changes — commit or stash before deploying" >&2
        exit 1
    fi
    # `--input-type dotenv` is required because sops's autodetect doesn't
    # treat the .sops extension as dotenv; without it sops tries JSON and
    # fails with "Error unmarshalling input json" / "missing file to decrypt".
    sops exec-env --input-type dotenv .env.sops just _deploy

_deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "→ building CV PDF"
    npm run build:cv
    echo "→ building site (Astro + postbuild CSP-hash sync)"
    npm run build
    sha=$(git rev-parse --short HEAD)
    echo "→ deploying dist/ at commit ${sha}"
    npx wrangler pages deploy dist \
        --project-name=personal-site \
        --commit-hash="$(git rev-parse HEAD)"
    echo "→ purging Cloudflare cache..."
    curl -sf -X POST \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' | jq -r '.success'
    echo "✓ deployed personal-site @ ${sha}"

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
