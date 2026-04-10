# Personal Website Design Spec

## Overview

A professional personal website for Will Pike -- physician and researcher -- showcasing publications, CV, projects, and professional identity. Built with Astro, styled with Tailwind CSS, deployed to Cloudflare Pages via GitHub Actions.

## Goals

- Present a polished professional identity online
- Make publications discoverable and searchable
- Render CV from Markdown source with PDF download (Typst-compiled)
- Auto-rebuild when the Publications repo is updated
- Generate a CITATION.cff file from publication metadata

## Non-Goals (for now)

- Blog / writing section (structure will support adding later)
- CMS or admin interface
- Authentication or gated content
- Google Scholar auto-sync

---

## Architecture

### Repository: `pike00/personal-site`

```
personal-site/
  src/
    components/       # Reusable Astro/JSX components
    layouts/          # Page layouts (Base, Page, Publication)
    pages/            # Route pages
      index.astro     # Homepage
      publications/
        index.astro   # Publications list with search/filter
        [slug].astro  # Individual publication page
      abstracts/
        index.astro   # Abstracts list
      cv.astro        # CV page (rendered MD + PDF embed/download)
      projects.astro  # Projects page
      about.astro     # About page
      contact.astro   # Contact page
    content/
      cv/
        cv.md         # CV Markdown source (canonical)
        template.typ  # Typst template for PDF generation
      projects/       # Project entries as .md files
      about.md        # About page content
    lib/
      publications.ts # Parses info.xml files from submodule
      citations.ts    # Generates CITATION.cff
    styles/
      global.css      # Tailwind base + custom styles
  public/
    cv.pdf            # Generated during build (Typst output)
    CITATION.cff      # Generated during build
    favicon.svg
  publications/       # Git submodule -> pike00/Publications
  astro.config.mjs
  tailwind.config.mjs
  package.json
  tsconfig.json
```

### Git Submodule

The `pike00/Publications` repo is included as a git submodule at `publications/`. During the Astro build, `src/lib/publications.ts` reads and parses the `info.xml` files from each publication folder to generate typed publication data.

### Data Flow

```
publications/Publications/*/info.xml
        |
        v
  src/lib/publications.ts  (XML parser -> typed Publication objects)
        |
        v
  Astro content pipeline (pages, components, search index)
        |
        v
  Static HTML + JSON search index -> Cloudflare Pages
```

---

## Pages & Sections

### Homepage (`/`)

- **Nav bar:** Logo/name, links (Home, Publications, CV, Projects, About, Contact), dark mode toggle
- **Hero section:** Dark gradient background (#1a1a2e -> #16213e), purple accents (#a78bfa). Tagline, subtitle, two CTA buttons ("View Publications", "Download CV")
- **Stats bar:** Publication count, abstract count, research area count, first publication year. Pulled dynamically from parsed data.
- **Recent publications:** 3 most recent publication cards with title, authors, journal, year, topic tag. "View all" link.
- **Research areas:** Clickable topic pills that link to filtered publications page
- **Footer:** Copyright, links to GitHub, Google Scholar, LinkedIn

### Publications (`/publications`)

- **Search bar:** Client-side full-text search across title, authors, journal, year
- **Filters:** Year dropdown, research area tags (multi-select)
- **Sort:** Newest first (default), oldest first
- **Publication cards:** Each card shows:
  - Title
  - Authors (with "Pike CW" highlighted)
  - Journal name, volume, issue, pages
  - Publication date
  - DOI link (external)
  - Research area tag(s)
  - PDF download link (if available in submodule)
- **Individual publication pages** (`/publications/[slug]`): Full metadata, abstract (if available), links to PubMed, DOI, PDF

### Abstracts (`/abstracts`)

- Similar layout to publications but simpler cards
- Title, conference/venue, year
- PDF download link
- Data source: not all abstracts have `info.xml`. For those without metadata, fall back to folder name parsing (number + title) and PDF-only display.
- Unpublished abstracts (from `publications/Unpublished/`) are included with an "Unpublished" badge.

### CV (`/cv`)

- **Primary view:** Astro renders the Markdown CV directly as styled HTML on the page
- **Download button:** Prominent "Download PDF" button linking to `/cv.pdf` (Typst-compiled)
- **Build pipeline:** During build, Typst compiles `src/content/cv/cv.md` using `template.typ` to produce `public/cv.pdf`

### Projects (`/projects`)

- Grid of project cards
- Each project is a `.md` file in `src/content/projects/` with frontmatter (title, description, url, tags, date)
- Card shows: title, description, tech tags, link to repo or live site

### About (`/about`)

- Rendered from `src/content/about.md`
- Photo (optional), bio, professional background, research interests
- Links to external profiles

### Contact (`/contact`)

- Email link (mailto)
- Links to GitHub, LinkedIn, Google Scholar, ORCID
- Optional: simple contact form via Cloudflare Workers (deferred)

---

## Design System

### Color Palette

**Light mode (default):**
- Background: #fafafa (page), #ffffff (cards)
- Text: #1a1a2e (primary), #6b7280 (secondary)
- Accent: #a78bfa (purple-400), #7c3aed (purple-600 for tags)
- Hero: linear-gradient(135deg, #1a1a2e, #16213e)
- Borders: #e5e7eb
- Tag background: #f3f0ff

**Dark mode:**
- Background: #0f172a (page), #1e293b (cards)
- Text: #e2e8f0 (primary), #94a3b8 (secondary)
- Accent: #a78bfa (same purple -- works on dark)
- Borders: #334155

### Typography

- Font: Inter (variable weight) with system-ui fallback
- Headings: 700-800 weight, tight letter-spacing (-0.5px)
- Body: 400 weight, 1.6-1.7 line-height
- Small text/labels: 0.72-0.78rem, uppercase, letter-spacing 1-2px
- Code/mono: JetBrains Mono or system monospace

### Spacing

- Follow Tailwind's 4px base scale
- Section padding: 32px vertical, 28px horizontal (mobile), scales up for desktop
- Card padding: 18px
- Gap between cards: 10-12px

### Components

- **PublicationCard:** Left purple border, title, authors, journal, date, topic tags
- **TopicPill:** Rounded, purple bg on light, used for filtering
- **StatBlock:** Large number + label, used in stats bar
- **NavBar:** Sticky, white/dark bg, logo left, links right, dark mode toggle
- **Footer:** Dark bg, copyright + social links
- **SearchBar:** Input with icon, client-side filtering
- **FilterBar:** Year dropdown + tag multi-select

---

## Publication Data Model

Parsed from PubMed eSummary XML (`info.xml`):

```typescript
interface Publication {
  id: string;              // PubMed ID
  slug: string;            // URL-safe slug derived from folder name
  title: string;
  authors: string[];
  journal: string;         // Full journal name
  journalAbbrev: string;   // Source field (abbreviated)
  volume: string;
  issue: string;
  pages: string;
  pubDate: string;         // e.g. "2026 Apr 6"
  epubDate: string;
  doi: string;
  pmcId?: string;
  pii?: string;
  hasAbstract: boolean;
  pubType: string;         // e.g. "Journal Article"
  researchArea: string[];  // Manually tagged (frontmatter or mapping file)
  pdfPath?: string;        // Relative path to PDF in submodule
  folderName: string;      // Original folder name for reference
}
```

### Research Area Tagging

A mapping file (`src/content/publication-tags.yaml`) maps folder names to research area tags:

```yaml
"001 Online Ratings of Urologists":
  tags: ["Urology", "Health Informatics"]
"002 IC Opioids":
  tags: ["Urology", "Pain Management"]
# ...
```

This keeps tags decoupled from the Publications repo (which is a data archive, not a website concern).

---

## CITATION.cff Generation

A build-time script (`src/lib/citations.ts`) generates a `CITATION.cff` file from all publication metadata. Output goes to `public/CITATION.cff`.

Format follows the Citation File Format specification:

```yaml
cff-version: 1.2.0
title: "Will Pike - Publications"
type: dataset
authors:
  - family-names: Pike
    given-names: CW
references:
  - type: article
    title: "Online Ratings of Urologists: Comprehensive Analysis"
    authors:
      - family-names: Pike
        given-names: CW
      # ...
    doi: "10.2196/12436"
    journal: "Journal of Medical Internet Research"
    year: 2019
  # ... one entry per publication
```

---

## CI/CD Pipeline

### GitHub Actions: `personal-site` repo

**`.github/workflows/deploy.yml`** -- triggered on push to main OR repository_dispatch:

```yaml
on:
  push:
    branches: [main]
  repository_dispatch:
    types: [publications-updated]
```

Steps:
1. Checkout with submodules (`submodules: recursive`)
2. Setup Node.js
3. Install dependencies
4. Install Typst (for CV PDF generation)
5. Build CV PDF: `typst compile src/content/cv/template.typ public/cv.pdf`
6. Build Astro site: `npm run build`
7. Deploy to Cloudflare Pages via `wrangler pages deploy`

### GitHub Actions: `Publications` repo

**`.github/workflows/notify-site.yml`** -- triggered on push to master:

```yaml
on:
  push:
    branches: [master]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.SITE_DEPLOY_TOKEN }}
          repository: pike00/personal-site
          event-type: publications-updated
```

Requires a GitHub Personal Access Token (`SITE_DEPLOY_TOKEN`) with repo scope, stored as a secret in the Publications repo.

### Cloudflare Pages Setup

- Project name: `personal-site` (or custom domain if available)
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: none required for static build
- Custom domain: configured in Cloudflare dashboard when ready

---

## Search Implementation

Client-side search using Fuse.js (lightweight fuzzy search):

- At build time, Astro generates a JSON index of all publications (title, authors, journal, year, tags)
- Fuse.js loads this index on the publications page
- Search input filters results in real-time
- Combined with year/tag dropdown filters
- No server-side component needed

This is implemented as an Astro "island" -- the search/filter component hydrates with `client:load` while the rest of the page is static HTML.

---

## Dark Mode

- Toggle button in nav bar (sun/moon icon)
- Uses Tailwind's `class` strategy (not `media`)
- Preference saved to localStorage
- Respects `prefers-color-scheme` as initial default
- All components use Tailwind `dark:` variants

---

## Responsive Design

- Mobile-first approach
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Nav collapses to hamburger menu on mobile
- Publication cards stack vertically on mobile
- Stats bar wraps to 2x2 grid on small screens
- Hero text scales down on mobile

---

## Included From Day One

- **Sitemap:** Astro `@astrojs/sitemap` integration, auto-generated at build time
- **SEO meta tags:** Open Graph and Twitter Card meta on all pages

## Future Extensibility

Designed to easily add later:
- **Blog:** Add `src/content/blog/` collection, blog list/post pages
- **Google Scholar sync:** Build script to fetch citation counts
- **Contact form:** Cloudflare Workers function
- **RSS feed:** Astro RSS integration
