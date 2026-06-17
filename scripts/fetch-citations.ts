/**
 * build:scholar — fetch Semantic Scholar citation counts per publication DOI and
 * cache them for the "Cited by N" badge on /publications/<slug>.
 *
 * Fully fault-tolerant by design: a network failure, timeout, 404, or rate-limit
 * never throws and never fails the build — it just leaves the existing cached
 * value (or no badge) in place. Runs as part of `pnpm build` (the build:scholar
 * step) BEFORE astro build, so the pages can read a fresh cache.
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
const API = "https://api.semanticscholar.org/graph/v1/paper/DOI:";

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

let fetched = 0;
let cached = 0;
let failed = 0;
let consecutiveFailures = 0;

for (const pub of pubs) {
  const doi = pub.doi.toLowerCase();

  if (SKIP || (!FORCE && isFresh(doi))) {
    cached++;
    continue;
  }
  // Assume the network is unreachable after a few failures in a row and stop
  // hitting it — bounds the offline cost to a couple of timeouts, not 25.
  if (consecutiveFailures >= 3) {
    failed++;
    continue;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `${API}${encodeURIComponent(pub.doi)}?fields=citationCount,url`,
      { headers: { Accept: "application/json" }, signal: ctrl.signal },
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as {
        citationCount?: number;
        url?: string;
      };
      if (typeof data.citationCount === "number") {
        cache[doi] = {
          count: data.citationCount,
          url: data.url,
          fetchedAt: new Date().toISOString(),
        };
        fetched++;
        consecutiveFailures = 0;
      } else {
        failed++;
      }
    } else {
      // 404 = DOI unknown to S2; 429 = rate limited. Keep any cached value.
      failed++;
      if (res.status === 429) consecutiveFailures++;
    }
  } catch {
    // network error / abort
    failed++;
    consecutiveFailures++;
  }

  await sleep(1100); // keyless API is ~1 req/sec
}

try {
  fs.mkdirSync(path.dirname(CITATION_CACHE_PATH), { recursive: true });
  fs.writeFileSync(CITATION_CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
} catch {
  // best-effort: a write failure just means no badges this build
}

await lokiEmit("fetch-citations", "info", "complete", {
  elapsed_s: (Date.now() - t0) / 1000,
  fetched,
  cached,
  failed,
  total: pubs.length,
});
console.log(
  `scholar citations: ${fetched} fetched, ${cached} cached, ${failed} failed (of ${pubs.length} with DOI)`,
);
