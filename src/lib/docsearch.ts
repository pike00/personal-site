/**
 * Public Algolia DocSearch credentials for the ⌘K command palette.
 *
 * All three values are PUBLIC and safe to commit / ship in client HTML: the
 * DocSearch API key is a search-only key (read-only, rate-limited) by design.
 * Algolia emails them once your DocSearch application is approved.
 *
 * Set them at build time by exporting PUBLIC_DOCSEARCH_* (e.g. in
 * build.env.sops, threaded through `just deploy`'s `set -a`), or replace the
 * placeholder defaults below. Until all three are set, keep flags.search on
 * "fuse" — DocSearchPalette renders nothing (and ⌘K is a no-op) without them.
 */
export const DOCSEARCH = {
  appId: import.meta.env.PUBLIC_DOCSEARCH_APP_ID ?? "",
  apiKey: import.meta.env.PUBLIC_DOCSEARCH_API_KEY ?? "",
  indexName: import.meta.env.PUBLIC_DOCSEARCH_INDEX_NAME ?? "",
} as const;

/** True only when all three public credentials are present. */
export const docsearchConfigured =
  DOCSEARCH.appId !== "" &&
  DOCSEARCH.apiKey !== "" &&
  DOCSEARCH.indexName !== "";
