/**
 * build:scholar — fetch Semantic Scholar citation counts per publication DOI and
 * cache them for the "Cited by N" badge on /publications/<slug>.
 *
 * Uses the S2 *batch* endpoint: one POST for every stale DOI, raw (un-encoded)
 * DOIs in `DOI:<doi>` form. The keyless API shares a global ~1 req/sec limit, so
 * a single batched request is far less likely to be throttled than 24 per-DOI
 * calls; transient 429s are ridden out with backoff.
 *
 * Fully fault-tolerant: a 429 storm, timeout, 404, or offline host never throws
 * and never fails the build — it just leaves the existing cached value (or no
 * badge) in place. Runs in `pnpm build` (the build:scholar step) before astro
 * build, so the pages read a fresh cache.
 *
 * Env:
 *   SCHOLAR_TTL_DAYS  refetch entries older than this many days (default 7)
 *   SCHOLAR_FORCE=1   refetch every DOI regardless of cache freshness
 *   SCHOLAR_SKIP=1    skip the network entirely; render from cache only
 */
import fs from "node:fs";
import path from "node:path";
import { getPublications } from "../src/lib/publications";
import {
  CITATION_CACHE_PATH,
  readCitationCache,
  type CitationCache,
} from "../src/lib/citation-counts";
import { lokiEmit } from "./loki";

const t0 = Date.now();
const TTL_DAYS = Number(process.env.SCHOLAR_TTL_DAYS ?? "7");
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const FORCE = process.env.SCHOLAR_FORCE === "1";
const SKIP = process.env.SCHOLAR_SKIP === "1";
const BATCH_URL =
  "https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,url";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

await lokiEmit("fetch-citations", "info", "started", {
  ttl_days: TTL_DAYS,
  force: String(FORCE),
  skip: String(SKIP),
});

const cache: CitationCache = readCitationCache();
const pubs = getPublications().filter((p) => p.doi);

function isFresh(doi: string): boolean {
  const e = cache[doi];
  if (!e || typeof e.count !== "number") return false;
  return Date.now() - new Date(e.fetchedAt).getTime() < TTL_MS;
}

const stale = SKIP
  ? []
  : pubs.filter((p) => FORCE || !isFresh(p.doi.toLowerCase()));

interface BatchEntry {
  citationCount?: number;
  url?: string;
}

let fetched = 0;
let failed = 0;

if (stale.length > 0) {
  const ids = stale.map((p) => `DOI:${p.doi}`);
  let data: (BatchEntry | null)[] | null = null;

  // Up to 4 attempts, backing off to ride out the shared keyless 429 limit.
  for (let attempt = 0; attempt < 4 && data === null; attempt++) {
    if (attempt > 0) await sleep(attempt * 15000); // 15s, 30s, 45s
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(BATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ids }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429) continue; // throttled — back off and retry
      if (!res.ok) break; // other HTTP error — keep cache, give up
      const json = await res.json();
      if (Array.isArray(json)) data = json as (BatchEntry | null)[];
      else break;
    } catch {
      // network error / abort — retry
    }
  }

  if (data) {
    const now = new Date().toISOString();
    stale.forEach((p, i) => {
      const entry = data![i];
      if (entry && typeof entry.citationCount === "number") {
        cache[p.doi.toLowerCase()] = {
          count: entry.citationCount,
          url: entry.url,
          fetchedAt: now,
        };
        fetched++;
      } else {
        failed++; // DOI unknown to S2 (null entry)
      }
    });
  } else {
    failed = stale.length; // throttled/offline — leave cache untouched
  }
}

try {
  fs.mkdirSync(path.dirname(CITATION_CACHE_PATH), { recursive: true });
  fs.writeFileSync(CITATION_CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
} catch {
  // best-effort: a write failure just means no badge refresh this build
}

await lokiEmit("fetch-citations", "info", "complete", {
  elapsed_s: (Date.now() - t0) / 1000,
  fetched,
  failed,
  cached: pubs.length - stale.length,
  total: pubs.length,
});
console.log(
  `scholar citations: ${fetched} fetched, ${failed} failed, ${pubs.length - stale.length} cached (of ${pubs.length} with DOI)`,
);
