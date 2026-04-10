# personal-site

Personal site and academic portfolio built with [Astro](https://astro.build), deployed to [Cloudflare Pages](https://pages.cloudflare.com).

## Stack

- **Astro 5** + TypeScript (strict)
- **Tailwind CSS** with dark mode
- **React** for interactive components (publication search via Fuse.js)
- **Typst** for CV compilation (`.typ` -> PDF)
- **Publications** sourced from a git submodule with auto-generated citations

## Project Structure

```
src/
├── pages/          # Routes: index, about, projects, publications, cv, contact
├── components/     # Astro + React components
├── layouts/        # Base and page layouts
├── content/        # Content collections (cv, projects, publication tags)
├── lib/            # Utilities (citations, abstracts, types)
└── styles/         # Global CSS
scripts/            # Build utilities (Bash + Tsx)
publications/       # Git submodule
```

## Development

Requires Node >= 22.12.0 and [Typst](https://typst.app) for CV builds.

```sh
npm install
npm run dev          # Start dev server at localhost:4321
npm run build        # Full pipeline: PDFs -> citations -> CV -> Astro build
npm run preview      # Preview production build
```

### Build pipeline

`npm run build` runs these steps in sequence:

1. `build:pdfs` -- copy publication PDFs from the submodule
2. `build:citations` -- generate citation metadata from source files
3. `build:cv` -- compile CV from Typst template to PDF
4. `astro build` -- build the static site

## Deployment

Deployed via GitHub Actions to Cloudflare Pages. Builds trigger on pushes to main and via `repository_dispatch` when the publications submodule is updated upstream.
