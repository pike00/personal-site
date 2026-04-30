# List available commands
default:
    @just --list

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
