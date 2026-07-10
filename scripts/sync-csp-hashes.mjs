#!/usr/bin/env node
/**
 * Single-source the Content-Security-Policy across BOTH deploy targets:
 *   - public/_headers  (served by Cloudflare Pages — the live deploy)
 *   - Caddyfile        (the alternative self-hosted container build)
 *
 * The whole CSP is assembled here from one structured definition (CSP_DIRECTIVES
 * + the SHARED_ORIGINS constants) plus the SHA-256 hashes of every inline
 * <script> Astro emitted into dist/. The resulting policy string is written
 * verbatim into both files, in each file's own syntax. Because the policy is
 * generated from one source, the two files can no longer silently diverge —
 * the documented footgun where a stale Caddyfile hash silently breaks React
 * hydration on /publications/ in the self-hosted build.
 *
 * Astro emits inline scripts whose contents (and therefore hashes) change on
 * every Astro version bump. Without this sync an upgrade ships a CSP that
 * blocks the new inline scripts, breaking hydration with no visible build
 * error. This runs as a package.json `postbuild` step so every build emits a
 * fresh, consistent CSP into both files before the wrangler deploy uploads dist/.
 *
 * Exits non-zero if no inline scripts are found (unexpected for an Astro build)
 * or if either target file is missing a CSP directive to rewrite.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist";

// Out-of-document origins, single-sourced so analytics/font changes stay in
// sync across both target files. Reference these in CSP_DIRECTIVES below.
const SHARED_ORIGINS = {
  matomo: "https://matomo.khanpikehome.com", // Matomo analytics (script + API)
  fonts: "https://rsms.me", // Inter web font (stylesheet + font files)
  turnstile: "https://challenges.cloudflare.com", // Turnstile (contact form): api.js + iframe + siteverify
  // Algolia DocSearch (⌘K palette): search-API + crawler-fed index endpoints.
  // connect-src only — the DocSearch JS is bundled from npm, not a CDN.
  algolia: "https://*.algolia.net https://*.algolianet.com https://*.algolia.io",
};

// The full CSP, single-sourced. `script-src` receives the computed inline-script
// hashes at build time (spliced in after 'self'); every other directive is
// static. Order is preserved in the emitted policy string.
const CSP_DIRECTIVES = [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'", "__HASHES__", SHARED_ORIGINS.matomo, SHARED_ORIGINS.turnstile]],
  ["connect-src", ["'self'", SHARED_ORIGINS.matomo, SHARED_ORIGINS.turnstile, SHARED_ORIGINS.algolia]],
  ["style-src", ["'self'", "'unsafe-inline'", SHARED_ORIGINS.fonts]],
  ["img-src", ["'self'", "data:"]],
  ["font-src", ["'self'", SHARED_ORIGINS.fonts]],
  ["frame-src", ["'self'", SHARED_ORIGINS.turnstile]],
  ["frame-ancestors", ["'self'"]],
];

// Each target file: its path and how to splice the policy into its own syntax.
const TARGETS = [
  {
    path: "public/_headers",
    // Cloudflare _headers: `  Content-Security-Policy: <policy>` (unquoted).
    pattern: /(Content-Security-Policy:)[^\n]*/,
    replace: (policy) => `$1 ${policy}`,
  },
  {
    path: "Caddyfile",
    // Caddy header directive: `Content-Security-Policy "<policy>"` (quoted).
    pattern: /(Content-Security-Policy )"[^"]*"/,
    replace: (policy) => `$1"${policy}"`,
  },
];

function buildPolicy(sortedHashes) {
  return CSP_DIRECTIVES.map(([directive, sources]) => {
    const expanded = sources.flatMap((s) =>
      s === "__HASHES__" ? sortedHashes : [s]
    );
    return `${directive} ${expanded.join(" ")}`;
  }).join("; ");
}

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
    // Non-JS data blocks (e.g. JSON-LD) are not executed and aren't governed by
    // script-src, so they must not be hashed — doing so bloats the policy with a
    // per-page hash for every <script type="application/ld+json"> block.
    if (/\btype\s*=\s*["']application\/(ld\+json|json)["']/i.test(attrs)) continue;
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

const sortedHashes = [...hashes].sort();
const policy = buildPolicy(sortedHashes);

let changed = false;
for (const target of TARGETS) {
  const content = readFileSync(target.path, "utf8");
  if (!target.pattern.test(content)) {
    console.error(
      `error: no Content-Security-Policy directive to rewrite in ${target.path}`
    );
    process.exit(1);
  }
  const updated = content.replace(target.pattern, target.replace(policy));
  if (updated === content) {
    console.log(`✓ CSP already in sync in ${target.path}`);
  } else {
    writeFileSync(target.path, updated);
    console.log(`✓ synced CSP into ${target.path}`);
    changed = true;
  }
}

console.log(`  ${sortedHashes.length} inline-script hash(es):`);
for (const h of sortedHashes) console.log(`    ${h}`);
if (changed) {
  console.log("  (both _headers and Caddyfile are generated from one source)");
}
