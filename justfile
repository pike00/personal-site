# Update publications submodule to latest and commit the pointer
update-pubs:
    git -C publications pull origin master
    git add publications
    git commit -m "chore: update publications submodule"
