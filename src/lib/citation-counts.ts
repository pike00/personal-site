import fs from "node:fs";
import path from "node:path";

/**
 * Build-time cache of Semantic Scholar citation counts, keyed by lowercased DOI.
 * Populated by scripts/fetch-citations.ts (the `build:scholar` step) and read by
 * the publication pages to render a "Cited by N" badge. Lives under
 * node_modules/.cache (gitignored, per-machine) like the citations.stamp file,
 * so a machine that has never fetched simply renders no badges — the data is a
 * progressive enhancement, never a build dependency.
 */
export const CITATION_CACHE_PATH = path.resolve(
  "node_modules/.cache/scholar-citations.json",
);

export interface CitationEntry {
  count: number;
  url?: string;
  /** ISO-8601 timestamp of the last successful fetch (drives the TTL). */
  fetchedAt: string;
}

export type CitationCache = Record<string, CitationEntry>;

/** Read the cache, returning {} if it is missing or unparseable. Never throws. */
export function readCitationCache(): CitationCache {
  try {
    return JSON.parse(
      fs.readFileSync(CITATION_CACHE_PATH, "utf-8"),
    ) as CitationCache;
  } catch {
    return {};
  }
}

/** Cached citation info for a DOI, or null when absent. */
export function citationInfo(
  cache: CitationCache,
  doi: string | undefined,
): CitationEntry | null {
  if (!doi) return null;
  const entry = cache[doi.toLowerCase()];
  return entry && typeof entry.count === "number" ? entry : null;
}
