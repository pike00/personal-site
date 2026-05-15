#!/usr/bin/env node
/**
 * Sync the script-src CSP hashes in public/_headers with the inline scripts
 * Astro emitted into dist/.
 *
 * Astro emits inline scripts whose contents (and therefore SHA-256 hashes)
 * change on every Astro version bump. Without this, an Astro upgrade silently
 * ships a CSP that blocks the new inline scripts, breaking React hydration
 * with no visible build error. This script extracts every <script>...</script>
 * (and <script type="module">...</script>) body from every .html under dist/,
 * computes the SHA-256, and rewrites the `script-src` directive in
 * public/_headers with the resulting allowlist.
 *
 * It's invoked from package.json as a `postbuild` step. CI/local builds
 * (`npm run build`) thus always emit a fresh _headers file before the
 * wrangler deploy uploads dist/.
 *
 * Exits non-zero if no inline scripts are found (unexpected for an Astro
 * build) or if the _headers file is missing a `Content-Security-Policy`
 * line to rewrite.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist";
const HEADERS_PATH = "public/_headers";

// Allowlist of OUT-OF-DOC sources to preserve in script-src. Anything the
// CSP needs beyond 'self' + the computed hashes goes here.
const EXTRA_SCRIPT_SRC = ["https://umami.khanpikehome.com"];

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkHtml(full));
    } else if (entry.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function extractInlineScripts(html) {
  const scripts = [];
  // Match <script ...>body</script>, only if no `src=` attribute.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const attrs = match[1];
    const body = match[2];
    if (/\bsrc\s*=/i.test(attrs)) continue; // external script, no hash needed
    if (body.trim() === "") continue;
    scripts.push(body);
  }
  return scripts;
}

function sha256Base64(s) {
  return createHash("sha256").update(s, "utf8").digest("base64");
}

const htmlFiles = walkHtml(DIST_DIR);
if (htmlFiles.length === 0) {
  console.error(`error: no .html files found under ${DIST_DIR}/ — did the build run?`);
  process.exit(1);
}

const hashes = new Set();
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf8");
  for (const body of extractInlineScripts(html)) {
    hashes.add(`'sha256-${sha256Base64(body)}'`);
  }
}

if (hashes.size === 0) {
  console.error(
    "error: no inline scripts found in dist/. Astro normally emits at least one — " +
      "if this is expected, remove the CSP enforcement; otherwise check the build."
  );
  process.exit(1);
}

const headersContent = readFileSync(HEADERS_PATH, "utf8");
if (!/Content-Security-Policy:/i.test(headersContent)) {
  console.error(`error: no Content-Security-Policy line found in ${HEADERS_PATH}`);
  process.exit(1);
}

const sortedHashes = [...hashes].sort();
const scriptSrc = ["'self'", ...sortedHashes, ...EXTRA_SCRIPT_SRC].join(" ");

// Rewrite just the `script-src` directive within the CSP value.
const newHeaders = headersContent.replace(
  /(Content-Security-Policy:[^\n]*?)script-src [^;]+;/,
  `$1script-src ${scriptSrc};`
);

if (newHeaders === headersContent) {
  console.error(
    `error: failed to rewrite script-src in ${HEADERS_PATH}. ` +
      "The CSP line may not contain a `script-src` directive."
  );
  process.exit(1);
}

writeFileSync(HEADERS_PATH, newHeaders);
console.log(
  `✓ synced ${sortedHashes.length} inline-script hash(es) into ${HEADERS_PATH}`
);
for (const h of sortedHashes) console.log(`  ${h}`);
