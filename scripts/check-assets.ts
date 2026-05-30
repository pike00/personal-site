#!/usr/bin/env tsx
/**
 * Build-time asset check: assert that every publication PDF the site links to
 * actually landed in public/.
 *
 * `getPublications()` derives each `pdfPath` from the publications submodule via
 * the `findPdf` heuristic (which skips `Pubmed.pdf` and `20*`-prefixed files).
 * `scripts/copy-pdfs.sh` copies those into `public/<pdfPath>`, and the
 * publication detail page links to `/<pdfPath>`. Nothing currently verifies the
 * referenced file exists — a renamed or missing PDF 404s silently in
 * production. This turns that into a build failure.
 *
 * Wired into the `build` script after `astro build` (and before the deploy), so
 * a missing asset aborts `just deploy`. Run on demand with `pnpm build:check`.
 */

import fs from "node:fs";
import path from "node:path";
import { getPublications } from "../src/lib/publications";
import { lokiEmit } from "./loki";

const t0 = Date.now();
await lokiEmit("check-assets", "info", "started");

const PUBLIC_DIR = path.resolve("public");

const publications = getPublications();
const missing: { slug: string; pdfPath: string }[] = [];
let checked = 0;

for (const pub of publications) {
  if (!pub.pdfPath) continue;
  checked++;
  if (!fs.existsSync(path.join(PUBLIC_DIR, pub.pdfPath))) {
    missing.push({ slug: pub.slug, pdfPath: pub.pdfPath });
  }
}

if (missing.length > 0) {
  await lokiEmit("check-assets", "error", "missing_assets", {
    elapsed_s: (Date.now() - t0) / 1000,
    checked,
    missing: missing.length,
  });
  console.error(
    `\n✗ build:check — ${missing.length} publication PDF(s) missing from public/:`,
  );
  for (const m of missing) {
    console.error(`  - ${m.slug}: expected public/${m.pdfPath}`);
  }
  console.error(
    "\nRe-run `pnpm build:pdfs`, or check the publications submodule and the findPdf heuristic in src/lib/publications.ts.",
  );
  process.exit(1);
}

await lokiEmit("check-assets", "info", "complete", {
  elapsed_s: (Date.now() - t0) / 1000,
  checked,
});
console.log(`✓ build:check — all ${checked} publication PDF(s) present in public/`);
