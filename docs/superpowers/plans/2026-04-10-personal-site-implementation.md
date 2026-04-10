# Personal Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a professional personal website for Will Pike at pike00/personal-site, with auto-synced publications from the Publications repo.

**Architecture:** Astro static site with Tailwind CSS, publication data parsed from PubMed XML in a git submodule, CV rendered from Markdown with Typst PDF compilation, deployed to Cloudflare Pages via GitHub Actions with repository_dispatch for auto-rebuild.

**Tech Stack:** Astro 5, Tailwind CSS 4, TypeScript, Fuse.js, Typst, Cloudflare Pages, GitHub Actions

---

## File Structure

```
personal-site/
  src/
    components/
      NavBar.astro            # Sticky nav with dark mode toggle
      Footer.astro            # Dark footer with social links
      PublicationCard.astro    # Reusable pub card (left purple border, tags)
      AbstractCard.astro       # Simpler card for abstracts
      ProjectCard.astro       # Card for project entries
      StatBlock.astro         # Number + label stat display
      TopicPill.astro         # Rounded tag pill
      SearchPublications.tsx  # React island: search + filter + sort
      DarkModeToggle.astro    # Sun/moon toggle button
      SEO.astro               # Open Graph + Twitter Card meta tags
    layouts/
      BaseLayout.astro        # HTML shell, head, fonts, global styles
      PageLayout.astro        # BaseLayout + NavBar + Footer + content slot
    pages/
      index.astro             # Homepage
      publications/
        index.astro           # Publications list page
        [slug].astro          # Individual publication detail page
      abstracts/
        index.astro           # Abstracts list page
      cv.astro                # CV page (rendered MD + PDF download)
      projects.astro          # Projects grid page
      about.astro             # About page
      contact.astro           # Contact page
    content/
      cv/
        cv.md                 # Markdown CV source (canonical)
        template.typ          # Typst template consuming cv.md
      projects/
        personal-site.md      # Example project entry
      about.md                # About page content
      publication-tags.yaml   # Folder name -> research area tag mapping
    lib/
      publications.ts         # Parses info.xml from submodule -> Publication[]
      abstracts.ts            # Parses abstract folders -> Abstract[]
      citations.ts            # Generates CITATION.cff from Publication[]
      types.ts                # Publication, Abstract, Project interfaces
    styles/
      global.css              # Tailwind directives + custom theme
  public/
    favicon.svg
  publications/               # Git submodule -> pike00/Publications
  scripts/
    build-cv.sh               # Typst compilation script
    copy-pdfs.sh              # Copies PDFs from submodule to public/
    generate-citations.ts     # CITATION.cff generation script
  .github/
    workflows/
      deploy.yml              # Build + deploy to Cloudflare Pages
  astro.config.mjs
  tailwind.config.ts
  tsconfig.json
  package.json
```

---

### Task 1: Repository Setup and Astro Scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `src/styles/global.css`, `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/work/Documents/personal-site
git init
```

- [ ] **Step 2: Initialize Astro project**

```bash
cd /Users/work/Documents/personal-site
npm create astro@latest -- --template minimal --no-install --no-git .
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/work/Documents/personal-site
npm install
npm install @astrojs/tailwind @astrojs/sitemap @astrojs/react tailwindcss @tailwindcss/typography
npm install react react-dom @types/react @types/react-dom
npm install fuse.js fast-xml-parser yaml marked gray-matter
```

- [ ] **Step 4: Configure Astro**

Write `astro.config.mjs`:
```javascript
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://personal-site.pages.dev",
  integrations: [tailwind(), sitemap(), react()],
});
```

- [ ] **Step 5: Configure Tailwind**

Write `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1a1a2e",
        "primary-light": "#16213e",
        accent: {
          DEFAULT: "#a78bfa",
          dark: "#7c3aed",
        },
        surface: {
          light: "#fafafa",
          card: "#ffffff",
          dark: "#0f172a",
          "card-dark": "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
```

- [ ] **Step 6: Write global CSS**

Write `src/styles/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply bg-surface-light text-primary antialiased;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
  .dark body {
    @apply bg-surface-dark text-gray-200;
  }
}
```

- [ ] **Step 7: Add Publications submodule**

```bash
cd /Users/work/Documents/personal-site
git submodule add git@github.com:pike00/Publications.git publications
```

- [ ] **Step 8: Update .gitignore**

Append to `.gitignore`:
```
node_modules/
dist/
.astro/
public/cv.pdf
public/CITATION.cff
public/Publications/
public/Abstracts/
public/Unpublished/
.superpowers/
```

- [ ] **Step 9: Verify build works**

```bash
cd /Users/work/Documents/personal-site
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
cd /Users/work/Documents/personal-site
git add -A
git commit -m "feat: initialize Astro project with Tailwind, submodule, and dependencies"
```

---

### Task 2: Type Definitions and Publication XML Parser

**Files:**
- Create: `src/lib/types.ts`, `src/lib/publications.ts`, `src/lib/abstracts.ts`

- [ ] **Step 1: Define TypeScript interfaces**

Write `src/lib/types.ts`:
```typescript
export interface Publication {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  journal: string;
  journalAbbrev: string;
  volume: string;
  issue: string;
  pages: string;
  pubDate: string;
  epubDate: string;
  doi: string;
  pmcId?: string;
  pii?: string;
  hasAbstract: boolean;
  pubType: string;
  researchArea: string[];
  pdfPath?: string;
  folderName: string;
}

export interface Abstract {
  slug: string;
  title: string;
  folderName: string;
  pdfPath?: string;
  abstractId?: string;
  id?: string;
  authors?: string[];
  journal?: string;
  pubDate?: string;
  doi?: string;
  unpublished: boolean;
}

export interface Project {
  title: string;
  description: string;
  url?: string;
  repo?: string;
  tags: string[];
  date: string;
}

export interface SearchablePublication {
  slug: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  tags: string[];
}
```

- [ ] **Step 2: Write the XML parser**

Write `src/lib/publications.ts`:
```typescript
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import type { Publication, SearchablePublication } from "./types";

const PUBLICATIONS_DIR = path.resolve("publications/Publications");
const TAGS_FILE = path.resolve("src/content/publication-tags.yaml");

function slugify(folderName: string): string {
  return folderName
    .toLowerCase()
    .replace(/^\d+\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findPdf(dirPath: string): string | undefined {
  const files = fs.readdirSync(dirPath);
  const pdf = files.find(
    (f) =>
      f.endsWith(".pdf") &&
      f !== "Pubmed.pdf" &&
      !f.startsWith("20")
  );
  return pdf ? path.join(dirPath, pdf) : undefined;
}

function parseXml(xmlPath: string): Record<string, string | string[]> {
  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xmlContent);
  const docSum = parsed.eSummaryResult.DocSum;
  const items = docSum.Item;

  const result: Record<string, unknown> = { id: String(docSum.Id) };

  for (const item of Array.isArray(items) ? items : [items]) {
    const name = item["@_Name"];
    const type = item["@_Type"];

    if (name === "AuthorList" && type === "List") {
      const authorItems = item.Item;
      const authors = Array.isArray(authorItems)
        ? authorItems.map((a: Record<string, string>) => a["#text"])
        : authorItems
          ? [authorItems["#text"]]
          : [];
      result.authors = authors;
    } else if (name === "ArticleIds" && type === "List") {
      const idItems = Array.isArray(item.Item) ? item.Item : [item.Item];
      for (const idItem of idItems) {
        const idName = idItem["@_Name"];
        if (idName === "pmc" || idName === "pmcid") {
          result.pmcId = String(idItem["#text"])
            .replace("pmc-id: ", "")
            .replace(";", "");
        }
        if (idName === "pii") {
          result.pii = String(idItem["#text"]);
        }
      }
    } else if (type === "List") {
      // skip other lists
    } else {
      result[name] = String(item["#text"] ?? "");
    }
  }

  return result as Record<string, string | string[]>;
}

function loadTags(): Record<string, string[]> {
  if (!fs.existsSync(TAGS_FILE)) return {};
  const content = fs.readFileSync(TAGS_FILE, "utf-8");
  const parsed = yaml.parse(content) as Record<string, { tags: string[] }>;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(parsed)) {
    result[key] = value.tags;
  }
  return result;
}

export function getPublications(): Publication[] {
  if (!fs.existsSync(PUBLICATIONS_DIR)) return [];

  const tags = loadTags();
  const folders = fs.readdirSync(PUBLICATIONS_DIR).filter((f) => {
    return fs.statSync(path.join(PUBLICATIONS_DIR, f)).isDirectory();
  });

  const publications: Publication[] = [];

  for (const folder of folders) {
    const dirPath = path.join(PUBLICATIONS_DIR, folder);
    const xmlPath = path.join(dirPath, "info.xml");
    const pdfPath = findPdf(dirPath);
    const slug = slugify(folder);

    if (fs.existsSync(xmlPath)) {
      const data = parseXml(xmlPath);
      publications.push({
        id: data.id as string,
        slug,
        title: (data.Title as string).replace(/\.$/, ""),
        authors: data.authors as string[],
        journal: (data.FullJournalName as string) || (data.Source as string),
        journalAbbrev: data.Source as string,
        volume: data.Volume as string,
        issue: data.Issue as string,
        pages: data.Pages as string,
        pubDate: data.PubDate as string,
        epubDate: data.EPubDate as string,
        doi: data.DOI as string,
        pmcId: data.pmcId as string | undefined,
        pii: data.pii as string | undefined,
        hasAbstract: data.HasAbstract === "1",
        pubType: (data.PubType as string) ?? "Journal Article",
        researchArea: tags[folder] ?? [],
        pdfPath: pdfPath
          ? path.relative(path.resolve("."), pdfPath)
          : undefined,
        folderName: folder,
      });
    } else if (pdfPath) {
      const titleFromFolder = folder.replace(/^\d+\s+/, "");
      publications.push({
        id: "",
        slug,
        title: titleFromFolder,
        authors: [],
        journal: "",
        journalAbbrev: "",
        volume: "",
        issue: "",
        pages: "",
        pubDate: "",
        epubDate: "",
        doi: "",
        hasAbstract: false,
        pubType: "Journal Article",
        researchArea: tags[folder] ?? [],
        pdfPath: path.relative(path.resolve("."), pdfPath),
        folderName: folder,
      });
    }
  }

  // Sort by folder number descending (newest first)
  publications.sort((a, b) => {
    const numA = parseInt(a.folderName.match(/^(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.folderName.match(/^(\d+)/)?.[1] ?? "0", 10);
    return numB - numA;
  });

  return publications;
}

export function buildSearchIndex(
  publications: Publication[]
): SearchablePublication[] {
  return publications.map((p) => ({
    slug: p.slug,
    title: p.title,
    authors: p.authors.join(", "),
    journal: p.journal,
    year: p.pubDate ? p.pubDate.split(" ")[0] : "",
    tags: p.researchArea,
  }));
}
```

- [ ] **Step 3: Write the abstracts parser**

Write `src/lib/abstracts.ts`:
```typescript
import fs from "node:fs";
import path from "node:path";
import type { Abstract } from "./types";

const ABSTRACTS_DIR = path.resolve("publications/Abstracts");
const UNPUBLISHED_DIR = path.resolve("publications/Unpublished");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\d+\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findPdf(dirPath: string): string | undefined {
  const files = fs.readdirSync(dirPath);
  const pdf = files.find(
    (f) => f.endsWith(".pdf") && f !== "Pubmed.pdf"
  );
  return pdf ? path.join(dirPath, pdf) : undefined;
}

export function getAbstracts(): Abstract[] {
  const abstracts: Abstract[] = [];

  if (fs.existsSync(ABSTRACTS_DIR)) {
    const folders = fs.readdirSync(ABSTRACTS_DIR).filter((f) =>
      fs.statSync(path.join(ABSTRACTS_DIR, f)).isDirectory()
    );

    for (const folder of folders) {
      const dirPath = path.join(ABSTRACTS_DIR, folder);
      const pdfPath = findPdf(dirPath);
      const titleFromFolder = folder.replace(/^\d+\s+/, "");

      const abstractIdPath = path.join(dirPath, "abstract_id.txt");
      const abstractId = fs.existsSync(abstractIdPath)
        ? fs.readFileSync(abstractIdPath, "utf-8").trim()
        : undefined;

      abstracts.push({
        slug: slugify(folder),
        title: titleFromFolder,
        folderName: folder,
        pdfPath: pdfPath
          ? path.relative(path.resolve("."), pdfPath)
          : undefined,
        abstractId,
        unpublished: false,
      });
    }
  }

  if (fs.existsSync(UNPUBLISHED_DIR)) {
    const files = fs.readdirSync(UNPUBLISHED_DIR);
    for (const file of files) {
      if (!file.endsWith(".pdf")) continue;
      const title = file.replace(/\.pdf$/, "");
      abstracts.push({
        slug: slugify(title),
        title,
        folderName: "Unpublished",
        pdfPath: path.relative(
          path.resolve("."),
          path.join(UNPUBLISHED_DIR, file)
        ),
        unpublished: true,
      });
    }
  }

  return abstracts;
}
```

- [ ] **Step 4: Verify parser works**

```bash
cd /Users/work/Documents/personal-site
npx tsx -e "
import { getPublications } from './src/lib/publications.ts';
const pubs = getPublications();
console.log('Total publications:', pubs.length);
console.log('With XML:', pubs.filter(p => p.id).length);
console.log('Without XML:', pubs.filter(p => !p.id).length);
console.log('First title:', pubs[pubs.length - 1].title);
"
```
Expected: 21 publications total, ~17 with XML, ~4 without.

- [ ] **Step 5: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/lib/
git commit -m "feat: add publication and abstract XML parsers with type definitions"
```

---

### Task 3: Publication Tags File

**Files:**
- Create: `src/content/publication-tags.yaml`

- [ ] **Step 1: Create the tag mapping**

Write `src/content/publication-tags.yaml`:
```yaml
"001 Online Ratings of Urologists":
  tags: ["Urology", "Health Informatics"]
"002 IC Opioids":
  tags: ["Urology", "Pain Management"]
"003 VALUE Study":
  tags: ["Urology"]
"004 Epoprostenol COVID":
  tags: ["Infectious Disease", "Critical Care"]
"005 Online Rating Urologist by Subspecialty":
  tags: ["Urology", "Health Informatics"]
"006 RRT COVID":
  tags: ["Infectious Disease", "Critical Care"]
"007 Capes Paper":
  tags: ["Ethics"]
"008 Prone COVID":
  tags: ["Infectious Disease", "Critical Care"]
"009 Accuracy of NIBP":
  tags: ["Critical Care"]
"010 MACE Stimulant Use":
  tags: ["Cardiology", "Substance Use"]
"011 MDD in MS":
  tags: ["Neurology", "Psychiatry"]
"012 Fracture Risk GLP v Sleeve Gastrectomy":
  tags: ["Endocrinology", "Orthopedics"]
"013 Adherence to guideline-directed medical therapy":
  tags: ["Cardiology"]
"014 Telemedicine Visits for New Onycomycosis Diangoses":
  tags: ["Dermatology", "Telemedicine"]
"015 Screening for MetALD":
  tags: ["Endocrinology", "Hepatology"]
"016 Estrogen Exposure from Contraceptives in Migraine":
  tags: ["Neurology", "Gynecology"]
"017 Heart Transplant Outcomes in SUD":
  tags: ["Cardiology", "Substance Use"]
"018 Perioperative Pressure Injuries":
  tags: ["Perioperative Medicine"]
"019 MetALD + AUD + GLP1":
  tags: ["Endocrinology", "Substance Use", "Hepatology"]
"020 Inflammatory Vaginitis in Multiple Sclerosis":
  tags: ["Neurology", "Gynecology"]
"021 PJI Racial Disparities TKA":
  tags: ["Orthopedics", "Health Equity"]
```

- [ ] **Step 2: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/content/publication-tags.yaml
git commit -m "feat: add research area tags for all publications"
```

---

### Task 4: Base Layout and Shared Components

**Files:**
- Create: `src/components/SEO.astro`, `src/components/DarkModeToggle.astro`, `src/components/NavBar.astro`, `src/components/Footer.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/PageLayout.astro`, `public/favicon.svg`

- [ ] **Step 1: Create SEO component**

Write `src/components/SEO.astro`:
```astro
---
interface Props {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

const { title, description, image, type = "website" } = Astro.props;
const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
const siteTitle = "Will Pike";
const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
---

<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalUrl} />

<meta property="og:type" content={type} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:site_name" content={siteTitle} />
{image && <meta property="og:image" content={new URL(image, Astro.site)} />}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
{image && <meta name="twitter:image" content={new URL(image, Astro.site)} />}
```

- [ ] **Step 2: Create DarkModeToggle**

Write `src/components/DarkModeToggle.astro`:
```astro
<button
  id="dark-mode-toggle"
  aria-label="Toggle dark mode"
  class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
>
  <svg id="sun-icon" class="w-5 h-5 hidden dark:block text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
  <svg id="moon-icon" class="w-5 h-5 block dark:hidden text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
</button>

<script is:inline>
  (function() {
    var toggle = document.getElementById("dark-mode-toggle");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var stored = localStorage.getItem("theme");

    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }

    if (toggle) {
      toggle.addEventListener("click", function() {
        var isDark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
      });
    }
  })();
</script>
```

- [ ] **Step 3: Create NavBar**

Write `src/components/NavBar.astro`:
```astro
---
import DarkModeToggle from "./DarkModeToggle.astro";

const links = [
  { href: "/", label: "Home" },
  { href: "/publications", label: "Publications" },
  { href: "/cv", label: "CV" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const currentPath = Astro.url.pathname;
---

<nav class="sticky top-0 z-40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
    <a href="/" class="text-lg font-bold tracking-tight text-primary dark:text-white">
      Will Pike
    </a>

    <div class="hidden md:flex items-center gap-6">
      {links.map((link) => (
        <a
          href={link.href}
          class:list={[
            "text-sm transition-colors",
            currentPath === link.href || (link.href !== "/" && currentPath.startsWith(link.href))
              ? "text-primary dark:text-white font-semibold"
              : "text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white",
          ]}
        >
          {link.label}
        </a>
      ))}
      <DarkModeToggle />
    </div>

    <div class="flex items-center gap-3 md:hidden">
      <DarkModeToggle />
      <button id="mobile-menu-btn" aria-label="Open menu" class="w-10 h-10 flex items-center justify-center">
        <svg class="w-6 h-6 text-primary dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </div>

  <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark">
    <div class="px-6 py-4 flex flex-col gap-3">
      {links.map((link) => (
        <a
          href={link.href}
          class:list={[
            "text-sm py-2 transition-colors",
            currentPath === link.href || (link.href !== "/" && currentPath.startsWith(link.href))
              ? "text-primary dark:text-white font-semibold"
              : "text-gray-500 dark:text-gray-400",
          ]}
        >
          {link.label}
        </a>
      ))}
    </div>
  </div>
</nav>

<script is:inline>
  var menuBtn = document.getElementById("mobile-menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function() {
      var menu = document.getElementById("mobile-menu");
      if (menu) menu.classList.toggle("hidden");
    });
  }
</script>
```

- [ ] **Step 4: Create Footer**

Write `src/components/Footer.astro`:
```astro
---
const year = new Date().getFullYear();
const links = [
  { href: "https://github.com/pike00", label: "GitHub" },
  { href: "https://www.linkedin.com/in/willpike", label: "LinkedIn" },
  { href: "https://scholar.google.com", label: "Google Scholar" },
];
---

<footer class="bg-primary dark:bg-gray-950 text-gray-400 mt-auto">
  <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
    <p class="text-sm">&copy; {year} Will Pike. Built with Astro.</p>
    <div class="flex gap-6">
      {links.map((link) => (
        <a href={link.href} target="_blank" rel="noopener noreferrer" class="text-sm hover:text-white transition-colors">
          {link.label}
        </a>
      ))}
    </div>
  </div>
</footer>
```

- [ ] **Step 5: Create BaseLayout**

Write `src/layouts/BaseLayout.astro`:
```astro
---
import SEO from "../components/SEO.astro";
import "../styles/global.css";

interface Props {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

const { title, description, image, type } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://rsms.me/" />
    <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    <SEO title={title} description={description} image={image} type={type} />
  </head>
  <body class="min-h-screen flex flex-col">
    <slot />
  </body>
</html>

<script is:inline>
  (function() {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  })();
</script>
```

- [ ] **Step 6: Create PageLayout**

Write `src/layouts/PageLayout.astro`:
```astro
---
import BaseLayout from "./BaseLayout.astro";
import NavBar from "../components/NavBar.astro";
import Footer from "../components/Footer.astro";

interface Props {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

const { title, description, image, type } = Astro.props;
---

<BaseLayout title={title} description={description} image={image} type={type}>
  <NavBar />
  <main class="flex-1">
    <slot />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 7: Create favicon**

Write `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1a1a2e"/>
  <text x="16" y="22" text-anchor="middle" fill="#a78bfa" font-family="system-ui" font-size="18" font-weight="bold">W</text>
</svg>
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/work/Documents/personal-site
npm run build
```
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/components/ src/layouts/ public/favicon.svg
git commit -m "feat: add base layout, nav, footer, dark mode, and SEO components"
```

---

### Task 5: Reusable Display Components

**Files:**
- Create: `src/components/StatBlock.astro`, `src/components/TopicPill.astro`, `src/components/PublicationCard.astro`, `src/components/AbstractCard.astro`, `src/components/ProjectCard.astro`

- [ ] **Step 1: Create StatBlock**

Write `src/components/StatBlock.astro`:
```astro
---
interface Props {
  value: string | number;
  label: string;
}

const { value, label } = Astro.props;
---

<div class="text-center px-6 py-5">
  <div class="text-3xl font-extrabold text-accent">{value}</div>
  <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{label}</div>
</div>
```

- [ ] **Step 2: Create TopicPill**

Write `src/components/TopicPill.astro`:
```astro
---
interface Props {
  tag: string;
  href?: string;
  size?: "sm" | "md";
}

const { tag, href, size = "md" } = Astro.props;
const sizeClasses = size === "sm"
  ? "text-xs px-2.5 py-0.5"
  : "text-sm px-4 py-2";
---

{href ? (
  <a
    href={href}
    class:list={[
      "inline-block rounded-full font-medium bg-purple-50 text-accent-dark dark:bg-purple-950 dark:text-accent hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors",
      sizeClasses,
    ]}
  >
    {tag}
  </a>
) : (
  <span
    class:list={[
      "inline-block rounded-full font-medium bg-purple-50 text-accent-dark dark:bg-purple-950 dark:text-accent",
      sizeClasses,
    ]}
  >
    {tag}
  </span>
)}
```

- [ ] **Step 3: Create PublicationCard**

Write `src/components/PublicationCard.astro`:
```astro
---
import TopicPill from "./TopicPill.astro";
import type { Publication } from "../lib/types";

interface Props {
  publication: Publication;
}

const { publication: pub } = Astro.props;

const authorDisplay = pub.authors
  .map((a) => (a === "Pike CW" ? `<strong>${a}</strong>` : a))
  .join(", ");

const year = pub.pubDate ? pub.pubDate.split(" ")[0] : "";
const journalLine = [pub.journalAbbrev, year].filter(Boolean).join(", ");
---

<a href={`/publications/${pub.slug}`} class="block group">
  <div class="bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 border-l-[3px] border-l-accent rounded-lg p-5 hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start gap-3">
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold text-primary dark:text-gray-100 group-hover:text-accent-dark dark:group-hover:text-accent transition-colors leading-snug">
          {pub.title}
        </h3>
        {pub.authors.length > 0 && (
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5" set:html={authorDisplay} />
        )}
        {journalLine && (
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{journalLine}</p>
        )}
      </div>
      {pub.researchArea.length > 0 && (
        <div class="flex flex-wrap gap-1.5 shrink-0">
          {pub.researchArea.map((tag) => (
            <TopicPill tag={tag} size="sm" />
          ))}
        </div>
      )}
    </div>
  </div>
</a>
```

Note: `set:html` in Astro is safe here -- the author data comes from our own XML files parsed at build time, not from user input.

- [ ] **Step 4: Create AbstractCard**

Write `src/components/AbstractCard.astro`:
```astro
---
import type { Abstract } from "../lib/types";

interface Props {
  abstract: Abstract;
}

const { abstract: abs } = Astro.props;
---

<div class="bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg p-5">
  <div class="flex justify-between items-start gap-3">
    <div class="flex-1 min-w-0">
      <h3 class="text-sm font-semibold text-primary dark:text-gray-100 leading-snug">
        {abs.title}
      </h3>
      {abs.abstractId && (
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Abstract #{abs.abstractId}</p>
      )}
    </div>
    <div class="flex items-center gap-2 shrink-0">
      {abs.unpublished && (
        <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-medium">
          Unpublished
        </span>
      )}
      {abs.pdfPath && (
        <a
          href={`/${abs.pdfPath}`}
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-accent hover:text-accent-dark font-medium"
        >
          PDF
        </a>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Create ProjectCard**

Write `src/components/ProjectCard.astro`:
```astro
---
import TopicPill from "./TopicPill.astro";

interface Props {
  title: string;
  description: string;
  url?: string;
  repo?: string;
  tags: string[];
}

const { title, description, url, repo, tags } = Astro.props;
const href = url || repo;
---

<div class="bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow">
  <h3 class="text-sm font-semibold text-primary dark:text-gray-100">{title}</h3>
  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{description}</p>
  <div class="flex items-center justify-between mt-4">
    <div class="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TopicPill tag={tag} size="sm" />
      ))}
    </div>
    {href && (
      <a href={href} target="_blank" rel="noopener noreferrer" class="text-xs text-accent hover:text-accent-dark font-medium">
        {url ? "Visit" : "GitHub"} &rarr;
      </a>
    )}
  </div>
</div>
```

- [ ] **Step 6: Verify build**

```bash
cd /Users/work/Documents/personal-site
npm run build
```
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/components/
git commit -m "feat: add reusable display components (cards, pills, stat blocks)"
```

---

### Task 6: Homepage

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Build the homepage**

Write `src/pages/index.astro`:
```astro
---
import PageLayout from "../layouts/PageLayout.astro";
import StatBlock from "../components/StatBlock.astro";
import PublicationCard from "../components/PublicationCard.astro";
import TopicPill from "../components/TopicPill.astro";
import { getPublications } from "../lib/publications";
import { getAbstracts } from "../lib/abstracts";

const publications = getPublications();
const abstracts = getAbstracts();
const recentPubs = publications.slice(0, 3);

const allTags = [...new Set(publications.flatMap((p) => p.researchArea))].sort();
const firstYear = publications
  .map((p) => p.pubDate?.split(" ")[0])
  .filter(Boolean)
  .sort()[0] ?? "";
---

<PageLayout
  title="Will Pike"
  description="Physician and researcher. Publications, CV, and projects."
>
  <!-- Hero -->
  <section class="bg-gradient-to-br from-primary to-primary-light text-white relative overflow-hidden">
    <div class="absolute top-[-80px] right-[-40px] w-96 h-96 rounded-full bg-accent/10 blur-3xl"></div>
    <div class="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
      <p class="text-xs uppercase tracking-[3px] text-accent font-semibold mb-4">
        Physician & Researcher
      </p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
        Building evidence<br />for better patient care.
      </h1>
      <p class="text-gray-300 max-w-lg leading-relaxed">
        Clinician-researcher focused on real-world evidence, health outcomes, and translational
        research across multiple specialties.
      </p>
      <div class="flex gap-3 mt-8">
        <a href="/publications" class="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors">
          View Publications
        </a>
        <a href="/cv.pdf" class="border border-gray-500 text-gray-300 hover:text-white hover:border-gray-300 px-6 py-3 rounded-lg text-sm transition-colors">
          Download CV
        </a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="bg-white dark:bg-surface-card-dark border-b border-gray-200 dark:border-gray-800">
    <div class="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
      <StatBlock value={publications.length} label="Publications" />
      <StatBlock value={abstracts.length} label="Abstracts" />
      <StatBlock value={allTags.length} label="Research Areas" />
      <StatBlock value={firstYear} label="First Publication" />
    </div>
  </section>

  <!-- Recent Publications -->
  <section class="max-w-6xl mx-auto px-6 py-12">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-primary dark:text-white">Recent Publications</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Latest research and findings</p>
      </div>
      <a href="/publications" class="text-sm text-accent font-semibold hover:text-accent-dark transition-colors">
        View all &rarr;
      </a>
    </div>
    <div class="flex flex-col gap-3">
      {recentPubs.map((pub) => (
        <PublicationCard publication={pub} />
      ))}
    </div>
  </section>

  <!-- Research Areas -->
  <section class="max-w-6xl mx-auto px-6 pb-16">
    <h2 class="text-xl font-bold text-primary dark:text-white mb-5">Research Areas</h2>
    <div class="flex flex-wrap gap-2">
      {allTags.map((tag) => (
        <TopicPill tag={tag} href={`/publications?tag=${encodeURIComponent(tag)}`} />
      ))}
    </div>
  </section>
</PageLayout>
```

- [ ] **Step 2: Verify homepage in dev server**

```bash
cd /Users/work/Documents/personal-site
npm run dev
```
Open http://localhost:4321 and verify hero, stats, recent publications, and research areas render correctly.

- [ ] **Step 3: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/pages/index.astro
git commit -m "feat: add homepage with hero, stats, recent publications, and research areas"
```

---

### Task 7: Publications List and Detail Pages

**Files:**
- Create: `src/components/SearchPublications.tsx`, `src/pages/publications/index.astro`, `src/pages/publications/[slug].astro`

- [ ] **Step 1: Create the search/filter React island**

Write `src/components/SearchPublications.tsx`:
```tsx
import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import type { SearchablePublication } from "../lib/types";

interface Props {
  publications: SearchablePublication[];
  allTags: string[];
  allYears: string[];
  initialTag?: string;
}

function highlightAuthor(authors: string): string {
  // Build-time data only -- no user input
  return authors.replace(/Pike CW/g, "<strong>Pike CW</strong>");
}

export default function SearchPublications({
  publications,
  allTags,
  allYears,
  initialTag,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(initialTag ?? "");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const fuse = useMemo(
    () =>
      new Fuse(publications, {
        keys: ["title", "authors", "journal", "tags"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [publications]
  );

  const filtered = useMemo(() => {
    let results = query
      ? fuse.search(query).map((r) => r.item)
      : [...publications];

    if (selectedTag) {
      results = results.filter((p) => p.tags.includes(selectedTag));
    }
    if (selectedYear) {
      results = results.filter((p) => p.year === selectedYear);
    }

    results.sort((a, b) => {
      const yearA = parseInt(a.year || "0", 10);
      const yearB = parseInt(b.year || "0", 10);
      return sortOrder === "newest" ? yearB - yearA : yearA - yearB;
    });

    return results;
  }, [query, selectedTag, selectedYear, sortOrder, fuse, publications]);

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search publications..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-[#1a1a2e] dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50 placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="">All Years</option>
          {allYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="">All Topics</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        {(selectedTag || selectedYear || query) && (
          <button
            onClick={() => { setQuery(""); setSelectedTag(""); setSelectedYear(""); }}
            className="px-3 py-2 text-sm text-[#a78bfa] hover:text-[#7c3aed] font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {filtered.length} publication{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {filtered.map((pub) => (
          <a key={pub.slug} href={`/publications/${pub.slug}`} className="block group">
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 border-l-[3px] border-l-[#a78bfa] rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#1a1a2e] dark:text-gray-100 group-hover:text-[#7c3aed] dark:group-hover:text-[#a78bfa] transition-colors leading-snug">
                    {pub.title}
                  </h3>
                  {pub.authors && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {pub.authors}
                    </p>
                  )}
                  {pub.journal && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {pub.journal}{pub.year ? `, ${pub.year}` : ""}
                    </p>
                  )}
                </div>
                {pub.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {pub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-[#7c3aed] dark:bg-purple-950 dark:text-[#a78bfa] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create publications list page**

Write `src/pages/publications/index.astro`:
```astro
---
import PageLayout from "../../layouts/PageLayout.astro";
import SearchPublications from "../../components/SearchPublications";
import { getPublications, buildSearchIndex } from "../../lib/publications";

const publications = getPublications();
const searchIndex = buildSearchIndex(publications);

const allTags = [...new Set(publications.flatMap((p) => p.researchArea))].sort();
const allYears = [...new Set(
  publications
    .map((p) => p.pubDate?.split(" ")[0])
    .filter(Boolean)
)].sort().reverse();

const url = new URL(Astro.request.url);
const initialTag = url.searchParams.get("tag") ?? undefined;
---

<PageLayout
  title="Publications"
  description="Research publications by Will Pike across multiple medical specialties."
>
  <div class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="text-2xl font-bold text-primary dark:text-white mb-2">Publications</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      {publications.length} peer-reviewed publications
    </p>

    <SearchPublications
      client:load
      publications={searchIndex}
      allTags={allTags}
      allYears={allYears}
      initialTag={initialTag}
    />
  </div>
</PageLayout>
```

- [ ] **Step 3: Create individual publication page**

Write `src/pages/publications/[slug].astro`:
```astro
---
import PageLayout from "../../layouts/PageLayout.astro";
import TopicPill from "../../components/TopicPill.astro";
import { getPublications } from "../../lib/publications";
import type { Publication } from "../../lib/types";

export function getStaticPaths() {
  const publications = getPublications();
  return publications.map((pub) => ({
    params: { slug: pub.slug },
    props: { publication: pub },
  }));
}

interface Props {
  publication: Publication;
}

const { publication: pub } = Astro.props;

const authorDisplay = pub.authors
  .map((a) => (a === "Pike CW" ? `<strong>${a}</strong>` : a))
  .join(", ");

const year = pub.pubDate ? pub.pubDate.split(" ")[0] : "";
---

<PageLayout
  title={pub.title}
  description={`${pub.title}. ${pub.journal}${year ? `, ${year}` : ""}`}
>
  <div class="max-w-3xl mx-auto px-6 py-12">
    <nav class="text-sm text-gray-400 dark:text-gray-500 mb-8">
      <a href="/publications" class="hover:text-accent transition-colors">Publications</a>
      <span class="mx-2">/</span>
      <span class="text-gray-600 dark:text-gray-300">{pub.title}</span>
    </nav>

    <h1 class="text-2xl font-bold text-primary dark:text-white leading-snug mb-4">
      {pub.title}
    </h1>

    {pub.authors.length > 0 && (
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-2" set:html={authorDisplay} />
    )}

    {pub.journal && (
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <span class="italic">{pub.journal}</span>
        {pub.volume && `, ${pub.volume}`}
        {pub.issue && `(${pub.issue})`}
        {pub.pages && `: ${pub.pages}`}
        {year && ` (${year})`}
      </p>
    )}

    {pub.researchArea.length > 0 && (
      <div class="flex flex-wrap gap-2 mb-8">
        {pub.researchArea.map((tag) => (
          <TopicPill tag={tag} href={`/publications?tag=${encodeURIComponent(tag)}`} size="sm" />
        ))}
      </div>
    )}

    <div class="flex flex-wrap gap-3 mb-8">
      {pub.doi && (
        <a
          href={`https://doi.org/${pub.doi}`}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors"
        >
          DOI: {pub.doi}
        </a>
      )}
      {pub.id && (
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${pub.id}/`}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-accent rounded-lg text-sm transition-colors"
        >
          PubMed
        </a>
      )}
      {pub.pmcId && (
        <a
          href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pub.pmcId}/`}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-accent rounded-lg text-sm transition-colors"
        >
          PMC
        </a>
      )}
      {pub.pdfPath && (
        <a
          href={`/${pub.pdfPath}`}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-accent rounded-lg text-sm transition-colors"
        >
          PDF
        </a>
      )}
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Details</h2>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        {pub.pubType && (
          <>
            <dt class="text-gray-500 dark:text-gray-400">Type</dt>
            <dd class="text-primary dark:text-gray-200">{pub.pubType}</dd>
          </>
        )}
        {pub.pubDate && (
          <>
            <dt class="text-gray-500 dark:text-gray-400">Published</dt>
            <dd class="text-primary dark:text-gray-200">{pub.pubDate}</dd>
          </>
        )}
        {pub.id && (
          <>
            <dt class="text-gray-500 dark:text-gray-400">PubMed ID</dt>
            <dd class="text-primary dark:text-gray-200">{pub.id}</dd>
          </>
        )}
      </dl>
    </div>
  </div>
</PageLayout>
```

- [ ] **Step 4: Verify publications pages**

```bash
cd /Users/work/Documents/personal-site
npm run dev
```
Open http://localhost:4321/publications -- verify all 21 publications listed, search works, clicking opens detail page with correct DOI/PubMed links.

- [ ] **Step 5: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/components/SearchPublications.tsx src/pages/publications/
git commit -m "feat: add publications list with search/filter and detail pages"
```

---

### Task 8: Abstracts Page

**Files:**
- Create: `src/pages/abstracts/index.astro`

- [ ] **Step 1: Create abstracts list page**

Write `src/pages/abstracts/index.astro`:
```astro
---
import PageLayout from "../../layouts/PageLayout.astro";
import AbstractCard from "../../components/AbstractCard.astro";
import { getAbstracts } from "../../lib/abstracts";

const allAbstracts = getAbstracts();
const published = allAbstracts.filter((a) => !a.unpublished);
const unpublished = allAbstracts.filter((a) => a.unpublished);
---

<PageLayout
  title="Abstracts & Presentations"
  description="Conference abstracts, posters, and presentations by Will Pike."
>
  <div class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="text-2xl font-bold text-primary dark:text-white mb-2">Abstracts & Presentations</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      Conference abstracts, posters, and presentations
    </p>

    <div class="flex flex-col gap-3">
      {published.map((abs) => (
        <AbstractCard abstract={abs} />
      ))}
    </div>

    {unpublished.length > 0 && (
      <>
        <h2 class="text-lg font-bold text-primary dark:text-white mt-12 mb-4">Unpublished</h2>
        <div class="flex flex-col gap-3">
          {unpublished.map((abs) => (
            <AbstractCard abstract={abs} />
          ))}
        </div>
      </>
    )}
  </div>
</PageLayout>
```

- [ ] **Step 2: Verify abstracts page**

```bash
cd /Users/work/Documents/personal-site
npm run dev
```
Open http://localhost:4321/abstracts -- verify 6 published + 1 unpublished (with badge).

- [ ] **Step 3: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/pages/abstracts/
git commit -m "feat: add abstracts and presentations page"
```

---

### Task 9: CV Page with Typst PDF Pipeline

**Files:**
- Create: `src/content/cv/cv.md`, `src/content/cv/template.typ`, `src/pages/cv.astro`, `scripts/build-cv.sh`

- [ ] **Step 1: Create placeholder CV markdown**

Write `src/content/cv/cv.md`:
```markdown
---
name: Will Pike, MD
title: Physician & Researcher
---

## Education

- **Doctor of Medicine** -- [University], [Year]

## Experience

*To be updated with actual CV content.*

## Publications

See [Publications](/publications) for a complete list.

## Skills

- Real-World Evidence Research
- Clinical Data Analysis
- Health Outcomes Research
```

- [ ] **Step 2: Create Typst template**

Write `src/content/cv/template.typ`:
```typst
#set page(margin: (x: 1.2in, y: 1in))
#set text(font: "Inter", size: 10pt)
#set par(leading: 0.7em)

#align(center)[
  #text(size: 18pt, weight: "bold")[Will Pike, MD]
  #v(4pt)
  #text(size: 11pt, fill: rgb("#6b7280"))[Physician & Researcher]
]

#v(16pt)
#line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
#v(8pt)

#text(size: 9pt, fill: rgb("#6b7280"))[
  This PDF is auto-generated from cv.md. Update the Markdown source to change content.
]
```

- [ ] **Step 3: Create build script**

Write `scripts/build-cv.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CV_DIR="$PROJECT_DIR/src/content/cv"
OUTPUT="$PROJECT_DIR/public/cv.pdf"

mkdir -p "$(dirname "$OUTPUT")"

if command -v typst &> /dev/null; then
  typst compile "$CV_DIR/template.typ" "$OUTPUT"
  echo "CV PDF generated: $OUTPUT"
else
  echo "Warning: typst not installed, skipping CV PDF generation"
  echo "Install: brew install typst (macOS) or cargo install typst-cli"
fi
```

- [ ] **Step 4: Make build script executable**

```bash
chmod +x /Users/work/Documents/personal-site/scripts/build-cv.sh
```

- [ ] **Step 5: Create CV page**

Write `src/pages/cv.astro`:
```astro
---
import PageLayout from "../layouts/PageLayout.astro";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const cvPath = path.resolve("src/content/cv/cv.md");
const cvContent = fs.readFileSync(cvPath, "utf-8");
const contentWithoutFrontmatter = cvContent.replace(/^---[\s\S]*?---\n/, "");
const htmlContent = await marked.parse(contentWithoutFrontmatter);
---

<PageLayout
  title="CV"
  description="Curriculum vitae for Will Pike, MD -- physician and researcher."
>
  <div class="max-w-3xl mx-auto px-6 py-12">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-primary dark:text-white">Curriculum Vitae</h1>
      <a
        href="/cv.pdf"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-semibold transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download PDF
      </a>
    </div>

    <article
      class="prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary dark:prose-headings:text-white prose-a:text-accent"
      set:html={htmlContent}
    />
  </div>
</PageLayout>
```

- [ ] **Step 6: Verify CV page**

```bash
cd /Users/work/Documents/personal-site
npm run dev
```
Open http://localhost:4321/cv -- verify Markdown renders as styled HTML with download button.

- [ ] **Step 7: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/content/cv/ src/pages/cv.astro scripts/build-cv.sh
git commit -m "feat: add CV page with Markdown rendering and Typst PDF pipeline"
```

---

### Task 10: About, Projects, and Contact Pages

**Files:**
- Create: `src/content/about.md`, `src/content/projects/personal-site.md`, `src/pages/about.astro`, `src/pages/projects.astro`, `src/pages/contact.astro`

- [ ] **Step 1: Create about page content and page**

Write `src/content/about.md`:
```markdown
---
name: Will Pike
---

Physician and researcher with a focus on real-world evidence, health outcomes research, and translational studies across multiple medical specialties.

*Update this page with your full bio, research interests, and professional background.*
```

Write `src/pages/about.astro`:
```astro
---
import PageLayout from "../layouts/PageLayout.astro";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const aboutPath = path.resolve("src/content/about.md");
const aboutContent = fs.readFileSync(aboutPath, "utf-8");
const contentWithoutFrontmatter = aboutContent.replace(/^---[\s\S]*?---\n/, "");
const htmlContent = await marked.parse(contentWithoutFrontmatter);
---

<PageLayout title="About" description="About Will Pike -- physician and researcher.">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <h1 class="text-2xl font-bold text-primary dark:text-white mb-8">About</h1>
    <article
      class="prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary dark:prose-headings:text-white prose-a:text-accent"
      set:html={htmlContent}
    />
  </div>
</PageLayout>
```

- [ ] **Step 2: Create project entry and projects page**

Write `src/content/projects/personal-site.md`:
```markdown
---
title: Personal Website
description: Academic portfolio and publication showcase built with Astro, Tailwind CSS, and deployed to Cloudflare Pages.
repo: https://github.com/pike00/personal-site
tags: ["Astro", "Tailwind CSS", "TypeScript"]
date: "2026-04-10"
---
```

Write `src/pages/projects.astro`:
```astro
---
import PageLayout from "../layouts/PageLayout.astro";
import ProjectCard from "../components/ProjectCard.astro";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const projectsDir = path.resolve("src/content/projects");
const projectFiles = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"));

const projects = projectFiles
  .map((file) => {
    const content = fs.readFileSync(path.join(projectsDir, file), "utf-8");
    const { data } = matter(content);
    return data as {
      title: string;
      description: string;
      url?: string;
      repo?: string;
      tags: string[];
      date: string;
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
---

<PageLayout title="Projects" description="Projects and tools by Will Pike.">
  <div class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="text-2xl font-bold text-primary dark:text-white mb-2">Projects</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      Tools, research projects, and open-source work
    </p>

    <div class="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard
          title={project.title}
          description={project.description}
          url={project.url}
          repo={project.repo}
          tags={project.tags}
        />
      ))}
    </div>
  </div>
</PageLayout>
```

- [ ] **Step 3: Create contact page**

Write `src/pages/contact.astro`:
```astro
---
import PageLayout from "../layouts/PageLayout.astro";

const links = [
  { label: "GitHub", href: "https://github.com/pike00" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/willpike" },
  { label: "Google Scholar", href: "https://scholar.google.com" },
];
---

<PageLayout title="Contact" description="Get in touch with Will Pike.">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <h1 class="text-2xl font-bold text-primary dark:text-white mb-2">Contact</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      Feel free to reach out through any of the channels below.
    </p>

    <div class="grid gap-4 sm:grid-cols-2">
      {links.map((link) => (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-4 p-5 bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
        >
          <div class="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-accent-dark dark:text-accent text-sm font-bold">
            {link.label.charAt(0)}
          </div>
          <div>
            <div class="text-sm font-semibold text-primary dark:text-white">{link.label}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500">{link.href}</div>
          </div>
        </a>
      ))}
    </div>
  </div>
</PageLayout>
```

- [ ] **Step 4: Verify all pages**

```bash
cd /Users/work/Documents/personal-site
npm run dev
```
Check /about, /projects, /contact all render.

- [ ] **Step 5: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/content/about.md src/content/projects/ src/pages/about.astro src/pages/projects.astro src/pages/contact.astro
git commit -m "feat: add about, projects, and contact pages"
```

---

### Task 11: CITATION.cff Generator

**Files:**
- Create: `src/lib/citations.ts`, `scripts/generate-citations.ts`

- [ ] **Step 1: Write the citation generator**

Write `src/lib/citations.ts`:
```typescript
import type { Publication } from "./types";

interface CffAuthor {
  "family-names": string;
  "given-names": string;
}

function parseAuthor(authorStr: string): CffAuthor {
  const parts = authorStr.trim().split(/\s+/);
  if (parts.length === 1) {
    return { "family-names": parts[0], "given-names": "" };
  }
  return {
    "family-names": parts[0],
    "given-names": parts.slice(1).join(" "),
  };
}

export function generateCitationCff(publications: Publication[]): string {
  const lines: string[] = [
    "cff-version: 1.2.0",
    'title: "Will Pike - Publications"',
    "type: dataset",
    "authors:",
    "  - family-names: Pike",
    "    given-names: CW",
    "references:",
  ];

  for (const pub of publications) {
    if (!pub.id) continue;

    lines.push("  - type: article");
    lines.push(`    title: "${pub.title.replace(/"/g, '\\"')}"`);
    lines.push("    authors:");

    for (const author of pub.authors) {
      const parsed = parseAuthor(author);
      lines.push(`      - family-names: "${parsed["family-names"]}"`);
      lines.push(`        given-names: "${parsed["given-names"]}"`);
    }

    if (pub.doi) {
      lines.push(`    doi: "${pub.doi}"`);
    }
    if (pub.journal) {
      lines.push(`    journal: "${pub.journal.replace(/"/g, '\\"')}"`);
    }

    const yearMatch = pub.pubDate.match(/(\d{4})/);
    if (yearMatch) {
      lines.push(`    year: ${yearMatch[1]}`);
    }
  }

  return lines.join("\n") + "\n";
}
```

- [ ] **Step 2: Create generation script**

Write `scripts/generate-citations.ts`:
```typescript
import fs from "node:fs";
import path from "node:path";
import { getPublications } from "../src/lib/publications";
import { generateCitationCff } from "../src/lib/citations";

const publications = getPublications();
const cff = generateCitationCff(publications);
const outputPath = path.resolve("public/CITATION.cff");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, cff);

console.log(
  `CITATION.cff generated with ${publications.filter((p) => p.id).length} references`
);
```

- [ ] **Step 3: Verify generation**

```bash
cd /Users/work/Documents/personal-site
npx tsx scripts/generate-citations.ts
head -30 public/CITATION.cff
```
Expected: Valid YAML with cff-version, title, authors, and references.

- [ ] **Step 4: Commit**

```bash
cd /Users/work/Documents/personal-site
git add src/lib/citations.ts scripts/generate-citations.ts
git commit -m "feat: add CITATION.cff generator from publication metadata"
```

---

### Task 12: PDF Copy Script and Build Pipeline

**Files:**
- Create: `scripts/copy-pdfs.sh`
- Modify: `package.json`

- [ ] **Step 1: Create PDF copy script**

Write `scripts/copy-pdfs.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBS_DIR="$PROJECT_DIR/publications"
PUBLIC_DIR="$PROJECT_DIR/public"

if [ -d "$PUBS_DIR/Publications" ]; then
  for dir in "$PUBS_DIR/Publications"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    mkdir -p "$PUBLIC_DIR/$relpath"
    cp "$dir"*.pdf "$PUBLIC_DIR/$relpath" 2>/dev/null || true
  done
fi

if [ -d "$PUBS_DIR/Abstracts" ]; then
  for dir in "$PUBS_DIR/Abstracts"/*/; do
    relpath="${dir#$PUBS_DIR/}"
    mkdir -p "$PUBLIC_DIR/$relpath"
    cp "$dir"*.pdf "$PUBLIC_DIR/$relpath" 2>/dev/null || true
  done
fi

if [ -d "$PUBS_DIR/Unpublished" ]; then
  mkdir -p "$PUBLIC_DIR/Unpublished"
  cp "$PUBS_DIR/Unpublished/"*.pdf "$PUBLIC_DIR/Unpublished/" 2>/dev/null || true
fi

echo "PDFs copied to public directory"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/work/Documents/personal-site/scripts/copy-pdfs.sh
```

- [ ] **Step 3: Update package.json scripts**

Update the `scripts` section in `package.json`:
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "npm run build:pdfs && npm run build:citations && npm run build:cv && astro build",
    "build:pdfs": "bash scripts/copy-pdfs.sh",
    "build:cv": "bash scripts/build-cv.sh",
    "build:citations": "tsx scripts/generate-citations.ts",
    "preview": "astro preview"
  }
}
```

- [ ] **Step 4: Install tsx as dev dependency**

```bash
cd /Users/work/Documents/personal-site
npm install -D tsx
```

- [ ] **Step 5: Verify full build**

```bash
cd /Users/work/Documents/personal-site
rm -rf dist public/Publications public/Abstracts public/Unpublished public/cv.pdf public/CITATION.cff
npm run build
```
Expected: PDFs copied, citations generated, CV built (or warning), Astro build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/work/Documents/personal-site
git add scripts/copy-pdfs.sh package.json package-lock.json
git commit -m "feat: add build pipeline with PDF copy, citation generation, and CV compilation"
```

---

### Task 13: GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy workflow**

Write `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [publications-updated]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Typst
        uses: typst-community/setup-typst@v4

      - name: Build site
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=personal-site
```

- [ ] **Step 2: Commit**

```bash
cd /Users/work/Documents/personal-site
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions workflow for Cloudflare Pages deployment"
```

---

### Task 14: Publications Repo Dispatch Workflow

**Files:**
- Create (in Publications repo): `.github/workflows/notify-site.yml`

- [ ] **Step 1: Create notification workflow in Publications repo**

```bash
cd /Users/work/Documents/Publications
git checkout -b add-site-dispatch
mkdir -p .github/workflows
```

Write `/Users/work/Documents/Publications/.github/workflows/notify-site.yml`:
```yaml
name: Notify personal site

on:
  push:
    branches: [master]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger personal-site rebuild
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.SITE_DEPLOY_TOKEN }}
          repository: pike00/personal-site
          event-type: publications-updated
```

- [ ] **Step 2: Commit in Publications repo**

```bash
cd /Users/work/Documents/Publications
git add .github/workflows/notify-site.yml
git commit -m "feat: add repository dispatch to trigger personal-site rebuild"
```

Note: User must push this branch and merge via PR, then add `SITE_DEPLOY_TOKEN` secret to the Publications repo.

---

### Task 15: Final Integration Test and Push

- [ ] **Step 1: Full clean build from personal-site**

```bash
cd /Users/work/Documents/personal-site
rm -rf dist public/Publications public/Abstracts public/Unpublished public/cv.pdf public/CITATION.cff
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Preview and verify all pages**

```bash
cd /Users/work/Documents/personal-site
npm run preview
```

Verify at http://localhost:4321:
- Homepage: hero, stats (21 pubs, 7 abstracts), recent publications, research area pills
- /publications: 21 items, search filters, detail pages with DOI/PubMed links
- /abstracts: 6 published + 1 unpublished with badge
- /cv: Markdown renders, download button present
- /projects: card grid with project entry
- /about: content renders
- /contact: link cards render
- Dark mode toggle works globally
- Mobile nav hamburger works (resize to < 768px)

- [ ] **Step 3: Create GitHub repo and push**

```bash
cd /Users/work/Documents/personal-site
gh repo create pike00/personal-site --private --source=. --push
```

User confirmation required before this step.

---

## Post-Implementation: User Actions Required

These require credentials/access that cannot be configured by the agent:

1. **Cloudflare Pages:** Create project named `personal-site` in Cloudflare dashboard
2. **GitHub Secrets (personal-site):** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
3. **GitHub Secrets (Publications):** Create GitHub PAT with `repo` scope, add as `SITE_DEPLOY_TOKEN`
4. **CV Content:** Copy actual CV from `smb://192.168.0.2/PikeDocuments/Professional/Resume` into `src/content/cv/cv.md`
5. **About Content:** Update `src/content/about.md` with real bio
6. **Footer Links:** Update Google Scholar and LinkedIn URLs in Footer.astro and contact.astro with actual profile URLs
7. **Custom Domain (optional):** Configure in Cloudflare Pages dashboard
