export const flags = {
  contact: true,
  /**
   * Which backend powers the ⌘K command palette.
   *   "fuse"      — build-time JSON index, metadata-only, zero external calls (default)
   *   "docsearch" — Algolia DocSearch full-text over the crawled live site
   *
   * Flip to "docsearch" ONLY after: (1) the Algolia DocSearch app is approved,
   * (2) PUBLIC_DOCSEARCH_APP_ID/_API_KEY/_INDEX_NAME are set at build time, and
   * (3) the crawler has indexed the live site at least once. Otherwise search
   * returns nothing.
   */
  search: "docsearch" as "fuse" | "docsearch",
} as const;
