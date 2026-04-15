# personal-site

Personal site and academic portfolio built with [Astro](https://astro.build), deployed to [GitHub Pages](https://pages.github.com).

## Stack

- **Astro 5** + TypeScript (strict)
- **Tailwind CSS** with dark mode
- **React** for interactive components (publication search via Fuse.js)
- **Typst** for CV compilation (`.typ` -> PDF)
- **Publications** sourced from a git submodule with auto-generated citations

## Project Structure

```
src/
├── pages/          # Routes: index, about, projects, blog, publications, cv, contact
├── components/     # Astro + React components
├── layouts/        # Base and page layouts
├── content/        # Content collections (cv, projects, blog, publication tags)
├── lib/            # Utilities (citations, abstracts, types)
└── styles/         # Global CSS
scripts/            # Build utilities (Bash + Tsx)
publications/       # Git submodule
```

## Development

Requires Node >= 22.12.0 and [Typst](https://typst.app) for CV builds.

```sh
git clone --recurse-submodules https://github.com/pike00/personal-site.git
# or, if already cloned without submodules:
git submodule update --init --recursive

npm install
npm run dev          # Start dev server at localhost:4321
npm run build        # Full pipeline: PDFs -> citations -> CV -> Astro build
npm run preview      # Preview production build
```

> **Note:** The `publications/` directory is a git submodule. If you skip submodule init, the Publications page, homepage recent-publications list, and CV publication counts will all render empty on the dev server.

### Build pipeline

`npm run build` runs these steps in sequence:

1. `build:pdfs` -- copy publication PDFs from the submodule
2. `build:citations` -- generate citation metadata from source files
3. `build:cv` -- compile CV from Typst template to PDF
4. `astro build` -- build the static site

## Deployment

Deployed via GitHub Actions to GitHub Pages. Builds trigger on pushes to main and via `repository_dispatch` when the publications submodule is updated upstream.
